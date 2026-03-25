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
        usedForPic: true,
      },
    }),
    (prisma as typeof prisma & {
      domainHistory?: {
        findMany: (args: {
          select: { hosting: true; project: true; country: true; usedForPic: true };
        }) => Promise<Array<{ hosting: string; project: string; country: string; usedForPic: string | null }>>;
      };
    }).domainHistory?.findMany({
      select: {
        hosting: true,
        project: true,
        country: true,
        usedForPic: true,
      },
    }) ?? Promise.resolve([]),
  ]);

  const picEntries = [
    ...domains.map((item) => ({
      country: item.usedForCountry || item.country,
      pic: item.usedForPic,
    })),
    ...history.map((item) => ({
      country: item.country,
      pic: item.usedForPic,
    })),
  ].filter((item) => item.pic && item.country) as Array<{ country: string; pic: string }>;

  const picByCountry = picEntries.reduce<Record<string, string[]>>((acc, item) => {
    const countryKey = item.country.trim();
    if (!countryKey) return acc;

    acc[countryKey] = acc[countryKey] ?? [];
    if (!acc[countryKey].includes(item.pic)) {
      acc[countryKey].push(item.pic);
    }

    return acc;
  }, {});

  Object.keys(picByCountry).forEach((countryKey) => {
    picByCountry[countryKey].sort((a, b) => a.localeCompare(b));
  });

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
    pic: uniqueSorted([
      ...domains.map((item) => item.usedForPic),
      ...history.map((item) => item.usedForPic),
    ]),
    picByCountry,
  });
}
