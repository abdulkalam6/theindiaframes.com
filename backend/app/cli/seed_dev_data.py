"""
Local Development & Manual QA Dataset Seeder for The India Frames.
Populates local MongoDB (`the_india_frames`) with clearly labeled QA accounts,
categories, products, variants, wholesale applications, online enquiries,
offline counter sales, payment ledger receipts, and audit logs.

Usage:
  cd backend
  set PYTHONPATH=.
  .\\.venv\\Scripts\\python.exe -m app.cli.seed_dev_data

WARNING: For local development / manual validation ONLY. Never run with default
credentials in production.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from bson import ObjectId

from app.core.config import settings
from app.core.security import hash_password
from app.database.indexes import create_indexes
from app.database.session import db_manager
from app.schemas.billing import (
    OfflineSaleCreateRequest,
    OfflineSaleCustomerInput,
    OfflineSaleItemInput,
    PaymentCreateRequest,
)
from app.schemas.enquiry import EnquiryCreateRequest
from app.services.billing import BillingService
from app.services.enquiry import EnquiryService

QA_ACCOUNTS = [
    {
        "role_label": "Owner (Admin + Billing)",
        "name": "TIF Owner Admin",
        "email": "owner@theindiaframes.com",
        "phone": "+919443312345",
        "password": "Owner@TIF2026!",
        "account_type": "owner",
        "wholesale_status": "approved",
    },
    {
        "role_label": "Retail Customer",
        "name": "Arun Kumar (QA Retail)",
        "email": "retail.qa@theindiaframes.com",
        "phone": "+919840100001",
        "password": "Retail@TIF2026!",
        "account_type": "retail",
        "wholesale_status": "not_applied",
    },
    {
        "role_label": "Wholesale Customer (Approved)",
        "name": "Lakshmi Photo Studio (QA Wholesale)",
        "email": "wholesale.approved@theindiaframes.com",
        "phone": "+919840100002",
        "password": "Wholesale@TIF2026!",
        "account_type": "wholesale",
        "wholesale_status": "approved",
    },
    {
        "role_label": "Wholesale Customer (Pending Review)",
        "name": "Kaveri Prints & Frames (QA Pending)",
        "email": "wholesale.pending@theindiaframes.com",
        "phone": "+919840100003",
        "password": "Pending@TIF2026!",
        "account_type": "retail",
        "wholesale_status": "pending",
    },
]


async def seed_qa_dataset() -> None:
    if settings.ENVIRONMENT == "production":
        raise RuntimeError("Refusing to run QA dev seeder in production environment.")

    await db_manager.connect()
    db = db_manager.db
    if db is None:
        raise RuntimeError("Failed to connect to MongoDB.")

    await create_indexes(db)

    # Clear collections for a clean, deterministic QA dataset
    for coll_name in (
        "users",
        "sessions",
        "wholesale_applications",
        "categories",
        "products",
        "product_variants",
        "enquiries",
        "offline_sales",
        "payments",
        "audit_logs",
        "counters",
    ):
        await db[coll_name].delete_many({})

    now = datetime.now(timezone.utc)

    # 1. Seed Users
    user_ids: dict[str, str] = {}
    for acc in QA_ACCOUNTS:
        doc = {
            "name": acc["name"],
            "email": acc["email"],
            "email_normalized": acc["email"].lower().strip(),
            "phone": acc["phone"],
            "account_type": acc["account_type"],
            "account_status": "active",
            "password_hash": hash_password(acc["password"]),
            "google_sub": None,
            "wholesale_status": acc["wholesale_status"],
            "created_at": now - timedelta(days=10),
            "updated_at": now - timedelta(days=10),
            "last_login_at": None,
        }
        res = await db.users.insert_one(doc)
        user_ids[acc["email"]] = str(res.inserted_id)

    owner_id = user_ids["owner@theindiaframes.com"]
    retail_id = user_ids["retail.qa@theindiaframes.com"]
    ws_approved_id = user_ids["wholesale.approved@theindiaframes.com"]
    ws_pending_id = user_ids["wholesale.pending@theindiaframes.com"]

    # 2. Seed Wholesale Applications (1 Approved + 1 Pending for Owner review)
    await db.wholesale_applications.insert_many(
        [
            {
                "user_id": ObjectId(ws_approved_id),
                "business_name": "Lakshmi Photo Studio (QA)",
                "business_type": "photo_studio",
                "gstin": "33AABCL1234A1Z5",
                "contact_name": "Lakshmi Photo Studio (QA Wholesale)",
                "contact_phone": "+919840100002",
                "contact_email": "wholesale.approved@theindiaframes.com",
                "business_address": {
                    "line1": "14 Main Road",
                    "line2": "Near Bus Stand",
                    "city": "Cumbum",
                    "district": "Theni",
                    "state": "Tamil Nadu",
                    "postal_code": "625516",
                    "country": "IN",
                },
                "proof_document": {
                    "provider": "local-private",
                    "asset_id": "qa-approved-proof.pdf",
                    "original_filename": "gst-certificate-qa.pdf",
                    "mime_type": "application/pdf",
                    "uploaded_at": now - timedelta(days=8),
                },
                "status": "approved",
                "applicant_note": "Regular framing studio in Theni district.",
                "owner_internal_note": "Verified GST details (QA seed).",
                "reviewed_by": ObjectId(owner_id),
                "reviewed_at": now - timedelta(days=7),
                "created_at": now - timedelta(days=8),
                "updated_at": now - timedelta(days=7),
            },
            {
                "user_id": ObjectId(ws_pending_id),
                "business_name": "Kaveri Prints & Frames (QA)",
                "business_type": "print_shop",
                "gstin": "33AABCK5678B1Z2",
                "contact_name": "Kaveri Prints & Frames (QA Pending)",
                "contact_phone": "+919840100003",
                "contact_email": "wholesale.pending@theindiaframes.com",
                "business_address": {
                    "line1": "88 Bazaar Street",
                    "line2": "",
                    "city": "Bodinayakanur",
                    "district": "Theni",
                    "state": "Tamil Nadu",
                    "postal_code": "625513",
                    "country": "IN",
                },
                "proof_document": {
                    "provider": "local-private",
                    "asset_id": "qa-pending-proof.pdf",
                    "original_filename": "shop-registration-qa.pdf",
                    "mime_type": "application/pdf",
                    "uploaded_at": now - timedelta(days=1),
                },
                "status": "pending",
                "applicant_note": "Looking for bulk lamination rolls and MDF frames.",
                "owner_internal_note": None,
                "reviewed_by": None,
                "reviewed_at": None,
                "created_at": now - timedelta(days=1),
                "updated_at": now - timedelta(days=1),
            },
        ]
    )

    # 3. Seed Categories
    categories_seed = [
        {
            "name": "Photo Frames",
            "slug": "photo-frames",
            "description": "Designer MDF, synthetic, and teak-finish photo frames in standard studio sizes.",
            "sort_order": 1,
            "is_active": True,
            "seo_title": "Photo Frames | The India Frames",
            "seo_description": "Browse retail and wholesale photo frames in Cumbum, Tamil Nadu.",
        },
        {
            "name": "Lamination Machines",
            "slug": "lamination-machines",
            "description": "Commercial thermal and cold roll lamination machines for photo studios.",
            "sort_order": 2,
            "is_active": True,
            "seo_title": "Lamination Machines | The India Frames",
            "seo_description": "Commercial studio lamination machines and equipment.",
        },
        {
            "name": "Lamination Consumables",
            "slug": "lamination-consumables",
            "description": "Gloss, matte, velvet, and spark lamination roll films and pouches.",
            "sort_order": 3,
            "is_active": True,
            "seo_title": "Lamination Rolls & Films | The India Frames",
            "seo_description": "Velvet, matte, and gloss lamination film rolls for framing studios.",
        },
        {
            "name": "Glass & Backing",
            "slug": "glass-and-backing",
            "description": "Non-glare glass, clear glass, MDF backing boards, and frame hardware.",
            "sort_order": 4,
            "is_active": True,
            "seo_title": "Frame Glass & Backing Boards | The India Frames",
            "seo_description": "Framing glass sheets, MDF backs, and hanging accessories.",
        },
    ]

    cat_ids: dict[str, ObjectId] = {}
    for cat in categories_seed:
        doc = {**cat, "parent_id": None, "image": None, "created_at": now, "updated_at": now}
        res = await db.categories.insert_one(doc)
        cat_ids[cat["slug"]] = res.inserted_id

    # 4. Seed Products & Variants
    catalogue_seed = [
        {
            "category_slug": "photo-frames",
            "name": "Classic Teak Gold-Trim Frame",
            "slug": "classic-teak-gold-trim-frame",
            "base_sku": "TIF-FRM-001",
            "short_description": "Warm teak-grain synthetic moulding with subtle gold inner bead.",
            "description": (
                "Durable moisture-resistant moulding crafted for portraits, wedding "
                "photos, and certificates. Supplied with clear front glass and MDF back."
            ),
            "tags": ["frame", "teak", "gold", "portrait"],
            "is_featured": True,
            "variants": [
                {
                    "sku": "TIF-FRM-001-8X12",
                    "label": "8 × 12 inches",
                    "attributes": {"size": "8x12", "unit": "inch", "finish": "Teak Gold"},
                    "retail_price_paise": 35000,
                    "wholesale_price_paise": 22000,
                    "wholesale_moq": 10,
                    "availability": "available",
                },
                {
                    "sku": "TIF-FRM-001-12X18",
                    "label": "12 × 18 inches",
                    "attributes": {"size": "12x18", "unit": "inch", "finish": "Teak Gold"},
                    "retail_price_paise": 65000,
                    "wholesale_price_paise": 44000,
                    "wholesale_moq": 10,
                    "availability": "available",
                },
                {
                    "sku": "TIF-FRM-001-16X24",
                    "label": "16 × 24 inches",
                    "attributes": {"size": "16x24", "unit": "inch", "finish": "Teak Gold"},
                    "retail_price_paise": 115000,
                    "wholesale_price_paise": 82000,
                    "wholesale_moq": 5,
                    "availability": "available",
                },
            ],
        },
        {
            "category_slug": "photo-frames",
            "name": "Matte Black Gallery MDF Frame",
            "slug": "matte-black-gallery-mdf-frame",
            "base_sku": "TIF-FRM-002",
            "short_description": "Minimalist matte black flat profile for modern gallery walls.",
            "description": (
                "Clean straight-edge gallery moulding ideal for certificates, art "
                "prints, and monochrome photography."
            ),
            "tags": ["frame", "black", "matte", "gallery"],
            "is_featured": True,
            "variants": [
                {
                    "sku": "TIF-FRM-002-A4",
                    "label": "A4 (8.3 × 11.7 inches)",
                    "attributes": {"size": "A4", "finish": "Matte Black"},
                    "retail_price_paise": 28000,
                    "wholesale_price_paise": 17500,
                    "wholesale_moq": 12,
                    "availability": "available",
                },
                {
                    "sku": "TIF-FRM-002-12X18",
                    "label": "12 × 18 inches",
                    "attributes": {"size": "12x18", "finish": "Matte Black"},
                    "retail_price_paise": 58000,
                    "wholesale_price_paise": 39000,
                    "wholesale_moq": 10,
                    "availability": "available",
                },
            ],
        },
        {
            "category_slug": "lamination-machines",
            "name": "Heavy-Duty Thermal Roll Laminator 350mm",
            "slug": "heavy-duty-thermal-roll-laminator-350mm",
            "base_sku": "TIF-LAM-350",
            "short_description": "Dual-roller studio laminator with digital temperature control.",
            "description": (
                "Engineered for high-volume photo labs and framing shops. Supports "
                "both hot thermal films and cold pressure-sensitive rolls up to 350mm width."
            ),
            "tags": ["lamination", "machine", "studio", "thermal"],
            "is_featured": True,
            "variants": [
                {
                    "sku": "TIF-LAM-350-STD",
                    "label": "350mm Standard Model",
                    "attributes": {"width_mm": "350", "voltage": "220V"},
                    "retail_price_paise": 1850000,
                    "wholesale_price_paise": 1520000,
                    "wholesale_moq": 1,
                    "availability": "available",
                },
                {
                    "sku": "TIF-LAM-350-PRO",
                    "label": "350mm Pro Digital Dual-Heat",
                    "attributes": {"width_mm": "350", "voltage": "220V", "tier": "Pro"},
                    "retail_price_paise": 2450000,
                    "wholesale_price_paise": 2050000,
                    "wholesale_moq": 1,
                    "availability": "unavailable",
                },
            ],
        },
        {
            "category_slug": "lamination-consumables",
            "name": "Velvet Matte Lamination Roll Film",
            "slug": "velvet-matte-lamination-roll-film",
            "base_sku": "TIF-FLM-VLV",
            "short_description": "Soft-touch anti-glare velvet thermal film for wedding albums & frames.",
            "description": (
                "High-clarity BOPP velvet matte film with strong EVA adhesive layer. "
                "Eliminates harsh reflections on framed portraits."
            ),
            "tags": ["film", "velvet", "matte", "consumables"],
            "is_featured": True,
            "variants": [
                {
                    "sku": "TIF-FLM-VLV-12X100",
                    "label": "12 inch × 100 meter (28 mic)",
                    "attributes": {"width": "12 inch", "length": "100m", "micron": "28"},
                    "retail_price_paise": 145000,
                    "wholesale_price_paise": 112000,
                    "wholesale_moq": 4,
                    "availability": "available",
                },
                {
                    "sku": "TIF-FLM-VLV-18X100",
                    "label": "18 inch × 100 meter (28 mic)",
                    "attributes": {"width": "18 inch", "length": "100m", "micron": "28"},
                    "retail_price_paise": 210000,
                    "wholesale_price_paise": 168000,
                    "wholesale_moq": 4,
                    "availability": "available",
                },
            ],
        },
        {
            "category_slug": "glass-and-backing",
            "name": "Anti-Glare Framing Glass Sheet Pack",
            "slug": "anti-glare-framing-glass-sheet-pack",
            "base_sku": "TIF-GLS-AG",
            "short_description": "Etched non-reflective 2mm framing glass cut to standard sizes.",
            "description": (
                "Precision-cut 2mm non-glare float glass reducing studio glare while "
                "keeping photographic colours crisp."
            ),
            "tags": ["glass", "non-glare", "sheet"],
            "is_featured": False,
            "variants": [
                {
                    "sku": "TIF-GLS-AG-12X18",
                    "label": "12 × 18 inches (Pack of 5)",
                    "attributes": {"size": "12x18", "thickness": "2mm", "pack": "5 sheets"},
                    "retail_price_paise": 48000,
                    "wholesale_price_paise": 35000,
                    "wholesale_moq": 5,
                    "availability": "available",
                },
                {
                    "sku": "TIF-GLS-AG-16X24",
                    "label": "16 × 24 inches (Pack of 5)",
                    "attributes": {"size": "16x24", "thickness": "2mm", "pack": "5 sheets"},
                    "retail_price_paise": 85000,
                    "wholesale_price_paise": 64000,
                    "wholesale_moq": 5,
                    "availability": "available",
                },
            ],
        },
    ]

    sku_lookup: dict[str, tuple[str, str]] = {}
    for p in catalogue_seed:
        prod_doc = {
            "name": p["name"],
            "slug": p["slug"],
            "base_sku": p["base_sku"],
            "short_description": p["short_description"],
            "description": p["description"],
            "category_id": cat_ids[p["category_slug"]],
            "subcategory_id": None,
            "tags": p["tags"],
            "gallery": [],
            "is_featured": p["is_featured"],
            "is_active": True,
            "seo_title": f"{p['name']} | The India Frames",
            "seo_description": p["short_description"],
            "created_at": now - timedelta(days=5),
            "updated_at": now - timedelta(days=5),
        }
        prod_res = await db.products.insert_one(prod_doc)
        prod_id = str(prod_res.inserted_id)

        for v in p["variants"]:
            var_doc = {
                **v,
                "product_id": prod_res.inserted_id,
                "gallery": [],
                "is_active": True,
                "created_at": now - timedelta(days=5),
                "updated_at": now - timedelta(days=5),
            }
            var_res = await db.product_variants.insert_one(var_doc)
            sku_lookup[v["sku"]] = (prod_id, str(var_res.inserted_id))

    # 5. Seed Online Enquiries via EnquiryService (tests full snapshot logic)
    enquiry_service = EnquiryService(db)
    billing_service = BillingService(db)

    p1_id, v1_id = sku_lookup["TIF-FRM-001-12X18"]
    p2_id, v2_id = sku_lookup["TIF-FRM-002-A4"]
    p4_id, v4_id = sku_lookup["TIF-FLM-VLV-12X100"]
    p5_id, v5_id = sku_lookup["TIF-GLS-AG-12X18"]

    # Enquiry 1: Retail customer pending enquiry
    enq1 = await enquiry_service.create_enquiry(
        user_id=retail_id,
        payload=EnquiryCreateRequest(
            items=[
                {"product_id": p1_id, "variant_id": v1_id, "quantity": 2},
                {"product_id": p2_id, "variant_id": v2_id, "quantity": 3},
            ],
            customer_note="Need frames ready by Saturday evening for family function.",
            idempotency_key="qa-seed-enq-001",
        ),
    )

    # Enquiry 2: Approved wholesale customer enquiry -> Quoted & Partially Paid
    enq2 = await enquiry_service.create_enquiry(
        user_id=ws_approved_id,
        payload=EnquiryCreateRequest(
            items=[
                {"product_id": p1_id, "variant_id": v1_id, "quantity": 15},
                {"product_id": p4_id, "variant_id": v4_id, "quantity": 5},
            ],
            customer_note="Bulk order for studio stock replenishment.",
            idempotency_key="qa-seed-enq-002",
        ),
    )
    # Owner updates quote and status on Enquiry 2, then records a partial advance payment
    await db.enquiries.update_one(
        {"_id": ObjectId(enq2.id)},
        {
            "$set": {
                "quoted_total_paise": 1200000,  # ₹12,000 agreed quote
                "enquiry_status": "in_progress",
                "payment_summary.outstanding_paise": 1200000,
            },
            "$push": {
                "status_history": {
                    "status": "in_progress",
                    "changed_by": owner_id,
                    "changed_at": now,
                    "note": "Confirmed bulk quote ₹12,000 and started packing.",
                }
            },
        },
    )
    await billing_service.record_payment(
        source_type="enquiry",
        source_id=enq2.id,
        owner_id=owner_id,
        payload=PaymentCreateRequest(
            entry_type="receipt",
            amount_paise=500000,  # ₹5,000 advance
            method="upi",
            reference_number="UPI-QA-402199",
            notes="Advance payment received via UPI",
            idempotency_key="qa-seed-pay-enq2-1",
        ),
    )

    # 6. Seed Offline Counter Sales via BillingService
    # Offline Sale 1: Walk-in customer, paid in full via cash
    sale1 = await billing_service.create_offline_sale(
        owner_id=owner_id,
        payload=OfflineSaleCreateRequest(
            customer=OfflineSaleCustomerInput(
                name="Walk-in Counter Customer (QA)",
                phone="+919840199991",
            ),
            items=[
                OfflineSaleItemInput(
                    product_id=p1_id,
                    variant_id=v1_id,
                    quantity=2,
                    unit_price_paise=62500,  # Manual override ₹625 vs ₹650 retail (audited!)
                )
            ],
            discount_paise=5000,  # ₹50 discount -> Payable ₹1,200
            notes="Counter pickup with minor loyalty discount.",
        ),
    )
    await billing_service.record_payment(
        source_type="offline_sale",
        source_id=sale1.source_id,
        owner_id=owner_id,
        payload=PaymentCreateRequest(
            entry_type="receipt",
            amount_paise=120000,
            method="cash",
            notes="Full cash payment at counter",
            idempotency_key="qa-seed-pay-sale1-1",
        ),
    )

    # Offline Sale 2: Existing wholesale customer, 2 partial payments (still has balance)
    sale2 = await billing_service.create_offline_sale(
        owner_id=owner_id,
        payload=OfflineSaleCreateRequest(
            customer=OfflineSaleCustomerInput(customer_id=ws_approved_id),
            items=[
                OfflineSaleItemInput(
                    product_id=p5_id,
                    variant_id=v5_id,
                    quantity=4,
                    unit_price_paise=35000,
                ),
                OfflineSaleItemInput(
                    product_name="Custom Cut Mount Board",
                    variant_label="16 × 24 inches Cream",
                    quantity=10,
                    unit_price_paise=6000,
                ),
            ],
            discount_paise=0,
            notes="Urgent counter order for studio.",
        ),
    )
    await billing_service.record_payment(
        source_type="offline_sale",
        source_id=sale2.source_id,
        owner_id=owner_id,
        payload=PaymentCreateRequest(
            entry_type="receipt",
            amount_paise=100000,
            method="upi",
            reference_number="UPI-QA-551100",
            notes="First partial payment",
            idempotency_key="qa-seed-pay-sale2-1",
        ),
    )

    # Verify reconciliation is 100% clean
    report = await billing_service.reconcile_payments(owner_id=owner_id, repair=False)
    assert report.mismatched_records == 0, f"Reconciliation mismatch: {report}"

    print("\n=== QA DATASET SEEDED SUCCESSFULLY ===")
    print(f"Database: {settings.MONGODB_DB_NAME}")
    print("\n--- Accounts ---")
    for acc in QA_ACCOUNTS:
        uid = user_ids[acc["email"]]
        print(
            f"  [{acc['role_label']}] email={acc['email']} | password={acc['password']} | id={uid}"
        )
    print("\n--- Online Enquiries ---")
    print(f"  {enq1.enquiry_id} (id={enq1.id}) | Retail | Status={enq1.enquiry_status}")
    print(f"  {enq2.enquiry_id} (id={enq2.id}) | Wholesale | Quoted ₹12,000 | Paid ₹5,000")
    print("\n--- Offline Sales ---")
    print(f"  {sale1.reference_id} (id={sale1.source_id}) | Walk-in | Paid ₹1,200 (Full)")
    print(f"  {sale2.reference_id} (id={sale2.source_id}) | Lakshmi Studio | Payable ₹2,000 | Paid ₹1,000")
    print(
        f"\nReconciliation Check: {report.consistent_records}/{report.checked_records} consistent.\n"
    )

    await db_manager.disconnect()


if __name__ == "__main__":
    asyncio.run(seed_qa_dataset())
