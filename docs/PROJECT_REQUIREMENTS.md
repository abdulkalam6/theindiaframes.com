# Project Requirements — The India Frames

## 1. Project overview

The India Frames is a business based in Cumbum, Tamil Nadu, serving individual customers and business buyers. Its offerings include photo frames, framing materials, lamination machines and consumables, custom framing, digital printing, lamination, glass works, mirror solutions and personalised gifts.

The website must work as:

- A retail product catalogue with visible retail prices.
- A wholesale catalogue with wholesale prices restricted to owner-approved wholesale accounts.
- A multi-item cart and enquiry-submission workflow.
- A customer-account area for profile and enquiry history.
- An owner-only admin area for catalogue, wholesale and enquiry management.
- An owner-only billing area for online enquiry payments and offline sales.

The website does not process online payments in version one. The customer submits an enquiry; the business follows up and records receipts manually.

## 2. Business goals

1. Present the business as a credible destination for framing, printing, lamination and customised gifts.
2. Let retail customers find products, see retail prices, select variants and submit enquiries.
3. Let legitimate business buyers apply for wholesale access and see wholesale prices only after approval.
4. Support one enquiry containing multiple products, variants and categories.
5. Reduce manual product and enquiry administration through the owner dashboard.
6. Maintain a reliable record of online enquiries, offline sales, payment receipts and balances.
7. Improve discovery through responsive design, indexable product/category pages and local business information.

## 3. User types and permissions

### 3.1 Visitor

- Can view public pages and product/category details.
- Can see retail prices and public product availability.
- Can add products to a local cart without signing in.
- Cannot submit an enquiry until authenticated.
- Cannot see wholesale prices or private business information.

### 3.2 Retail customer

- Registers with email/password or Google sign-in.
- Can manage basic profile information.
- Sees retail prices only.
- Can submit enquiries and view their own enquiry history/details.
- Cannot see another customer's records or any wholesale-only information.

### 3.3 Wholesale applicant / pending account

- Has a normal customer account.
- Can submit a wholesale application with mandatory GSTIN, business details and proof document.
- Remains on retail pricing while the application is pending or rejected.
- Can see application status and any owner-provided rejection/revision note that is safe to disclose.

### 3.4 Approved wholesale customer

- Has all normal customer capabilities.
- Sees wholesale prices instead of retail prices while signed in and approved.
- Must satisfy the MOQ defined for each selected product variant.
- Can submit mixed-category enquiries at wholesale prices.
- Must not be able to grant approval to themselves or alter wholesale pricing.

### 3.5 Business owner

- Is the only administrator in version one.
- Uses one owner account for `/admin` and `/billing`.
- Manages products, variants, categories, wholesale applications, customers, online enquiries, business settings, billing and offline sales.
- Can record full and partial payments and view payment history.
- There is no public owner registration, employee login, staff role or multi-user permission matrix in version one.

## 4. Catalogue and product requirements

### 4.1 Main business categories

The initial catalogue should be able to represent:

1. Photo frames — ready-made, MDF, designer, calendar, devotional, 3D box, wedding/couple/family, certificate and artwork frames.
2. Frame accessories and materials — mouldings/profiles, MDF/backing boards, glass/glazing, hooks, hangers, stands and mounting accessories.
3. Lamination machines — photo, pouch, hot/cold, roll and professional equipment.
4. Lamination consumables — pouches, rolls, films, cold films, sheets, compatible rollers and spare parts.
5. Custom framing services.
6. Digital printing, poster printing, document/photo/certificate lamination, glass works and mirror solutions.
7. Personalised gifts.

The owner must be able to add, rename, reorder, activate and deactivate categories without code changes.

### 4.2 Product data

Each product should support:

- Product name, slug, SKU/base code and description.
- Main category and optional subcategory.
- Product card image and product gallery.
- Active/inactive and featured flags.
- Search keywords/tags where useful.
- SEO title and meta description (with sensible generation fallback).
- One or more variants.

### 4.3 Variant data

Each variant should support:

- Variant label and structured attributes (for example size, width, machine type or finish).
- Unique SKU.
- Retail price.
- Wholesale price.
- Wholesale minimum order quantity (MOQ).
- Variant-specific image/gallery (with product gallery fallback if no variant image exists).
- Availability status: `available` or `unavailable`.
- Active/inactive status.

A product must support both retail and wholesale customers. Wholesale prices are configured per variant. The system does not use tiered wholesale slabs in version one.

No numerical stock quantity is maintained in version one. Availability is a manually controlled status. When a variant is unavailable, customers must not be able to submit it in a new enquiry; the backend must validate this at submission time.

### 4.4 Product catalogue experience

- Browse by category and subcategory.
- Search by product name and relevant terms.
- Filter/sort where it improves discovery.
- View variant choices, images, prices appropriate to the signed-in customer and availability.
- Add an available variant to cart with a quantity.
- Display the applicable MOQ for approved wholesale customers.

### 4.5 Services

Custom framing, printing, lamination, glass works and mirror solutions must have informative service pages and a clear enquiry/contact action. Unless a later decision says otherwise, service offerings are not forced into the physical-product cart; provide a service enquiry form or WhatsApp contact CTA.

## 5. Account and authentication requirements

- Customers can register before browsing or when they reach enquiry submission.
- Visitors can browse and build a cart without an account.
- Cart contents must survive navigation and refresh using browser local storage.
- When the customer signs in/registers at checkout, retain the cart.
- Support email/password registration and Google sign-in.
- Email must be normalized for matching and uniqueness.
- Google identity tokens must be verified by the backend before issuing a local session.
- Public registration may create retail/wholesale-customer accounts only; it must never create an owner account.
- A single owner account must be provisioned through a secure setup/seed process, not a public registration endpoint.

## 6. Wholesale application requirements

A customer must be signed in before applying.

Mandatory application information:

- Business/legal name.
- GSTIN (mandatory).
- Business type/category.
- Business address and location.
- Primary contact name, phone and email.
- At least one business proof document.
- Applicant declaration that the information is accurate.

The precise accepted document types are an owner decision and must be configurable/documented. The proof document must be private and available only to the owner through authenticated access.

Application states:

- `pending`
- `approved`
- `rejected`

The owner can inspect details and the proof document, approve/reject, add an internal note and record the reviewer/time. A rejected customer remains a retail customer unless a future policy changes this. Reapplication policy should be configurable; do not silently overwrite an existing application history.

GSTIN syntax/format validation can be implemented. Do not claim that a GSTIN is officially verified unless a trusted GST verification service has actually been integrated. No such external verification integration is included in version one.

## 7. Cart and enquiry requirements

### 7.1 Cart

- Guest cart is allowed.
- Cart can contain multiple products and variants from multiple categories.
- Each line identifies a product and a specific variant.
- Customer can adjust quantity, remove a line and continue shopping.
- Duplicate additions of the same variant should normally merge into one line and update quantity.
- Cart is persisted in browser local storage.
- The browser's displayed total is provisional; backend re-prices and validates on submission.
- No payment or checkout gateway is included.

### 7.2 Submission gate

The customer must be authenticated before submitting an enquiry. The customer can register or log in at checkout. On successful authentication, return them to checkout with their cart intact.

### 7.3 Enquiry creation

On submission, the backend must:

1. Authenticate the customer.
2. Load product and variant records by ID.
3. Confirm the products/variants are active and available.
4. Determine customer price tier from server-side account status.
5. Apply retail price or approved wholesale price.
6. Validate positive quantities and wholesale MOQ.
7. Calculate totals using integer paise.
8. Save customer and product/variant/price snapshots.
9. Create a unique enquiry ID.
10. Store the enquiry before returning success.

The saved enquiry must remain stable if the live product name, image, price or variant changes later.

### 7.4 WhatsApp handoff

After a successful save, show an enquiry confirmation page and provide a WhatsApp action. Open a `wa.me` click-to-chat URL with a URL-encoded pre-filled message that contains the enquiry ID and concise product/quantity summary. The customer must manually press Send in WhatsApp. Do not claim that a WhatsApp message was sent or delivered automatically.

If the customer closes WhatsApp, the enquiry remains saved in the website.

## 8. Enquiry status requirements

Initial status: `pending`.

Owner-managed workflow:

`pending` → `contacted` → `quotation_sent` → `confirmed` → `completed`

Additional statuses: `rejected`, `cancelled`.

The owner may move between valid states where the business needs a correction (for example, return to `contacted` after a revised quote). Record every change in status history with timestamp, owner and optional note. Status is independent from payment status.

Suggested enquiry amount fields:

- `estimated_total_paise`: price-based total captured at submission.
- `quoted_total_paise`: optional owner-confirmed/negotiated final payable amount.
- `currency`: `INR`.

Billing should use `quoted_total_paise` when set; otherwise use the saved estimate as the provisional payable basis. The owner must be able to set/update the quoted total before or during billing. The exact tax treatment of these amounts remains unresolved and must not be guessed.

## 9. Admin requirements

Admin route: `/admin`.

Modules:

- Dashboard summary.
- Products and variants CRUD.
- Category/subcategory management.
- Product and variant media management.
- Retail and wholesale prices, MOQ and availability.
- Wholesale application review and approval.
- Customer search/details.
- Online enquiry list, filters, details, status and quotation amount.
- Website/business settings (phone, WhatsApp, address, email, opening hours, social links).
- Audit activity for sensitive changes.

The admin area may show the payment summary of each enquiry, but detailed payment entry/management is performed in `/billing`. Both read the same underlying data.

## 10. Billing requirements

Billing route: `/billing`; login page: `/billing/login`.

- Separate billing navigation and screen design.
- Same owner credentials and authorization as `/admin`.
- Unified listing of online enquiry records and offline sales.
- Filters by date range, source type, payment status and reference ID.
- Show original estimate, final quoted/payable amount, amount received and outstanding balance.
- Record multiple payment entries per source record.
- Support partial and full payments.
- Payment methods: cash, UPI, bank transfer, card and other (configurable list).
- Each entry stores amount, method, date/time, reference and notes.
- Offline sale creation with customer/walk-in details, multiple product variants, quantities and manually entered price adjustments where authorized.
- Offline sales use the same payment ledger and status calculation.
- Payment status: `unpaid`, `partially_paid`, `paid` (derived from payment ledger vs payable total).
- Do not delete/overwrite historical payment entries to correct an error; use an auditable reversal/adjustment.

## 11. Non-functional requirements

- Mobile-first responsive UX; desktop admin tables must remain usable on mobile.
- SEO-friendly server-rendered public content and product/category metadata.
- Accessible forms, keyboard navigation, semantic HTML and clear focus states.
- Fast image loading and responsive image sizing.
- Backend authorization and server-side validation for all sensitive operations.
- Structured logs without passwords, tokens or private document URLs.
- Automated tests for pricing, wholesale access, MOQ, enquiry snapshots and payment calculations.
- Health endpoint and production error monitoring strategy.
- Backup and restore process for MongoDB Atlas.

## 12. Out of scope for version one

- Online payment gateway/checkout.
- Automated WhatsApp Business API messages.
- Tiered wholesale pricing slabs.
- Quantity-based warehouse stock ledger.
- Staff/employee accounts or multiple admin roles.
- GST filing, automated tax reconciliation or tax advice.
- GST invoice/receipt generation until the owner confirms exact requirements.
- Bank statement/payment gateway reconciliation.
- Microservices/Kubernetes/Kafka/Redis without a proven need.

## 13. Acceptance criteria

The MVP is acceptable only when all of the following are demonstrated:

1. Visitor can browse categories/products and add variants from different categories to a cart.
2. Guest cart survives a browser refresh.
3. Customer is required to authenticate before enquiry submission.
4. Email/password and Google login work with backend verification.
5. Retail users never receive wholesale prices from any API response.
6. Pending/rejected wholesale users see retail prices; approved users see wholesale prices.
7. Wholesale application requires GSTIN, business details and a proof document.
8. Owner can approve/reject an application and the change takes effect on subsequent API requests.
9. Variant-specific retail/wholesale prices, images and availability can be managed in admin.
10. Backend revalidates availability, pricing and MOQ at enquiry submission.
11. Enquiry is saved before WhatsApp opens and includes immutable price/product snapshots.
12. Enquiry status history works independently of payment status.
13. Owner can use the same credentials to access `/admin` and `/billing`.
14. Billing displays online enquiries and offline sales without duplicating online enquiry records.
15. Owner can create an offline sale with multiple line items.
16. Multiple partial payment entries update the outstanding balance correctly.
17. Billing changes to an online enquiry's payment summary are reflected in admin.
18. Rejected/cancelled enquiry records remain available with their payment/audit history.
19. Two Railway services deploy from the monorepo and communicate with MongoDB Atlas.
20. No online payment gateway or automatic WhatsApp message sending is accidentally implemented.
