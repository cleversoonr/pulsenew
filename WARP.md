# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Monorepo with two apps:
  - front/: Next.js (App Router) admin UI
  - api/: FastAPI service for admin features (plans, subscriptions, branding, quotas, organizations, tenants, invoices)

Common commands

Front-end (Next.js) — front/
- Install dependencies
```bash path=null start=null
npm install
```
- Start development server (http://localhost:3000)
```bash path=null start=null
npm run dev
```
- Build production bundle
```bash path=null start=null
npm run build
```
- Start production server (after build)
```bash path=null start=null
npm run start
```
- Lint
```bash path=null start=null
npm run lint
# If the script expects an explicit path, run:
# npx eslint .
```
- Configure API base URL used by the frontend
```bash path=null start=null
export NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Back-end (FastAPI) — api/
- Create virtualenv and install
```bash path=null start=null
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
- Run server (http://localhost:8080)
```bash path=null start=null
uvicorn app.main:app --reload --port 8080
```
- Health check and base path
```bash path=null start=null
GET http://localhost:8080/health
Base API prefix: /api
Admin routes prefix: /api/admin
```
- Database configuration (environment variables expected by the API)
```bash path=null start=null
export PGDATABASE={{your_db_name}}
export PGUSER={{your_db_user}}
export PGPASSWORD={{your_db_password}}
export PGHOST={{your_db_host}}
export PGPORT={{your_db_port}}
```

Tests
- Front-end: no test setup present in front/package.json.
- Back-end: tests are not yet configured; api/README.md suggests adding pytest (with a temporary database) in the future. Once pytest is configured, a single test example would look like:
```bash path=null start=null
pytest tests/test_something.py::TestClass::test_case -q
```

High-level architecture

Front-end (front/)
- App Router entry: app/admin/page.tsx wraps the admin UI in a TanStack Query provider.
- UI composition lives in components/, with feature shells like:
  - components/admin/admin-shell.tsx: Admin console orchestrating tabs for Overview, Plans, Branding, Quotas, Invoices. Forms use react-hook-form + zod validation; data formatted with date-fns.
  - components/dashboard/*: Layout and dashboard widgets (SideNav, TopBar, resizable panels, etc.).
- Data layer and API calls:
  - hooks/use-admin.ts: Encapsulates queries and mutations with React Query. Query keys are namespaced (e.g., ["admin","plans"]). Mutations invalidate relevant queries to keep UI consistent.
  - lib/admin-api.ts: Declares typed API methods for admin entities, all calling a shared client.
  - lib/api-client.ts: apiFetch() prefixes paths with NEXT_PUBLIC_API_BASE_URL (defaults to http://localhost:8080), serializes JSON, and throws ApiError on non-2xx responses.
  - lib/admin-types.ts: Frontend TypeScript types aligned with API response models (Plan, Organization, Subscription, Branding, QuotaUsage, Invoice, OrganizationSummary, etc.).
- Data flow
  UI components → hooks/use-admin (React Query) → lib/admin-api (endpoint paths) → lib/api-client (base URL + fetch) → FastAPI routes at /api/admin/*.

Back-end (api/)
- Entry and lifecycle
  - app/main.py: Creates FastAPI app, enables permissive CORS for development, mounts admin router at settings.api_prefix ("/api"). Exposes /health.
  - app/database.py: Async SQLAlchemy engine/session (asyncpg), dependency-injected AsyncSession via get_session(). Engine is disposed on app shutdown via lifespan context.
  - app/config.py: Pydantic Settings reads PG* environment variables and constructs postgresql+asyncpg URL. Also defines api_prefix ("/api").
- Domain layering
  - app/models/admin.py: SQLAlchemy models for PlanCatalog, Organization, Tenant, BillingSubscription, Invoice, TenantQuotaUsage, BrandingProfile and enums for plan tiers and statuses.
  - app/schemas/admin.py: Pydantic models for request/response (PlanCreate/Update/Out, SubscriptionAssign/Out, BrandingUpdate/Out, QuotaUsageIn/Out, OrganizationSummary, etc.). Numeric/Decimal normalization handled via validators.
  - app/services/admin.py: Business logic and DB access using SQLAlchemy select/delete, selectinload, upserts and summary composition (organization, plan/subscription, branding, quotas, invoices, tenants).
  - app/routers/admin.py: HTTP layer mapping to services. Routes include (prefixed by /api/admin):
    - Plans: GET /plans, POST /plans, PUT /plans/{plan_id}, DELETE /plans/{plan_id}
    - Organizations: GET /organizations, GET /organizations/{org_id}/tenants
    - Subscription: POST /organizations/{org_id}/subscription
    - Branding: GET/PUT /organizations/{org_id}/branding
    - Summary: GET /organizations/{org_id}/summary
    - Tenant quotas: GET /tenants/{tenant_id}/quotas, POST /tenants/{tenant_id}/quotas

Local development tips specific to this repo
- Start both services for end-to-end UI:
  1) Back-end (api/): run uvicorn on port 8080.
  2) Front-end (front/): set NEXT_PUBLIC_API_BASE_URL to http://localhost:8080, then run npm run dev.
- CORS is enabled for all origins in the API, so the Next.js dev server on port 3000 can call the API without additional setup.
