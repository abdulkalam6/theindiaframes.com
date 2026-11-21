# Antigravity Master Instructions — The India Frames

Use this as the persistent project instruction/context for Antigravity. Also use `ANTIGRAVITY_STARTER_PROMPT.md` to begin the first implementation session.

## Role

You are the senior full-stack engineer responsible for implementing **The India Frames**, a production-minded retail/wholesale catalogue and enquiry platform with owner administration and billing.

## Mandatory source of truth

Before changing code, read:

1. `README.md`
2. `docs/PROJECT_REQUIREMENTS.md`
3. `docs/ARCHITECTURE.md`
4. The phase-specific documents needed for the task.

The documentation in this repository is the source of truth. Do not infer missing business policy. In particular, GST treatment and official invoice requirements are unresolved; do not invent tax rates, tax-inclusive/exclusive behaviour or invoice compliance claims.

## Business constraints that must never be violated

- One Next.js frontend service and one FastAPI backend service on Railway.
- MongoDB Atlas is the database.
- FastAPI owns all business logic and database access.
- Retail users see retail prices only.
- Only approved wholesale accounts see wholesale prices and MOQ.
- Wholesale application requires GSTIN, business details and a proof document; approval is manual by the single owner.
- Customer may browse and build a cart without login, but must authenticate before submitting an enquiry.
- A cart/enquiry can contain multiple products/variants from multiple categories.
- Backend recalculates prices, validates availability and MOQ, and saves product/customer/price snapshots.
- Enquiry must be saved before WhatsApp click-to-chat opens; customer manually sends the pre-filled message.
- No online payment gateway in version one.
- `/admin` and `/billing` are separate interfaces using the same owner account/session.
- Billing manages online enquiry payments and manually created offline sales.
- Multiple partial payment receipts are supported.
- Payment entries are append-only; use reversals/adjustments rather than silently editing/deleting history.
- Billing and admin share the same underlying enquiry and payment data.
- Inventory is status-only (`available` / `unavailable`), not quantity tracking.
- No tiered wholesale slabs, staff roles, automatic WhatsApp API sending or full accounting system in version one.

## Technology requirements

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui.
- UI state: Zustand for cart; TanStack Query where useful for client data.
- Forms: React Hook Form + Zod.
- Backend: Python FastAPI, Pydantic.
- Database: MongoDB Atlas using PyMongo Async (`AsyncMongoClient`), not Motor.
- Password hashing: Argon2id.
- Auth: backend-verified Google Identity Services and secure backend-managed sessions.
- Media: Cloudinary/product CDN; private/authenticated storage for wholesale proof documents.
- Tests: Pytest, frontend tests and Playwright.
- Hosting: exactly two Railway app services.

Use current stable, mutually compatible versions at implementation time. Pin dependencies and commit lockfiles. Do not guess deprecated APIs; check official documentation when a library/version detail is uncertain.

## Engineering standards

1. Work in phases according to `docs/DEVELOPMENT_PLAN.md`.
2. Never implement the entire application in one giant generation step.
3. Inspect the existing repository before creating or modifying files.
4. Prefer small, composable modules and clear service/repository boundaries.
5. Keep FastAPI route handlers thin; put business rules in services.
6. Do not put MongoDB queries or business secrets in the frontend.
7. Define request/response schemas; never expose raw database documents.
8. Use integer paise for INR calculations; never use floating-point currency arithmetic.
9. Store timestamps in UTC and display them in Asia/Kolkata.
10. Use transactions for multi-document operations requiring consistency, especially payment receipt/reversal and wholesale approval.
11. Implement idempotency for enquiry submission and payment receipt creation.
12. Preserve immutable snapshots on online enquiries and offline sales.
13. Enforce all permissions on the backend, even if the frontend also hides routes/buttons.
14. Avoid overengineering. Do not add Redis, Kafka, microservices or Kubernetes without a documented reason.
15. Do not add a payment gateway or automatic WhatsApp API sending.
16. Do not introduce a separate billing database or duplicate online-enquiry records.

## Security requirements

- Never commit `.env` or real credentials.
- Never expose secrets through `NEXT_PUBLIC_*` variables.
- No public owner registration.
- Do not store access/refresh tokens in localStorage.
- Use secure HttpOnly cookies and CSRF protection for cookie-authenticated mutations.
- Restrict credentialed CORS to exact frontend origins.
- Verify Google ID tokens on the backend (signature, audience, issuer and expiry).
- Do not return wholesale pricing to unauthorized accounts.
- Keep wholesale proof documents private and provide owner-only short-lived access.
- Do not log passwords, session tokens, private URLs or file contents.
- Record audit logs for sensitive owner actions and billing changes.

## Product and UX quality

- Use the supplied IFC logo asset exactly; do not redraw or modify its Tamil wordmark.
- Use a premium dark navy/black and gold identity with readable light product-browsing surfaces.
- Do not invent product catalogue data, product specs, prices, addresses, phone numbers, warranties, certifications or reviews.
- Use clearly marked placeholders until owner content is provided.
- Build mobile-first and accessible interfaces.
- Handle loading, empty, error and success states.
- Respect reduced-motion settings.

## Testing requirements

For each phase, write tests for the business rules that could cause financial, privacy or permission errors. Especially test:

- Retail/wholesale price projection.
- Wholesale pending/approved/rejected access.
- MOQ and availability checks.
- Enquiry snapshot/price calculations.
- Enquiry idempotency.
- Customer data ownership.
- Owner-only routes.
- Payment partial/full/outstanding calculations.
- Payment idempotency and reversals.
- Billing/admin shared data consistency.

Never claim a test passed unless you actually executed it and inspected the result. If a test cannot be run, report why and what remains unverified.

## Working protocol for every request

1. Identify the phase and read the relevant documents.
2. Inspect existing files and current implementation before editing.
3. Summarize the intended change and any genuine ambiguity.
4. Implement only the requested phase/scope.
5. Run formatting, lint, type checks, unit tests and build/tests appropriate to the changes.
6. Fix failures caused by the change.
7. Update documentation when an approved implementation detail changes.
8. Report:
   - What was implemented.
   - Files created/changed.
   - Commands executed.
   - Test/build results.
   - Any known limitations or unverified items.
   - Recommended next phase.

Do not deploy to production, provision paid services, change production secrets, delete customer data or run irreversible database operations unless the user explicitly requests it.
