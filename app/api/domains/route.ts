import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const uppercaseText = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

// GET all domains
export async function GET() {
  const domains = await prisma.domain.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(domains);
}

// CREATE new domain
export async function POST(req: Request) {
  const body = await req.json();

  const domain = await prisma.domain.create({
    data: {
      domain: body.domain,
      hosting: uppercaseText(body.hosting),
      account: uppercaseText(body.account),
      project: uppercaseText(body.project),
      country: uppercaseText(body.country),
      expiry: new Date(body.expiry),
      status: "available",
    },
  });

  return NextResponse.json(domain);
}

// UPDATE domain
export async function PUT(req: Request) {
  const body = await req.json();

  const updated = await prisma.domain.update({
    where: { id: body.id },
    data: {
      domain: body.domain,
      hosting: uppercaseText(body.hosting),
      account: uppercaseText(body.account),
      project: uppercaseText(body.project),
      country: uppercaseText(body.country),
      expiry: new Date(body.expiry),
      status: body.status,
    },
  });

  return NextResponse.json(updated);
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
