-- AlterTable
ALTER TABLE "Domain"
ALTER COLUMN "expiry" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DomainHistory"
ALTER COLUMN "expiry" DROP NOT NULL;
