import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  const [domains, history] = await Promise.all([
    prisma.domain.findMany({
      select: {
        hosting: true,
        account: true,
        project: true,
        country: true,
        usedForProject: true,
        usedForCountry: true,
      },
    }),
    (prisma as typeof prisma & {
      domainHistory?: {
        findMany: (args: {
          select: { hosting: true; project: true; country: true };
        }) => Promise<Array<{ hosting: string; project: string; country: string }>>;
      };
    }).domainHistory?.findMany({
      select: {
        hosting: true,
        project: true,
        country: true,
      },
    }) ?? Promise.resolve([]),
  ]);

  return NextResponse.json({
    hosting: uniqueSorted([
      ...domains.map((item) => item.hosting),
      ...history.map((item) => item.hosting),
    ]),
    account: uniqueSorted(domains.map((item) => item.account)),
    project: uniqueSorted([
      ...domains.map((item) => item.project),
      ...domains.map((item) => item.usedForProject),
      ...history.map((item) => item.project),
    ]),
    country: uniqueSorted([
      ...domains.map((item) => item.country),
      ...domains.map((item) => item.usedForCountry),
      ...history.map((item) => item.country),
    ]),
  });
}
