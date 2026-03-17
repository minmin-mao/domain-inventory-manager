/*
  Warnings:

  - Changed the type of `status` on the `Domain` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('available', 'taken');

-- AlterTable
ALTER TABLE "Domain" DROP COLUMN "status",
ADD COLUMN     "status" "DomainStatus" NOT NULL;
