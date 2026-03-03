# Roblox AI Agent - Production SaaS Platform

An AI-powered coding agent for Roblox Studio. Build, modify, and manage Roblox projects with structured AI-generated patch operations.

## Architecture Overview

```
┌──────────────┐     ┌──────────────────────────────────────┐     ┌──────────────┐
│              │     │           Next.js App                 │     │              │
│  Roblox      │◄───►│  ┌──────────┐  ┌──────────────────┐ │     │   OpenAI     │
│  Studio      │     │  │ API      │  │ Frontend (React)  │ │◄───►│   (GPT-4o)   │
│  Plugin      │     │  │ Routes   │  │ App Router        │ │     │              │
│              │     │  └────┬─────┘  └──────────────────┘ │     └──────────────┘
└──────────────┘     │       │                              │
                     │  ┌────▼─────┐  ┌──────────────────┐ │
                     │  │ Prisma   │  │ Redis (optional)  │ │
                     │  │ ORM      │  │ Job Queue         │ │
                     │  └────┬─────┘  └──────────────────┘ │
                     └───────┼──────────────────────────────┘
                             │
                     ┌───────▼──────┐
                     │  Supabase    │
                     │  PostgreSQL  │
                     └──────────────┘
```

## System Domains

### 1. Authentication
- Email/password registration & login
- JWT access tokens (15-min) + refresh tokens (7-day)
- HTTP-only secure cookies
- Token rotation on refresh

### 2. Plugin Pairing
- 8-character pairing codes (5-min TTL)
- Plugin confirms with code + machineId
- Separate plugin JWT tokens (1-hour access, 30-day refresh)
- Connection management

### 3. Workspace Manifest
- Plugin uploads structured JSON workspace tree
- Zod-validated manifest schema
- Versioned storage per project
- Tree visualization in frontend

### 4. AI Suggestion Engine
- OpenAI-compatible provider abstraction
- Structured JSON output (create/update/delete ops)
- Schema validation of AI output
- Rate limiting per user
- SSE streaming support

### 5. Patch Approval & Delivery
- Pending → Approved → Delivered workflow
- Never auto-approved
- Diff viewer with syntax highlighting
- Plugin polls for approved patches

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS, shadcn/ui |
| State | Zustand (auth/project), TanStack Query (API) |
| Backend | Next.js API Routes (serverless) |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Cache/Queue | Redis (optional, in-memory fallback) |
| AI | OpenAI SDK (GPT-4o default) |
| Auth | JWT (jose library, edge-compatible) |
| Validation | Zod |
| Hosting | Vercel + Supabase |

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # register, login, refresh, logout, me
│   │   │   ├── pair/           # generate, confirm, status
│   │   │   ├── workspace/      # manifest, projects
│   │   │   ├── ai/             # suggest, stream, job/[jobId]
│   │   │   ├── patch/          # list, [patchId], approve, reject
│   │   │   └── plugin/         # next-patch, connections
│   │   ├── dashboard/          # Main dashboard + connections
│   │   ├── project/[id]/       # Project detail page
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Sidebar, AppLayout
│   │   ├── providers/          # Auth, Query providers
│   │   ├── workspace/          # WorkspaceTree
│   │   ├── ai/                 # AiChatPanel
│   │   ├── pairing/            # PairingDialog
│   │   └── patches/            # PatchList, PatchDiffViewer
│   ├── lib/
│   │   ├── api/                # Response helpers, API client
│   │   ├── auth/               # JWT, password, middleware
│   │   ├── config/             # Environment variables
│   │   ├── db/                 # Prisma client, Redis client
│   │   ├── services/           # AI service, Job queue
│   │   ├── validation/         # Zod schemas
│   │   ├── logger.ts           # Structured logging
│   │   ├── rate-limit.ts       # Rate limiter
│   │   └── utils.ts            # Utility functions
│   ├── stores/                 # Zustand stores
│   └── middleware.ts           # Next.js edge middleware
├── supabase/
│   └── setup.sql               # Supabase-specific setup
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── next.config.js
├── vercel.json
├── tailwind.config.js
└── tsconfig.json
```

## API Routes

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/refresh` | Cookie | Refresh tokens |
| POST | `/api/auth/logout` | Cookie | Logout |
| GET | `/api/auth/me` | User JWT | Get current user |

### Plugin Pairing
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/pair/generate` | User JWT | Generate pairing code |
| POST | `/api/pair/confirm` | Public | Plugin confirms pairing |
| GET | `/api/pair/status` | User JWT | Check pairing status |

### Workspace
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/workspace/manifest` | Plugin JWT | Upload manifest |
| GET | `/api/workspace/manifest` | User JWT | Get latest manifest |
| GET | `/api/workspace/projects` | User JWT | List projects |

### AI
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/suggest` | User JWT | Request AI suggestion |
| GET | `/api/ai/stream` | User JWT | SSE stream |
| GET | `/api/ai/job/[jobId]` | User JWT | Poll job status |

### Patches
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/patch` | User JWT | List patches |
| GET | `/api/patch/[patchId]` | User JWT | Get patch detail |
| POST | `/api/patch/approve` | User JWT | Approve patch |
| POST | `/api/patch/reject` | User JWT | Reject patch |

### Plugin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/plugin/next-patch` | Plugin JWT | Get next approved patch |
| POST | `/api/plugin/next-patch` | Plugin JWT | Confirm delivery |
| GET | `/api/plugin/connections` | User JWT | List connections |

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase project (or local PostgreSQL)
- OpenAI API key

### Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd roblox-ai-agent
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 3. Setup database
npx prisma migrate dev

# 4. Start development server
npm run dev
```

### With Docker

```bash
# Copy environment
cp .env.example .env

# Start services
docker-compose up -d

# Run migrations
npx prisma migrate deploy
```

## Deployment

> **Important – Subdirectory structure:** The Next.js application lives in the `ENV_Sai/` subdirectory of this repository.
> When importing the project in Vercel you **must** set the **Root Directory** to `ENV_Sai` in the project settings
> (Settings → General → Root Directory). All build commands are relative to that directory.

### Vercel + Supabase

#### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Settings → Database → Connection string**, copy:
   - **Session mode (port 6543)** → `DATABASE_URL` (used at runtime via PgBouncer)
   - **Direct connection (port 5432)** → `DIRECT_URL` (used by Prisma migrations)
3. Apply DB migrations against your Supabase instance:
   ```bash
   # From the ENV_Sai/ directory
   DATABASE_URL="postgres://..." DIRECT_URL="postgres://..." npx prisma migrate deploy
   ```
4. *(Optional)* Run `supabase/setup.sql` in the Supabase SQL Editor for cron-job helpers.

#### 2. Vercel Setup

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
3. Set **Root Directory** to `ENV_Sai` (this is the key step for subdirectory deployments).
4. Framework preset will be detected as **Next.js** automatically.
5. Add the following **Environment Variables** in the Vercel dashboard:

| Key | Required | How to generate / where to find |
|-----|----------|----------------------------------|
| `DATABASE_URL` | **Yes** | Supabase → Settings → Database → Session mode connection string |
| `DIRECT_URL` | **Yes** | Supabase → Settings → Database → Direct connection string |
| `JWT_SECRET` | **Yes** | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | **Yes** | `openssl rand -hex 32` (use a different value from `JWT_SECRET`) |
| `OPENAI_API_KEY` | **Yes** | [platform.openai.com](https://platform.openai.com) → API keys |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Your Vercel deployment URL, e.g. `https://your-app.vercel.app` |
| `OPENAI_MODEL` | No | AI model name (default: `gpt-4o`) |
| `OPENAI_BASE_URL` | No | Custom OpenAI-compatible base URL |
| `REDIS_URL` | No | Upstash / Railway Redis URL (falls back to in-memory if unset) |
| `RATE_LIMIT_AI_MAX` | No | Max AI requests per window per user (default: `20`) |
| `RATE_LIMIT_AI_WINDOW_MS` | No | Rate-limit window in ms (default: `60000`) |

6. Click **Deploy**.

#### 3. Supabase DB Migration Steps (detailed)

```bash
# 1. Install dependencies
cd ENV_Sai
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your Supabase connection strings

# 3. Apply all pending migrations
npx prisma migrate deploy

# 4. (Development only) Generate Prisma client
npx prisma generate
```

#### 4. Redis (Optional but Recommended for Production)

Without Redis, rate limiting and job-state are in-memory (lost on cold-start, not shared across instances).
For production use **[Upstash](https://upstash.com)** (serverless Redis with a free tier):

1. Create a Redis database on Upstash.
2. Copy the `UPSTASH_REDIS_REST_URL` / standard Redis URL.
3. Set `REDIS_URL` in your Vercel environment variables.

#### 5. Custom Domain

1. Vercel Dashboard → Settings → Domains → Add Domain.
2. Update DNS records as instructed.
3. Update `NEXT_PUBLIC_APP_URL` to your custom domain.
4. SSL is automatic.

---

### Plugin Integration Notes

The Roblox Studio plugin communicates with this backend over HTTPS. Key requirements:

- **Base URL**: Must be a publicly reachable HTTPS URL (`NEXT_PUBLIC_APP_URL`). The plugin cannot reach `localhost`.
- **Stable domain**: Use a custom domain or the fixed Vercel URL (`your-project.vercel.app`). Avoid preview deployment URLs which change per-deploy.
- **Plugin pairing flow**:
  1. User opens the web dashboard and generates a pairing code (`POST /api/pair/generate`).
  2. Plugin sends the code + a stable `machineId` to `POST /api/pair/confirm`.
  3. Plugin receives `pluginToken` (1 h) and `pluginRefreshToken` (30 d).
  4. When `pluginToken` expires, plugin calls `POST /api/plugin/refresh` with the `pluginRefreshToken` to obtain a rotated token pair.
- **Manifest uploads**: Plugin calls `POST /api/workspace/manifest` with `Content-Type: application/json` and the `Authorization: Bearer <pluginToken>` header.
- **Patch polling**: Plugin polls `GET /api/plugin/next-patch` (rate-limited to 60 req/min).

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL pooled connection (Supabase port 6543) |
| `DIRECT_URL` | Yes | PostgreSQL direct connection for migrations (port 5432) |
| `JWT_SECRET` | Yes | HMAC secret for access JWTs — min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | HMAC secret for refresh JWTs — min 32 chars, different from `JWT_SECRET` |
| `OPENAI_API_KEY` | Yes | OpenAI API key (`sk-...`) |
| `OPENAI_MODEL` | No | Model name (default: `gpt-4o`) |
| `OPENAI_BASE_URL` | No | Custom OpenAI-compatible provider base URL |
| `REDIS_URL` | No | Redis connection URL — in-memory fallback used if not set |
| `NEXT_PUBLIC_APP_URL` | No | Canonical app URL (no trailing slash) |
| `RATE_LIMIT_AI_MAX` | No | Max AI requests per user per window (default: `20`) |
| `RATE_LIMIT_AI_WINDOW_MS` | No | Rate-limit window duration in ms (default: `60000`) |

## Security

- All passwords hashed with bcrypt (12 rounds)
- JWT access tokens are short-lived (15 min); refresh tokens expire after 7 days
- Refresh tokens stored as SHA-256 hashes in the DB — raw tokens are never persisted
- Access tokens delivered via httpOnly cookies only; never stored in JS state
- Token rotation on every refresh (old token invalidated immediately)
- Plugin tokens have a separate auth flow with independent refresh-token rotation
- Rate limiting on AI, pairing, manifest upload, and patch-polling endpoints
- Zod validation on all inputs with server-side limits (max manifest 512 KB, max 50 ops, max 64 KB source)
- AI output schema validated before storage; patches require explicit user approval
- HTTPS enforced in production
- Security headers (HSTS, X-Frame-Options, CSP, etc.) via Next.js config and middleware

## License

Proprietary - All Rights Reserved
