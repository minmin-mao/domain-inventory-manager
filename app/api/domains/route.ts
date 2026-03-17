import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/domain/domainUtils";
import { capitalizeText } from "@/lib/domain/textUtils";
import { NextResponse } from "next/server";

const normalizeText = (value: unknown) =>
  typeof value === "string" ? capitalizeText(value.trim()) : "";

const parseExpiry = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return null;

  const trimmed = value.trim();
  const localDateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const normalizedValue = localDateMatch
    ? `${localDateMatch[3]}-${localDateMatch[2]}-${localDateMatch[1]}`
    : trimmed;

  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// GET all domains
export async function GET() {
  const domains = await prisma.domain.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(domains);
}

// CREATE new domain
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const expiry = parseExpiry(body.expiry);

    const domain = await prisma.domain.create({
      data: {
        domain: normalizeDomain(body.domain),
        hosting: normalizeText(body.hosting),
        account: normalizeText(body.account),
        project: normalizeText(body.project),
        country: normalizeText(body.country),
        ...(expiry ? { expiry } : {}),
        status: "available",
      },
    });

    return NextResponse.json(domain);
  } catch (error) {
    console.error("Failed to create domain", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to create domain.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// UPDATE domain
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const expiry = parseExpiry(body.expiry);

    const updated = await prisma.domain.update({
      where: { id: body.id },
      data: {
        domain: normalizeDomain(body.domain),
        hosting: normalizeText(body.hosting),
        account: normalizeText(body.account),
        project: normalizeText(body.project),
        country: normalizeText(body.country),
        ...(expiry ? { expiry } : { expiry: null }),
        status: body.status,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update domain", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Failed to update domain.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE domain
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.domain.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
