import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country")?.trim() ?? "";
  const pic = searchParams.get("pic")?.trim() ?? "";

  if (!country || !pic) {
    return NextResponse.json(
      { error: "Country and PIC are required." },
      { status: 400 }
    );
  }

  const latestTaken = await prisma.domain.findFirst({
    where: {
      status: "taken",
      usedForCountry: {
        equals: country,
        mode: "insensitive",
      },
      usedForPic: {
        equals: pic,
        mode: "insensitive",
      },
    },
    orderBy: [
      { usedAt: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      hosting: true,
      usedForCountry: true,
      usedForPic: true,
    },
  });

  return NextResponse.json({
    lastProvider: latestTaken?.hosting ?? null,
    usedForCountry: latestTaken?.usedForCountry ?? null,
    usedForPic: latestTaken?.usedForPic ?? null,
  });
}
