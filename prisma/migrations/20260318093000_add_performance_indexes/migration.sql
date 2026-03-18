CREATE INDEX IF NOT EXISTS "Domain_status_createdAt_idx" ON "Domain"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Domain_project_idx" ON "Domain"("project");
CREATE INDEX IF NOT EXISTS "Domain_country_idx" ON "Domain"("country");
CREATE INDEX IF NOT EXISTS "Domain_hosting_idx" ON "Domain"("hosting");
CREATE INDEX IF NOT EXISTS "Domain_expiry_idx" ON "Domain"("expiry");

CREATE INDEX IF NOT EXISTS "DomainHistory_project_idx" ON "DomainHistory"("project");
CREATE INDEX IF NOT EXISTS "DomainHistory_country_idx" ON "DomainHistory"("country");
CREATE INDEX IF NOT EXISTS "DomainHistory_hosting_idx" ON "DomainHistory"("hosting");
CREATE INDEX IF NOT EXISTS "DomainHistory_expiry_idx" ON "DomainHistory"("expiry");
