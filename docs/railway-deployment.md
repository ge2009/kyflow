# Railway Deployment Runbook (staging + production)

This runbook deploys this project to Railway with:

- GitHub auto deploy
- Two app services (`kyflow-prod`, `kyflow-staging`)
- One shared Railway PostgreSQL instance (same `public` schema)

## 1) Prerequisites

- A Railway account with project creation permission
- A GitHub repository for this project
- Two domain names (or subdomains), one for production and one for staging
- `RAILWAY_TOKEN` for CLI operations

## 2) Repository changes required by Railway

Already implemented in this repo:

- `Dockerfile` supports build-time `NEXT_PUBLIC_APP_URL` via:
  - `ARG NEXT_PUBLIC_APP_URL`
  - `ENV NEXT_PUBLIC_APP_URL`
- Runtime-safe scripts that do not use `scripts/with-env.ts`:
  - `pnpm db:migrate:runtime`
  - `pnpm rbac:init:runtime`
  - `pnpm rbac:assign:runtime`

## 3) Create Railway topology

1. Create one Railway project.
2. Add one PostgreSQL service.
3. Add two app services connected to the same GitHub repository:
   - `kyflow-prod` (branch: `main`)
   - `kyflow-staging` (branch: `staging`)
4. Ensure both services build from the repository root `Dockerfile`.

## 4) Configure custom domains

- Attach your production domain to `kyflow-prod`
- Attach your staging domain to `kyflow-staging`

Wait until both are active with TLS issued.

## 5) Environment variables

Set these on each app service:

| Variable | `kyflow-prod` | `kyflow-staging` |
| --- | --- | --- |
| `NODE_ENV` | `production` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://<prod-domain>` | `https://<staging-domain>` |
| `AUTH_URL` | `https://<prod-domain>/api/auth` | `https://<staging-domain>/api/auth` |
| `AUTH_SECRET` | unique secret | unique secret |
| `DATABASE_PROVIDER` | `postgresql` | `postgresql` |
| `DATABASE_URL` | same shared Postgres URL | same shared Postgres URL |
| `DB_SINGLETON_ENABLED` | `true` | `true` |
| `DB_MAX_CONNECTIONS` | `1` | `1` |

Build config requirement for each service:

- Build arg `NEXT_PUBLIC_APP_URL` must match that service domain URL.

## 6) Deploy order (first launch)

1. Deploy `kyflow-prod` from branch `main` once.
2. Run DB migration in `production` service only.
3. Initialize RBAC and assign `super_admin`.
4. Deploy `kyflow-staging` from branch `staging`.
5. Validate both domains and auth callback behavior.

## 7) CLI operations with token

Install CLI (one-time):

```bash
npm i -g @railway/cli
```

Set token:

```bash
export RAILWAY_TOKEN="<your-token>"
```

Login context (if needed):

```bash
railway whoami
```

Select project/environment/service and run commands:

```bash
# Example: run migration on production service
railway run --service kyflow-prod --environment production -- pnpm db:migrate:runtime

# Example: initialize RBAC in production
railway run --service kyflow-prod --environment production -- pnpm rbac:init:runtime -- --admin-email=you@example.com
```

Assign role explicitly:

```bash
railway run --service kyflow-prod --environment production -- pnpm rbac:assign:runtime -- --email=you@example.com --role=super_admin
```

## 8) Verification checklist

- `https://<prod-domain>` loads successfully
- `https://<staging-domain>` loads successfully
- `/sign-in` and `/api/auth/*` callback URLs stay on the correct domain
- Admin user can access `/admin`
- Staging deploy does not run migrations

## 9) Important risk note (current chosen architecture)

Both environments share the same PostgreSQL database and the same `public` schema.

Implications:

- Staging writes affect production data.
- Any staging migration can impact production immediately.

Operational guardrail:

- Only run migrations on `kyflow-prod` (production service).
