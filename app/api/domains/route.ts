import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
      hosting: body.hosting,
      account: body.account,
      project: body.project,
      country: body.country,
      expiry: new Date(body.expiry),
      status: "available",
    },
  });

  return NextResponse.json(domain);
}