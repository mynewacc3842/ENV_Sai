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

### Vercel + Supabase

1. **Supabase Setup:**
   - Create a new Supabase project
   - Copy the connection strings to your env vars
   - Run `npx prisma migrate deploy` against the Supabase DB

2. **Vercel Setup:**
   - Connect your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push

3. **Environment Variables on Vercel** — in **Project → Settings → Environment Variables**, click **Add** for each variable below. In the dialog, enter the variable name in the **Key (Name)** field and the secret value in the **Value** field.

   > **⚠️ Common mistake:** Do **not** paste the connection string into the Key field. The Key must be the variable name (e.g. `DATABASE_URL`) and the Value must be the full connection string.

   | Key (Name) | Value |
   |------------|-------|
   | `DATABASE_URL` | Supabase pooled connection string (see below) |
   | `DIRECT_URL` | Supabase direct connection string |
   | `JWT_SECRET` | Min 32 chars (`openssl rand -hex 32`) |
   | `JWT_REFRESH_SECRET` | Min 32 chars (`openssl rand -hex 32`) |
   | `OPENAI_API_KEY` | Your OpenAI key |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

   **How to get the Supabase connection strings:**
   1. In Supabase: **Project Settings → Database → Connection string**
   2. Copy **Session mode (pooled)** → use as the **Value** for `DATABASE_URL`
   3. Copy **Direct connection** → use as the **Value** for `DIRECT_URL`

   **Example `DATABASE_URL` entry in Vercel:**
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection (pooled) |
| `DIRECT_URL` | Yes | PostgreSQL connection (direct, for migrations) |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token secret (min 32 chars) |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | No | AI model (default: gpt-4o) |
| `OPENAI_BASE_URL` | No | Custom API base URL |
| `REDIS_URL` | No | Redis connection URL |
| `NEXT_PUBLIC_APP_URL` | No | Application URL |
| `RATE_LIMIT_AI_MAX` | No | Max AI requests per window (default: 20) |
| `RATE_LIMIT_AI_WINDOW_MS` | No | Rate limit window (default: 60000) |

## Security

- All passwords hashed with bcrypt (12 rounds)
- JWT tokens are short-lived (15 min access, 7 day refresh)
- HTTP-only cookies for refresh tokens
- Plugin tokens have separate auth flow
- Rate limiting on AI endpoints
- Zod validation on all inputs
- AI output schema validated before storage
- Patches never auto-approved
- HTTPS enforced in production
- Security headers via middleware

## License

Proprietary - All Rights Reserved
