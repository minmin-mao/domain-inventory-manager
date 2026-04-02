import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/domain/textUtils";
import { notifyInventoryUpdated } from "@/lib/realtime/domainEvents";
import { NextResponse } from "next/server";

const UNDO_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

type DomainHistoryDelegate = {
  findUnique: (args: {
    where: { id: string };
  }) => Promise<{
    id: string;
    domainId: string;
    createdAt: Date;
    usedForPic?: string | null;
  } | null>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  update?: (args: {
    where: { id: string };
    data: { usedForPic: string };
  }) => Promise<unknown>;
};

function getHistoryDelegate() {
  return (prisma as typeof prisma & {
    domainHistory?: DomainHistoryDelegate;
  }).domainHistory;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const historyDelegate = getHistoryDelegate();
  const isLegacyRow = id.startsWith("legacy-");
  const domainId = isLegacyRow ? id.replace(/^legacy-/, "") : null;
  const rawBody = await req.text();
  const body = rawBody ? JSON.parse(rawBody) as { pic?: string } : {};
  const requestedPic =
    typeof body.pic === "string" && body.pic.trim()
      ? capitalizeText(body.pic.trim())
      : null;

  if (requestedPic) {
    if (!historyDelegate || isLegacyRow) {
      return NextResponse.json(
        { error: "PIC assignment is unavailable for this row." },
        { status: 400 }
      );
    }

    const historyRow = await historyDelegate.findUnique({
      where: { id },
    });

    if (!historyRow) {
      return NextResponse.json({ error: "History row not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const txHistoryDelegate = (tx as typeof tx & {
        domainHistory?: DomainHistoryDelegate;
      }).domainHistory;

      await tx.domain.update({
        where: { id: historyRow.domainId },
        data: {
          usedForPic: requestedPic,
        },
      });

      await txHistoryDelegate?.update?.({
        where: { id: historyRow.id },
        data: { usedForPic: requestedPic },
      });
    });

    notifyInventoryUpdated({
      source: "history",
      refreshDomains: false,
      refreshHistory: true,
      refreshOptions: true,
      includeTotal: true,
    });

    return NextResponse.json({ success: true });
  }

  if (!historyDelegate && !isLegacyRow) {
    return NextResponse.json(
      { error: "History actions are unavailable until Prisma reloads." },
      { status: 503 }
    );
  }

  const historyRow = isLegacyRow
    ? null
    : await historyDelegate?.findUnique({
        where: { id },
      });

  const effectiveDomainId = historyRow?.domainId || domainId;

  if (!effectiveDomainId) {
    return NextResponse.json({ error: "History row not found" }, { status: 404 });
  }

  const cutoffTime = isLegacyRow
    ? Date.now()
    : historyRow!.createdAt.getTime() + UNDO_WINDOW_MS;

  if (Date.now() > cutoffTime) {
    return NextResponse.json(
      { error: "Undo is only available for the first 2 days." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.domain.update({
      where: { id: effectiveDomainId },
      data: {
        status: "available",
        usedAt: null,
        usedForProject: null,
        usedForCountry: null,
        usedForPic: null,
      },
    });

    if (historyRow) {
      const txHistoryDelegate = (tx as typeof tx & {
        domainHistory?: DomainHistoryDelegate;
      }).domainHistory;

      await txHistoryDelegate?.delete({
        where: { id: historyRow.id },
      });
    }
  });

  notifyInventoryUpdated({
    source: "history",
    refreshDomains: true,
    refreshHistory: true,
    refreshOptions: false,
    includeTotal: true,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const historyDelegate = getHistoryDelegate();

  if (!historyDelegate) {
    return NextResponse.json(
      { error: "History actions are unavailable until Prisma reloads." },
      { status: 503 }
    );
  }

  const historyRow = await historyDelegate.findUnique({
    where: { id },
  });

  if (!historyRow) {
    return NextResponse.json({ error: "History row not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const txHistoryDelegate = (tx as typeof tx & {
      domainHistory?: DomainHistoryDelegate;
    }).domainHistory;

    await txHistoryDelegate?.delete({
      where: { id },
    });

    await tx.domain.delete({
      where: { id: historyRow.domainId },
    });
  });

  notifyInventoryUpdated({
    source: "history",
    refreshDomains: true,
    refreshHistory: true,
    refreshOptions: true,
    includeTotal: true,
  });

  return NextResponse.json({ success: true });
}
