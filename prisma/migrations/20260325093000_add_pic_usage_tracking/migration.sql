ALTER TABLE "Domain"
ADD COLUMN IF NOT EXISTS "usedForPic" TEXT;

ALTER TABLE "DomainHistory"
ADD COLUMN IF NOT EXISTS "usedForPic" TEXT;

CREATE INDEX IF NOT EXISTS "Domain_usedForCountry_usedForPic_usedAt_idx"
ON "Domain"("usedForCountry", "usedForPic", "usedAt");

CREATE INDEX IF NOT EXISTS "DomainHistory_country_usedForPic_createdAt_idx"
ON "DomainHistory"("country", "usedForPic", "createdAt");
