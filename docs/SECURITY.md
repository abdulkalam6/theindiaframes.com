# Security Requirements — The India Frames

## 1. Security objectives

Protect customer accounts, owner operations, wholesale pricing, business proof documents, enquiry data and payment records. All access control must be enforced by FastAPI; frontend route guards are UX only.

## 2. Roles and authorization

Supported account classes:

- Visitor/unauthenticated.
- Retail customer.
- Wholesale customer with status pending, approved or rejected.
- Single owner.

There are no staff/employee roles in version one.

Rules:

- Public registration cannot create an owner.
- Owner account must be created by a secure one-time provisioning command or controlled setup procedure.
- All `/admin/*` and `/billing/*` endpoints require owner authorization.
- Customers can read only their own profile, applications and enquiries.
- Wholesale prices are returned only if server-side user status is currently approved.
- Wholesale approval/rejection is owner-only.
- The owner can access private business proof files through short-lived authenticated delivery.

## 3. Password and session security

- Hash passwords with Argon2id using a maintained library and safe parameters.
- Never log or store plaintext passwords.
- Set authentication cookies as `HttpOnly`, `Secure` in production, and an appropriate `SameSite` setting.
- Keep cookie domain/path narrowly configured for the chosen custom-domain topology.
- Do not store access or refresh tokens in localStorage.
- If using refresh tokens, rotate them and revoke a token family after reuse detection where practical.
- Clear cookies and revoke refresh/session state on logout.
- Add login throttling and progressive abuse protection.
- Use generic login errors so the endpoint does not reveal whether an email is registered.

## 4. CSRF and CORS

Cookie-authenticated state-changing requests need CSRF protection. Use a synchronizer or signed double-submit strategy appropriate to the session implementation. Validate Origin/Referer where appropriate as defence-in-depth.

CORS:

- Allow only the exact production frontend origin(s).
- Allow exact local development origin(s) in development.
- Enable credentials only for those origins.
- Never combine credentialed CORS with wildcard origin.
- Keep allowed methods and headers deliberate.

## 5. Google sign-in

- Use Google Identity Services in the frontend.
- Send the returned ID token to the backend over HTTPS.
- Verify its signature using Google's supported library/key process.
- Verify audience equals the configured web client ID, issuer is valid and expiry has not passed.
- Verify the GIS CSRF/double-submit value as required by the selected flow.
- Use `sub` as the stable Google identity identifier.
- Do not trust a client-submitted email or Google user ID without verifying the token.
- Avoid automatically linking an existing password account to a Google account using email alone; require a safe account-linking flow.

## 6. Wholesale data and price protection

- Never return wholesale price to retail/pending/rejected accounts.
- Re-check approval when reading protected pricing and when creating an enquiry.
- Validate GSTIN format server-side; do not claim official government validation without an integration.
- Do not expose proof-document URL/asset identifiers in customer/public APIs.
- Restrict document MIME types and size; reject executables and unexpected formats.
- Store proof documents privately and return only short-lived signed access to owner.
- Keep document access and approval actions in audit logs.

## 7. Product and enquiry integrity

- Treat client prices, totals, discount values and account type as untrusted.
- Recompute online enquiry prices on backend from product/variant records and verified customer tier.
- Validate product and variant belong together, are active and available.
- Enforce MOQ server-side.
- Use integer paise; reject floating-point money inputs.
- Snapshot item/customer/price information at enquiry creation.
- Use idempotency keys for create-enquiry operations.

## 8. Billing and payment integrity

- Owner-only access for billing endpoints.
- Never treat an unpaid enquiry as a payment.
- Payment receipt/reversal operations must be idempotent and transactional.
- Payment entries are append-only; no silent modification/deletion.
- Validate receipt against current outstanding amount unless an approved future overpayment/advance policy is implemented.
- Log every payment, reversal, amount change and offline sale adjustment.
- Do not accept payment status sent by the browser as authoritative.
- No card details or bank credentials are collected or stored.

## 9. File upload security

- Allow only configured MIME types and maximum file sizes.
- Validate extension and content type; do not rely only on filename.
- Use generated storage identifiers, not user-supplied paths.
- Scan files where supported/required by operational risk.
- Product image assets may have public delivery; wholesale proof documents must remain private/authenticated.
- Never place a private document in the Next.js `public` directory.
- Do not log signed private-document URLs.

## 10. Secrets and infrastructure

- Store secrets in Railway environment variables/secret management.
- Do not commit `.env`, credentials, database URIs, Google secrets, Cloudinary secrets or JWT secrets.
- Provide `.env.example` with placeholders only.
- Use a dedicated least-privilege MongoDB database user.
- Use TLS to MongoDB Atlas.
- Restrict database network access according to Railway's actual egress/networking configuration and the selected Atlas setup; do not assume an IP allow-list value without checking current deployment networking.
- Rotate compromised secrets immediately.
- Separate development/staging/production credentials and databases.

## 11. API and operational protections

- Rate-limit login, registration, password reset, Google login and upload-signing endpoints.
- Validate all payloads using Pydantic.
- Enforce request size limits and safe upload limits.
- Use parameterized/driver query construction; never build query operators directly from arbitrary client JSON.
- Avoid exposing stack traces or database exceptions.
- Use secure headers (HSTS on HTTPS, content type protection, frame policy, referrer policy and an appropriate CSP).
- Keep dependencies patched and pinned/locked.
- Add health and readiness endpoints without revealing secrets.

## 12. Audit requirements

Audit at minimum:

- Owner login/security events where appropriate.
- Wholesale approvals/rejections and proof document access.
- Product retail/wholesale price changes.
- MOQ and availability changes.
- Enquiry status and quoted amount changes.
- Offline sale creation/adjustment/void.
- Payment receipt and reversal.
- Website setting changes.

Audit logs must not contain passwords, access tokens, private document contents or unnecessary sensitive personal data.

## 13. Backup and recovery

- Enable an appropriate MongoDB Atlas backup strategy for the selected plan and business criticality.
- Document restore steps and periodically test a restore to a non-production database.
- Do not assume that code hosting backups are database backups.
- Keep product media asset identifiers and private document references recoverable.

## 14. Security acceptance checklist

- Retail user cannot get wholesale price through API inspection.
- Pending/rejected wholesale user cannot submit at wholesale price.
- Customer cannot read another customer's enquiry.
- Customer cannot call admin/billing endpoints successfully.
- Public registration cannot create owner.
- Google ID token is verified by FastAPI.
- CSRF/CORS configuration works with the deployed custom domains.
- Proof files are private and owner access is short-lived/authenticated.
- Payment entries cannot be duplicated by retry.
- Payment history cannot be silently edited/deleted.
- Secrets are absent from Git and client-side bundles.
