ALTER TABLE "Domain"
  ADD COLUMN IF NOT EXISTS "language" TEXT;

UPDATE "Domain"
SET "language" = CASE
  WHEN UPPER(BTRIM(COALESCE("country", ''))) IN ('DEU', 'AUT', 'CHE') THEN 'DE'
  WHEN UPPER(BTRIM(COALESCE("country", ''))) = 'FRA' THEN 'FR'
  WHEN UPPER(BTRIM(COALESCE("country", ''))) = 'ESP' THEN 'ES'
  WHEN UPPER(BTRIM(COALESCE("country", ''))) = 'ITA' THEN 'IT'
  ELSE 'EN'
END
WHERE "language" IS NULL OR BTRIM("language") = '';

