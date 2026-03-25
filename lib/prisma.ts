import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const connectionString =
  process.env.LOCAL_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error(
    "Missing database connection string. Set LOCAL_DATABASE_URL, POSTGRES_PRISMA_URL, DATABASE_URL, or POSTGRES_URL."
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaPool: Pool | undefined
}

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString,
  })

const adapter = new PrismaPg(pool)


export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaPool = pool
}
