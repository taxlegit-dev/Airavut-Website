-- CreateEnum
CREATE TYPE "CareerApplicationStatus" AS ENUM ('NEW', 'IN_REVIEW', 'SHORTLISTED', 'REJECTED');

-- CreateTable
CREATE TABLE "career_applications" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "location" VARCHAR(120) NOT NULL,
    "linkedin_url" VARCHAR(500) NOT NULL,
    "resume_url" VARCHAR(1000) NOT NULL,
    "portfolio_url" VARCHAR(1000),
    "experience" VARCHAR(40) NOT NULL,
    "role" VARCHAR(40) NOT NULL,
    "notice_period" VARCHAR(20) NOT NULL,
    "why_join_us" VARCHAR(2000) NOT NULL,
    "status" "CareerApplicationStatus" NOT NULL DEFAULT 'NEW',
    "ip_hash" CHAR(64) NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,

    CONSTRAINT "career_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "career_applications_fingerprint_key" ON "career_applications"("fingerprint");
CREATE INDEX "career_applications_created_at_idx" ON "career_applications"("created_at" DESC);
CREATE INDEX "career_applications_status_created_at_idx" ON "career_applications"("status", "created_at" DESC);
CREATE INDEX "career_applications_role_idx" ON "career_applications"("role");
CREATE INDEX "career_applications_experience_idx" ON "career_applications"("experience");
CREATE INDEX "career_applications_email_idx" ON "career_applications"("email");
CREATE INDEX "career_applications_ip_hash_created_at_idx" ON "career_applications"("ip_hash", "created_at");
