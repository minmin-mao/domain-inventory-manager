import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const EMPTY_COUNTRY_VALUES = ["", "-", "—"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project")?.trim() ?? "";
  const country = searchParams.get("country")?.trim() ?? "";
  const strictCountry = searchParams.get("strictCountry") === "true";

  if (!project) {
    return NextResponse.json(
      { error: "Project name is required." },
      { status: 400 }
    );
  }

  if (!country) {
    return NextResponse.json(
      { error: "Country is required to request a domain." },
      { status: 400 }
    );
  }

  const matches = await prisma.domain.findMany({
    where: {
      status: "available",
      project: {
        contains: project,
        mode: "insensitive",
      },
      ...(strictCountry
        ? {
            country: {
              equals: country,
              mode: "insensitive",
            },
          }
        : {
            OR: [
              {
                country: {
                  equals: country,
                  mode: "insensitive",
                },
              },
              ...EMPTY_COUNTRY_VALUES.map((value) => ({
                country: value,
              })),
            ],
          }),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(matches);
}
