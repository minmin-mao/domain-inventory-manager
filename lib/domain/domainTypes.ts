export type DomainItem = {
  id: string
  domain: string
  hosting: string
  expiry: string | null
  account: string
  project: string
  country: string
  hostingProvider?: string | null
  expiryDate?: string | null;
  status: "taken" | "available"

  usedAt?: string
  usedForProject?: string
  usedForCountry?: string

  previousState?: {
    status: "available" | "taken"
    usedAt?: string
    usedForProject?: string
    usedForCountry?: string
  }
}

export type DomainHistoryItem = {
  id: string
  domainId: string
  domain: string
  hosting: string
  expiry: string | null
  project: string
  country: string
  createdAt: string
  status: "taken"
  canUndo: boolean
}

export type ExpiryFilterOption = 'all' | 'expired' | 'le30' | 'le60' ;

export type DomainFilters = {
  search: string; // free text search applied to name (and maybe project)
  expiry: ExpiryFilterOption;
  hostingProvider: string | null;
  project: string | null;
  country: string | null;
}

export type PaginatedResponse<T> = {
  items: T[];
  total?: number;
  page: number;
  pageSize: number;
};

export type DomainOptionSets = {
  hosting: string[];
  account: string[];
  project: string[];
  country: string[];
};
