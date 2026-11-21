"""
Tests for Custom Frame Photo Upload, Enquiry Snapshot Attachment & Owner Download.
"""

import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.database.session import db_manager
from app.main import app

# Minimal valid 1x1 PNG bytes
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture(autouse=True)
async def setup_custom_photo_db():
    await db_manager.connect()
    if db_manager.db is not None:
        for coll in (
            "users",
            "sessions",
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
            "categories",
            "products",
            "product_variants",
            "enquiries",
            "custom_photos",
            "counters",
        ):
            await db_manager.db[coll].delete_many({})


@pytest.mark.asyncio
async def test_custom_photo_upload_enquiry_and_owner_download():
    await provision_owner(
        name="Owner Studio",
        email="owner.photo@theindiaframes.com",
        password="OwnerPassword123!",
    )

    # 1. Owner creates a frame product & variant
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as owner_client:
        await owner_client.post(
            "/api/v1/auth/login",
            json={"email": "owner.photo@theindiaframes.com", "password": "OwnerPassword123!"},
        )
        cat = await owner_client.post(
            "/api/v1/admin/categories",
            json={"name": "Photo Frames", "slug": "photo-frames-test"},
        )
        cat_id = cat.json()["data"]["id"]
        prod = await owner_client.post(
            "/api/v1/admin/products",
            json={
                "name": "Teak Frame",
                "slug": "teak-frame-photo",
                "base_sku": "TF-P01",
                "category_id": cat_id,
            },
        )
        prod_id = prod.json()["data"]["id"]
        var = await owner_client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            json={
                "sku": "TF-P01-12X18",
                "label": "12 x 18 inches",
                "retail_price_paise": 65000,
                "availability": "available",
            },
        )
        var_id = var.json()["data"]["id"]

        # 2. Customer registers, uploads edited photo, submits enquiry
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as cust_client:
            # Non-image file rejected
            bad_upload = await cust_client.post(
                "/api/v1/custom-photos/upload",
                files={"photo": ("malware.txt", b"not an image", "text/plain")},
            )
            assert bad_upload.status_code == 400

            # Valid edited PNG uploaded
            good_upload = await cust_client.post(
                "/api/v1/custom-photos/upload",
                files={"photo": ("family-portrait.png", VALID_PNG_BYTES, "image/png")},
                data={
                    "edit_settings": json.dumps(
                        {
                            "zoom": 1.25,
                            "rotation": 90,
                            "orientation": "portrait",
                            "matColor": "white",
                        }
                    )
                },
            )
            assert good_upload.status_code == 201
            asset_id = good_upload.json()["data"]["asset_id"]

            await cust_client.post(
                "/api/v1/auth/register",
                json={
                    "name": "Priya",
                    "email": "priya@example.com",
                    "password": "Password123!",
                    "requested_account_type": "retail",
                },
            )
            await cust_client.post(
                "/api/v1/auth/login",
                json={"email": "priya@example.com", "password": "Password123!"},
            )

            enq_resp = await cust_client.post(
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
            assert enq_resp.status_code == 201
            enq_data = enq_resp.json()["data"]
            enquiry_id = enq_data["id"]
            assert enq_data["items"][0]["custom_photo"]["asset_id"] == asset_id
            assert (
                enq_data["items"][0]["custom_photo"]["edit_settings"]["matColor"]
                == "white"
            )
            assert "Custom%20Photo%20Attached" in enq_data["whatsapp_url"]

            # Customer CANNOT use owner admin download endpoint (403)
            denied_dl = await cust_client.get(
                f"/api/v1/admin/enquiries/{enquiry_id}/photos/{asset_id}"
            )
            assert denied_dl.status_code == 403

        # 3. Owner sees custom_photo on Admin detail and downloads exact bytes
        admin_enq = await owner_client.get(f"/api/v1/admin/enquiries/{enquiry_id}")
        assert admin_enq.status_code == 200
        assert (
            admin_enq.json()["data"]["items"][0]["custom_photo"]["asset_id"] == asset_id
        )

        dl_resp = await owner_client.get(
            f"/api/v1/admin/enquiries/{enquiry_id}/photos/{asset_id}"
        )
        assert dl_resp.status_code == 200
        assert dl_resp.content == VALID_PNG_BYTES
        assert "attachment;" in dl_resp.headers.get("content-disposition", "")
