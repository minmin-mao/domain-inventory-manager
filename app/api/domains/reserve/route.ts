import { getDomainSelect } from "@/lib/domain/domainDb";
import { prisma } from "@/lib/prisma";
import { capitalizeText } from "@/lib/domain/textUtils";
import { notifyInventoryUpdated } from "@/lib/realtime/domainEvents";
import { NextResponse } from "next/server";

type ReserveDomainBody = {
  id?: string;
  project?: string;
  country?: string;
  pic?: string;
};

const normalizeText = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? capitalizeText(trimmed) : undefined;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReserveDomainBody;
    const domainId = body.id?.trim();
    const project = normalizeText(body.project);
    const country = normalizeText(body.country);
    const pic = normalizeText(body.pic);

    if (!domainId) {
      return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
    }

    if (!project) {
      return NextResponse.json({ error: "Project is required" }, { status: 400 });
    }

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }

    const select = await getDomainSelect();
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      select,
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domain.status !== "available") {
      return NextResponse.json(
        { error: "Only available domains can be reserved" },
        { status: 400 }
      );
    }

    const reservedAt = new Date();

    const updatedDomain = await prisma.domain.update({
      where: { id: domain.id },
      select,
      data: {
        status: "reserved",
        reservedAt,
        reservedForProject: project,
        reservedForCountry: country,
        reservedForPic: pic ?? null,
      },
    });

    await notifyInventoryUpdated({
      source: "domains",
      refreshDomains: true,
      refreshHistory: false,
      refreshOptions: true,
      includeTotal: true,
    });

    return NextResponse.json(updatedDomain);
  } catch (error) {
    console.error("Failed to reserve domain", error);
    return NextResponse.json(
      { error: "Failed to reserve domain." },
      { status: 500 }
    );
  }
}
