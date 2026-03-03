-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PatchStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELIVERED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairing_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jsonData" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patches" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "aiJobId" TEXT,
    "jsonPatch" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "PatchStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_refreshToken_idx" ON "sessions"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "pairing_codes_code_key" ON "pairing_codes"("code");

-- CreateIndex
CREATE INDEX "pairing_codes_code_idx" ON "pairing_codes"("code");

-- CreateIndex
CREATE INDEX "pairing_codes_userId_idx" ON "pairing_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_connections_refreshToken_key" ON "plugin_connections"("refreshToken");

-- CreateIndex
CREATE INDEX "plugin_connections_userId_idx" ON "plugin_connections"("userId");

-- CreateIndex
CREATE INDEX "plugin_connections_refreshToken_idx" ON "plugin_connections"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "plugin_connections_userId_machineId_key" ON "plugin_connections"("userId", "machineId");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_userId_placeId_key" ON "projects"("userId", "placeId");

-- CreateIndex
CREATE INDEX "manifests_projectId_idx" ON "manifests"("projectId");

-- CreateIndex
CREATE INDEX "ai_jobs_userId_idx" ON "ai_jobs"("userId");

-- CreateIndex
CREATE INDEX "ai_jobs_projectId_idx" ON "ai_jobs"("projectId");

-- CreateIndex
CREATE INDEX "ai_jobs_status_idx" ON "ai_jobs"("status");

-- CreateIndex
CREATE INDEX "patches_projectId_idx" ON "patches"("projectId");

-- CreateIndex
CREATE INDEX "patches_status_idx" ON "patches"("status");

-- CreateIndex
CREATE INDEX "patches_projectId_status_idx" ON "patches"("projectId", "status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_connections" ADD CONSTRAINT "plugin_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patches" ADD CONSTRAINT "patches_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patches" ADD CONSTRAINT "patches_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "manifests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patches" ADD CONSTRAINT "patches_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
