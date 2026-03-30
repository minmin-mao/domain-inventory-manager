import React from 'react';
import { SearchInput } from './SearchInput';
import { ExpiryFilter } from './ExpiryFilters';
import { DropdownFilter } from './DropdownFilter';
import type { DomainFilters } from '../../lib/domain/domainTypes';

type Props = {
  hostingOptions: string[];
  projectOptions: string[];
  countryOptions: string[];
  picOptions?: string[];
  filters: DomainFilters;
  searchValue: string;
  searchPlaceholder?: string;
  setSearch: (v: string) => void
  setExpiry: (v: 'all' | 'le30' | 'le60' | 'expired') => void;
  setHostingProvider: (v: string | null) => void;
  setProject: (v: string | null) => void;
  setCountry: (v: string | null) => void;
  setPic?: (v: string | null) => void;
  showPicFilter?: boolean;
  onClear: () => void;
}

export function FilterBar({
  hostingOptions,
  projectOptions,
  countryOptions,
  picOptions = [],
  filters,
  searchValue,
  searchPlaceholder = "Search domains...",
  setSearch,
  setExpiry,
  setHostingProvider,
  setProject,
  setCountry,
  setPic,
  showPicFilter = false,
  onClear,
}: Props) {

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap gap-4 items-end">

        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Search</label>
          <SearchInput
            value={searchValue}
            onChange={setSearch}
            placeholder={searchPlaceholder}
          />
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
            options={hostingOptions}
            placeholder="All providers"
          />
        </div>

        {/* Project */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs text-zinc-400">Project</label>
          <DropdownFilter
            value={filters.project}
            onChange={setProject}
            options={projectOptions}
            placeholder="All projects"
          />
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1 w-44">
          <label className="text-xs text-zinc-400">Country</label>
          <DropdownFilter
            value={filters.country}
            onChange={setCountry}
            options={countryOptions}
            placeholder="All countries"
          />
        </div>

        {showPicFilter && setPic ? (
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs text-zinc-400">PIC</label>
            <DropdownFilter
              value={filters.pic ?? null}
              onChange={setPic}
              options={picOptions}
              placeholder="All PIC"
            />
          </div>
        ) : null}

        {/* Clear button */}
        <div className="ml-auto">
          <button
            onClick={onClear}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
          >
            Clear filters
          </button>
        </div>

      </div>
    </div>
  );
}
