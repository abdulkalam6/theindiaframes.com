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
        await db_manager.db.audit_logs.delete_many({})
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
        await db_manager.db.audit_logs.delete_many({})


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
            json={"name": "Photo Frames", "slug": "photo-frames-billing"},
        )
        cat_id = cat.json()["data"]["id"]
        prod = await owner_client.post(
            "/api/v1/admin/products",
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


@pytest.mark.asyncio
async def test_phase9_offline_sales_partial_payments_reversals_and_reconciliation():
    """
    Phase 9 Exit Gate Verification:
    1. Offline sale creation with multiple line items, walk-in/existing customer, manual price
       override & discount with audit log entries.
    2. Two partial payments produce exact received/outstanding/status transitions.
    3. Idempotency prevents duplicate payment receipts.
    4. Reversal creates a separate immutable ledger entry while preserving original receipt.
    5. Admin enquiry view immediately reflects payments recorded in Billing on the shared record,
       and blocks reducing quote below net received.
    6. Reconciliation detects and repairs drifted payment summaries from the immutable ledger.
    """
    await provision_owner(
        name="Owner Phase9",
        email="owner.p9@theindiaframes.com",
        password="OwnerPassword123!",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as cust_client:
        await cust_client.post(
            "/api/v1/auth/register",
            json={
                "name": "Meena Studio",
                "email": "meena@example.com",
                "password": "Password123!",
                "requested_account_type": "retail",
            },
        )
        await cust_client.post(
            "/api/v1/auth/login",
            json={"email": "meena@example.com", "password": "Password123!"},
        )
        me_cust = await cust_client.get("/api/v1/auth/me")
        cust_id = me_cust.json()["data"]["id"]

        # Customer cannot create offline sales or record payments (403)
        denied_sale = await cust_client.post(
            "/api/v1/billing/offline-sales",
            json={
                "customer": {"name": "Walk-in"},
                "items": [{"product_name": "Frame", "quantity": 1, "unit_price_paise": 50000}],
            },
        )
        assert denied_sale.status_code == 403

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as owner_client:
        await owner_client.post(
            "/api/v1/auth/login",
            json={"email": "owner.p9@theindiaframes.com", "password": "OwnerPassword123!"},
        )

        # Create catalogue item (retail ₹650 = 65000 paise)
        cat = await owner_client.post(
            "/api/v1/admin/categories",
            json={"name": "Wood Frames", "slug": "wood-frames-p9"},
        )
        cat_id = cat.json()["data"]["id"]
        prod = await owner_client.post(
            "/api/v1/admin/products",
            json={
                "name": "Teak Frame",
                "slug": "teak-frame-p9",
                "base_sku": "TK-01",
                "category_id": cat_id,
            },
        )
        prod_id = prod.json()["data"]["id"]
        var = await owner_client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            json={
                "sku": "TK-01-12X18",
                "label": "12 x 18 in",
                "retail_price_paise": 65000,
                "availability": "available",
            },
        )
        var_id = var.json()["data"]["id"]

        # 1. Create offline sale with 2 line items (catalogue with manual price override + custom)
        # Line 1: 2 x ₹600 (overridden from ₹650) = ₹1200 (120000)
        # Line 2: 1 x ₹300 custom glass cut = ₹300 (30000)
        # Subtotal = ₹1500 (150000), Discount = ₹100 (10000) -> Payable = ₹1400 (140000)
        sale_resp = await owner_client.post(
            "/api/v1/billing/offline-sales",
            json={
                "customer": {"customer_id": cust_id},
                "items": [
                    {
                        "product_id": prod_id,
                        "variant_id": var_id,
                        "quantity": 2,
                        "unit_price_paise": 60000,
                    },
                    {
                        "product_name": "Custom Non-Glare Glass",
                        "variant_label": "12 x 18 in",
                        "quantity": 1,
                        "unit_price_paise": 30000,
                    },
                ],
                "discount_paise": 10000,
                "notes": "Regular studio customer discount",
            },
        )
        assert sale_resp.status_code == 201
        sale_data = sale_resp.json()["data"]
        sale_id = sale_data["source_id"]
        assert sale_data["source_type"] == "offline_sale"
        assert sale_data["reference_id"].startswith("TIFS-")
        assert sale_data["customer"]["name"] == "Meena Studio"
        assert sale_data["subtotal_paise"] == 150000
        assert sale_data["discount_paise"] == 10000
        assert sale_data["payable_total_paise"] == 140000
        assert sale_data["payment_status"] == "unpaid"

        # Verify audit log recorded manual price deviation
        audit_doc = await db_manager.db.audit_logs.find_one(
            {"action": "offline_sale.created", "entity_id": ObjectId(sale_id)}
        )
        assert audit_doc is not None
        assert len(audit_doc["after"]["price_deviations"]) == 1
        assert audit_doc["after"]["price_deviations"][0]["catalogue_retail_paise"] == 65000
        assert audit_doc["after"]["price_deviations"][0]["agreed_unit_price_paise"] == 60000

        # 2. First partial payment: ₹500 (50000 paise) via UPI with idempotency key
        pay1_resp = await owner_client.post(
            f"/api/v1/billing/records/offline_sale/{sale_id}/payments",
            json={
                "entry_type": "receipt",
                "amount_paise": 50000,
                "method": "upi",
                "reference_number": "UPI-1001",
                "notes": "Advance payment",
                "idempotency_key": "sale-pay-1",
            },
        )
        assert pay1_resp.status_code == 201
        pay1 = pay1_resp.json()["data"]
        assert pay1["idempotent_replay"] is False
        assert pay1["billing_record"]["received_total_paise"] == 50000
        assert pay1["billing_record"]["outstanding_paise"] == 90000
        assert pay1["billing_record"]["payment_status"] == "partial"
        first_payment_id = pay1["payment"]["id"]

        # 3. Idempotent retry with same key does NOT create duplicate
        pay1_retry = await owner_client.post(
            f"/api/v1/billing/records/offline_sale/{sale_id}/payments",
            json={
                "entry_type": "receipt",
                "amount_paise": 50000,
                "method": "upi",
                "reference_number": "UPI-1001",
                "idempotency_key": "sale-pay-1",
            },
        )
        assert pay1_retry.status_code == 201
        assert pay1_retry.json()["data"]["idempotent_replay"] is True
        assert pay1_retry.json()["data"]["payment"]["id"] == first_payment_id
        assert len(pay1_retry.json()["data"]["billing_record"]["payments"]) == 1

        # 4. Second partial payment: ₹900 (90000 paise) via cash -> Paid in full
        pay2_resp = await owner_client.post(
            f"/api/v1/billing/records/offline_sale/{sale_id}/payments",
            json={
                "entry_type": "receipt",
                "amount_paise": 90000,
                "method": "cash",
                "notes": "Balance on pickup",
                "idempotency_key": "sale-pay-2",
            },
        )
        assert pay2_resp.status_code == 201
        pay2 = pay2_resp.json()["data"]
        assert pay2["billing_record"]["received_total_paise"] == 140000
        assert pay2["billing_record"]["outstanding_paise"] == 0
        assert pay2["billing_record"]["payment_status"] == "paid"

        # Overpayment blocked
        overpay = await owner_client.post(
            f"/api/v1/billing/records/offline_sale/{sale_id}/payments",
            json={"entry_type": "receipt", "amount_paise": 100, "method": "cash"},
        )
        assert overpay.status_code == 400

        # Voiding blocked while net receipts > 0
        void_blocked = await owner_client.patch(
            f"/api/v1/billing/offline-sales/{sale_id}",
            json={"sale_status": "voided"},
        )
        assert void_blocked.status_code == 400

        # 5. Reversal workflow: reverse first ₹500 receipt -> original receipt stays preserved!
        rev_resp = await owner_client.post(
            f"/api/v1/billing/records/offline_sale/{sale_id}/payments",
            json={
                "entry_type": "reversal",
                "reversed_payment_id": first_payment_id,
                "method": "upi",
                "notes": "UPI failed settlement",
                "idempotency_key": "sale-rev-1",
            },
        )
        assert rev_resp.status_code == 201
        rev_data = rev_resp.json()["data"]
        assert rev_data["payment"]["entry_type"] == "reversal"
        assert rev_data["payment"]["amount_paise"] == 50000
        assert rev_data["payment"]["reversed_payment_id"] == first_payment_id
        # 2 receipts + 1 reversal = 3 immutable entries in ledger
        assert len(rev_data["billing_record"]["payments"]) == 3
        assert rev_data["billing_record"]["received_total_paise"] == 90000
        assert rev_data["billing_record"]["outstanding_paise"] == 50000
        assert rev_data["billing_record"]["payment_status"] == "partial"

        # Double reversal of same receipt blocked
        rev_again = await owner_client.post(
            f"/api/v1/billing/records/offline_sale/{sale_id}/payments",
            json={
                "entry_type": "reversal",
                "reversed_payment_id": first_payment_id,
                "method": "upi",
            },
        )
        assert rev_again.status_code == 400

        # 6. Shared record test: Customer creates online enquiry, Owner pays via Billing,
        #    and Admin immediately reflects updated payment_summary!
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as cust_client2:
            await cust_client2.post(
                "/api/v1/auth/login",
                json={"email": "meena@example.com", "password": "Password123!"},
            )
            enq_resp = await cust_client2.post(
                "/api/v1/enquiries",
                json={"items": [{"product_id": prod_id, "variant_id": var_id, "quantity": 2}]},
            )
            assert enq_resp.status_code == 201
            enquiry_id = enq_resp.json()["data"]["id"]  # ₹1300 (130000 paise)

        # Record ₹300 partial payment on the online enquiry via Billing
        enq_pay = await owner_client.post(
            f"/api/v1/billing/records/enquiry/{enquiry_id}/payments",
            json={
                "entry_type": "receipt",
                "amount_paise": 30000,
                "method": "bank_transfer",
                "reference_number": "NEFT-99",
                "idempotency_key": "enq-pay-1",
            },
        )
        assert enq_pay.status_code == 201

        # Admin endpoint reads the exact same shared enquiry document and sees partial payment
        admin_enq = await owner_client.get(f"/api/v1/admin/enquiries/{enquiry_id}")
        assert admin_enq.status_code == 200
        admin_pay_sum = admin_enq.json()["data"]["payment_summary"]
        assert admin_pay_sum["received_total_paise"] == 30000
        assert admin_pay_sum["outstanding_paise"] == 100000
        assert admin_pay_sum["payment_status"] == "partial"

        # Admin cannot lower quote below already-received ₹300
        bad_quote = await owner_client.patch(
            f"/api/v1/admin/enquiries/{enquiry_id}/quote",
            json={"quoted_total_paise": 20000},
        )
        assert bad_quote.status_code == 400

        # 7. Reconciliation check & repair
        clean_rec = await owner_client.get("/api/v1/billing/reconciliation")
        assert clean_rec.status_code == 200
        assert clean_rec.json()["data"]["mismatched_records"] == 0

        # Simulate drifted denormalized summary directly in DB and verify reconciliation repairs it
        await db_manager.db.enquiries.update_one(
            {"_id": ObjectId(enquiry_id)},
            {"$set": {"payment_summary.received_total_paise": 0}},
        )
        drift_rec = await owner_client.get("/api/v1/billing/reconciliation")
        assert drift_rec.json()["data"]["mismatched_records"] == 1

        repair_rec = await owner_client.post("/api/v1/billing/reconciliation/repair")
        assert repair_rec.status_code == 200
        assert repair_rec.json()["data"]["repaired_records"] == 1

        post_repair = await owner_client.get("/api/v1/billing/reconciliation")
        assert post_repair.json()["data"]["mismatched_records"] == 0

