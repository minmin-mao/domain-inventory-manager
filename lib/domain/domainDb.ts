import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

let hasDomainLanguageColumnPromise: Promise<boolean> | null = null;

export const DOMAIN_BASE_SELECT = {
  id: true,
  domain: true,
  hosting: true,
  account: true,
  project: true,
  country: true,
  expiry: true,
  reservedAt: true,
  reservedForProject: true,
  reservedForCountry: true,
  reservedForPic: true,
  usedAt: true,
  usedForProject: true,
  usedForCountry: true,
  usedForPic: true,
  createdAt: true,
  updatedAt: true,
  status: true,
} satisfies Prisma.DomainSelect;

export async function hasDomainLanguageColumn() {
  if (!hasDomainLanguageColumnPromise) {
    hasDomainLanguageColumnPromise = prisma
      .$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'Domain'
            AND column_name = 'language'
        ) AS "exists"
      `)
      .then((rows) => rows[0]?.exists === true)
      .catch(() => false);
  }

  return hasDomainLanguageColumnPromise;
}

export async function getDomainSelect() {
  if (await hasDomainLanguageColumn()) {
    return {
      ...DOMAIN_BASE_SELECT,
      language: true,
    } satisfies Prisma.DomainSelect;
  }

  return DOMAIN_BASE_SELECT;
}

