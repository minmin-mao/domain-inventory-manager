import { capitalizeText } from "../lib/domain/textUtils";
import { prisma } from "../lib/prisma";

async function main() {
  const domains = await prisma.domain.findMany();

  for (const domain of domains) {
    await prisma.domain.update({
      where: { id: domain.id },
      data: {
        hosting: capitalizeText(domain.hosting),
        account: capitalizeText(domain.account),
        project: capitalizeText(domain.project),
        country:
          domain.country === "-" ? domain.country : capitalizeText(domain.country),
        usedForProject: domain.usedForProject
          ? capitalizeText(domain.usedForProject)
          : null,
        usedForCountry: domain.usedForCountry
          ? capitalizeText(domain.usedForCountry)
          : null,
      },
    });
  }

  const historyDelegate = (prisma as typeof prisma & {
    domainHistory?: {
      findMany: () => Promise<
        Array<{
          id: string;
          hosting: string;
          project: string;
          country: string;
        }>
      >;
      update: (args: {
        where: { id: string };
        data: {
          hosting: string;
          project: string;
          country: string;
        };
      }) => Promise<unknown>;
    };
  }).domainHistory;

  if (!historyDelegate) return;

  const histories = await historyDelegate.findMany();

  for (const history of histories) {
    await historyDelegate.update({
      where: { id: history.id },
      data: {
        hosting: capitalizeText(history.hosting),
        project: capitalizeText(history.project),
        country:
          history.country === "-" ? history.country : capitalizeText(history.country),
      },
    });
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  });
