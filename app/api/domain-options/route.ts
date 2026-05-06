import { Prisma } from "@prisma/client";
import { DEFAULT_LANGUAGE_OPTIONS, getEffectiveLanguage } from "@/lib/domain/languageUtils";
import { hasDomainLanguageColumn } from "@/lib/domain/domainDb";
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

type DomainOptionItem = {
  hosting: string;
  account: string;
  project: string;
  country: string;
  language?: string | null;
  reservedForProject: string | null;
  reservedForCountry: string | null;
  reservedForPic: string | null;
  usedForProject: string | null;
  usedForCountry: string | null;
  usedForPic: string | null;
};

type DomainHistoryOptionItem = {
  hosting: string;
  project: string;
  country: string;
  usedForPic: string | null;
};

type DomainHistoryOptionDelegate = {
  findMany: (args: {
    select: { hosting: true; project: true; country: true; usedForPic: true };
  }) => Promise<DomainHistoryOptionItem[]>;
};

type LanguageSelectableDomain = DomainOptionItem & {
  language?: string | null;
};

export async function GET() {
  try {
    const canSelectLanguage = await hasDomainLanguageColumn();
    const domainSelect = {
      hosting: true,
      account: true,
      project: true,
      country: true,
      reservedForProject: true,
      reservedForCountry: true,
      reservedForPic: true,
      usedForProject: true,
      usedForCountry: true,
      usedForPic: true,
      ...(canSelectLanguage ? { language: true } : {}),
    } satisfies Prisma.DomainSelect;

    const [domains, history] = await Promise.all([
      prisma.domain.findMany({
        select: domainSelect,
      }) as Promise<DomainOptionItem[]>,
      (prisma as typeof prisma & {
        domainHistory?: DomainHistoryOptionDelegate;
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
        country: item.reservedForCountry || item.usedForCountry || item.country,
        pic: item.reservedForPic || item.usedForPic,
      })),
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
        ...domains.map((item) => item.reservedForProject),
        ...domains.map((item) => item.usedForProject),
        ...history.map((item) => item.project),
      ]),
      country: uniqueSorted([
        ...domains.map((item) => item.country),
        ...domains.map((item) => item.reservedForCountry),
        ...domains.map((item) => item.usedForCountry),
        ...history.map((item) => item.country),
      ]),
      language: uniqueSorted([
        ...DEFAULT_LANGUAGE_OPTIONS,
        ...domains.map((item: LanguageSelectableDomain) =>
          getEffectiveLanguage(item.language, item.country)
        ),
      ]),
      pic: uniqueSorted([
        ...domains.map((item) => item.reservedForPic),
        ...domains.map((item) => item.usedForPic),
        ...history.map((item) => item.usedForPic),
      ]),
      picByCountry,
    });
  } catch (error) {
    console.error("Failed to load domain options", error);
    return NextResponse.json(
      {
        hosting: [],
        account: [],
        project: [],
        country: [],
        language: DEFAULT_LANGUAGE_OPTIONS,
        pic: [],
        picByCountry: {},
      },
      { status: 500 }
    );
  }
}
