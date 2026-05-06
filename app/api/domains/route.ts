import { getDomainSelect, hasDomainLanguageColumn } from "@/lib/domain/domainDb";
import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/domain/domainUtils";
import { deriveLanguageFromCountry, normalizeLanguageCode } from "@/lib/domain/languageUtils";
import { capitalizeText } from "@/lib/domain/textUtils";
import { notifyInventoryUpdated } from "@/lib/realtime/domainEvents";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const normalizeText = (value: unknown) =>
  typeof value === "string" ? capitalizeText(value.trim()) : "";

const normalizeNullableText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? capitalizeText(trimmed) : null;
};

const normalizeLanguage = (value: unknown, country: unknown) => {
  const normalizedLanguage = normalizeLanguageCode(
    typeof value === "string" ? value : null
  );

  return normalizedLanguage || deriveLanguageFromCountry(
    typeof country === "string" ? country : null
  );
};

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

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const getExpiryWhere = (expiry: string | null) => {
  const now = new Date();

  switch (expiry) {
    case "expired":
      return { lt: now };
    case "le30": {
      const upperBound = new Date(now);
      upperBound.setDate(upperBound.getDate() + 30);
      return { gte: now, lte: upperBound };
    }
    case "le60": {
      const upperBound = new Date(now);
      upperBound.setDate(upperBound.getDate() + 60);
      return { gte: now, lte: upperBound };
    }
    default:
      return undefined;
  }
};

const buildWhere = (searchParams: URLSearchParams): Prisma.DomainWhereInput => {
  const search = searchParams.get("search")?.trim();
  const hosting = searchParams.get("hostingProvider");
  const project = searchParams.get("project");
  const country = searchParams.get("country");
  const pic = searchParams.get("pic")?.trim();
  const status = searchParams.get("status");
  const exactDomain = searchParams.get("exactDomain")?.trim();
  const expiry = searchParams.get("expiry");
  const isReserved = status === "reserved";

  return {
    ...(status ? { status: status as "available" | "reserved" | "taken" } : {}),
    ...(exactDomain ? { domain: normalizeDomain(exactDomain) } : {}),
    ...(search
      ? {
          OR: [
            { domain: { contains: search, mode: "insensitive" } },
            isReserved
              ? { reservedForProject: { contains: search, mode: "insensitive" } }
              : { project: { contains: search, mode: "insensitive" } },
            { hosting: { contains: search, mode: "insensitive" } },
            { account: { contains: search, mode: "insensitive" } },
            isReserved
              ? { reservedForCountry: { contains: search, mode: "insensitive" } }
              : { country: { contains: search, mode: "insensitive" } },
            ...(isReserved
              ? [{ reservedForPic: { contains: search, mode: "insensitive" as const } }]
              : []),
          ],
        }
      : {}),
    ...(hosting ? { hosting } : {}),
    ...(project
      ? isReserved
        ? { reservedForProject: project }
        : { project }
      : {}),
    ...(country
      ? isReserved
        ? { reservedForCountry: country }
        : { country }
      : {}),
    ...(pic && isReserved
      ? {
          reservedForPic: {
            equals: pic,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(getExpiryWhere(expiry) ? { expiry: getExpiryWhere(expiry) } : {}),
  };
};

// GET all domains
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hasPagingParams =
      searchParams.has("page") ||
      searchParams.has("pageSize") ||
      searchParams.has("search") ||
      searchParams.has("hostingProvider") ||
      searchParams.has("project") ||
      searchParams.has("country") ||
      searchParams.has("pic") ||
      searchParams.has("expiry") ||
      searchParams.has("status") ||
      searchParams.has("exactDomain");
    const where = buildWhere(searchParams);

    if (!hasPagingParams) {
      const select = await getDomainSelect();
      const domains = await prisma.domain.findMany({
        where,
        select,
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(domains);
    }

    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 10);
    const includeTotal = searchParams.get("includeTotal") !== "false";
    const skip = (page - 1) * pageSize;
    const select = await getDomainSelect();
    const items = await prisma.domain.findMany({
      where,
      select,
      orderBy:
        searchParams.get("status") === "reserved"
          ? { reservedAt: "desc" }
          : { createdAt: "desc" },
      skip,
      take: pageSize,
    });
    const total = includeTotal ? await prisma.domain.count({ where }) : undefined;

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error(
      "Failed to load domains",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to load domains." },
      { status: 500 }
    );
  }
}

// CREATE new domain
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const expiry = parseExpiry(body.expiry);
    const canPersistLanguage = await hasDomainLanguageColumn();
    const select = await getDomainSelect();

    const domain = await prisma.domain.create({
      select,
      data: {
        domain: normalizeDomain(body.domain),
        hosting: normalizeText(body.hosting),
        account: normalizeText(body.account),
        project: normalizeText(body.project),
        country: normalizeText(body.country),
        ...(canPersistLanguage
          ? { language: normalizeLanguage(body.language, body.country) }
          : {}),
        ...(expiry ? { expiry } : {}),
        status: body.status === "reserved" ? "reserved" : "available",
        ...(body.status === "reserved"
          ? {
              reservedAt: body.reservedAt ? new Date(body.reservedAt) : new Date(),
              reservedForProject: normalizeNullableText(body.reservedForProject ?? body.project),
              reservedForCountry: normalizeNullableText(body.reservedForCountry ?? body.country),
              reservedForPic: normalizeNullableText(body.reservedForPic),
            }
          : {}),
      },
    });

    await notifyInventoryUpdated({
      source: "domains",
      refreshDomains: true,
      refreshHistory: false,
      refreshOptions: true,
      includeTotal: true,
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
    const canPersistLanguage = await hasDomainLanguageColumn();
    const select = await getDomainSelect();

    const updated = await prisma.domain.update({
      where: { id: body.id },
      select,
      data: {
        domain: normalizeDomain(body.domain),
        hosting: normalizeText(body.hosting),
        account: normalizeText(body.account),
        project: normalizeText(body.project),
        country: normalizeText(body.country),
        ...(canPersistLanguage
          ? { language: normalizeLanguage(body.language, body.country) }
          : {}),
        ...(expiry ? { expiry } : { expiry: null }),
        status: body.status,
        ...(Object.prototype.hasOwnProperty.call(body, "reservedAt")
          ? { reservedAt: body.reservedAt ? new Date(body.reservedAt) : null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "reservedForProject")
          ? { reservedForProject: normalizeNullableText(body.reservedForProject) }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "reservedForCountry")
          ? { reservedForCountry: normalizeNullableText(body.reservedForCountry) }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "reservedForPic")
          ? { reservedForPic: normalizeNullableText(body.reservedForPic) }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "usedAt")
          ? { usedAt: body.usedAt ? new Date(body.usedAt) : null }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "usedForProject")
          ? { usedForProject: normalizeNullableText(body.usedForProject) }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "usedForCountry")
          ? { usedForCountry: normalizeNullableText(body.usedForCountry) }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(body, "usedForPic")
          ? { usedForPic: normalizeNullableText(body.usedForPic) }
          : {}),
      },
    });

    await notifyInventoryUpdated({
      source: "domains",
      refreshDomains: true,
      refreshHistory: false,
      refreshOptions: true,
      includeTotal: true,
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
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.domain.delete({
      where: { id },
      select: { id: true },
    });

    await notifyInventoryUpdated({
      source: "domains",
      refreshDomains: true,
      refreshHistory: false,
      refreshOptions: true,
      includeTotal: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Failed to delete domain",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to delete domain." },
      { status: 500 }
    );
  }
}
