-- CreateTable
CREATE TABLE "DomainHistory" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "hosting" TEXT NOT NULL,
    "expiry" TIMESTAMP(3) NOT NULL,
    "project" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainHistory_domainId_idx" ON "DomainHistory"("domainId");

-- CreateIndex
CREATE INDEX "DomainHistory_createdAt_idx" ON "DomainHistory"("createdAt");
