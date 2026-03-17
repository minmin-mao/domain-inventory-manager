import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const UNDO_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export async function GET() {
  try {
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

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load domain history", error);
    return NextResponse.json([], { status: 200 });
  }
}
