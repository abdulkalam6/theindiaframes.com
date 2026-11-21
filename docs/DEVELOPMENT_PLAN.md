# Development Plan — The India Frames

## 1. Delivery approach

Build the application incrementally. Antigravity must implement one phase at a time, run the relevant checks and report results before moving on. Never generate the entire application in one pass.

## 2. Phase 0 — Repository foundation and engineering standards

Deliver:

- Monorepo folders for `frontend`, `backend` and `docs`.
- Next.js App Router + TypeScript app scaffold.
- FastAPI app scaffold.
- Shared `.gitignore`, root README and environment examples.
- Frontend lint/typecheck/test/build scripts.
- Backend Ruff/typecheck/pytest configuration.
- `/health` and `/ready` backend endpoints.
- Database connection lifecycle abstraction using PyMongo Async.
- Centralized frontend API client configuration.
- No production business features yet.

Exit gate:

- Frontend install/lint/typecheck/test/build pass.
- Backend install/lint/typecheck/test pass.
- Local frontend and backend start.
- `/health` responds.
- No secrets committed.

## 3. Phase 1 — Design system and storefront shell

Deliver:

- Supplied IFC logo integration.
- Theme tokens and typography.
- Responsive header/footer/navigation.
- Homepage structure with clearly marked content placeholders.
- Category/product listing and detail page shells.
- Empty/loading/error states.
- Cart page shell and responsive patterns.

Exit gate:

- Mobile/desktop visual review.
- Accessibility basics and keyboard navigation checked.
- No fake customer/product/contact data presented as real.

## 4. Phase 2 — MongoDB and catalogue management

Deliver:

- Collections and indexes for users, categories, products and variants.
- Pydantic schemas and repository/service modules.
- Public category/product endpoints.
- Owner-only product/category/variant CRUD.
- Cloudinary product media upload workflow.
- Retail price projection and availability handling.

Exit gate:

- Product/variant CRUD tests pass.
- SKU uniqueness and variant relationship tests pass.
- Retail API does not expose wholesale price fields.

## 5. Phase 3 — Customer authentication

Deliver:

- Retail registration and email/password login.
- Google Identity Services login with backend ID-token verification.
- Secure session cookies, CSRF and logout/refresh lifecycle.
- Customer profile and protected customer route.
- Secure owner provisioning script/runbook.

Exit gate:

- Registration cannot create owner.
- Invalid Google ID tokens are rejected.
- Customer data ownership tests pass.
- Session security/CORS tests pass in local configuration.

## 6. Phase 4 — Wholesale application and approval

Deliver:

- Wholesale application UI.
- Mandatory GSTIN, business fields and proof upload.
- Private document storage and owner-only signed retrieval.
- Admin application review/approve/reject.
- User wholesale status update.
- Approval-gated price projection.

Exit gate:

- Pending/rejected accounts receive retail prices only.
- Approved accounts receive wholesale prices and MOQ.
- Customer cannot self-approve.
- Private proof documents cannot be accessed publicly.

## 7. Phase 5 — Cart and variant pricing

Deliver:

- Zustand cart with localStorage persistence.
- Mixed-category cart lines.
- Variant selection and images.
- Quantity changes and MOQ UX.
- Login/register return-to-checkout behaviour.
- Server-side cart validation/pricing endpoint if needed for review before final submit.

Exit gate:

- Cart survives refresh and login flow.
- Duplicate variant additions merge correctly.
- Retail/wholesale cart display matches current server account status.

## 8. Phase 6 — Enquiry submission and WhatsApp

Deliver:

- Authenticated enquiry creation endpoint.
- Backend availability, price-tier and MOQ validation.
- Immutable item/customer/price snapshots.
- Unique enquiry ID and idempotency.
- Customer enquiry history/detail.
- Confirmation page and pre-filled WhatsApp click-to-chat handoff.

Exit gate:

- Enquiry saved before WhatsApp opens.
- Repeated request with same idempotency key does not create duplicates.
- Historical snapshots survive product/price changes.
- WhatsApp does not claim automatic send/delivery.

## 9. Phase 7 — Owner admin and enquiry workflow

Deliver:

- Dashboard summary.
- Online enquiry list/detail.
- Enquiry status changes and status history.
- Owner quote amount updates.
- Customer lookup.
- Audit log views for relevant events.

Exit gate:

- Only owner can access admin APIs.
- Rejected/cancelled enquiries remain stored.
- Status and payment state are independent.

## 10. Phase 8 — Billing foundation and unified records

Deliver:

- `/billing` and `/billing/login`.
- Same owner authentication as admin.
- Unified list of online enquiries and offline sales.
- Billing summaries and filters.
- Payment record detail and source-type labels.
- `payments` ledger collection and indexes.

Exit gate:

- Customer cannot access billing APIs.
- Online enquiries are not duplicated into a billing collection.
- Billing accurately distinguishes online and offline records.

## 11. Phase 9 — Offline sales and partial payments

Deliver:

- Offline sale creation with multiple line items.
- Walk-in/existing customer capture.
- Manual price and discount adjustment with audit.
- Multiple payment receipts.
- Partial/full/unpaid calculations.
- Reversal workflow.
- Transactional payment summary updates and reconciliation.

Exit gate:

- Two partial payments produce correct received/outstanding values.
- Idempotency prevents duplicate receipts.
- Reversal preserves original receipt history.
- Admin reflects billing updates from shared records.

## 12. Phase 10 — SEO, quality, performance and security hardening

Deliver:

- Dynamic product/category metadata.
- Sitemap, robots and canonical URL strategy.
- Structured data where supported by accurate catalogue/business details.
- Responsive image optimization.
- Rate limiting, security headers and security tests.
- End-to-end Playwright tests.
- Error monitoring and structured logging configuration.

Exit gate:

- Acceptance tests in project requirements pass.
- No wholesale price leakage.
- No critical security or payment consistency issues.
- Mobile/desktop review completed.

## 13. Phase 11 — Railway and production release

Deliver:

- Two Railway services configured from the monorepo.
- MongoDB Atlas production connection.
- Cloudinary and Google production configuration.
- Custom domains, HTTPS, CORS and cookie settings.
- Health checks, backups and restore runbook.
- Owner account provisioned securely.
- Production seed/catalogue setup documented.

Exit gate:

- Both services deploy and pass health checks.
- End-to-end smoke test on production/staging domain.
- Backup and restore plan verified.
- Unresolved GST/invoice items are explicitly agreed as excluded or completed.

## 14. Definition of done for every phase

A phase is done only when:

1. Code matches the relevant requirements and API/data contracts.
2. Tests for the phase are added and pass.
3. Type/lint checks pass.
4. Loading, error, empty and success states are handled for user-facing work.
5. No secrets or real customer data are committed.
6. Documentation is updated if the implementation changes a contract.
7. Antigravity reports changed files, commands executed, test results, known gaps and the next recommended phase.

## 15. Change-control rule

If an implementation discovery conflicts with this documentation, stop before silently changing business behaviour. Explain the conflict and propose an option. For minor internal implementation choices that do not alter business behaviour, choose the simplest maintainable option and record it in the relevant architecture document.
