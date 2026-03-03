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

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project credentials:
   - **Project URL**: `https://your-project.supabase.co`
   - **Database password**: (set during creation)
   - **Connection strings**: Settings → Database → Connection string

3. Get your connection strings:
   - **Session mode (pooled)** → use as `DATABASE_URL`
   - **Direct connection** → use as `DIRECT_URL`

4. Run migrations:
   ```bash
   # Set DATABASE_URL and DIRECT_URL in .env
   npx prisma migrate deploy
   ```

5. Optionally run `supabase/setup.sql` in the SQL Editor for cron jobs

### 2. Vercel Setup

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: `.next`

5. Add Environment Variables in the Vercel dashboard (**Project → Settings → Environment Variables**):

   > **⚠️ Common mistake:** In the Vercel "Add Environment Variable" dialog there are two fields — **Name (Key)** and **Value**. Enter the variable name (e.g. `DATABASE_URL`) in the **Key/Name** field and the connection string in the **Value** field. Do **not** paste the connection string into the Key field.

   | Key (Name) | Value |
   |------------|-------|
   | `DATABASE_URL` | `postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres?pgbouncer=true` |
   | `DIRECT_URL` | `postgresql://postgres.[ref]:[password]@...pooler.supabase.com:5432/postgres` |
   | `JWT_SECRET` | Generate: `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | Generate: `openssl rand -hex 32` |
   | `OPENAI_API_KEY` | `sk-...` |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

   **Example — Supabase `DATABASE_URL`:**
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

6. Deploy!

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
