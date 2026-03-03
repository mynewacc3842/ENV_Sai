# Roblox AI Agent Platform - Deployment Guide

## Hosting Architecture

```
GitHub Repository
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Vercel    │      │   Supabase   │
│             │      │              │
│  Next.js    │◄────►│  PostgreSQL  │
│  Frontend + │      │  (managed)   │
│  API Routes │      │              │
│  (serverless│      └──────────────┘
│   edge)     │
└─────────────┘      ┌──────────────┐
                     │  Redis       │
                     │  (optional)  │
                     │  Upstash/    │
                     │  Railway     │
                     └──────────────┘
```

## Step-by-Step Deployment

### 1. Supabase Setup – Create the Database Schema

> **Goal**: create all tables in your Supabase PostgreSQL database using Prisma migrations.

#### a) Get your connection strings

1. Go to [supabase.com](https://supabase.com) → your project → **Settings → Database → Connection string**
2. You need **two** URLs:

   | Variable | Where to find it | Example format |
   |----------|-----------------|----------------|
   | `DIRECT_URL` | **Direct connection** tab | `postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres` |
   | `DATABASE_URL` | **Session mode** (pooled) tab | `postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |

   > If you only have the direct connection string, you can set both `DATABASE_URL` and `DIRECT_URL` to the same direct URL during setup.

#### b) Create your local `.env` file

```bash
cd ENV_Sai
cp .env.example .env
```

Edit `.env` and replace the placeholder values:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.gowcuiwaxygxtmoxfltb.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.gowcuiwaxygxtmoxfltb.supabase.co:5432/postgres"
JWT_SECRET="<output of: openssl rand -hex 32>"
JWT_REFRESH_SECRET="<output of: openssl rand -hex 32>"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### c) Install dependencies and run migrations

```bash
# Install npm packages (also runs prisma generate via postinstall)
npm install

# Apply all Prisma migrations to your Supabase database
# This creates all tables defined in prisma/schema.prisma
npx prisma migrate deploy
```

After this command completes, all required tables will exist in your Supabase database.

#### d) Verify (optional)

```bash
# Open Prisma Studio to browse your database visually
npx prisma studio
```

Or check the **Table Editor** in the Supabase Dashboard to confirm the tables were created.

#### e) Local development (optional)

For local development with schema changes, use `migrate dev` instead:

```bash
# Creates a new migration and applies it (requires direct DB access)
npx prisma migrate dev
```

#### f) Supabase cron jobs (optional)

Run `supabase/setup.sql` in the Supabase SQL Editor to configure cron jobs.

---

### 2. Vercel Setup

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `ENV_Sai`
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: `.next`

5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Pooled connection: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
   | `DIRECT_URL` | Direct connection: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres` |
   | `JWT_SECRET` | Generate: `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | Generate: `openssl rand -hex 32` |
   | `OPENAI_API_KEY` | `sk-...` |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

6. **Run migrations before deploying** (migrations do NOT run automatically on Vercel build):
   ```bash
   # Run once from your local machine with DIRECT_URL set in .env
   npx prisma migrate deploy
   ```

7. Deploy!

### 3. Redis (Optional)

For production job queues, use:
- **[Upstash](https://upstash.com)** - Serverless Redis (free tier available)
- **[Railway](https://railway.app)** - Managed Redis

Set `REDIS_URL` in Vercel env vars. If not set, the app falls back to in-memory queuing.

### 4. Custom Domain (Optional)

1. In Vercel: Settings → Domains → Add Domain
2. Update DNS records as instructed
3. Update `NEXT_PUBLIC_APP_URL` to your custom domain
4. SSL is automatic via Vercel

## CI/CD

Vercel automatically deploys on every push to `main`. Preview deployments are created for PRs.

For database migrations in CI:
```bash
# In your CI/CD pipeline
npx prisma migrate deploy
```

## Scaling Notes

- **Vercel Functions**: Auto-scale with traffic (serverless)
- **Supabase**: Scales with plan (free tier: 500MB DB, 2GB bandwidth)
- **AI Requests**: Rate limited per user (configurable)
- **Redis**: Optional, use Upstash for serverless scaling

## Monitoring

- **Vercel Analytics**: Built-in for frontend performance
- **Vercel Logs**: Function logs for API debugging
- **Supabase Dashboard**: DB metrics and query analysis
- **Application Logs**: Structured JSON logging in production
