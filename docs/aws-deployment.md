# Bee3ly on AWS (dev & prod)

Infrastructure lives in [`infra/`](../infra/) (AWS CDK). Containers: [`backend/Dockerfile`](../backend/Dockerfile), [`ai-services/Dockerfile`](../ai-services/Dockerfile). The SPA is hosted on **Amplify Hosting** (connected to this repo); API and AI run on **ECS Fargate**.

## Architecture (per environment)

| Piece | AWS service |
|-------|-------------|
| Frontend (Vite React) | Amplify Hosting |
| Backend (NestJS + Prisma + Socket.io) | ECS Fargate + public ALB (HTTP :80, sticky sessions) |
| AI (FastAPI + Gemini) | ECS Fargate (private, Cloud Map `ai.<env>.bee3ly.local`) |
| PostgreSQL | RDS PostgreSQL 16 |
| Redis (AI memory) | ElastiCache Redis |
| Secrets | Secrets Manager |

Internal DNS namespace: `dev.bee3ly.local` or `prod.bee3ly.local`.

- Backend → `AI_SERVICE_URL=http://ai.<env>.bee3ly.local:8000`
- AI → `BEE3LY_API_URL=http://backend.<env>.bee3ly.local:5000`

## Prerequisites

1. AWS CLI configured (`aws configure`) and CDK bootstrapped once per account/region:

   ```bash
   npm install -g aws-cdk
   cdk bootstrap aws://ACCOUNT_ID/REGION
   ```

2. Docker installed (build and push images).

3. **Gemini** API key (for AI tasks).

4. Decide **region** (e.g. `eu-central-1`) and set:

   ```bash
   export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
   export CDK_DEFAULT_REGION=eu-central-1
   ```

## 1. Deploy infrastructure

```bash
cd infra
npm install
```

**Dev** (replace frontend URL with your Amplify dev URL or temporary origin):

```bash
npm run deploy:dev -- -c frontendUrl=https://main.xxxxx.amplifyapp.com
```

**Prod**:

```bash
npm run deploy:prod -- -c frontendUrl=https://app.yourdomain.com
```

Note the outputs: `ApiUrl`, `BackendEcrUri`, `AiEcrUri`, `GeminiSecretArn`.

## 2. Set Gemini secret

In AWS Console → Secrets Manager → `bee3ly/<env>/gemini-api-key`, set the secret value to your **plain-text** `GEMINI_API_KEY` (not JSON). Restart the AI ECS service after updating.

## 3. Build and push container images

From repo root (after CDK created ECR repos):

```bash
# Backend
aws ecr get-login-password --region $CDK_DEFAULT_REGION | docker login --username AWS --password-stdin $CDK_DEFAULT_ACCOUNT.dkr.ecr.$CDK_DEFAULT_REGION.amazonaws.com

docker build -t bee3ly-backend ./backend
docker tag bee3ly-backend:latest <BackendEcrUri>:latest
docker push <BackendEcrUri>:latest

# AI
docker build -t bee3ly-ai ./ai-services
docker tag bee3ly-ai:latest <AiEcrUri>:latest
docker push <AiEcrUri>:latest
```

Force new ECS deployments (Console or CLI) so tasks pull `:latest`.

Backend entrypoint runs `prisma migrate deploy` before `node dist/main.js`.

## 4. Amplify (frontend)

1. Amplify Console → **New app** → connect GitHub → monorepo root.
2. **App root**: `frontend`
3. Build settings (example):

   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

4. Environment variables (per branch):

   | Branch | Variable | Value |
   |--------|----------|--------|
   | develop | `VITE_API_URL` | CDK output `ApiUrl` (or `https://api.dev.yourdomain.com` after HTTPS) |
   | main | `VITE_API_URL` | Prod API URL |

5. Redeploy Amplify whenever `VITE_API_URL` changes.

6. Use the **same** URL(s) in CDK `-c frontendUrl=...` as backend `FRONTEND_URL` (comma-separated for multiple origins).

## 5. Environment checklist

### Backend (set by CDK; you add Meta/TikTok in Console or extend CDK)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Built in container from RDS secret (`DB_*`) |
| `FRONTEND_URL` | CDK `-c frontendUrl` |
| `AI_SERVICE_URL` | Internal Cloud Map URL |
| `JWT_*`, `TOKEN_ENCRYPTION_KEY`, `AI_SERVICE_TOKEN_SECRET` | Secrets Manager (auto-generated) |
| `META_*`, `TIKTOK_*` | Add via ECS task env or Secrets Manager (not in base stack) |

Webhook base URL: `{ApiUrl}/social/...` (confirm paths in backend `social.controller`).

### AI service (CDK)

| Variable | Source |
|----------|--------|
| `GEMINI_API_KEY` | Secrets Manager |
| `REDIS_URL` | ElastiCache endpoint |
| `BEE3LY_API_URL` | Internal backend URL |

### Frontend (Amplify)

| Variable | Source |
|----------|--------|
| `VITE_API_URL` | Public API URL (HTTPS recommended in prod) |
| `VITE_META_*` | Meta developer app (optional) |

## 6. HTTPS and custom domains (recommended for prod)

1. ACM certificate in the same region as the ALB (for `api.yourdomain.com`).
2. Add HTTPS listener + redirect on the ALB (extend CDK or manually).
3. Route 53 (or DNS provider) alias to the ALB.
4. Amplify custom domain for `app.yourdomain.com`.
5. Update Meta/TikTok OAuth redirect URIs and webhook URLs to HTTPS.

## 7. Dev vs prod sizing (CDK defaults)

| | Dev | Prod |
|---|-----|------|
| Backend tasks | 1 × 0.5 vCPU / 1 GB | 2 × 1 vCPU / 2 GB |
| AI tasks | 1 × 0.25 vCPU / 512 MB | 2 × 0.5 vCPU / 1 GB |
| RDS | `db.t4g.micro`, single-AZ | `db.t4g.small`, Multi-AZ |
| Redis | `cache.t4g.micro` × 1 | `cache.t4g.small` × 2 |
| NAT | 1 gateway | 2 gateways |

## 8. Local Docker smoke test

```bash
docker compose up -d postgres
# Set DATABASE_URL in backend/.env, then:
docker build -t bee3ly-backend ./backend
docker run --rm -p 5000:5000 --env-file backend/.env bee3ly-backend
curl http://localhost:5000/health
```

## 9. Operations

- **Logs**: CloudWatch `/bee3ly/<env>/ai` and ECS log group for backend (created by CDK pattern).
- **Migrations**: Run automatically on backend task start; for large prod cutovers, run a one-off ECS task instead.
- **Scale**: Increase `desiredCount` in CDK or enable autoscaling in a follow-up change.
- **Destroy dev**: `cdk destroy Bee3ly-dev -c env=dev -c frontendUrl=...` (RDS snapshot policy applies per stack config).

### Copy local Postgres → RDS (dev)

After one CDK deploy that includes `DbSyncBucket` / `DbSyncTaskDef` outputs:

```bash
docker compose up -d postgres   # local data source
node scripts/sync-local-db-to-aws.mjs --env dev --stack Bee3ly-dev    # preview
npm run db:sync:aws            # truncate RDS app tables + import local data
```

RDS is private; import runs as a one-off Fargate task inside the VPC.

## 10. CI/CD (GitHub)

| Workflow | Trigger | What it does |
|----------|---------|----------------|
| `.github/workflows/deploy-aws-dev.yml` | Push to `main` (backend, ai-services, infra) | `cdk deploy Bee3ly-dev` (builds Docker images on GitHub, updates ECS) |
| `.github/workflows/frontend-ci.yml` | Push/PR touching `frontend/` | `npm run build` |
| **Amplify** (Console) | Push when app is connected | Hosts SPA using `frontend/amplify.yml` |

**GitHub Actions secrets** (repo → Settings → Secrets):

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — IAM user (e.g. `bee3ly-deploy`)
- `AWS_ACCOUNT_ID` — e.g. `014498663501`

**Repository variable** (optional):

- `DEV_FRONTEND_URL` — Amplify URL for backend CORS (`-c frontendUrl`); defaults to `http://localhost:5173`

Push to `main` redeploys API/AI after secrets are set. Set Amplify env `VITE_API_URL` to CDK `ApiUrl`.

## Related docs

- [README.md](../README.md) — local dev and env overview
- [ai-services-setup.md](./ai-services-setup.md) — Gemini and Redis locally
