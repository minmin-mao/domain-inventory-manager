import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/domain/textUtils";
import { NextResponse } from "next/server";

type DomainHistoryCreateInput = {
  domainId: string;
  domain: string;
  hosting: string;
  expiry: Date | null;
  project: string;
  country: string;
  createdAt: Date;
};

type UseDomainBody = {
  id?: string;
  project?: string;
  country?: string;
};

const normalizeText = (value: string | undefined) =>
  value ? capitalizeText(value.trim()) : undefined;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UseDomainBody;

    const domainId = body.id?.trim();
    const project = normalizeText(body.project);
    const country = normalizeText(body.country);

    if (!domainId) {
      return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
    }

    if (!project) {
      return NextResponse.json({ error: "Project is required" }, { status: 400 });
    }

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domain.status !== "available") {
      return NextResponse.json(
        { error: "Only available domains can be used" },
        { status: 400 }
      );
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
              ...(domain.expiry ? { expiry: domain.expiry } : {}),
              project,
              country,
              createdAt: now,
            },
          })
        : null;

      const updatedDomain = await tx.domain.update({
        where: { id: domain.id },
        data: {
          status: "taken",
          usedAt: now,
          usedForProject: project,
          usedForCountry: country,
        },
      });

      return { history, updatedDomain };
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
