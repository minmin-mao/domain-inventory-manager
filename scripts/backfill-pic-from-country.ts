import { prisma } from "../lib/prisma";

type DomainRow = {
  id: string;
  usedForCountry: string | null;
  usedForPic: string | null;
};

type HistoryRow = {
  id: string;
  country: string;
  usedForPic: string | null;
};

const isLikelyCountryCode = (value: string) => /^[A-Z]{2,3}$/.test(value.trim());
const isBlankLike = (value: string | null | undefined) =>
  !value || value.trim() === "" || value.trim() === "-" || value.trim() === "—";

function shouldMoveCountryToPic(value: string | null | undefined) {
  if (isBlankLike(value)) return false;
  const trimmed = value!.trim();
  return !isLikelyCountryCode(trimmed);
}

async function main() {
  const apply = process.argv.includes("--apply");

  const [domains, histories] = await Promise.all([
    prisma.domain.findMany({
      select: {
        id: true,
        usedForCountry: true,
        usedForPic: true,
      },
    }),
    (prisma as typeof prisma & {
      domainHistory?: {
        findMany: (args: {
          select: {
            id: true;
            country: true;
            usedForPic: true;
          };
        }) => Promise<HistoryRow[]>;
      };
    }).domainHistory?.findMany({
      select: {
        id: true,
        country: true,
        usedForPic: true,
      },
    }) ?? Promise.resolve([]),
  ]);

  const domainCandidates = domains.filter((row: DomainRow) =>
    isBlankLike(row.usedForPic) && shouldMoveCountryToPic(row.usedForCountry)
  );

  const historyCandidates = histories.filter((row: HistoryRow) =>
    isBlankLike(row.usedForPic) && shouldMoveCountryToPic(row.country)
  );

  console.log("Backfill preview:");
  console.log(`- Domain rows to update: ${domainCandidates.length}`);
  console.log(`- History rows to update: ${historyCandidates.length}`);
  console.log(`- Mode: ${apply ? "APPLY" : "DRY RUN"}`);

  if (!apply) {
    console.log("Run with --apply to execute updates.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const row of domainCandidates) {
      await tx.domain.update({
        where: { id: row.id },
        data: {
          usedForPic: row.usedForCountry?.trim() || null,
          usedForCountry: "",
        },
      });
    }

    const historyDelegate = (tx as typeof tx & {
      domainHistory?: {
        update: (args: {
          where: { id: string };
          data: {
            usedForPic: string | null;
            country: string;
          };
        }) => Promise<unknown>;
      };
    }).domainHistory;

    if (!historyDelegate) return;

    for (const row of historyCandidates) {
      await historyDelegate.update({
        where: { id: row.id },
        data: {
          usedForPic: row.country?.trim() || null,
          country: "",
        },
      });
    }
  });

  console.log("Backfill completed successfully.");
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
