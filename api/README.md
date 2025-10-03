# PulseHub Admin API

FastAPI service responsável pelo módulo administrativo do PulseHub (catálogo de planos, billing, branding e quota de tenants).

## Requisitos

- Python 3.11+
- Acesso ao PostgreSQL já criado (ver `.env` abaixo)

## Instalação rápida

```bash
cd pulsehub-api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Opcional: exporte as variáveis para usar outro banco.

```bash
export PGDATABASE=pulsehub
export PGUSER=n8ndsuprema
export PGPASSWORD=a5f4a173aee84ea452e193e643fe817c
export PGHOST=5.78.154.75
export PGPORT=5436
```

## Executar localmente

```bash
uvicorn app.main:app --reload --port 8080
```

- Health check: `GET http://localhost:8080/health`
- API base: `http://localhost:8080/api/admin`

## Endpoints principais

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/admin/plans` | Lista planos disponíveis |
| `POST` | `/api/admin/plans` | Cria novo plano (features/limits em JSON) |
| `PUT` | `/api/admin/plans/{plan_id}` | Atualiza plano existente |
| `DELETE` | `/api/admin/plans/{plan_id}` | Remove plano |
| `POST` | `/api/admin/organizations/{org_id}/subscription` | Atribui/atualiza assinatura para organização |
| `GET` | `/api/admin/organizations/{org_id}/branding` | Consulta personalização |
| `PUT` | `/api/admin/organizations/{org_id}/branding` | Atualiza personalização |
| `GET` | `/api/admin/organizations/{org_id}/summary` | Retorna visão consolidada (plano, assinatura, quotas, invoices) |
| `GET` | `/api/admin/tenants/{tenant_id}/quotas` | Lista consumo de quotas do tenant |
| `POST` | `/api/admin/tenants/{tenant_id}/quotas` | Faz upsert do consumo de quota |

> Todos os payloads/retornos estão em `app/schemas/admin.py`.

## Estrutura

- `app/models/admin.py`: mapeamentos SQLAlchemy (PlanCatalog, BillingSubscription, BrandingProfile, TenantQuotaUsage etc.)
- `app/services/admin.py`: regras de negócio e queries reutilizáveis.
- `app/routers/admin.py`: rotas FastAPI ligando schemas ↔ serviços.
- `pulsehub-db-schema.md`: atualizado com as tabelas `plan_catalog`, `billing_subscription`, `invoice`, `tenant_quota_usage`, `branding_profile` e enums auxiliares.

## Próximos passos sugeridos

1. Criar seeds para os planos default (Free/Pro/Enterprise) com limites carregados do documento `pulsehub-visaogeral.md`.
2. Conectar o frontend Next.js para consumir esses endpoints (React Query) e montar telas reais de administração.
3. Implementar jobs para reset automático de quotas por período (`tenant_quota_usage`).
4. Configurar testes automatizados (pytest + banco temporário) e CI.
