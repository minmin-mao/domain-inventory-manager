import { DomainFilters, DomainItem } from './domainTypes';

export const normalizeDomain = (d: string) => {
  return d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
};

export function getDaysLeft(expiry?: string) {
  if (!expiry) return null;

  const today = new Date();
  const exp = new Date(expiry);

  // normalize both to midnight
  today.setHours(0,0,0,0);
  exp.setHours(0,0,0,0);

  const diff =
    (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  return Math.floor(diff);
}


export const nowUtc = () => new Date();

function daysBetween(dateStr: string | undefined | null) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const diff = d.getTime() - nowUtc().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isExpired(expiry?: string | null) {
  if (!expiry) return false;
  return new Date(expiry).getTime() < nowUtc().getTime();
}

type FilterableRecord = Pick<DomainItem, "domain" | "project" | "country" | "expiry"> & {
  hosting?: string | null
  hostingProvider?: string | null
};

export function applyFilters<T extends FilterableRecord>(
  domains: T[],
  filters: DomainFilters
) {
  const s = filters.search.trim().toLowerCase();

  return domains.filter((d) => {
    // Search: match domain name, project, hosting provider
    if (s) {
      const hay = [
        d.domain,
        d.project ?? '',
        d.hostingProvider ?? '',
        d.country ?? '',
      ].join(' ').toLowerCase();
      if (!hay.includes(s)) return false;
    }

    // Expiry filter
    const daysLeft = d.expiry ? daysBetween(d.expiry) : Infinity;
    switch (filters.expiry) {
      case 'expired':
        if (!isExpired(d.expiry)) return false;
        break;
      case 'le30':
        if (!(daysLeft <= 30 && !isExpired(d.expiry))) return false;
        break;
      case 'le60':
        if (!(daysLeft <= 60 && !isExpired(d.expiry))) return false;
        break;
      case 'all':
      default:
        break;
    }

    // Hosting provider
    if (filters.hostingProvider && filters.hostingProvider !== 'all') {
      if ((d.hosting ?? '') !== filters.hostingProvider) return false;
    }

    // Project
    if (filters.project && filters.project !== 'all') {
      if ((d.project ?? '') !== filters.project) return false;
    }

    // Country
    if (filters.country && filters.country !== 'all') {
      if ((d.country ?? '') !== filters.country) return false;
    }

    return true;
  });
}





