# Deployment Guide — Railway + MongoDB Atlas

## 1. Deployment target

Exactly two Railway application services are required in version one:

1. `frontend` — Next.js customer storefront, admin and billing interfaces.
2. `backend` — FastAPI REST API.

MongoDB Atlas, Cloudinary and Google Identity Services are external managed services, not additional Railway application deployments.

Suggested repository layout:

```text
the-india-frames/
├── frontend/
├── backend/
├── docs/
├── README.md
├── ANTIGRAVITY_MASTER_PROMPT.md
└── ANTIGRAVITY_STARTER_PROMPT.md
```

## 2. Railway monorepo setup

Create one Railway project and add two empty services connected to the same GitHub repository.

Configure:

| Setting | Frontend service | Backend service |
|---|---|---|
| Service name | `frontend` | `backend` |
| Root directory | `/frontend` | `/backend` |
| Runtime | Node.js / Next.js | Python / FastAPI |
| Public domain | `theindiaframes.com` (or `www`) | `api.theindiaframes.com` |
| Health check | Next.js health route if configured | `/health` or `/ready` |
| Watch path | `/frontend/**` and shared relevant files | `/backend/**` and shared relevant files |

Railway's monorepo configuration supports separate root directories for separate services. Ensure each service's root directory and watch paths are configured correctly so frontend-only changes do not unnecessarily redeploy the backend and vice versa.

Do not deploy a third standalone service for admin or billing. Those are routes within the frontend.

## 3. Frontend service

Build from `/frontend`.

Typical commands (adjust to the actual package manager/scripts created by the project):

```bash
npm ci
npm run build
npm run start
```

The Next.js process must listen on `0.0.0.0` and Railway's provided `PORT`. Use the framework's supported start command and confirm it in Railway logs. Do not assume a fixed production port.

Required environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.theindiaframes.com/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-web-client-id
```

Only publish values that are safe for browsers. Do not expose database URI, JWT secret, Cloudinary API secret or private signing keys as `NEXT_PUBLIC_*` variables.

If server components need a backend base URL, use a non-public `API_BASE_URL` variable where possible and keep it server-only.

## 4. Backend service

Build from `/backend`.

Typical install/start commands (adjust to package layout):

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Confirm the ASGI import path matches the actual application layout. The process must bind to `0.0.0.0` and Railway's injected port.

Required environment variables:

```env
APP_ENV=production
MONGODB_URI=your-mongodb-atlas-uri
DATABASE_NAME=the_india_frames
FRONTEND_ORIGINS=https://theindiaframes.com,https://www.theindiaframes.com
COOKIE_DOMAIN=.theindiaframes.com
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-web-client-id
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
WHATSAPP_BUSINESS_NUMBER=country-code-and-number
```

Add any session encryption/signing, CSRF, private-storage, email, logging or monitoring variables only when their implementation is selected. Keep secrets in Railway variables, not the repository.

Cookie domain settings must be adjusted for the actual production hostname. Do not use the production parent-domain cookie setting for unrelated preview domains. Local development should have a separate cookie/CORS configuration.

## 5. MongoDB Atlas

1. Create a production cluster/database.
2. Create a dedicated application database user with only the required database privileges.
3. Configure TLS/connection URI.
4. Configure the Atlas network access policy based on the actual Railway egress/networking setup and selected plan.
5. Do not blindly allow all IP addresses as a permanent default. If the selected Railway plan/networking cannot provide stable outbound IPs, document the chosen connectivity trade-off and compensate with least-privilege credentials, TLS, monitoring and secret rotation.
6. Create indexes through a controlled application initialization/index setup process.
7. Enable appropriate backups and document restore procedures.
8. Use separate development and production databases.

Use PyMongo Async (`AsyncMongoClient`) and create/close the client through FastAPI lifespan management. Validate connection readiness at startup or with a readiness endpoint.

## 6. Cloudinary/media configuration

- Configure product image uploads using server-signed upload parameters or a backend-controlled upload flow.
- Keep the Cloudinary API secret on the backend only.
- Product images may be publicly delivered through transformed CDN URLs.
- Wholesale proof documents must use private/authenticated delivery and short-lived owner-only access.
- Never put proof files in the frontend public directory.

## 7. Google sign-in configuration

- Register the production frontend origin with the Google Identity configuration.
- Configure the correct web client ID in frontend and backend.
- Send ID token to the FastAPI endpoint over HTTPS.
- Verify signature, audience, issuer and expiry on backend.
- Configure allowed origins and any required redirect/origin settings consistently for local, staging and production environments.

## 8. Domain and DNS

Suggested public structure:

- `theindiaframes.com` or `www.theindiaframes.com` → frontend Railway service.
- `api.theindiaframes.com` → backend Railway service.

Choose one canonical public web host and redirect the other (`www` or apex) consistently. Configure HTTPS certificates in Railway. Update CORS, Google sign-in origins and cookie settings after final domains are known.

## 9. Health checks and observability

Backend:

- `/health`: process is running.
- `/ready`: app can reach critical dependencies (including MongoDB) where appropriate.

Frontend:

- Provide a lightweight health route if required by Railway health checks.

Operational readiness:

- Structured application logs.
- Request IDs.
- No secret/PII leakage in logs.
- Error monitoring configured before production launch.
- Database backups enabled.
- Error/rollback procedure documented.

## 10. Environment separation

Maintain distinct configuration for:

- Local development.
- Staging (recommended before public launch).
- Production.

Do not point local or staging code at the production database. Do not reuse JWT secrets or Google/Cloudinary credentials unnecessarily across environments.

## 11. Deployment checklist

### Before first deployment

- [ ] Frontend and backend root directories are correct.
- [ ] `.gitignore` excludes `.env`, build output, node modules, caches and uploaded private files.
- [ ] `.env.example` contains placeholders only.
- [ ] Backend connects to the intended MongoDB Atlas database.
- [ ] Database indexes are created.
- [ ] Owner provisioning process is tested.
- [ ] Frontend API URL points to the backend service.
- [ ] CORS and cookie configuration match the selected domains.
- [ ] Cloudinary public/private asset rules are tested.
- [ ] Google sign-in audience and origins are correct.

### Before production launch

- [ ] Product and variant data reviewed by owner.
- [ ] Real business WhatsApp number and contact data configured.
- [ ] Wholesale application and proof document privacy tested.
- [ ] Wholesale price leakage tests pass.
- [ ] Enquiry idempotency tests pass.
- [ ] Payment idempotency, partial payment and reversal tests pass.
- [ ] Admin and billing use the same owner session.
- [ ] Offline sale flow tested.
- [ ] GST and invoice behaviour is either confirmed and implemented or clearly excluded from the launch.
- [ ] Backup/restore procedure tested.
- [ ] Mobile, desktop and SEO checks pass.
- [ ] HTTPS and domain redirects work.

## 12. Official references

- Railway monorepo deployment: https://docs.railway.com/deployments/monorepo
- Railway build configuration and root directories: https://docs.railway.com/builds/build-configuration
- Railway language/framework support: https://docs.railway.com/languages-frameworks
- Railway build/start command troubleshooting: https://docs.railway.com/deployments/troubleshooting/no-start-command-could-be-found
- MongoDB PyMongo connection: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/
- MongoDB PyMongo Async migration: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/reference/migration/
- Google ID token verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
