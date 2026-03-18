import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const UNDO_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 10;

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const matchesExpiryFilter = (expiry: Date | null, filter: string | null) => {
  if (!filter || filter === "all") return true;
  if (!expiry) return false;

  const now = Date.now();
  const diffDays = Math.ceil((expiry.getTime() - now) / (1000 * 60 * 60 * 24));
  const isExpired = expiry.getTime() < now;

  switch (filter) {
    case "expired":
      return isExpired;
    case "le30":
      return !isExpired && diffDays <= 30;
    case "le60":
      return !isExpired && diffDays <= 60;
    default:
      return true;
  }
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
    const includeTotal = searchParams.get("includeTotal") !== "false";
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const hosting = searchParams.get("hostingProvider");
    const project = searchParams.get("project");
    const country = searchParams.get("country");
    const expiryFilter = searchParams.get("expiry");

    const historyDelegate = (prisma as typeof prisma & {
      domainHistory?: {
        findMany: (args: { orderBy: { createdAt: "desc" } }) => Promise<
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
      };
    }).domainHistory;

    const [history, takenDomains] = await Promise.all([
      historyDelegate
        ? historyDelegate.findMany({
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      prisma.domain.findMany({
        where: { status: "taken" },
        orderBy: { usedAt: "desc" },
      }),
    ]);

    const existingHistoryDomainIds = new Set(history.map((item) => item.domainId));

    const legacyHistory = takenDomains
      .filter((domain) => !existingHistoryDomainIds.has(domain.id))
      .map((domain) => ({
        id: `legacy-${domain.id}`,
        domainId: domain.id,
        domain: domain.domain,
        hosting: domain.hosting,
        expiry: domain.expiry,
        project: domain.usedForProject || domain.project,
        country: domain.usedForCountry || domain.country,
        createdAt: domain.usedAt || domain.createdAt,
        status: "taken" as const,
        canUndo: Date.now() - new Date(domain.usedAt || domain.createdAt).getTime() <= UNDO_WINDOW_MS,
      }));

    const payload = [...history.map((item) => ({
      ...item,
      status: "taken" as const,
      canUndo:
        Date.now() - new Date(item.createdAt).getTime() <= UNDO_WINDOW_MS,
    })), ...legacyHistory].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const filtered = payload.filter((item) => {
      if (search) {
        const haystack = [
          item.domain,
          item.project,
          item.hosting,
          item.country,
        ].join(" ").toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      if (hosting && item.hosting !== hosting) return false;
      if (project && item.project !== project) return false;
      if (country && item.country !== country) return false;
      if (!matchesExpiryFilter(item.expiry, expiryFilter)) return false;

      return true;
    });

    if (!searchParams.has("page") && !searchParams.has("pageSize")) {
      return NextResponse.json(filtered);
    }

    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      items,
      total: includeTotal ? filtered.length : undefined,
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
