# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**PulseHub** is a multi-tenant "second brain" for product teams that organizes information by project and context from meetings, manual inputs, and documents, generating actionable insights and automated updates.

This is a monorepo with two main applications:
- **front/**: Next.js 15 (App Router) admin and dashboard UI
- **api/**: FastAPI service for admin features (plans, subscriptions, branding, quotas, organizations, tenants, invoices)

## Common Development Commands

### Frontend (front/)

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build production bundle
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

Configure the API base URL:
```bash
export NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### Backend (api/)

```bash
# Create virtual environment and install dependencies
cd api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run development server (http://localhost:8080)
uvicorn app.main:app --reload --port 8080
```

Database configuration (set these environment variables):
```bash
export PGDATABASE=pulsehub
export PGUSER=your_db_user
export PGPASSWORD=your_db_password
export PGHOST=your_db_host
export PGPORT=5432
```

Health check: `GET http://localhost:8080/health`

API routes are prefixed with `/api`, admin routes with `/api/admin`.

### Full-Stack Development

To run the complete application:
1. Start the backend API on port 8080
2. Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
3. Start the frontend dev server on port 3000

CORS is enabled for all origins in development, allowing seamless communication between services.

## Architecture

### Frontend Stack ([front/](front/))

**Core Framework:**
- Next.js 15 (App Router) + TypeScript + React 19
- Tailwind CSS 4 + shadcn/ui (Radix Primitives)

**Key Libraries:**
- **Data fetching:** TanStack React Query
- **Forms:** React Hook Form + Zod validation
- **Tables:** AG Grid Community (dense lists, inline editing)
- **Collaboration:** Tiptap + Yjs (real-time collaboration)
- **Drag & Drop:** dnd-kit
- **Calendar:** FullCalendar
- **Command Palette:** cmdk
- **Charts:** Recharts
- **Date utilities:** date-fns

**Application Structure:**
- [app/layout.tsx](front/app/layout.tsx): Root layout with Geist fonts and dark mode
- [app/admin/page.tsx](front/app/admin/page.tsx): Admin console entry point
- [app/meetings/page.tsx](front/app/meetings/page.tsx): Meetings management
- [components/admin/admin-shell.tsx](front/components/admin/admin-shell.tsx): Main admin UI with tabs for Overview, Plans, Branding, Quotas, Invoices
- [components/dashboard/](front/components/dashboard/): Dashboard widgets (SideNav, TopBar, PulseSummary, InsightStream, etc.)
- [components/ui/](front/components/ui/): shadcn/ui primitives

**Data Layer:**
- [hooks/use-admin.ts](front/hooks/use-admin.ts): React Query hooks for admin API (queries/mutations with proper invalidation)
- [hooks/use-meetings.ts](front/hooks/use-meetings.ts): React Query hooks for meetings API
- [lib/admin-api.ts](front/lib/admin-api.ts): Typed API methods for admin entities
- [lib/meetings-api.ts](front/lib/meetings-api.ts): Typed API methods for meetings
- [lib/api-client.ts](front/lib/api-client.ts): Base HTTP client with `apiFetch()` helper (prefixes `NEXT_PUBLIC_API_BASE_URL`, handles JSON, throws `ApiError` on failures)
- [lib/admin-types.ts](front/lib/admin-types.ts): TypeScript types for admin domain (Plan, Organization, Subscription, Branding, QuotaUsage, Invoice, etc.)
- [lib/meetings-types.ts](front/lib/meetings-types.ts): TypeScript types for meetings domain

**Data Flow:**
UI Components → React Query Hooks ([hooks/](front/hooks/)) → API Methods ([lib/\*-api.ts](front/lib/)) → API Client ([lib/api-client.ts](front/lib/api-client.ts)) → FastAPI routes at `/api/*`

### Backend Stack ([api/](api/))

**Core Framework:**
- FastAPI + Pydantic v2
- PostgreSQL 16+ with pgvector, pg_trgm, Full-Text Search
- SQLAlchemy 2 (async) + Alembic (migrations)
- Workers: Celery/RQ + Redis
- Cache: Redis
- Storage: S3-compatible (MinIO)

**Planned Features:**
- Event queue: Kafka/Redpanda or Redis Streams
- Auth: JWT/OAuth2 (Keycloak/Auth0) or next-auth + OIDC
- RBAC: Multi-tenant by organization and project
- Observability: OpenTelemetry + SigNoz/Grafana + Sentry

**Application Structure:**
- [app/main.py](api/app/main.py): FastAPI app, CORS setup, router mounting at `/api`, `/health` endpoint
- [app/database.py](api/app/database.py): Async SQLAlchemy engine/session (asyncpg), `get_session()` dependency injection
- [app/config.py](api/app/config.py): Pydantic Settings (reads `PG*` env vars, constructs database URL, defines `api_prefix="/api"`)
- [app/models/admin.py](api/app/models/admin.py): SQLAlchemy models (PlanCatalog, Organization, Tenant, BillingSubscription, Invoice, TenantQuotaUsage, BrandingProfile)
- [app/schemas/admin.py](api/app/schemas/admin.py): Pydantic request/response models
- [app/services/admin.py](api/app/services/admin.py): Business logic and database operations (queries, upserts, summary composition)
- [app/routers/admin.py](api/app/routers/admin.py): HTTP routes for admin endpoints

**Admin API Endpoints (`/api/admin`):**
- Plans: `GET/POST /plans`, `PUT/DELETE /plans/{plan_id}`
- Organizations: `GET /organizations`, `GET /organizations/{org_id}/tenants`, `GET /organizations/{org_id}/summary`
- Subscriptions: `POST /organizations/{org_id}/subscription`
- Branding: `GET/PUT /organizations/{org_id}/branding`
- Quotas: `GET /tenants/{tenant_id}/quotas`, `POST /tenants/{tenant_id}/quotas`

## Key Design Patterns

### Multi-Tenancy
- Logical tenant isolation with Row-Level Security (RLS)
- Organization → Tenant hierarchy
- RBAC by organization and project
- Audit logs for all tenant actions

### Data Fetching (Frontend)
- All API calls use React Query hooks from [hooks/](front/hooks/)
- Query keys are namespaced (e.g., `["admin", "plans"]`)
- Mutations invalidate relevant queries for UI consistency
- Error handling via `ApiError` class

### API Design (Backend)
- Async SQLAlchemy sessions via dependency injection
- Service layer pattern (models → schemas → services → routers)
- Pydantic validation on all inputs/outputs
- Numeric/Decimal normalization in schemas

### Meeting Processing Pipeline
The system is designed for meeting-centric workflows:
1. **Ingestion:** Upload transcriptions or integrate with tools
2. **Classification:** Auto-detect meeting type (daily, refinement, alignment)
3. **Chunking:** Segment by topics (400-800 tokens + overlap) with timestamps and participants
4. **Indexing:** Embeddings (pgvector) + Full-Text Search (tsvector + pg_trgm)
5. **Insights Extraction:** LLM-based extraction with playbooks per meeting type
6. **Action Application:** Create tasks, update docs, send reminders (with approval flow)

### Playbooks by Meeting Type
- **Daily:** Link updates to existing tasks, generate objective comments
- **Refinement:** Create tasks with acceptance criteria, estimates, dependencies
- **Alignment:** Record decisions, risks, ideas for backlog/roadmap
- Customizable per organization (edit prompts, rules, sensitivity)

## Important Implementation Notes

### Frontend Type Safety
- All API responses must match types in [lib/admin-types.ts](front/lib/admin-types.ts) and [lib/meetings-types.ts](front/lib/meetings-types.ts)
- Forms use Zod schemas for validation
- Date handling: use `date-fns` for formatting/parsing

### Backend Database Operations
- Always use async sessions from `get_session()` dependency
- Use `selectinload()` for eager loading relationships
- Prefer service layer functions over direct model access in routes
- Database URL is constructed from `PG*` environment variables in [app/config.py](api/app/config.py)

### CORS Configuration
- Development: Permissive CORS enabled in [app/main.py](api/app/main.py)
- Production: Configure allowed origins properly

### Hybrid Search
When implementing search features:
- Combine semantic search (pgvector cosine similarity) with lexical search (BM25/ts_rank_cd)
- Use Reciprocal Rank Fusion (RRF) for ranking
- Apply boosts for recency and project relevance
- Include snippet highlights and "why this result" explanations

### Agent Actions & Insights
All agent actions must:
- Include confidence scores
- Reference evidence (link to chunks/sources)
- Support simulation mode before applying
- Be idempotent and reversible when possible
- Log to `agent_action_log` for audit trail

## Testing Guidelines

### Frontend
- No test setup currently configured in [front/package.json](front/package.json)
- When adding tests, use testing-library/react for component tests

### Backend
- Not yet configured; [api/README.md](api/README.md) suggests pytest with temporary database
- Test tenant isolation thoroughly
- Mock LLM calls in tests

## Multi-Tenant Database Schema

Key tables (defined in [app/models/admin.py](api/app/models/admin.py)):
- `organization`: Top-level entity with plan, locale, timezone, resource limits
- `tenant`: Sub-entities within organizations
- `plan_catalog`: Available subscription plans (features, limits, pricing)
- `billing_subscription`: Active subscriptions with periods and payment methods
- `branding_profile`: Custom branding per organization
- `tenant_quota_usage`: Track resource consumption (storage, API calls, etc.)
- `invoice`: Billing records

## Future Modules (from spec)

The system is architected for these planned features:
- Projects, Tasks, Comments with deduplication and dependencies
- Sprint Planning with capacity-based allocation
- Document management with versioning and collaboration
- Hybrid search with semantic + lexical ranking
- LLM-powered agents (Router, Backlog, Docs, Sprint, Email)
- Integrations: Jira/Linear/Azure DevOps, Gmail/IMAP, Google Calendar, Slack/Teams, GitHub/GitLab, Confluence/Notion
- Project Pulse: Daily dashboards per project with risks, blockers, next steps
- Approval queues and audit trails
- Webhooks and public API
- Internationalization (PT/EN)

## MVP Criteria

The minimum viable product includes:
- Multi-tenant with RBAC and SSO (Google)
- Ingest transcriptions and documents
- Index with pgvector + Full-Text Search
- Hybrid search with project filters and evidence snippets
- Meeting playbooks (daily, refinement, alignment) with structured extraction
- Approval flow for agent actions on tasks/comments
- Daily Project Pulse per project
- Basic Slack and email integrations
