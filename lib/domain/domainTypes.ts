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
  status: "taken" | "available" | "reserved"

  reservedAt?: string | null
  reservedForProject?: string
  reservedForCountry?: string
  reservedForPic?: string

  usedAt?: string
  usedForProject?: string
  usedForCountry?: string
  usedForPic?: string

  previousState?: {
    status: "available" | "reserved" | "taken"
    reservedAt?: string | null
    reservedForProject?: string
    reservedForCountry?: string
    reservedForPic?: string
    usedAt?: string
    usedForProject?: string
    usedForCountry?: string
    usedForPic?: string
  }
}

export type DomainHistoryItem = {
  id: string
  domainId: string
  domain: string
  hosting: string
  account: string
  expiry: string | null
  project: string
  country: string
  usedForPic?: string
  createdAt: string
  status: "taken"
  usageType?: "backup" | "pic"
  canUndo: boolean
}

export type ExpiryFilterOption = 'all' | 'expired' | 'le30' | 'le60' ;

export type DomainFilters = {
  search: string; // free text search applied to name (and maybe project)
  expiry: ExpiryFilterOption;
  hostingProvider: string | null;
  project: string | null;
  country: string | null;
  pic?: string | null;
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
  pic: string[];
  picByCountry: Record<string, string[]>;
};
