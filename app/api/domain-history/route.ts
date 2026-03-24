import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const UNDO_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 10;

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

const buildWhere = (searchParams: URLSearchParams): Prisma.DomainHistoryWhereInput => {
  const search = searchParams.get("search")?.trim();
  const hosting = searchParams.get("hostingProvider");
  const project = searchParams.get("project");
  const country = searchParams.get("country");
  const expiry = searchParams.get("expiry");

  return {
    ...(search
      ? {
          OR: [
            { domain: { contains: search, mode: "insensitive" } },
            { project: { contains: search, mode: "insensitive" } },
            { hosting: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(hosting ? { hosting } : {}),
    ...(project ? { project } : {}),
    ...(country ? { country } : {}),
    ...(getExpiryWhere(expiry) ? { expiry: getExpiryWhere(expiry) } : {}),
  };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
    const includeTotal = searchParams.get("includeTotal") !== "false";
    const where = buildWhere(searchParams);
    const skip = (page - 1) * pageSize;

    const historyDelegate = (prisma as typeof prisma & {
      domainHistory?: {
        findMany: (args: {
          where?: Prisma.DomainHistoryWhereInput;
          orderBy: { createdAt: "desc" };
          skip?: number;
          take?: number;
        }) => Promise<
          Array<{
            id: string;
            domainId: string;
            domain: string;
            hosting: string;
            expiry: Date;
            project: string;
            country: string;
            createdAt: Date;
          }>
        >;
        count: (args: { where?: Prisma.DomainHistoryWhereInput }) => Promise<number>;
      };
    }).domainHistory;
    if (historyDelegate) {
      const [rows, total] = await Promise.all([
        historyDelegate.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        includeTotal ? historyDelegate.count({ where }) : Promise.resolve(undefined),
      ]);

      const items = rows.map((item) => ({
        ...item,
        status: "taken" as const,
        canUndo:
          Date.now() - new Date(item.createdAt).getTime() <= UNDO_WINDOW_MS,
      }));

      return NextResponse.json({
        items,
        total,
        page,
        pageSize,
      });
    }

    // Legacy fallback when DomainHistory delegate is unavailable.
    const takenDomains = await prisma.domain.findMany({
      where: { status: "taken" },
      orderBy: { usedAt: "desc" },
      skip,
      take: pageSize,
    });

    const items = takenDomains.map((domain) => ({
      id: `legacy-${domain.id}`,
      domainId: domain.id,
      domain: domain.domain,
      hosting: domain.hosting,
      expiry: domain.expiry,
      project: domain.usedForProject || domain.project,
      country: domain.usedForCountry || domain.country,
      createdAt: domain.usedAt || domain.createdAt,
      status: "taken" as const,
      canUndo:
        Date.now() - new Date(domain.usedAt || domain.createdAt).getTime() <=
        UNDO_WINDOW_MS,
    }));

    const total = includeTotal
      ? await prisma.domain.count({ where: { status: "taken" } })
      : undefined;

    return NextResponse.json({
      items,
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
