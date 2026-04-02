import { prisma } from "@/lib/prisma";
import { notifyInventoryUpdated } from "@/lib/realtime/domainEvents";
import { NextResponse } from "next/server";

type ReleaseDomainBody = {
  id?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReleaseDomainBody;
    const domainId = body.id?.trim();

    if (!domainId) {
      return NextResponse.json({ error: "Missing domain id" }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    if (domain.status !== "reserved") {
      return NextResponse.json(
        { error: "Only reserved domains can be released" },
        { status: 400 }
      );
    }

    const updatedDomain = await prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: "available",
        reservedAt: null,
        reservedForProject: null,
        reservedForCountry: null,
        reservedForPic: null,
      },
    });

    notifyInventoryUpdated({
      source: "domains",
      refreshDomains: true,
      refreshHistory: false,
      refreshOptions: true,
      includeTotal: true,
    });

    return NextResponse.json(updatedDomain);
  } catch (error) {
    console.error("Failed to release domain", error);
    return NextResponse.json(
      { error: "Failed to release domain." },
      { status: 500 }
    );
  }
}
