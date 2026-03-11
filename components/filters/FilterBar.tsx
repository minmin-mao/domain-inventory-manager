import React from 'react';
import { SearchInput } from './SearchInput';
import { ExpiryFilter } from './ExpiryFilters';
import { DropdownFilter } from './DropdownFilter';
import { DomainItem } from '../../lib/domain/domainTypes';

type Props = {
  domains: DomainItem[]; // used to build option lists (unique providers/projects/countries)

  filters: {
  search: string;
  expiry: 'all' | 'le30' | 'le60' | 'expired';
  hostingProvider: string | null;
  project: string | null;
  country: string | null;
};
setSearch: (v: string) => void
setExpiry: (v: 'all' | 'le30' | 'le60' | 'expired') => void;
setHostingProvider: (v: string | null) => void;
setProject: (v: string | null) => void;
setCountry: (v: string | null) => void;
}

function uniqueOptions(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean))).sort() as string[];
}

export function FilterBar({ domains, filters, setSearch, setExpiry, setHostingProvider, setProject, setCountry }: Props) {
  const providers = uniqueOptions(domains.map((d) => d.hosting));
  const projects = uniqueOptions(domains.map((d) => d.project));
  const countries = uniqueOptions(domains.map((d) => d.country));

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap gap-4 items-end">

        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Search</label>
          <SearchInput value={filters.search} onChange={setSearch} />
        </div>

        {/* Expiry */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs text-zinc-400">Expiry</label>
          <ExpiryFilter value={filters.expiry} onChange={setExpiry} />
        </div>

        {/* Hosting */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs text-zinc-400">Hosting</label>
          <DropdownFilter
            value={filters.hostingProvider}
            onChange={setHostingProvider}
            options={providers}
            placeholder="All providers"
          />
        </div>

        {/* Project */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs text-zinc-400">Project</label>
          <DropdownFilter
            value={filters.project}
            onChange={setProject}
            options={projects}
            placeholder="All projects"
          />
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs text-zinc-400">Country</label>
          <DropdownFilter
            value={filters.country}
            onChange={setCountry}
            options={countries}
            placeholder="All countries"
          />
        </div>

        {/* Clear button */}
        <div className="ml-auto">
          <button
            onClick={() => {
              setSearch("");
              setExpiry("all");
              setHostingProvider(null);
              setProject(null);
              setCountry(null);
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
          >
            Clear filters
          </button>
        </div>

      </div>
    </div>
  );
}