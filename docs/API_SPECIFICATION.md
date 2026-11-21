# REST API Specification — The India Frames

## 1. Conventions

- Base path: `/api/v1`.
- Content type: `application/json` unless uploading a file.
- Authentication: backend-managed secure cookies; browser requests include credentials.
- All owner-only endpoints require an authenticated owner account.
- All IDs in URLs are serialized as strings.
- Dates are ISO 8601 UTC.
- Money is integer paise and currency is `INR`.
- Pagination: `page` and `page_size` or a cursor model; enforce a maximum page size.
- Use request IDs/correlation IDs for diagnostics.
- Do not expose raw MongoDB documents or wholesale-only price fields to unauthorized users.

## 2. Standard response envelope

Success responses may use direct resource objects or a consistent envelope. Recommended envelope:

```json
{
  "data": {},
  "meta": { "request_id": "..." }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "details": [{ "field": "items[0].quantity", "issue": "Must satisfy the minimum order quantity." }]
  },
  "meta": { "request_id": "..." }
}
```

Do not return stack traces, database errors, secrets or internal document paths to clients.

## 3. Authentication endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create retail customer account; optional registration intent may start wholesale application but cannot grant approval |
| POST | `/auth/login` | Public | Email/password login |
| POST | `/auth/google` | Public + Google credential | Verify Google ID token and create/login local account |
| POST | `/auth/logout` | Authenticated | Revoke session/refresh token and clear cookies |
| POST | `/auth/refresh` | Valid refresh cookie | Rotate/refresh session |
| GET | `/auth/me` | Authenticated | Return current account and server-derived capabilities |
| POST | `/auth/password/forgot` | Public | Optional password reset initiation |
| POST | `/auth/password/reset` | Valid reset token | Complete password reset |

Registration must never accept `account_type=owner`. Google login must be verified by FastAPI, including signature, audience, issuer and expiry. The Google `sub` claim is the stable identity key.

The billing login UI calls the same `/auth/login` endpoint and then checks that the current account is the owner. It does not use a separate authentication system.

## 4. Public catalogue endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/categories` | Public | Active category tree |
| GET | `/categories/{slug}` | Public | Category detail and metadata |
| GET | `/products` | Public | Search/filter/sort/paginated catalogue |
| GET | `/products/{slug}` | Public | Product detail with authorized price projection |

Price projection rules:

- Visitor: retail price only.
- Retail, pending wholesale or rejected wholesale: retail price only.
- Approved wholesale: wholesale price and MOQ only (no retail price unless owner later explicitly asks to show both).
- Owner: may receive both.

Do not expose a wholesale price in a generic unfiltered product JSON that the browser merely hides.

Suggested product list filters: `category`, `subcategory`, `q`, `featured`, `sort`, `page`, `page_size`.

## 5. Customer profile endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/customers/me` | Customer | Read own profile |
| PATCH | `/customers/me` | Customer | Update allowed profile fields |
| GET | `/customers/me/enquiries` | Customer | List own enquiries |
| GET | `/customers/me/enquiries/{enquiry_id}` | Owner of enquiry | Read own enquiry detail |

Never allow a customer to submit another user's ID as an authorization shortcut. Resolve customer identity from the session.

## 6. Wholesale endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/wholesale/applications` | Authenticated customer | Submit application with mandatory GSTIN/business data/proof upload reference |
| GET | `/wholesale/applications/me` | Authenticated customer | View own current/recent application status |
| POST | `/wholesale/applications/{id}/documents` | Authenticated applicant | Upload/attach proof using a secure upload flow if upload is separate |
| GET | `/admin/wholesale-applications` | Owner | Filter/list applications |
| GET | `/admin/wholesale-applications/{id}` | Owner | View application details |
| GET | `/admin/wholesale-applications/{id}/proof` | Owner | Obtain short-lived private proof document access |
| POST | `/admin/wholesale-applications/{id}/approve` | Owner | Approve and update user wholesale status |
| POST | `/admin/wholesale-applications/{id}/reject` | Owner | Reject and record reason/note |

GSTIN and proof document are mandatory. No public endpoint may set wholesale status to approved.

## 7. Enquiry endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/enquiries` | Authenticated customer | Submit a multi-line cart as one enquiry |
| GET | `/enquiries/me` | Authenticated customer | List own enquiries |
| GET | `/enquiries/me/{enquiry_id}` | Owner of enquiry | Read own enquiry |
| GET | `/admin/enquiries` | Owner | Search/filter all online enquiries |
| GET | `/admin/enquiries/{enquiry_id}` | Owner | Full detail, snapshots and payment summary |
| PATCH | `/admin/enquiries/{enquiry_id}/status` | Owner | Change enquiry lifecycle state and append history |
| PATCH | `/admin/enquiries/{enquiry_id}/quote` | Owner | Set/update owner-confirmed payable amount and note |

Suggested create payload:

```json
{
  "items": [
    { "product_id": "...", "variant_id": "...", "quantity": 10 },
    { "product_id": "...", "variant_id": "...", "quantity": 2 }
  ],
  "customer_note": "Please contact me about bulk availability.",
  "idempotency_key": "client-generated-unique-value"
}
```

The backend ignores client-supplied prices/totals/account tier if sent. It reloads products/variants, determines the correct price, validates availability/MOQ and calculates the total.

The response includes the new enquiry ID, snapshots and server-calculated totals. The frontend then builds the WhatsApp click-to-chat URL from the confirmed response and configured business WhatsApp number.

## 8. Admin catalogue endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/admin/categories` | Owner | Create category |
| PATCH | `/admin/categories/{id}` | Owner | Update category |
| DELETE | `/admin/categories/{id}` | Owner | Prefer deactivate; reject deletion if referenced |
| POST | `/admin/products` | Owner | Create product |
| GET | `/admin/products` | Owner | List products including admin pricing fields |
| GET | `/admin/products/{id}` | Owner | Full product and variants |
| PATCH | `/admin/products/{id}` | Owner | Update product |
| POST | `/admin/products/{id}/variants` | Owner | Add variant |
| PATCH | `/admin/variants/{variant_id}` | Owner | Update price, MOQ, media, availability and active status |
| POST | `/admin/media/sign-upload` | Owner | Obtain signed product-media upload parameters |

All catalogue mutations must validate price, category references, unique SKUs, MOQ and media metadata. Log price and availability changes.

## 9. Billing endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/billing/records` | Owner | Unified list of online enquiries and offline sales |
| GET | `/billing/records/{source_type}/{source_id}` | Owner | Unified billing detail for one record |
| GET | `/billing/summary` | Owner | Totals, received, outstanding and counts for a date range |
| POST | `/billing/offline-sales` | Owner | Create offline sale with multi-line items and customer/walk-in details |
| PATCH | `/billing/offline-sales/{id}` | Owner | Correct editable sale fields subject to audit/payment safeguards |
| POST | `/billing/records/{source_type}/{source_id}/payments` | Owner | Record a receipt or reversal |
| GET | `/billing/records/{source_type}/{source_id}/payments` | Owner | List payment history |
| GET | `/billing/payments` | Owner | Search/filter payment ledger |

Suggested receipt payload:

```json
{
  "entry_type": "receipt",
  "amount_paise": 500000,
  "method": "upi",
  "paid_at": "2026-11-21T05:30:00Z",
  "reference_number": "optional-reference",
  "notes": "Advance payment",
  "idempotency_key": "unique-value"
}
```

Suggested offline sale payload:

```json
{
  "customer": {
    "name": "Walk-in customer",
    "phone": null,
    "email": null
  },
  "items": [
    { "product_id": "...", "variant_id": "...", "quantity": 2, "unit_price_paise": 65000 }
  ],
  "discount_paise": 0,
  "notes": "Counter sale"
}
```

For offline sales, unit price may be owner-entered/overridden; the backend must still validate integer money values and record an audit event for deviations from catalogue price. Online enquiry payment records must reference the existing enquiry; do not create a second billing copy of the enquiry.

## 10. Settings endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/settings/public` | Public | Business phone, WhatsApp, address, hours, social links and public SEO settings |
| GET | `/admin/settings` | Owner | Full editable settings |
| PATCH | `/admin/settings` | Owner | Update business settings |

Never return private API secrets from settings.

## 11. Health endpoints

- `GET /health`: process liveness.
- `GET /ready`: readiness including database availability where appropriate.

Do not expose connection strings, internal hostnames or detailed infrastructure credentials in health responses.

## 12. Validation and authorization requirements

- Validate all request bodies with Pydantic.
- Enforce positive integer quantities and integer-paise money.
- Enforce availability and MOQ on the backend.
- Derive current user, owner privilege and wholesale approval from session/database state.
- Verify ownership for customer enquiry/profile endpoints.
- Require owner on all `/admin/*` and `/billing/*` endpoints.
- Use rate limiting for authentication, registration, password reset and upload-signature endpoints.
- Use idempotency keys on enquiry creation and payment recording.
- CORS must allow exact approved frontend origins and credentials only; do not use wildcard origin with credentials.

## 13. Tax and invoice API boundary

Do not add tax-calculation endpoints, GST rate logic or official invoice generation until tax treatment and invoice requirements are confirmed. Keep monetary schemas extensible for future tax breakdowns.
