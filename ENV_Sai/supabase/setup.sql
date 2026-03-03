-- Supabase SQL Setup Script
-- Run this in the Supabase SQL Editor for initial setup

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Prisma manages the schema via migrations.
-- Run `npx prisma migrate deploy` to create all tables.
-- This file is for any additional Supabase-specific setup.

-- ────────────────────────────────────────────
-- Row Level Security (RLS) policies
-- These are OPTIONAL - Prisma bypasses RLS via service role
-- But if using Supabase client directly, enable these
-- ────────────────────────────────────────────

-- Example: Enable RLS on users table
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own data" ON users
--   FOR SELECT USING (id = auth.uid());

-- ────────────────────────────────────────────
-- Indexes for performance
-- (Already defined in Prisma schema, but listed here for reference)
-- ────────────────────────────────────────────

-- These are auto-created by Prisma migrations:
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON pairing_codes(code);
-- CREATE INDEX IF NOT EXISTS idx_patches_project_status ON patches(project_id, status);

-- ────────────────────────────────────────────
-- Cleanup: Remove expired pairing codes (optional cron)
-- ────────────────────────────────────────────

-- If using Supabase pg_cron extension:
-- SELECT cron.schedule(
--   'cleanup-expired-pairing-codes',
--   '*/30 * * * *',  -- Every 30 minutes
--   $$ DELETE FROM pairing_codes WHERE expires_at < NOW() AND used = true $$
-- );

-- ────────────────────────────────────────────
-- Cleanup: Remove expired sessions (optional cron)
-- ────────────────────────────────────────────

-- SELECT cron.schedule(
--   'cleanup-expired-sessions',
--   '0 */6 * * *',  -- Every 6 hours
--   $$ DELETE FROM sessions WHERE expires_at < NOW() $$
-- );
