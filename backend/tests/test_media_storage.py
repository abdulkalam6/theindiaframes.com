"""
Tests for Pluggable Object Storage (Local + Cloudflare R2) & Owner Product Image Upload.
Verifies:
1. Owner can upload & delete public product images; customers receive 403.
2. Public media route serves `public/` files and blocks path traversal into `private/`.
3. StorageService correctly routes public vs private keys to R2 buckets when provider="r2".
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.core.config import settings
from app.database.session import db_manager
from app.main import app
from app.services.storage import StorageService

VALID_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(autouse=True)
async def setup_media_db():
    await db_manager.connect()
    if db_manager.db is not None:
        for coll in (
            "users",
            "sessions",
            "categories",
            "products",
            "product_variants",
            "audit_logs",
        ):
            await db_manager.db[coll].delete_many({})
    yield
    if db_manager.db is not None:
        for coll in (
            "users",
            "sessions",
            "categories",
            "products",
            "product_variants",
            "audit_logs",
        ):
            await db_manager.db[coll].delete_many({})


@pytest.mark.asyncio
async def test_owner_product_image_upload_and_private_isolation():
    await provision_owner(
        name="Owner Media",
        email="owner.media@theindiaframes.com",
        password="OwnerPassword123!",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as owner_client:
        await owner_client.post(
            "/api/v1/auth/login",
            json={"email": "owner.media@theindiaframes.com", "password": "OwnerPassword123!"},
        )
        cat = await owner_client.post(
            "/api/v1/admin/categories",
            json={"name": "Frames", "slug": "frames-media"},
        )
        prod = await owner_client.post(
            "/api/v1/admin/products",
            json={
                "name": "Walnut Frame",
                "slug": "walnut-frame-media",
                "base_sku": "WF-M01",
                "category_id": cat.json()["data"]["id"],
            },
        )
        prod_id = prod.json()["data"]["id"]

        # Unauthenticated cannot upload product images
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as anon_client:
            denied = await anon_client.post(
                f"/api/v1/admin/products/{prod_id}/images",
                files={"image": ("frame.png", VALID_PNG, "image/png")},
            )
            assert denied.status_code == 401

        # Owner uploads real product image
        up = await owner_client.post(
            f"/api/v1/admin/products/{prod_id}/images",
            files={"image": ("walnut.png", VALID_PNG, "image/png")},
            data={"alt": "Walnut frame front"},
        )
        assert up.status_code == 201
        media_data = up.json()["data"]
        asset_id = media_data["asset_id"]
        assert "/api/v1/media/products/" in media_data["url"]

        # Public URL serves exact PNG bytes
        media_path = media_data["url"].split("/api/v1/media/", 1)[1]
        fetched = await owner_client.get(f"/api/v1/media/{media_path}")
        assert fetched.status_code == 200
        assert fetched.content == VALID_PNG

        # Path traversal attempt into private directory returns 404
        traversal = await owner_client.get(
            "/api/v1/media/../private/custom_photos/secret.jpg"
        )
        assert traversal.status_code == 404

        # Owner deletes the image
        deleted = await owner_client.delete(
            f"/api/v1/admin/products/{prod_id}/images/{asset_id}"
        )
        assert deleted.status_code == 200


@pytest.mark.asyncio
async def test_storage_service_r2_routing(monkeypatch):
    """Verify Cloudflare R2 public/private bucket separation with mocked S3 client."""
    calls: list[tuple[str, dict]] = []

    class FakeBody:
        def __init__(self, data: bytes):
            self._data = data

        def read(self) -> bytes:
            return self._data

    class FakeS3Client:
        def put_object(self, **kwargs):
            calls.append(("put", kwargs))

        def get_object(self, **kwargs):
            calls.append(("get", kwargs))
            return {"Body": FakeBody(b"private-bytes")}

        def delete_object(self, **kwargs):
            calls.append(("delete", kwargs))

    monkeypatch.setattr(settings, "STORAGE_PROVIDER", "r2")
    monkeypatch.setattr(settings, "R2_PUBLIC_BUCKET", "tif-public")
    monkeypatch.setattr(settings, "R2_PUBLIC_BASE_URL", "https://media.theindiaframes.com")
    monkeypatch.setattr(settings, "R2_PRIVATE_BUCKET", "tif-private")

    svc = StorageService()
    svc._s3_client = FakeS3Client()

    pub_url = await svc.save_public("products/p1/a.jpg", b"img", "image/jpeg")
    assert pub_url == "https://media.theindiaframes.com/products/p1/a.jpg"
    assert calls[-1][1]["Bucket"] == "tif-public"

    priv_key = await svc.save_private("custom_photos/c1.jpg", b"secret", "image/jpeg")
    assert priv_key == "custom_photos/c1.jpg"
    assert calls[-1][1]["Bucket"] == "tif-private"

    priv_bytes = await svc.read_private("custom_photos/c1.jpg")
    assert priv_bytes == b"private-bytes"
    assert calls[-1][1]["Bucket"] == "tif-private"
