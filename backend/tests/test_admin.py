"""
Tests for Phase 7 Owner Admin and Enquiry Workflow.
Verifies:
1. Owner authorization gate on all /admin endpoints (403 for non-owners).
2. Admin dashboard KPI counters.
3. Enquiry status changes with audit history tracking.
4. Quoted total adjustments and independent payment state preservation.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_test_admin_db():
    await db_manager.connect()
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
        await db_manager.db.enquiries.delete_many({})
    yield
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
        await db_manager.db.enquiries.delete_many({})


@pytest.mark.asyncio
async def test_owner_admin_enquiry_workflow():
    # 1. Provision Owner and create customer
    await provision_owner(
        name="Owner Admin",
        email="owner@theindiaframes.com",
        password="OwnerPassword123!",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Register Customer
        await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Ramesh",
                "email": "ramesh@example.com",
                "password": "Password123!",
                "requested_account_type": "retail",
            },
        )
        cust_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "ramesh@example.com", "password": "Password123!"},
        )
        cust_cookies = cust_login.cookies

        # Customer attempts to access admin dashboard -> 403 Forbidden
        dash_cust = await client.get("/api/v1/admin/dashboard", cookies=cust_cookies)
        assert dash_cust.status_code == 403

        # 2. Owner Logs in
        owner_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "owner@theindiaframes.com", "password": "OwnerPassword123!"},
        )
        owner_cookies = owner_login.cookies

        # 3. Create sample catalogue and customer enquiry
        cat = await client.post(
            "/api/v1/admin/categories",
            cookies=owner_cookies,
            json={"name": "Lamination", "slug": "lamination"},
        )
        cat_id = cat.json()["data"]["id"]

        prod = await client.post(
            "/api/v1/admin/products",
            cookies=owner_cookies,
            json={
                "name": "Velvet Roll Film",
                "slug": "velvet-roll-film",
                "base_sku": "VRF-01",
                "category_id": cat_id,
            },
        )
        prod_id = prod.json()["data"]["id"]

        var = await client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            cookies=owner_cookies,
            json={
                "sku": "VRF-01-ROLL",
                "label": "25 micron 50m",
                "retail_price_paise": 120000,
                "availability": "available",
            },
        )
        var_id = var.json()["data"]["id"]

        # Customer submits enquiry
        enquiry_resp = await client.post(
            "/api/v1/enquiries",
            cookies=cust_cookies,
            json={"items": [{"product_id": prod_id, "variant_id": var_id, "quantity": 1}]},
        )
        assert enquiry_resp.status_code == 201
        enquiry_id = enquiry_resp.json()["data"]["id"]

        # 4. Owner views Dashboard metrics
        dash_resp = await client.get("/api/v1/admin/dashboard", cookies=owner_cookies)
        assert dash_resp.status_code == 200
        dash_data = dash_resp.json()["data"]
        assert dash_data["total_enquiries"] == 1
        assert dash_data["pending_enquiries"] == 1
        assert dash_data["total_customers"] == 1

        # 4b. Owner retrieves single enquiry detail
        detail_resp = await client.get(
            f"/api/v1/admin/enquiries/{enquiry_id}", cookies=owner_cookies
        )
        assert detail_resp.status_code == 200
        assert detail_resp.json()["data"]["id"] == enquiry_id

        # 5. Owner updates quote amount (discounted from ₹1200 to ₹1100 = 110000 paise)
        quote_resp = await client.patch(
            f"/api/v1/admin/enquiries/{enquiry_id}/quote",
            cookies=owner_cookies,
            json={"quoted_total_paise": 110000, "note": "Discounted for local pickup."},
        )
        assert quote_resp.status_code == 200
        quote_data = quote_resp.json()["data"]
        assert quote_data["quoted_total_paise"] == 110000
        assert quote_data["payment_summary"]["outstanding_paise"] == 110000

        # 6. Owner transitions enquiry status to "quoted"
        status_resp = await client.patch(
            f"/api/v1/admin/enquiries/{enquiry_id}/status",
            cookies=owner_cookies,
            json={"status": "quoted", "note": "Quote sent via WhatsApp."},
        )
        assert status_resp.status_code == 200
        status_data = status_resp.json()["data"]
        assert status_data["enquiry_status"] == "quoted"
        # Verify status history audit trail
        history_statuses = [h["status"] for h in status_data["status_history"]]
        assert "pending" in history_statuses
        assert "quoted" in history_statuses

        # 7. Owner lists customers
        cust_list_resp = await client.get("/api/v1/admin/customers", cookies=owner_cookies)
        assert cust_list_resp.status_code == 200
        assert len(cust_list_resp.json()["data"]) == 1
        assert cust_list_resp.json()["data"][0]["email"] == "ramesh@example.com"

        # 8. Cancelled enquiry remains stored and retains independent payment state
        cancel_resp = await client.patch(
            f"/api/v1/admin/enquiries/{enquiry_id}/status",
            cookies=owner_cookies,
            json={"status": "cancelled", "note": "Customer changed mind."},
        )
        assert cancel_resp.status_code == 200
        cancelled = cancel_resp.json()["data"]
        assert cancelled["enquiry_status"] == "cancelled"
        assert cancelled["payment_summary"]["payment_status"] == "unpaid"

        still_exists = await client.get(
            f"/api/v1/admin/enquiries/{enquiry_id}", cookies=owner_cookies
        )
        assert still_exists.status_code == 200
        assert still_exists.json()["data"]["enquiry_status"] == "cancelled"
