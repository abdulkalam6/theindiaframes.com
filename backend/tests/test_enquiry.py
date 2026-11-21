"""
Tests for Phase 6 Enquiry Creation, Idempotency, Snapshots & WhatsApp Click-to-Chat Handoff.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_test_enquiry_db():
    await db_manager.connect()
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
        await db_manager.db.enquiries.delete_many({})
        await db_manager.db.counters.delete_many({})
    yield
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
        await db_manager.db.enquiries.delete_many({})
        await db_manager.db.counters.delete_many({})


@pytest.mark.asyncio
async def test_enquiry_creation_and_immutable_snapshots():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Setup Customer & Catalogue Data
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Senthil Kumar",
                "email": "senthil@example.com",
                "phone": "+919876543210",
                "password": "Password123!",
                "requested_account_type": "retail",
            },
        )
        assert reg_resp.status_code == 201

        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "senthil@example.com", "password": "Password123!"},
        )
        cust_cookies = login_resp.cookies

        # Create Category and Product
        cat_resp = await client.post(
            "/api/v1/admin/categories",
            headers={"x-auth-role": "owner"},
            json={"name": "Glass Products", "slug": "glass-products"},
        )
        cat_id = cat_resp.json()["data"]["id"]

        prod_resp = await client.post(
            "/api/v1/admin/products",
            headers={"x-auth-role": "owner"},
            json={
                "name": "Antique Glass Mirror",
                "slug": "antique-glass-mirror",
                "base_sku": "AGM-01",
                "category_id": cat_id,
            },
        )
        prod_id = prod_resp.json()["data"]["id"]

        var_resp = await client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            headers={"x-auth-role": "owner"},
            json={
                "sku": "AGM-01-SMALL",
                "label": "Small 10x15",
                "retail_price_paise": 60000,  # ₹600
                "availability": "available",
            },
        )
        var_id = var_resp.json()["data"]["id"]

        # 2. Submit Enquiry with Idempotency Key
        enquiry_payload = {
            "items": [{"product_id": prod_id, "variant_id": var_id, "quantity": 3}],
            "customer_note": "Please package with extra bubble wrap.",
            "idempotency_key": "idemp-key-senthil-001",
        }

        enquiry_resp = await client.post(
            "/api/v1/enquiries",
            cookies=cust_cookies,
            json=enquiry_payload,
        )
        assert enquiry_resp.status_code == 201
        data = enquiry_resp.json()["data"]

        # Assert format TIF-YYYY-XXXXX
        assert data["enquiry_id"].startswith("TIF-")
        assert len(data["enquiry_id"]) == 14  # e.g. TIF-2026-00001
        assert data["customer_snapshot"]["name"] == "Senthil Kumar"
        assert data["pricing_tier"] == "retail"
        assert data["subtotal_paise"] == 180000  # 60000 * 3 = ₹1800
        assert data["payment_summary"]["payment_status"] == "unpaid"
        assert data["enquiry_status"] == "pending"

        # Assert WhatsApp Click-to-Chat URL
        assert "https://wa.me/" in data["whatsapp_url"]
        assert data["enquiry_id"] in data["whatsapp_url"]

        # 3. Idempotency Verification: Repeating identical submission returns the same record
        repeat_resp = await client.post(
            "/api/v1/enquiries",
            cookies=cust_cookies,
            json=enquiry_payload,
        )
        assert repeat_resp.status_code in [200, 201]
        assert repeat_resp.json()["data"]["enquiry_id"] == data["enquiry_id"]

        # Verify only 1 enquiry was created in DB
        history_resp = await client.get("/api/v1/enquiries", cookies=cust_cookies)
        assert len(history_resp.json()["data"]) == 1

        # 4. Snapshot immutability: Update live variant price -> old enquiry snapshot remains unchanged
        await client.patch(
            f"/api/v1/admin/variants/{var_id}",
            headers={"x-auth-role": "owner"},
            json={"retail_price_paise": 95000},  # Price increased to ₹950
        )

        detail_resp = await client.get(
            f"/api/v1/enquiries/{data['id']}",
            cookies=cust_cookies,
        )
        saved_item = detail_resp.json()["data"]["items"][0]
        # Must retain original snapshot price of ₹600 (60000 paise)
        assert saved_item["unit_price_paise"] == 60000
        assert saved_item["line_total_paise"] == 180000
