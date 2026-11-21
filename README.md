# The India Frames — Project Documentation

**Tagline:** Where Memories Become Art.  
**Business location:** Cumbum, Tamil Nadu, India.  
**Document status:** Baseline requirements and architecture for implementation.  
**Primary implementation tool:** Antigravity.  
**Last consolidated:** 21 November 2026.

This folder is the source of truth for building The India Frames website and its business-management features. Read the documents before implementing features. If a requirement is not specified, do not silently invent a business rule; record the uncertainty and ask for a decision or implement only a safe, reversible default.

## Product summary

The India Frames is a combined retail and wholesale photo-framing, framing-materials, lamination-equipment, printing, glass-work and personalised-gifting business. The website is a product-catalogue and enquiry platform with a multi-item cart. It does **not** take online payments in version one.

Customers can browse without signing in and add multiple products/variants to a local cart. They must create an account or sign in before submitting the cart as an enquiry. Retail customers see retail prices. Only admin-approved wholesale accounts can receive wholesale prices.

The owner uses `/admin` to manage the catalogue, wholesale applications and online enquiries. The owner uses `/billing` to manage payments against online enquiries and manually-entered offline sales. Both areas use the same owner account and the same backend/database; they are separate interfaces, not separate systems.

## Documentation index

| File | Purpose |
|---|---|
| [`docs/PROJECT_REQUIREMENTS.md`](docs/PROJECT_REQUIREMENTS.md) | Business goals, scope, actors, functional requirements and acceptance criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Application boundaries, deployment topology, major modules and key technical decisions |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | MongoDB collections, fields, relationships, indexes and consistency rules |
| [`docs/API_SPECIFICATION.md`](docs/API_SPECIFICATION.md) | REST API conventions, endpoint catalogue, authorization and payload expectations |
| [`docs/USER_FLOWS.md`](docs/USER_FLOWS.md) | Retail, wholesale, cart, enquiry, admin and billing workflows |
| [`docs/UI_UX_GUIDELINES.md`](docs/UI_UX_GUIDELINES.md) | Brand, visual system, page structure, responsive and accessibility guidelines |
| [`docs/BILLING_SYSTEM.md`](docs/BILLING_SYSTEM.md) | Online enquiry billing, offline sales, partial payments and reconciliation rules |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Authentication, authorization, document privacy, validation and audit requirements |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Railway two-service deployment, MongoDB Atlas, environment variables and release checklist |
| [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) | Phased delivery plan, gates and definition of done |
| [`ANTIGRAVITY_MASTER_PROMPT.md`](ANTIGRAVITY_MASTER_PROMPT.md) | Persistent project-level instructions for Antigravity |
| [`ANTIGRAVITY_STARTER_PROMPT.md`](ANTIGRAVITY_STARTER_PROMPT.md) | First prompt to paste into Antigravity to begin Phase 0 |
| [`PHASE_PROMPT_TEMPLATE.md`](PHASE_PROMPT_TEMPLATE.md) | Reusable prompt format for asking Antigravity to implement later phases |

## Confirmed decisions

- Frontend: Next.js App Router, React and TypeScript.
- Backend: Python FastAPI REST API.
- Database: MongoDB Atlas.
- MongoDB driver: PyMongo Async (`AsyncMongoClient`), not Motor.
- Hosting: two Railway application services only — frontend and backend.
- Media: Cloudinary for product media; private delivery/storage for wholesale verification documents.
- Retail: fixed retail price per product variant.
- Wholesale: mandatory GSTIN, business details and proof document; owner approval required; one wholesale price per variant plus MOQ.
- Product variants: independent price, image/gallery and availability status per variant.
- Inventory: status-only (`available` / `unavailable`); no numeric stock ledger in version one.
- Cart: mixed products/categories, guest cart in browser local storage; login required to submit.
- Customer authentication: email/password and Google sign-in.
- WhatsApp: save enquiry first, then open WhatsApp with a pre-filled message; customer manually taps Send.
- No online payment gateway in version one.
- Payments: owner manually records full or partial receipts; multiple payment entries supported.
- Billing: `/billing` has a distinct login screen but uses the same owner credentials and owner session as `/admin`.
- Offline sales: created manually inside billing.
- Admin: one business-owner account; no staff/employee role system in version one.

## Unresolved business decisions

1. GST treatment: whether displayed prices include GST, whether GST is added, applicable rates/tax categories, and how tax should be rounded.
2. Invoice/receipt compliance: whether official GST invoices, non-GST receipts, quotations or pro-forma documents are required and what fields/layout they need.
3. Final business contact details: WhatsApp number, phone, email, exact address, map pin, social URLs and opening hours.
4. Product catalogue data: final categories, product names, SKUs, descriptions, variants, prices, MOQs, images and availability.
5. Wholesale proof policy: exact acceptable documents (for example GST certificate, shop registration, business card or other evidence).
6. Whether customer-facing website content should be English-only initially or fully bilingual (English/Tamil). The supplied logo includes Tamil lettering; that alone does not establish a bilingual UI requirement.
7. Whether owner needs printable quotations/receipts in the first release.

Do not implement tax calculations, GST invoice generation or legal tax statements until the owner confirms the relevant rules. Keep the model extensible so tax fields can be added without changing the basic payment ledger.

## Brand asset handoff

Use the IFC logo image supplied in the conversation as the exact logo asset. Do not recreate, rewrite, crop away, recolour or replace the Tamil wordmark. Place a clean copy in `frontend/public/logo/ifc-logo.png` when setting up the repository. The visual guidelines document defines the website palette around the supplied dark navy/black and gold identity.

## Global implementation rules

1. The FastAPI backend is the authority for authentication, authorization, product availability, price selection, MOQ validation, enquiry totals and payment calculations.
2. Never trust prices, totals, account type, wholesale approval or owner identity sent by the browser.
3. Do not return wholesale prices to retail, pending or rejected accounts — not even as hidden JSON fields.
4. Never store payment-card data. There is no payment gateway in version one.
5. Never overwrite or delete payment history to correct it. Use a recorded reversal/adjustment with an audit trail.
6. Preserve immutable product/customer/price snapshots on submitted enquiries and offline sales.
7. Use INR and integer paise for money calculations; do not use binary floating-point for currency.
8. Use UTC timestamps in storage and convert to the user's local display timezone (`Asia/Kolkata`) in the UI.
9. All owner operations must be authorized by the backend, not merely hidden in the frontend.
10. Keep the first release as a modular monolith: one Next.js frontend service, one FastAPI backend service and MongoDB Atlas. Do not introduce microservices, Kubernetes, Kafka or Redis without a demonstrated requirement.


## Local Development & Setup

### Architecture Overview

- **Frontend**: Next.js App Router (TypeScript + Tailwind CSS) located in `frontend/`.
- **Backend**: Python FastAPI REST API with PyMongo Async (`AsyncMongoClient`) located in `backend/`.
- **Database**: MongoDB Atlas (external managed cluster; optional in local mode for Phase 0).

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run dev
```

Runs on [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` to configure `NEXT_PUBLIC_API_BASE_URL`.

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Unix/macOS:
source .venv/bin/activate

pip install -r requirements.txt
ruff check app tests
pytest
python -m uvicorn app.main:app --reload --port 8000
```

Runs on [http://localhost:8000](http://localhost:8000).
- Health check: `GET http://localhost:8000/health`
- Readiness check: `GET http://localhost:8000/ready` (reports `unconfigured_local_mode` when `MONGODB_URI` is omitted).
