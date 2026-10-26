-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL,
    "phone_hash" CHAR(64) NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "ip_hash" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_verifications_phone_hash_created_at_idx" ON "otp_verifications"("phone_hash", "created_at" DESC);

-- CreateIndex
CREATE INDEX "otp_verifications_ip_hash_created_at_idx" ON "otp_verifications"("ip_hash", "created_at");

