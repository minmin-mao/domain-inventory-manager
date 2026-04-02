ALTER TYPE "DomainStatus" ADD VALUE IF NOT EXISTS 'reserved';

ALTER TABLE "Domain"
  ADD COLUMN IF NOT EXISTS "reservedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reservedForProject" TEXT,
  ADD COLUMN IF NOT EXISTS "reservedForCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "reservedForPic" TEXT;

CREATE INDEX IF NOT EXISTS "Domain_status_reservedAt_idx"
  ON "Domain"("status", "reservedAt");
