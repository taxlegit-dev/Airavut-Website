-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "LearningMode" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "discipline" VARCHAR(100) NOT NULL,
    "skill_level" VARCHAR(50) NOT NULL,
    "certification_goals" VARCHAR(1000) NOT NULL,
    "preferred_schedule" VARCHAR(200) NOT NULL,
    "learning_mode" "LearningMode" NOT NULL,
    "remarks" VARCHAR(2000),
    "privacy_consent_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "ip_hash" CHAR(64) NOT NULL,
    "duplicate_key" CHAR(64) NOT NULL,
    "email_delivery_error" VARCHAR(500),
    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "content" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "inquiry_id" UUID,
    "actor" VARCHAR(254) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" BIGSERIAL NOT NULL,
    "ip_hash" CHAR(64) NOT NULL,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "inquiries_duplicate_key_key" ON "inquiries"("duplicate_key");
CREATE INDEX "inquiries_created_at_idx" ON "inquiries"("created_at" DESC);
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries"("status", "created_at" DESC);
CREATE INDEX "inquiries_discipline_idx" ON "inquiries"("discipline");
CREATE INDEX "inquiries_ip_hash_created_at_idx" ON "inquiries"("ip_hash", "created_at");
CREATE UNIQUE INDEX "portfolios_inquiry_id_key" ON "portfolios"("inquiry_id");
CREATE INDEX "audit_logs_inquiry_id_created_at_idx" ON "audit_logs"("inquiry_id", "created_at" DESC);
CREATE INDEX "login_attempts_ip_hash_created_at_idx" ON "login_attempts"("ip_hash", "created_at");

-- Foreign keys
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
