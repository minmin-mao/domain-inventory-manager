import { getDomainSelect } from "@/lib/domain/domainDb";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/domain/textUtils";
import { notifyInventoryUpdated } from "@/lib/realtime/domainEvents";
import { NextResponse } from "next/server";

type DomainHistoryCreateInput = {
  domainId: string;
  domain: string;
  hosting: string;
  expiry: Date | null;
  project: string;
  country: string;
  usedForPic: string | null;
  createdAt: Date;
};

type UseDomainBody = {
  id?: string;
  project?: string;
  country?: string;
  pic?: string;
  useMode?: "pic" | "backup";
};

const normalizeText = (value: string | undefined) =>
  value ? capitalizeText(value.trim()) : undefined;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UseDomainBody;

    const domainId = body.id?.trim();
    const requestedProject = normalizeText(body.project);
    const requestedCountry = normalizeText(body.country);
    const requestedPic = normalizeText(body.pic);
    const useMode = body.useMode === "backup" ? "backup" : "pic";

    if (!domainId) {
      return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
    }

    const select = await getDomainSelect();
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      select,
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domain.status !== "available" && domain.status !== "reserved") {
      return NextResponse.json(
        { error: "Only available or reserved domains can be used" },
        { status: 400 }
      );
    }

    const project =
      domain.status === "reserved"
        ? requestedProject || normalizeText(domain.reservedForProject ?? undefined)
        : normalizeText(domain.project);
    const country =
      requestedCountry || normalizeText(domain.reservedForCountry ?? undefined);
    const pic =
      useMode === "backup"
        ? null
        : requestedPic || normalizeText(domain.reservedForPic ?? undefined) || null;

    if (!project) {
      return NextResponse.json({ error: "Project is required" }, { status: 400 });
    }

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }

    if (useMode === "pic" && !pic) {
      return NextResponse.json({ error: "PIC is required" }, { status: 400 });
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const historyDelegate = (tx as typeof tx & {
        domainHistory?: {
          create: (args: { data: DomainHistoryCreateInput }) => Promise<{
            id: string;
            domainId: string;
            domain: string;
            hosting: string;
            expiry: Date;
            project: string;
            country: string;
            createdAt: Date;
          }>;
        };
      }).domainHistory;

      const history = historyDelegate
        ? await historyDelegate.create({
            data: {
              domainId: domain.id,
              domain: domain.domain,
              hosting: domain.hosting,
              expiry: domain.expiry ?? null,
              project,
              country,
              usedForPic: pic ?? null,
              createdAt: now,
            },
          })
        : null;

      const updatedDomain = await tx.domain.update({
        where: { id: domain.id },
        select,
        data: {
          status: "taken",
          reservedAt: null,
          reservedForProject: null,
          reservedForCountry: null,
          reservedForPic: null,
          usedAt: now,
          usedForProject: project,
          usedForCountry: country,
          usedForPic: pic ?? null,
        },
      });

      return { history, updatedDomain };
    });

    await notifyInventoryUpdated({
      source: "use",
      refreshDomains: true,
      refreshHistory: true,
      refreshOptions: false,
      includeTotal: true,
    });

    return NextResponse.json({
      ...result,
      history: result.history
        ? {
            ...result.history,
            status: "taken" as const,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to use domain", error);
    return NextResponse.json(
      { error: "Failed to use domain." },
      { status: 500 }
    );
  }
}
