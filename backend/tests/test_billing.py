"""
Tests for Phase 8 Billing Foundation and Unified Records.
Verifies Exit Gate:
1. Unauthenticated users and customers cannot access billing APIs (401 / 403).
2. Online enquiries are NOT duplicated into a billing collection (updates on enquiry
   immediately reflect in billing records and summary).
3. Billing accurately distinguishes online enquiries and offline sales with source-type
   labels, filters, detail view, and payment ledger queries.
4. `payments` ledger indexes are ensured (including unique payment_id & idempotency_key).
"""

from datetime import datetime, timezone

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from pymongo.errors import DuplicateKeyError

from app.cli.provision_owner import provision_owner
from app.database.indexes import create_indexes
from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_test_billing_db():
    await db_manager.connect()
    if db_manager.db is not None:
        await create_indexes(db_manager.db)
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
        await db_manager.db.enquiries.delete_many({})
        await db_manager.db.offline_sales.delete_many({})
        await db_manager.db.payments.delete_many({})
    yield
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
        await db_manager.db.enquiries.delete_many({})
        await db_manager.db.offline_sales.delete_many({})
        await db_manager.db.payments.delete_many({})


@pytest.mark.asyncio
async def test_billing_authorization_and_unified_records():
    await provision_owner(
        name="Owner Billing",
        email="owner.billing@theindiaframes.com",
        password="OwnerPassword123!",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as anon_client:
        # 1. Unauthenticated access denied
        resp = await anon_client.get("/api/v1/billing/records")
        assert resp.status_code == 401
        resp_sum = await anon_client.get("/api/v1/billing/summary")
        assert resp_sum.status_code == 401

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as cust_client:
        await cust_client.post(
            "/api/v1/auth/register",
            json={
                "name": "Karthik",
                "email": "karthik@example.com",
                "password": "Password123!",
                "requested_account_type": "retail",
            },
        )
        await cust_client.post(
            "/api/v1/auth/login",
            json={"email": "karthik@example.com", "password": "Password123!"},
        )

        # 2. Customer forbidden from all billing APIs
        assert (await cust_client.get("/api/v1/billing/records")).status_code == 403
        assert (await cust_client.get("/api/v1/billing/summary")).status_code == 403
        assert (await cust_client.get("/api/v1/billing/payments")).status_code == 403

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as owner_client:
        login_res = await owner_client.post(
            "/api/v1/auth/login",
            json={
                "email": "owner.billing@theindiaframes.com",
                "password": "OwnerPassword123!",
            },
        )
        assert login_res.status_code == 200
        owner_me = await owner_client.get("/api/v1/auth/me")
        owner_id = owner_me.json()["data"]["id"]

        # Create catalogue item
        cat = await owner_client.post(
            "/api/v1/admin/categories",
            headers={"x-auth-role": "owner"},
            json={"name": "Photo Frames", "slug": "photo-frames-billing"},
        )
        cat_id = cat.json()["data"]["id"]
        prod = await owner_client.post(
            "/api/v1/admin/products",
            headers={"x-auth-role": "owner"},
            json={
                "name": "MDF Frame",
                "slug": "mdf-frame-billing",
                "base_sku": "MDF-B01",
                "category_id": cat_id,
            },
        )
        prod_id = prod.json()["data"]["id"]
        var = await owner_client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            headers={"x-auth-role": "owner"},
            json={
                "sku": "MDF-B01-12X18",
                "label": "12 x 18 in",
                "retail_price_paise": 65000,
                "availability": "available",
            },
        )
        var_id = var.json()["data"]["id"]

        # Customer creates an online enquiry (2 x ₹650 = ₹1300 = 130000 paise)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as cust_client2:
            await cust_client2.post(
                "/api/v1/auth/login",
                json={"email": "karthik@example.com", "password": "Password123!"},
            )
            enq_resp = await cust_client2.post(
                "/api/v1/enquiries",
                json={
                    "items": [
                        {"product_id": prod_id, "variant_id": var_id, "quantity": 2}
                    ]
                },
            )
            assert enq_resp.status_code == 201
            enquiry_id = enq_resp.json()["data"]["id"]
            human_enq_id = enq_resp.json()["data"]["enquiry_id"]

        # Seed an offline sale document and a payment ledger record directly in MongoDB
        now = datetime.now(timezone.utc)
        sale_oid = ObjectId()
        await db_manager.db.offline_sales.insert_one(
            {
                "_id": sale_oid,
                "sale_id": "TIFS-2026-00001",
                "customer": {
                    "customer_id": None,
                    "name": "Walk-in Counter Customer",
                    "phone": "+919000000001",
                    "email": None,
                },
                "items": [
                    {
                        "product_id": ObjectId(prod_id),
                        "variant_id": ObjectId(var_id),
                        "sku": "MDF-B01-12X18",
                        "product_name": "MDF Frame",
                        "variant_label": "12 x 18 in",
                        "quantity": 1,
                        "unit_price_paise": 60000,
                        "line_total_paise": 60000,
                    }
                ],
                "currency": "INR",
                "subtotal_paise": 60000,
                "discount_paise": 0,
                "tax_amount_paise": None,
                "payable_total_paise": 60000,
                "payment_summary": {
                    "received_total_paise": 60000,
                    "outstanding_paise": 0,
                    "payment_status": "paid",
                },
                "sale_status": "recorded",
                "notes": "Counter cash sale",
                "created_by": ObjectId(owner_id),
                "created_at": now,
                "updated_at": now,
            }
        )
        await db_manager.db.payments.insert_one(
            {
                "payment_id": "TIFPAY-2026-00001",
                "source_type": "offline_sale",
                "source_id": sale_oid,
                "entry_type": "receipt",
                "amount_paise": 60000,
                "currency": "INR",
                "method": "cash",
                "reference_number": None,
                "paid_at": now,
                "notes": "Paid at counter",
                "created_by": ObjectId(owner_id),
                "created_at": now,
                "idempotency_key": "pay-idem-001",
            }
        )

        # 3. Unified list returns BOTH online enquiry and offline sale with distinct labels
        list_resp = await owner_client.get("/api/v1/billing/records")
        assert list_resp.status_code == 200
        records = list_resp.json()["data"]
        assert len(records) == 2

        by_type = {r["source_type"]: r for r in records}
        assert "enquiry" in by_type
        assert "offline_sale" in by_type
        assert by_type["enquiry"]["source_label"] == "Online Enquiry"
        assert by_type["enquiry"]["reference_id"] == human_enq_id
        assert by_type["enquiry"]["payable_total_paise"] == 130000
        assert by_type["enquiry"]["payment_status"] == "unpaid"

        assert by_type["offline_sale"]["source_label"] == "Offline Sale"
        assert by_type["offline_sale"]["reference_id"] == "TIFS-2026-00001"
        assert by_type["offline_sale"]["payable_total_paise"] == 60000
        assert by_type["offline_sale"]["payment_status"] == "paid"

        # 4. Filter by source_type and payment_status
        only_enq = await owner_client.get("/api/v1/billing/records?source_type=enquiry")
        assert len(only_enq.json()["data"]) == 1
        assert only_enq.json()["data"][0]["source_type"] == "enquiry"

        only_paid = await owner_client.get("/api/v1/billing/records?payment_status=paid")
        assert len(only_paid.json()["data"]) == 1
        assert only_paid.json()["data"][0]["source_type"] == "offline_sale"

        # 5. No duplication check: updating quote via Admin API immediately updates Billing view
        quote_resp = await owner_client.patch(
            f"/api/v1/admin/enquiries/{enquiry_id}/quote",
            json={"quoted_total_paise": 120000, "note": "Confirmed quote"},
        )
        assert quote_resp.status_code == 200

        # Billing detail reflects updated quote directly from `enquiries` collection
        enq_detail = await owner_client.get(
            f"/api/v1/billing/records/enquiry/{enquiry_id}"
        )
        assert enq_detail.status_code == 200
        detail_data = enq_detail.json()["data"]
        assert detail_data["quoted_total_paise"] == 120000
        assert detail_data["payable_total_paise"] == 120000
        assert detail_data["outstanding_paise"] == 120000
        assert detail_data["tax_amount_paise"] is None
        assert len(detail_data["items"]) == 1
        assert detail_data["payments"] == []

        # Offline sale detail includes its payment ledger entry
        sale_detail = await owner_client.get(
            f"/api/v1/billing/records/offline_sale/{str(sale_oid)}"
        )
        assert sale_detail.status_code == 200
        sale_data = sale_detail.json()["data"]
        assert len(sale_data["payments"]) == 1
        assert sale_data["payments"][0]["payment_id"] == "TIFPAY-2026-00001"

        # 6. Summary totals reflect updated quote (120000 + 60000 = 180000 payable)
        sum_resp = await owner_client.get("/api/v1/billing/summary")
        assert sum_resp.status_code == 200
        s = sum_resp.json()["data"]
        assert s["total_records"] == 2
        assert s["online_enquiries_count"] == 1
        assert s["offline_sales_count"] == 1
        assert s["total_payable_paise"] == 180000
        assert s["total_received_paise"] == 60000
        assert s["total_outstanding_paise"] == 120000
        assert s["unpaid_count"] == 1
        assert s["paid_count"] == 1

        # 7. Payments ledger search endpoint
        ledger_resp = await owner_client.get("/api/v1/billing/payments?method=cash")
        assert ledger_resp.status_code == 200
        assert len(ledger_resp.json()["data"]) == 1

        # 8. Payments collection index enforces unique idempotency_key
        with pytest.raises(DuplicateKeyError):
            await db_manager.db.payments.insert_one(
                {
                    "payment_id": "TIFPAY-2026-00002",
                    "source_type": "offline_sale",
                    "source_id": sale_oid,
                    "entry_type": "receipt",
                    "amount_paise": 1000,
                    "currency": "INR",
                    "method": "cash",
                    "paid_at": now,
                    "created_by": ObjectId(owner_id),
                    "created_at": now,
                    "idempotency_key": "pay-idem-001",
                }
            )
