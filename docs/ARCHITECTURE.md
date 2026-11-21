# System Architecture — The India Frames

## 1. Architectural style

Use a **modular monolith** with two deployable application services:

1. Next.js frontend service.
2. FastAPI backend service.

MongoDB Atlas is the database. Cloudinary is the media platform. WhatsApp is a user-initiated click-to-chat handoff. No business microservices or separate billing backend are required.

The frontend must never connect directly to MongoDB. All business data access and business rules live in FastAPI.

## 2. Technology decisions

| Concern | Decision |
|---|---|
| Frontend | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Animation | Motion (formerly Framer Motion package ecosystem; pin a compatible release) |
| Client cart state | Zustand with localStorage persistence |
| Server/client data fetching | Next.js server-side fetch for public SEO pages; TanStack Query for interactive client data where useful |
| Forms | React Hook Form + Zod |
| Backend | Python + FastAPI |
| Validation | Pydantic |
| Database | MongoDB Atlas |
| MongoDB driver | PyMongo Async (`AsyncMongoClient`) |
| Authentication | Backend-managed session using secure cookies; Google Identity Services for federated login |
| Password hashing | Argon2id using a maintained library |
| Product media | Cloudinary or equivalent CDN/image service |
| Private proof documents | Private/authenticated object storage with short-lived signed access |
| Testing | Pytest, frontend unit tests, Playwright end-to-end tests |
| Python quality | Ruff and type checking |
| Frontend quality | ESLint, TypeScript checks and formatting |
| Hosting | Railway, two application services |

Do not use Motor for a new implementation. Use the PyMongo Async API and verify the pinned driver version against the current official documentation before implementation.

## 3. High-level topology

```text
Browser
  |
  | HTTPS
  v
Railway Service 1: Next.js frontend
  |  / public storefront
  |  /admin
  |  /billing
  |  /login and /register
  |
  | HTTPS REST API calls
  v
Railway Service 2: FastAPI backend
  |-- authentication and sessions
  |-- catalogue and pricing
  |-- wholesale application/review
  |-- enquiry creation and management
  |-- billing/offline sales/payment ledger
  |-- business settings and audit events
  |
  +---------------------> MongoDB Atlas
  |
  +---------------------> Cloudinary/private document storage
  |
  +---------------------> Google token verification
  |
  +---------------------> WhatsApp click-to-chat URL generated for browser
```

## 4. Frontend route boundaries

### Public/customer routes

- `/`
- `/products`
- `/products/[slug]`
- `/categories/[slug]`
- `/wholesale`
- `/services`
- `/personalised-gifts`
- `/cart`
- `/checkout`
- `/login`
- `/register`
- `/account`
- `/account/enquiries`
- `/account/enquiries/[enquiryId]`
- `/contact`
- `/about`

### Owner routes

- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]`
- `/admin/categories`
- `/admin/wholesale-applications`
- `/admin/customers`
- `/admin/enquiries`
- `/admin/enquiries/[enquiryId]`
- `/admin/settings`
- `/admin/audit-logs`
- `/billing/login`
- `/billing`
- `/billing/records/[recordId]`
- `/billing/offline-sales/new`
- `/billing/payments/[paymentId]` (optional detail route)

The billing login page is a distinct route and UX entry point but authenticates the same owner account. It is not a second owner identity system.

## 5. Backend module boundaries

Use `/api/v1` as the versioned API prefix. Suggested modules:

- `auth`: registration, email login, Google login, logout, session and current user.
- `users`: customer profile and customer record access.
- `catalogue`: public category/product/variant reads and admin CRUD.
- `media`: signed upload flows and private proof retrieval.
- `wholesale`: applications, application status and owner review.
- `enquiries`: customer submission/history and owner processing.
- `billing`: unified billing records, offline sales and payments.
- `settings`: owner-managed public business configuration.
- `audit`: audit event creation and owner audit queries.

Keep route handlers thin. Put business rules in service modules. Put database queries in repositories. Use Pydantic request/response schemas; do not expose raw MongoDB documents.

## 6. Pricing and authorization boundary

Price visibility and selection are backend responsibilities.

- Visitor/retail/pending/rejected: return retail price only.
- Approved wholesale: return wholesale price only (and MOQ).
- Owner: can manage both prices.

Do not send both retail and wholesale prices to a retail browser with the intention of hiding one using CSS or JavaScript. The API response itself must be filtered by the authenticated account's current approval status.

At enquiry submission, the backend reloads the product/variant records and determines the correct price tier from the server-side user record. The client does not choose its own price tier.

## 7. Cart and enquiry design

The cart is client-side in version one:

- Zustand store.
- localStorage persistence.
- Cart lines use product ID, variant ID and quantity; cached labels/images/prices are display conveniences only.
- No cart totals from the browser are authoritative.
- Login at checkout must preserve the local cart.
- On submit, FastAPI validates all lines, computes server-side amounts and writes one enquiry document containing line-item snapshots.

A database-backed cart is not required in version one. If later requested, add it as a deliberate enhancement rather than building it pre-emptively.

## 8. Enquiry and billing source of truth

- An online enquiry is stored once in `enquiries`.
- An offline sale is stored once in `offline_sales`.
- All receipts/reversals are stored in `payments` and reference the source record by type and ID.
- `/admin` reads enquiry/payment summary data.
- `/billing` reads a unified view of both source record types and manages payment entries.
- The admin UI and billing UI must never maintain independent payment-status copies.

The source record contains a denormalized payment summary for efficient lists, updated transactionally when a payment is recorded. Payment ledger entries remain authoritative and can be recomputed for reconciliation.

## 9. Enquiry amount model

At submit time, store an `estimated_total_paise` based on a server-side price snapshot. The owner can set `quoted_total_paise` as the negotiated/final amount. Billing uses the quoted amount when present; otherwise the original estimate is the provisional payable basis. Any tax treatment is explicitly pending owner confirmation.

If the owner changes a quoted amount after receipts exist, the system must recalculate outstanding balance and show an audit event. It must not mutate old payment entries.

## 10. Authentication/session design

Recommended model:

- FastAPI verifies credentials and issues secure, HttpOnly session cookies.
- Use separate short-lived access and refresh credentials if implementing refresh rotation.
- In production custom-domain deployment, frontend and API should be sibling subdomains (for example `theindiaframes.com` and `api.theindiaframes.com`) and cookie settings must be configured for that deployment.
- Set `Secure`, `HttpOnly`, appropriate `SameSite`, narrow path and deliberate cookie domain settings.
- Use CSRF protection on state-changing cookie-authenticated requests.
- Configure credentialed CORS for exact frontend origins only.
- In local development, configure allowed local frontend origins and cookie behaviour explicitly.
- Do not put session tokens in localStorage.

The backend must verify Google's signed ID token, audience, issuer and expiry before creating/linking a local account. Persist Google's stable `sub` identifier, not an email address as the identity key.

## 11. Image/media design

- Product images are uploaded through an authenticated owner-controlled flow.
- Prefer server-signed Cloudinary upload parameters or a backend-controlled upload endpoint; do not expose the Cloudinary API secret.
- Store provider asset IDs, URLs, dimensions, alt text and sort order in product/variant data.
- Product media can use public delivery URLs.
- Wholesale proof documents must use private/authenticated delivery. Never save a permanent public URL for a business proof document.

## 12. Error and observability strategy

- Standard JSON error envelope (see API specification).
- Include a request/correlation ID in logs and error responses.
- Log validation and business-rule failures at an appropriate level without logging secrets or private document payloads.
- Add `/health` for liveness and a deeper readiness check that tests database connectivity where appropriate.
- Report production exceptions to an error-monitoring service only after configuration is approved.

## 13. Architecture constraints

- Exactly two Railway application services in version one.
- No payment gateway.
- No automatic WhatsApp sending API.
- No separate billing backend or duplicate online-enquiry store.
- No numerical inventory stock system.
- No public owner registration.
- No tiered wholesale pricing.
- No implementation of GST calculations until confirmed.

## 14. Official technical references

- Next.js metadata and SEO APIs: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
- PyMongo Async migration and Motor deprecation guidance: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/reference/migration/
- PyMongo connection examples: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/
- Railway monorepo deployment: https://docs.railway.com/deployments/monorepo
- Railway build configuration/root directory: https://docs.railway.com/builds/build-configuration
- Google ID token server-side verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
