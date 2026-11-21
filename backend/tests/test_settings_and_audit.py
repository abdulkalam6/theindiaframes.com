"""
Tests for Owner Business Settings, Audit Log API, Admin Products list,
and Original + Edited Custom Photo Pair Downloads.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.database.session import db_manager
from app.main import app

VALID_PNG_A = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
)
VALID_JPEG_ORIG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9"


@pytest.fixture(autouse=True)
async def setup_settings_audit_db():
    await db_manager.connect()
    if db_manager.db is not None:
        for coll in (
            "users",
            "sessions",
            "settings",
            "audit_logs",
            "categories",
            "products",
            "product_variants",
            "enquiries",
            "custom_photos",
            "counters",
        ):
            await db_manager.db[coll].delete_many({})
    yield
    if db_manager.db is not None:
        for coll in (
            "users",
            "sessions",
            "settings",
            "audit_logs",
            "categories",
            "products",
            "product_variants",
            "enquiries",
            "custom_photos",
            "counters",
        ):
            await db_manager.db[coll].delete_many({})


@pytest.mark.asyncio
async def test_business_settings_audit_logs_and_photo_pair():
    await provision_owner(
        name="Owner Settings",
        email="owner.set@theindiaframes.com",
        password="OwnerPassword123!",
    )

    # 1. Public settings readable without login
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as pub_client:
        pub = await pub_client.get("/api/v1/settings/public")
        assert pub.status_code == 200
        assert pub.json()["data"]["business_name"] == "The India Frames"

        # Unauthenticated cannot access admin settings or audit logs
        assert (await pub_client.get("/api/v1/admin/settings")).status_code == 401
        assert (await pub_client.get("/api/v1/admin/audit-logs")).status_code == 401

    # 2. Owner updates WhatsApp number and business address
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as owner_client:
        await owner_client.post(
            "/api/v1/auth/login",
            json={"email": "owner.set@theindiaframes.com", "password": "OwnerPassword123!"},
        )
        upd = await owner_client.patch(
            "/api/v1/admin/settings",
            json={
                "whatsapp_number": "919999988888",
                "phone_display": "+91 99999 88888",
                "opening_hours": "Mon-Sat 9:30 AM - 8:30 PM",
            },
        )
        assert upd.status_code == 200
        assert upd.json()["data"]["whatsapp_number"] == "919999988888"

        # Audit log recorded the settings update
        logs = await owner_client.get("/api/v1/admin/audit-logs?entity_type=settings")
        assert logs.status_code == 200
        assert len(logs.json()["data"]) >= 1
        assert logs.json()["data"][0]["action"] == "settings.updated"

        # Create product & variant and confirm GET /admin/products returns both prices
        cat = await owner_client.post(
            "/api/v1/admin/categories",
            json={"name": "Frames", "slug": "frames-set"},
        )
        cat_id = cat.json()["data"]["id"]
        prod = await owner_client.post(
            "/api/v1/admin/products",
            json={
                "name": "Gold Frame",
                "slug": "gold-frame-set",
                "base_sku": "GF-01",
                "category_id": cat_id,
            },
        )
        prod_id = prod.json()["data"]["id"]
        var = await owner_client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            json={
                "sku": "GF-01-12X18",
                "label": "12 x 18 inches",
                "retail_price_paise": 65000,
                "wholesale_price_paise": 45000,
                "wholesale_moq": 10,
                "availability": "available",
            },
        )
        var_id = var.json()["data"]["id"]

        admin_prods = await owner_client.get("/api/v1/admin/products")
        assert admin_prods.status_code == 200
        v0 = admin_prods.json()["data"][0]["variants"][0]
        assert v0["retail_price_paise"] == 65000
        assert v0["wholesale_price_paise"] == 45000

        # 3. Customer uploads BOTH edited + original photo and submits enquiry
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as cust_client:
            up = await cust_client.post(
                "/api/v1/custom-photos/upload",
                files={
                    "photo": ("edited.png", VALID_PNG_A, "image/png"),
                    "original_photo": ("orig.jpg", VALID_JPEG_ORIG, "image/jpeg"),
                },
            )
            assert up.status_code == 201
            assert up.json()["data"]["has_original"] is True
            asset_id = up.json()["data"]["asset_id"]

            await cust_client.post(
                "/api/v1/auth/register",
                json={
                    "name": "Deepa",
                    "email": "deepa@example.com",
                    "password": "Password123!",
                    "requested_account_type": "retail",
                },
            )
            await cust_client.post(
                "/api/v1/auth/login",
                json={"email": "deepa@example.com", "password": "Password123!"},
            )
            enq = await cust_client.post(
                "/api/v1/enquiries",
                json={
                    "items": [
                        {
                            "product_id": prod_id,
                            "variant_id": var_id,
                            "quantity": 1,
                            "custom_photo_asset_id": asset_id,
                        }
                    ]
                },
            )
            assert enq.status_code == 201
            # Dynamic WhatsApp number from settings is used!
            assert "https://wa.me/919999988888" in enq.json()["data"]["whatsapp_url"]
            enq_id = enq.json()["data"]["id"]

        # Owner can download BOTH edited and untouched original photo
        dl_edited = await owner_client.get(
            f"/api/v1/admin/enquiries/{enq_id}/photos/{asset_id}"
        )
        assert dl_edited.status_code == 200
        assert dl_edited.content == VALID_PNG_A

        dl_orig = await owner_client.get(
            f"/api/v1/admin/enquiries/{enq_id}/photos/{asset_id}?version=original"
        )
        assert dl_orig.status_code == 200
        assert dl_orig.content == VALID_JPEG_ORIG
