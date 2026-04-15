import { getDomainSelect } from "@/lib/domain/domainDb";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const UNDO_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 10;
const EMPTY_PIC_VALUES = ["", "-", "—"];

type UsageType = "backup" | "pic";

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getExpiryWhere = (expiry: string | null) => {
  const now = new Date();

  switch (expiry) {
    case "expired":
      return { lt: now };
    case "le30": {
      const upperBound = new Date(now);
      upperBound.setDate(upperBound.getDate() + 30);
      return { gte: now, lte: upperBound };
    }
    case "le60": {
      const upperBound = new Date(now);
      upperBound.setDate(upperBound.getDate() + 60);
      return { gte: now, lte: upperBound };
    }
    default:
      return undefined;
  }
};

const getUsageType = (value: string | null | undefined): UsageType => {
  const normalized = value?.trim() ?? "";
  return !normalized || EMPTY_PIC_VALUES.includes(normalized) ? "backup" : "pic";
};

const buildLegacyWhere = (searchParams: URLSearchParams): Prisma.DomainWhereInput => {
  const search = searchParams.get("search")?.trim();
  const hosting = searchParams.get("hostingProvider");
  const project = searchParams.get("project");
  const country = searchParams.get("country");
  const pic = searchParams.get("pic")?.trim();
  const expiry = searchParams.get("expiry");
  const usageType = searchParams.get("usageType") as UsageType | null;

  const clauses: Prisma.DomainWhereInput[] = [{ status: "taken" }];

  if (hosting) clauses.push({ hosting });
  if (project) clauses.push({ usedForProject: project });
  if (country) clauses.push({ usedForCountry: country });
  if (pic) {
    clauses.push({
      usedForPic: {
        equals: pic,
        mode: "insensitive",
      },
    });
  }

  if (search) {
    clauses.push({
      OR: [
        { domain: { contains: search, mode: "insensitive" } },
        { hosting: { contains: search, mode: "insensitive" } },
        { account: { contains: search, mode: "insensitive" } },
        { usedForProject: { contains: search, mode: "insensitive" } },
        { usedForCountry: { contains: search, mode: "insensitive" } },
        { usedForPic: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const expiryWhere = getExpiryWhere(expiry);
  if (expiryWhere) clauses.push({ expiry: expiryWhere });

  if (usageType === "backup") {
    clauses.push({
      OR: [{ usedForPic: null }, ...EMPTY_PIC_VALUES.map((value) => ({ usedForPic: value }))],
    });
  }

  if (usageType === "pic") {
    clauses.push({
      AND: [
        { NOT: { usedForPic: null } },
        ...EMPTY_PIC_VALUES.map((value) => ({ NOT: { usedForPic: value } })),
      ],
    });
  }

  return clauses.length === 1 ? clauses[0] : { AND: clauses };
};

const buildHistoryWhereSql = (searchParams: URLSearchParams) => {
  const hosting = searchParams.get("hostingProvider");
  const project = searchParams.get("project");
  const country = searchParams.get("country");
  const pic = searchParams.get("pic")?.trim();
  const search = searchParams.get("search")?.trim();
  const expiry = searchParams.get("expiry");
  const usageType = searchParams.get("usageType") as UsageType | null;

  const clauses: Prisma.Sql[] = [];

  if (hosting) clauses.push(Prisma.sql`dh."hosting" = ${hosting}`);
  if (project) clauses.push(Prisma.sql`dh."project" = ${project}`);
  if (country) clauses.push(Prisma.sql`dh."country" = ${country}`);
  if (pic) {
    clauses.push(Prisma.sql`LOWER(COALESCE(dh."usedForPic", '')) = LOWER(${pic})`);
  }

  if (search) {
    const likeSearch = `%${search.toLowerCase()}%`;
    clauses.push(Prisma.sql`
      (
        LOWER(dh."domain") LIKE ${likeSearch}
        OR LOWER(dh."hosting") LIKE ${likeSearch}
        OR LOWER(COALESCE(d."account", '')) LIKE ${likeSearch}
        OR LOWER(dh."project") LIKE ${likeSearch}
        OR LOWER(dh."country") LIKE ${likeSearch}
        OR LOWER(COALESCE(dh."usedForPic", '')) LIKE ${likeSearch}
      )
    `);
  }

  const expiryWhere = getExpiryWhere(expiry);
  if (expiryWhere?.lt) clauses.push(Prisma.sql`dh."expiry" < ${expiryWhere.lt}`);
  if (expiryWhere?.gte && expiryWhere?.lte) {
    clauses.push(Prisma.sql`dh."expiry" >= ${expiryWhere.gte} AND dh."expiry" <= ${expiryWhere.lte}`);
  }

  if (usageType === "backup") {
    clauses.push(Prisma.sql`(dh."usedForPic" IS NULL OR BTRIM(dh."usedForPic") IN ('', '-', '—'))`);
  }

  if (usageType === "pic") {
    clauses.push(Prisma.sql`(dh."usedForPic" IS NOT NULL AND BTRIM(dh."usedForPic") NOT IN ('', '-', '—'))`);
  }

  if (clauses.length === 0) return Prisma.empty;

  return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
    const includeTotal = searchParams.get("includeTotal") !== "false";
    const skip = (page - 1) * pageSize;
    const whereSql = buildHistoryWhereSql(searchParams);

    try {
      const items = await prisma.$queryRaw<
        Array<{
          id: string;
          domainId: string;
          domain: string;
          hosting: string;
          account: string | null;
          expiry: Date | null;
          project: string;
          country: string;
          usedForPic: string | null;
          createdAt: Date;
        }>
      >(Prisma.sql`
        SELECT
          dh."id",
          dh."domainId",
          dh."domain",
          dh."hosting",
          d."account",
          dh."expiry",
          dh."project",
          dh."country",
          dh."usedForPic",
          dh."createdAt"
        FROM "DomainHistory" dh
        LEFT JOIN "Domain" d ON d."id" = dh."domainId"
        ${whereSql}
        ORDER BY dh."createdAt" DESC
        OFFSET ${skip}
        LIMIT ${pageSize}
      `);

      const total = includeTotal
        ? await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
            SELECT COUNT(*)::int AS total
            FROM "DomainHistory" dh
            LEFT JOIN "Domain" d ON d."id" = dh."domainId"
            ${whereSql}
          `)
        : undefined;

      return NextResponse.json({
        items: items.map((item) => ({
          ...item,
          account: item.account || "-",
          usageType: getUsageType(item.usedForPic),
          status: "taken" as const,
          canUndo:
            Date.now() - new Date(item.createdAt).getTime() <= UNDO_WINDOW_MS,
        })),
        total: total?.[0]?.total,
        page,
        pageSize,
      });
    } catch (rawError) {
      console.warn("Falling back to legacy domain-history query path", rawError);
    }

    const where = buildLegacyWhere(searchParams);
    const select = await getDomainSelect();
    const takenDomains = await prisma.domain.findMany({
      where,
      select,
      orderBy: { usedAt: "desc" },
      skip,
      take: pageSize,
    });
    const total = includeTotal ? await prisma.domain.count({ where }) : undefined;

    return NextResponse.json({
      items: takenDomains.map((domain) => ({
        id: `legacy-${domain.id}`,
        domainId: domain.id,
        domain: domain.domain,
        hosting: domain.hosting,
        account: domain.account,
        expiry: domain.expiry,
        project: domain.usedForProject || domain.project,
        country: domain.usedForCountry || domain.country,
        usedForPic: domain.usedForPic || null,
        createdAt: domain.usedAt || domain.createdAt,
        usageType: getUsageType(domain.usedForPic),
        status: "taken" as const,
        canUndo:
          Date.now() - new Date(domain.usedAt || domain.createdAt).getTime() <=
          UNDO_WINDOW_MS,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Failed to load domain history", error);
    return NextResponse.json(
      {
        items: [],
        total: 0,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
      },
      { status: 200 }
    );
  }
}
