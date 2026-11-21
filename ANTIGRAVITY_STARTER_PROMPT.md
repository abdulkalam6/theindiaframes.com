# Antigravity Starter Prompt — The India Frames

Copy the complete prompt below into Antigravity after opening the `the-india-frames` project folder (the folder containing this file and `docs/`).

---

You are the senior full-stack engineer starting implementation of **The India Frames**.

## 1. First, understand the project

Before writing code, read these files completely:

- `README.md`
- `ANTIGRAVITY_MASTER_PROMPT.md`
- `docs/PROJECT_REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`

Then inspect the current workspace. Do not assume it is empty. Preserve existing useful work and avoid overwriting user files without understanding them.

## 2. Project goal

Build a premium retail + wholesale catalogue and enquiry website for The India Frames, based in Cumbum, Tamil Nadu. It sells photo frames, framing materials, lamination machines and consumables, and offers custom framing, printing, lamination, glass works and personalised gifts.

The platform includes:

- Customer storefront.
- Retail and approval-gated wholesale pricing.
- Product variants with individual price, image and availability.
- Guest multi-item/multi-category cart.
- Customer account required before enquiry submission.
- Email/password and Google login.
- Wholesale application with mandatory GSTIN, business information and proof document.
- Owner-only product/admin/enquiry management.
- Owner-only billing for online enquiries and manually entered offline sales.
- Partial payment recording with multiple receipts.
- WhatsApp click-to-chat with a pre-filled message after the enquiry is saved.

No online payment gateway is required. There are exactly two Railway application services: Next.js frontend and FastAPI backend. The database is MongoDB Atlas.

## 3. Required stack

Frontend:

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui
- Motion for purposeful animations
- Zustand for the cart with localStorage persistence
- TanStack Query where appropriate
- React Hook Form + Zod

Backend:

- Python + FastAPI
- Pydantic
- PyMongo Async (`AsyncMongoClient`), not Motor
- Argon2id password hashing
- Secure backend-managed session cookies
- Google Identity Services token verification on the backend

Testing/quality:

- Pytest
- ESLint and TypeScript checks
- Ruff
- Playwright for end-to-end tests in later phases

Hosting:

- Railway frontend service rooted at `/frontend`
- Railway backend service rooted at `/backend`
- MongoDB Atlas external database
- Cloudinary/product media storage; wholesale proof documents must be private

Use current stable compatible dependencies, pin them and commit lockfiles. Check official documentation when uncertain about a version-specific API.

## 4. Important business rules

Do not violate these rules:

1. Retail prices are visible to public/retail/pending/rejected accounts.
2. Wholesale prices are returned only to owner-approved wholesale accounts.
3. Wholesale applications require GSTIN, business details and a proof document.
4. One fixed wholesale price and MOQ are configured per product variant; no tiered slabs.
5. Product availability is status-only (`available` / `unavailable`); no numeric stock tracking.
6. Visitors may browse and add to cart without login, but must log in/register before submitting an enquiry.
7. A cart may contain multiple variants and categories.
8. FastAPI recalculates all prices/totals and validates availability/MOQ at submission.
9. Save the enquiry in MongoDB first; then open WhatsApp with a pre-filled message. The customer manually taps Send.
10. `/admin` and `/billing` are different interfaces using the same owner account/session.
11. Billing combines online enquiries and owner-entered offline sales without creating duplicate online-enquiry records.
12. Multiple partial payment entries are supported. Payment records are append-only; corrections use reversals/adjustments.
13. No online payment gateway or automatic WhatsApp Business API messaging in version one.
14. Use integer paise for all INR calculations.
15. GST treatment and official invoice requirements are unresolved. Do not invent tax rates, inclusive/exclusive behaviour or legal invoice claims.

## 5. Your assignment now: Phase 0 only

Implement **Phase 0 — Repository foundation and engineering standards** from `docs/DEVELOPMENT_PLAN.md`. Do not proceed to Phase 1 or implement catalogue/authentication/billing features yet.

### Phase 0 deliverables

A. Repository structure:

```text
the-india-frames/
├── frontend/
├── backend/
├── docs/
├── README.md
├── ANTIGRAVITY_MASTER_PROMPT.md
├── ANTIGRAVITY_STARTER_PROMPT.md
├── PHASE_PROMPT_TEMPLATE.md
└── .gitignore
```

Preserve the existing documentation files. If the current workspace is already the repository root, do not create an unnecessary nested `the-india-frames/the-india-frames` folder.

B. Frontend scaffold:

- Create a minimal Next.js App Router + TypeScript project in `frontend/`.
- Configure Tailwind CSS and ESLint using versions compatible with the chosen Next.js release.
- Set up a clean `src/` structure for `app`, `components`, `features`, `hooks`, `lib`, `services`, `stores`, `types` and `styles`.
- Add a minimal branded placeholder page that uses the supplied IFC logo if the asset exists in the workspace. If the logo is not present in the repository, leave a clearly documented expected path `frontend/public/logo/ifc-logo.png`; do not synthesize a replacement.
- Add a central API base URL configuration that reads `NEXT_PUBLIC_API_BASE_URL` safely.
- Add scripts for dev, build, start, lint, typecheck and test (a minimal test setup is acceptable in Phase 0).
- Do not create fake product data or functional admin/billing screens yet.

C. Backend scaffold:

- Create a minimal FastAPI project in `backend/` using a modular `app/` structure.
- Include `app/main.py`, `app/core/`, `app/database/`, `app/api/` and `tests/`.
- Add configuration management from environment variables.
- Add a database lifecycle abstraction using PyMongo Async (`AsyncMongoClient`) but make local startup/test behaviour explicit when `MONGODB_URI` is not configured. Do not hide a production database failure.
- Add `GET /health` and `GET /ready` endpoints.
- Add CORS configuration driven by explicit allowed origins from environment variables; never use wildcard credentials in production.
- Add Pydantic settings and a consistent error response foundation.
- Add dependency management (`pyproject.toml` preferred) with pinned/locked compatible dependencies.
- Add Ruff configuration and pytest setup.
- Do not implement real authentication, product CRUD or billing yet.

D. Root/project hygiene:

- Create/update root `.gitignore` for Python caches, virtual environments, Node modules, Next build output, coverage, `.env` and local uploads.
- Add `frontend/.env.example` and `backend/.env.example` with placeholder values only.
- Ensure no secret or actual credential is committed.
- Update root README with local setup commands for both services and a short architecture summary.
- Keep the documentation intact and fix internal relative links only if needed.

## 6. Required verification

Run the commands that the scaffold supports and actually inspect their results:

Frontend:

- install dependencies using the selected package manager
- lint
- typecheck
- test (if configured)
- production build

Backend:

- install dependencies in the available environment
- Ruff check
- type check if configured
- pytest
- start FastAPI and verify `/health` and `/ready` behaviour, including the documented no-database/local mode

If the environment does not have a required runtime or network access, do not pretend the command passed. Report it as not run and explain why.

## 7. Output/report required

When Phase 0 is complete, report:

1. The exact repository structure created.
2. Key dependency choices and versions.
3. Environment variables added (names only; never values/secrets).
4. Commands actually executed.
5. Lint/typecheck/test/build results.
6. Any issue or setup step requiring the developer.
7. Confirmation that no Phase 1+ business features were implemented.
8. A recommendation to proceed to Phase 1 only after the Phase 0 exit gate passes.

Do not deploy to Railway, create paid resources, alter production settings or create real production owner credentials as part of this starter task.

Start by inspecting the workspace and reading the project documents. Then implement Phase 0 only.

---
