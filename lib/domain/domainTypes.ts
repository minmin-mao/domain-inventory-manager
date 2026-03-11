export type DomainItem = {
  id: string
  domain: string
  hosting: string
  expiry: string
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

export type ExpiryFilterOption = 'all' | 'expired' | 'le30' | 'le60' ;

export type DomainFilters = {
  search: string; // free text search applied to name (and maybe project)
  expiry: ExpiryFilterOption;
  hostingProvider: string | null;
  project: string | null;
  country: string | null;
}