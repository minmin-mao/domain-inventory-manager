import { useReducer, useMemo, useCallback } from 'react';
import { DomainFilters, ExpiryFilterOption, DomainItem } from './domainTypes';
import { applyFilters } from './domainUtils';

type Action =
  | { type: 'setSearch'; payload: string }
  | { type: 'setExpiry'; payload: ExpiryFilterOption }
  | { type: 'setHostingProvider'; payload: string | null }
  | { type: 'setProject'; payload: string | null }
  | { type: 'setCountry'; payload: string | null }
  | { type: 'reset' };

const defaultFilters: DomainFilters = {
  search: '',
  expiry: 'all',
  hostingProvider: null,
  project: null,
  country: null,
};

function reducer(state: DomainFilters, action: Action): DomainFilters {
  switch (action.type) {
    case 'setSearch':
      return { ...state, search: action.payload };
    case 'setExpiry':
      return { ...state, expiry: action.payload };
    case 'setHostingProvider':
      return { ...state, hostingProvider: action.payload };
    case 'setProject':
      return { ...state, project: action.payload };
    case 'setCountry':
      return { ...state, country: action.payload };
    case 'reset':
      return { ...defaultFilters };
    default:
      return state;
  }
}

export function useFilters(domains: DomainItem[]) {
  const [filters, dispatch] = useReducer(reducer, defaultFilters);

  const setSearch = useCallback((v: string) => dispatch({ type: 'setSearch', payload: v }), []);
  const setExpiry = useCallback((v: ExpiryFilterOption) => dispatch({ type: 'setExpiry', payload: v }), []);
  const setHostingProvider = useCallback((v: string | null) => dispatch({ type: 'setHostingProvider', payload: v }), []);
  const setProject = useCallback((v: string | null) => dispatch({ type: 'setProject', payload: v }), []);
  const setCountry = useCallback((v: string | null) => dispatch({ type: 'setCountry', payload: v }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const filtered = useMemo(() => applyFilters(domains, filters), [domains, filters]);

  return {
    filters,
    setSearch,
    setExpiry,
    setHostingProvider,
    setProject,
    setCountry,
    reset,
    filtered,
  } as const;
}