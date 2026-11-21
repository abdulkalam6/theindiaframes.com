# MongoDB Database Schema — The India Frames

## 1. Data conventions

- Database name: configurable, for example `the_india_frames`.
- MongoDB IDs: `ObjectId` for internal document identity.
- External references: human-readable IDs such as `TIF-2026-00001` for enquiries and `TIFS-2026-00001` for offline sales.
- Money: integer paise (for example ₹450.00 = `45000`). Never use floating-point types for currency.
- Currency: `INR`.
- Timestamps: UTC ISO dates stored as BSON Date values; UI converts to `Asia/Kolkata`.
- Soft deactivation: catalogue entities should generally use `is_active: false` rather than physical deletion where historical records reference them.
- Snapshot data: submitted enquiries and offline sales preserve item/customer/price details as they were when the record was created.

Names and fields below are the proposed implementation contract. Antigravity may refine internal implementation details but must not change business behaviour without updating these documents.

## 2. Collections overview

| Collection | Purpose |
|---|---|
| `users` | Retail customers, wholesale customers and the single owner identity |
| `wholesale_applications` | GSTIN, business details, private proof document and review history |
| `categories` | Product category hierarchy and display ordering |
| `products` | Product-level description, category, slug and gallery |
| `product_variants` | Variant-specific SKU, price, MOQ, media and availability |
| `enquiries` | Online cart submissions and customer enquiries |
| `offline_sales` | Owner-created shop-counter sales |
| `payments` | Immutable receipt/reversal ledger entries for either source type |
| `settings` | Public business settings and configurable options |
| `audit_logs` | Sensitive owner actions and important business changes |

## 3. `users`

Suggested document:

```json
{
  "_id": "ObjectId",
  "name": "Arun Kumar",
  "email": "arun@example.com",
  "email_normalized": "arun@example.com",
  "phone": "+91...",
  "account_type": "retail",
  "account_status": "active",
  "password_hash": "...",
  "google_sub": null,
  "wholesale_status": "not_applied",
  "created_at": "UTC date",
  "updated_at": "UTC date",
  "last_login_at": "UTC date"
}
```

Allowed `account_type`: `retail`, `wholesale`, `owner`.

Allowed `account_status`: `active`, `suspended`, `disabled`.

Allowed `wholesale_status`: `not_applied`, `pending`, `approved`, `rejected`.

Rules:

- Public registration can only create `retail` or wholesale-customer accounts; the public API must never accept `owner` as a requested account type.
- The owner identity is provisioned out-of-band with a secure one-time setup command/seed path.
- Normalize email to lowercase/trim before uniqueness checks.
- `google_sub` is a stable external identity; do not use email as the Google identity key.
- A user may have password authentication, Google authentication, or both if securely linked.
- Do not store plaintext passwords, Google ID tokens or session tokens.

## 4. `wholesale_applications`

Suggested document:

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "business_name": "Example Photo Studio",
  "business_type": "photo_studio",
  "gstin": "UPPERCASE_GSTIN",
  "contact_name": "Arun Kumar",
  "contact_phone": "+91...",
  "contact_email": "arun@example.com",
  "business_address": {
    "line1": "...",
    "line2": "...",
    "city": "...",
    "district": "...",
    "state": "Tamil Nadu",
    "postal_code": "...",
    "country": "IN"
  },
  "proof_document": {
    "provider": "cloudinary-or-private-storage",
    "asset_id": "private-asset-id",
    "original_filename": "proof.pdf",
    "mime_type": "application/pdf",
    "uploaded_at": "UTC date"
  },
  "status": "pending",
  "applicant_note": "...",
  "owner_internal_note": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at": "UTC date",
  "updated_at": "UTC date"
}
```

Rules:

- GSTIN is mandatory for an application.
- At least one business proof document is mandatory.
- Validate expected GSTIN format, but do not label it government-verified without a verification integration.
- Do not expose the private asset ID or a public document URL in public/customer APIs.
- Owner access to the document must use authenticated, short-lived delivery.
- Preserve prior/rejected applications when reapplication is supported. Decide whether a user may have multiple historical applications; do not overwrite audit history.
- Update the associated user's `wholesale_status` when the application state changes, preferably in one transaction.

## 5. `categories`

Suggested fields:

```json
{
  "_id": "ObjectId",
  "name": "Photo Frames",
  "slug": "photo-frames",
  "description": "...",
  "parent_id": null,
  "image": { "asset_id": "...", "url": "...", "alt": "..." },
  "sort_order": 10,
  "is_active": true,
  "seo_title": "...",
  "seo_description": "...",
  "created_at": "UTC date",
  "updated_at": "UTC date"
}
```

Support a parent/child hierarchy. Prevent creating cycles. Do not hard-delete categories used by products; reassign or deactivate them.

## 6. `products`

Suggested fields:

```json
{
  "_id": "ObjectId",
  "name": "MDF Designer Photo Frame",
  "slug": "mdf-designer-photo-frame",
  "base_sku": "MDF-001",
  "short_description": "...",
  "description": "...",
  "category_id": "ObjectId",
  "subcategory_id": null,
  "tags": ["mdf", "designer", "photo-frame"],
  "gallery": [
    { "asset_id": "...", "url": "...", "alt": "Front view", "sort_order": 0 }
  ],
  "is_featured": false,
  "is_active": true,
  "seo_title": "...",
  "seo_description": "...",
  "created_at": "UTC date",
  "updated_at": "UTC date"
}
```

Do not store authoritative variant prices only on the product. Variant prices belong in `product_variants`.

## 7. `product_variants`

Suggested fields:

```json
{
  "_id": "ObjectId",
  "product_id": "ObjectId",
  "sku": "MDF-001-12X18",
  "label": "12 × 18 inches",
  "attributes": { "size": "12x18", "unit": "inch" },
  "retail_price_paise": 65000,
  "wholesale_price_paise": 48000,
  "wholesale_moq": 10,
  "gallery": [
    { "asset_id": "...", "url": "...", "alt": "12x18 frame", "sort_order": 0 }
  ],
  "availability": "available",
  "is_active": true,
  "created_at": "UTC date",
  "updated_at": "UTC date"
}
```

Rules:

- SKU is unique.
- `retail_price_paise` and `wholesale_price_paise` are non-negative integer values; actual selling prices should normally be positive.
- `wholesale_moq` is a positive integer.
- Availability is `available` or `unavailable`; do not add stock quantity tracking in version one.
- If a variant is unavailable or inactive, prevent new enquiry submission for it.
- Wholesale price is returned only to an approved wholesale account or owner.
- If a wholesale price is not configured, owner must be prompted to configure it before enabling that variant for wholesale; do not fall back silently to retail price.
- Variant gallery can override or supplement the product gallery.

## 8. `enquiries`

Suggested document:

```json
{
  "_id": "ObjectId",
  "enquiry_id": "TIF-2026-00001",
  "customer_id": "ObjectId",
  "customer_snapshot": {
    "name": "Arun Kumar",
    "email": "arun@example.com",
    "phone": "+91...",
    "account_type_at_submission": "retail"
  },
  "pricing_tier": "retail",
  "items": [
    {
      "product_id": "ObjectId",
      "variant_id": "ObjectId",
      "sku": "MDF-001-12X18",
      "product_name": "MDF Designer Photo Frame",
      "variant_label": "12 × 18 inches",
      "variant_attributes": { "size": "12x18", "unit": "inch" },
      "image_snapshot_url": "...",
      "quantity": 10,
      "unit_price_paise": 65000,
      "line_total_paise": 650000
    }
  ],
  "currency": "INR",
  "subtotal_paise": 650000,
  "discount_paise": 0,
  "tax_amount_paise": null,
  "estimated_total_paise": 650000,
  "quoted_total_paise": null,
  "payment_summary": {
    "received_total_paise": 0,
    "outstanding_paise": 650000,
    "payment_status": "unpaid"
  },
  "enquiry_status": "pending",
  "status_history": [
    { "status": "pending", "changed_by": null, "changed_at": "UTC date", "note": null }
  ],
  "customer_note": null,
  "owner_note": null,
  "created_at": "UTC date",
  "updated_at": "UTC date"
}
```

Rules:

- Enquiry items and totals are server-calculated.
- Snapshot the customer's pricing tier, item labels, SKU, variant attributes and unit price at submission.
- Do not recalculate old enquiry item prices when the live product changes.
- `estimated_total_paise` is the total from the captured price snapshot, before any tax treatment not yet specified.
- `quoted_total_paise` may be set by the owner after discussions. If set, billing uses it as the payable basis.
- `payment_summary` is denormalized for display and must be updated transactionally when a payment entry is added/reversed. Ledger entries remain the source of truth.
- `payment_status` is independent from `enquiry_status`.
- Add idempotency support to enquiry creation to avoid duplicate submissions from repeated clicks/retries.

## 9. `offline_sales`

Suggested document:

```json
{
  "_id": "ObjectId",
  "sale_id": "TIFS-2026-00001",
  "customer": {
    "customer_id": null,
    "name": "Walk-in customer",
    "phone": null,
    "email": null
  },
  "items": [
    {
      "product_id": "ObjectId",
      "variant_id": "ObjectId",
      "sku": "MDF-001-12X18",
      "product_name": "MDF Designer Photo Frame",
      "variant_label": "12 × 18 inches",
      "quantity": 2,
      "unit_price_paise": 65000,
      "line_total_paise": 130000
    }
  ],
  "currency": "INR",
  "subtotal_paise": 130000,
  "discount_paise": 0,
  "tax_amount_paise": null,
  "payable_total_paise": 130000,
  "payment_summary": {
    "received_total_paise": 0,
    "outstanding_paise": 130000,
    "payment_status": "unpaid"
  },
  "sale_status": "recorded",
  "notes": null,
  "created_by": "owner ObjectId",
  "created_at": "UTC date",
  "updated_at": "UTC date"
}
```

Rules:

- Only owner can create/update offline sales.
- Customer may be selected from an existing customer record or captured as a walk-in snapshot.
- Offline sale line items are snapshots.
- Owner may enter an agreed manual price and discount; record the actor and audit the adjustment.
- The sale uses the same payment ledger as online enquiries.
- Avoid hard deletion; use a void/cancel state and audit trail.

## 10. `payments`

Suggested document:

```json
{
  "_id": "ObjectId",
  "payment_id": "TIFPAY-2026-00001",
  "source_type": "enquiry",
  "source_id": "ObjectId",
  "entry_type": "receipt",
  "amount_paise": 500000,
  "currency": "INR",
  "method": "upi",
  "reference_number": "UPI-REFERENCE-OPTIONAL",
  "paid_at": "UTC date",
  "notes": "Advance payment",
  "created_by": "owner ObjectId",
  "created_at": "UTC date",
  "idempotency_key": "unique-key"
}
```

Allowed `source_type`: `enquiry`, `offline_sale`.

Allowed `entry_type`: `receipt`, `reversal`.

Allowed `method`: `cash`, `upi`, `bank_transfer`, `card`, `other`.

Rules:

- Multiple receipts are allowed per source record.
- A reversal is a separate immutable ledger event linked to the original payment; never overwrite/delete the original receipt.
- Validate that the source record exists and belongs to the allowed source type.
- Validate positive receipt amounts and prevent receipts above the outstanding payable amount unless a future explicit advance/overpayment policy is approved.
- Use a transaction to insert the ledger event and update the source record's payment summary.
- Recompute net received amount from ledger entries when reconciling.
- A payment status is calculated: zero received = `unpaid`; some but less than payable = `partially_paid`; equal to payable = `paid`.
- If a source's payable amount changes after payments exist, show the new balance and write an audit log. Do not modify payment history. Do not allow the payable amount to be reduced below net receipts unless a separately approved refund/credit/overpayment workflow is implemented; version one should block this change and explain why.

## 11. `settings`

Use a singleton-style document or well-defined settings key. Suggested values:

- Business name and tagline.
- Business phone and WhatsApp number.
- Email.
- Full address and map URL/coordinates when supplied by the owner.
- Opening hours.
- Social profile URLs.
- Logo asset path/reference.
- Currency (`INR`).
- Supported payment methods.
- Public website SEO defaults.
- Optional future tax configuration — disabled/unset until confirmed.

Never store credentials or API secrets in this collection.

## 12. `audit_logs`

Suggested fields:

```json
{
  "_id": "ObjectId",
  "actor_user_id": "owner ObjectId",
  "action": "payment.receipt.created",
  "entity_type": "payment",
  "entity_id": "ObjectId",
  "before": {},
  "after": {},
  "request_id": "...",
  "ip_hash_or_safe_metadata": "...",
  "created_at": "UTC date"
}
```

Do not store passwords, access tokens, refresh tokens, private proof file contents or unnecessary personal data in audit logs. Audit at least product price/availability changes, wholesale decisions, enquiry status/quoted amount changes, offline sale changes, payment receipts/reversals and owner setting changes.

## 13. Recommended indexes

Create and test indexes deliberately:

- `users.email_normalized`: unique.
- `users.google_sub`: unique partial index when non-null.
- `users.account_type`, `users.wholesale_status`: for owner/customer filtering.
- `wholesale_applications.user_id`, `wholesale_applications.status`, `wholesale_applications.gstin` (consider normalized searchable value; restrict access).
- `categories.slug`: unique; `categories.parent_id` + `sort_order`.
- `products.slug`: unique; `products.category_id` + `is_active`; text/search index strategy selected for catalogue.
- `product_variants.sku`: unique; `product_variants.product_id` + `is_active`.
- `enquiries.enquiry_id`: unique; `customer_id` + `created_at`; `enquiry_status` + `created_at`.
- `offline_sales.sale_id`: unique; `created_at`.
- `payments.payment_id`: unique; `source_type` + `source_id` + `created_at`; unique `idempotency_key` where present.
- `audit_logs.entity_type` + `entity_id` + `created_at`; `created_at`.

Use pagination and avoid unbounded collection reads.

## 14. Transaction and consistency requirements

- Use MongoDB transactions for multi-document operations that must remain atomic, especially wholesale approval (application + user status) and payment receipt/reversal (ledger event + source payment summary).
- Confirm that the selected MongoDB Atlas deployment supports transactions in the intended configuration.
- Enquiry creation should use an idempotency key and one durable enquiry write. If any other related records are created, wrap the operation appropriately.
- Provide an owner reconciliation query/report that compares denormalized payment summaries with the sum of ledger entries.
- No destructive schema migration should drop historical enquiries, offline sales or payment records.

## 15. Tax fields — intentionally unresolved

`tax_amount_paise` is nullable and tax calculation is disabled until the owner confirms GST treatment. Do not assume that prices are GST-inclusive or GST-exclusive. Do not calculate a GST rate or generate official GST invoices based solely on the customer's GSTIN.
