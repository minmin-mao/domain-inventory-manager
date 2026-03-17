import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const UNDO_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

type DomainHistoryDelegate = {
  findUnique: (args: {
    where: { id: string };
  }) => Promise<{
    id: string;
    domainId: string;
    createdAt: Date;
  } | null>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

function getHistoryDelegate() {
  return (prisma as typeof prisma & {
    domainHistory?: DomainHistoryDelegate;
  }).domainHistory;
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const historyDelegate = getHistoryDelegate();
  const isLegacyRow = id.startsWith("legacy-");
  const domainId = isLegacyRow ? id.replace(/^legacy-/, "") : null;

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

  await historyDelegate.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
