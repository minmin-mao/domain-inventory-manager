import { getDomainSelect } from "@/lib/domain/domainDb";
import {
  deriveLanguageFromCountry,
  getEffectiveLanguage,
  getMappedLanguageFromCountry,
  isEmptyCountryValue,
  normalizeCountryCode,
  normalizeLanguageCode,
} from "@/lib/domain/languageUtils";
import { isNormalizedProjectMatch } from "@/lib/domain/projectUtils";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type SuggestedMatch = {
  id: string;
  domain: string;
  hosting: string;
  account: string;
  project: string;
  country: string;
  language?: string | null;
  expiry: Date | null;
  reservedAt: Date | null;
  reservedForProject: string | null;
  reservedForCountry: string | null;
  reservedForPic: string | null;
  usedAt: Date | null;
  usedForProject: string | null;
  usedForCountry: string | null;
  usedForPic: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: "available" | "reserved" | "taken";
};

type ScoredSuggestedMatch = SuggestedMatch & {
  score: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project")?.trim() ?? "";
  const country = searchParams.get("country")?.trim() ?? "";
  const onlyMatchingLanguage = searchParams.get("onlyMatchingLanguage") === "true";

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

  const requestCountry = normalizeCountryCode(country);
  const mappedLanguage = getMappedLanguageFromCountry(country);
  const select = await getDomainSelect();

  const availableMatches = await prisma.domain.findMany({
    where: {
      status: "available",
    },
    select,
    orderBy: { createdAt: "asc" },
  }) as SuggestedMatch[];

  const projectMatches = availableMatches.filter((item) =>
    isNormalizedProjectMatch(item.project, project)
  );

  const exactCountryAnyLanguage = projectMatches.filter((item) => {
    const itemCountry = normalizeCountryCode(item.country);
    return itemCountry === requestCountry;
  });
  const hasExactCountryMatches = exactCountryAnyLanguage.length > 0;
  const exactCountryPrimaryLanguage = hasExactCountryMatches
    ? getEffectiveLanguage(
        exactCountryAnyLanguage[0]?.language,
        exactCountryAnyLanguage[0]?.country
      )
    : null;
  const derivedLanguage = mappedLanguage ?? deriveLanguageFromCountry(country);
  const selectedLanguage = exactCountryPrimaryLanguage ?? derivedLanguage;

  const exactCountrySameLanguage = projectMatches.filter((item) => {
    const itemCountry = normalizeCountryCode(item.country);
    const itemLanguage = getEffectiveLanguage(item.language, item.country);

    return itemCountry === requestCountry && itemLanguage === selectedLanguage;
  });

  const exactCountryDifferentLanguage = projectMatches.filter((item) => {
    const itemCountry = normalizeCountryCode(item.country);
    const itemLanguage = getEffectiveLanguage(item.language, item.country);

    return itemCountry === requestCountry && itemLanguage !== selectedLanguage;
  });

  const globalSameLanguage = projectMatches.filter((item) => {
    const itemCountry = normalizeCountryCode(item.country);
    const itemLanguage = getEffectiveLanguage(item.language, item.country);

    return isEmptyCountryValue(itemCountry) && itemLanguage === selectedLanguage;
  });

  const otherCountrySameLanguage = projectMatches.filter((item) => {
    const itemCountry = normalizeCountryCode(item.country);
    const itemLanguage = getEffectiveLanguage(item.language, item.country);

    return (
      itemCountry !== requestCountry &&
      !isEmptyCountryValue(itemCountry) &&
      itemLanguage === selectedLanguage
    );
  });

  const globalFallback = projectMatches.filter((item) => {
    const itemCountry = normalizeCountryCode(item.country);

    return isEmptyCountryValue(itemCountry);
  });

  const defaultLanguageFallback = projectMatches.filter((item) => {
    const itemLanguage = normalizeLanguageCode(
      getEffectiveLanguage(item.language, item.country)
    );

    return itemLanguage === "EN";
  });

  const scoredMatches = new Map<string, ScoredSuggestedMatch>();

  const assignBucketScore = (items: SuggestedMatch[], score: number) => {
    items.forEach((item) => {
      const existing = scoredMatches.get(item.id);
      if (!existing || score > existing.score) {
        scoredMatches.set(item.id, {
          ...item,
          score,
        });
      }
    });
  };

  if (hasExactCountryMatches) {
    assignBucketScore(exactCountrySameLanguage, 5);
    if (!onlyMatchingLanguage) {
      assignBucketScore(exactCountryDifferentLanguage, 4);
      assignBucketScore(globalSameLanguage, 3);
      assignBucketScore(defaultLanguageFallback, 1);
    } else {
      assignBucketScore(globalSameLanguage, 3);
      assignBucketScore(otherCountrySameLanguage, 2);
    }
  } else if (mappedLanguage) {
    assignBucketScore(exactCountrySameLanguage, 5);
    if (!onlyMatchingLanguage) {
      assignBucketScore(exactCountryDifferentLanguage, 4);
    }
    assignBucketScore(globalSameLanguage, 3);
    assignBucketScore(otherCountrySameLanguage, 2);
    if (!onlyMatchingLanguage) {
      assignBucketScore(defaultLanguageFallback, 1);
    }
  } else if (!onlyMatchingLanguage) {
    assignBucketScore(globalFallback, 1);
  }

  const matches = [...scoredMatches.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .map((item) => {
      const { score, ...match } = item;
      void score;
      return match;
    });

  return NextResponse.json({
    matches,
    noLanguageMapping:
      !mappedLanguage && onlyMatchingLanguage && !hasExactCountryMatches,
    country: requestCountry,
  });
}
