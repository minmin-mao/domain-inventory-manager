// ================================
// Imports
// ================================

// UI
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import SmartDropdown from "@/components/SmartDropdown";
import DomainTable from "@/components/domain/DomainTable";
import HistoryTable from "@/components/domain/HistoryTable";
import ReservedTable from "@/components/domain/ReservedTable";
import { FilterBar } from "@/components/filters/FilterBar";

// Utilities
import { normalizeDomain } from "@/lib/domain/domainUtils";
import {
  DEFAULT_LANGUAGE_OPTIONS,
  deriveLanguageFromCountry,
  getLanguageOptionLabel,
  getSuggestionCountryLabel,
  getSuggestionLanguageLabel,
} from "@/lib/domain/languageUtils";
import { normalizeProjectName } from "@/lib/domain/projectUtils";
import { capitalizeText } from "@/lib/domain/textUtils";
import type {
  DomainFilters,
  DomainOptionSets,
  DomainHistoryItem,
  DomainItem,
  PaginatedResponse,
} from "@/lib/domain/domainTypes";

// React
import { useEffect, useMemo, useRef, useState } from "react";
import type { SelectInstance } from "react-select";


// ================================
// Types
// ================================

type Option = {
  label: string;
  value: string;
};

type RefreshInventoryArgs = {
  refreshDomains?: boolean;
  refreshHistory?: boolean;
  refreshOptions?: boolean;
  includeTotal?: boolean;
  silent?: boolean;
};

type RealtimeInventoryUpdate = {
  type: "inventory.updated";
  refreshDomains: boolean;
  refreshHistory: boolean;
  refreshOptions: boolean;
  includeTotal: boolean;
  source: "domains" | "history" | "use";
  at: string;
};

type DashboardTab = "available" | "reserved" | "backup" | "history";
type UseMode = "pic" | "backup";
type PendingUseRequest = {
  id: string;
  usedDomain: DomainItem | null;
  project: string;
  searchedProject: string;
  country: string;
  pic: string;
};

const DEFAULT_ROWS_PER_PAGE = 5;

function buildInventoryQuery(
  filters: DomainFilters,
  page: number,
  pageSize: number,
  extraParams?: Record<string, string>
) {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters.search.trim()) searchParams.set("search", filters.search.trim());
  if (filters.expiry !== "all") searchParams.set("expiry", filters.expiry);
  if (filters.hostingProvider) searchParams.set("hostingProvider", filters.hostingProvider);
  if (filters.project) searchParams.set("project", filters.project);
  if (filters.country) searchParams.set("country", filters.country);
  if (filters.pic) searchParams.set("pic", filters.pic);

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
  }

  return searchParams.toString();
}

// ================================
// Component
// ================================

export default function DomainManager() {
  const normalizeExpiryInput = (value: string) => {
    const trimmed = value.trim();
    const localDateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (localDateMatch) {
      return `${localDateMatch[3]}-${localDateMatch[2]}-${localDateMatch[1]}`;
    }

    return trimmed;
  };

  const isValidExpiryInput = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{2}\/\d{2}\/\d{4}$/.test(value);

  // ================================
  // Domain Inventory State
  // ================================

  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [reservedDomains, setReservedDomains] = useState<DomainItem[]>([]);
  const [backupHistory, setBackupHistory] = useState<DomainHistoryItem[]>([]);
  const [finalHistory, setFinalHistory] = useState<DomainHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>("available");
  const [loadedTabs, setLoadedTabs] = useState<Record<DashboardTab, boolean>>({
    available: true,
    reserved: false,
    backup: false,
    history: false,
  });

  // form fields
  const [domain, setDomain] = useState("");
  const [hosting, setHosting] = useState("");
  const [account, setAccount] = useState("");
  const [country, setCountry] = useState("");
  const [project, setProject] = useState("");
  const [expiry, setExpiry] = useState("");
  const [language, setLanguage] = useState("");
  const [reserveOnCreate, setReserveOnCreate] = useState(false);

  // suggestion
  const [matchedDomains, setMatchedDomains] = useState<DomainItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchProject, setSearchProject] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [searchPic, setSearchPic] = useState("");
  const [useMode, setUseMode] = useState<UseMode>("pic");
  const [pendingUseRequest, setPendingUseRequest] = useState<PendingUseRequest | null>(null);
  const [onlyMatchingLanguage, setOnlyMatchingLanguage] = useState(false);
  const [requestError, setRequestError] = useState("");

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState<DomainItem | null>(null);

  // warnings
  const [providerWarning, setProviderWarning] = useState("");
  const [duplicateDomain, setDuplicateDomain] = useState<DomainItem | null>(null);
  const [highlightDomainId, setHighlightDomainId] = useState<string | null>(null);
  const [highlightHistoryDomainId, setHighlightHistoryDomainId] = useState<string | null>(null);

  // dropdown options
  const [hostingOptions, setHostingOptions] = useState<string[]>([]);
  const [accountOptions, setAccountOptions] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [languageOptions, setLanguageOptions] = useState<string[]>(DEFAULT_LANGUAGE_OPTIONS);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [picByCountryOptions, setPicByCountryOptions] = useState<Record<string, string[]>>({});

  // filters
  const [filters, setFilters] = useState<DomainFilters>({
    search: "",
    expiry: "all",
    hostingProvider: null,
    project: null,
    country: null,
    pic: null,
  });
  const [tabSearches, setTabSearches] = useState<Record<DashboardTab, string>>({
    available: "",
    reserved: "",
    backup: "",
    history: "",
  });
  const [debouncedTabSearches, setDebouncedTabSearches] = useState<
    Record<DashboardTab, string>
  >({
    available: "",
    reserved: "",
    backup: "",
    history: "",
  });

  // pagination state
  const [pageAvailable, setPageAvailable] = useState(1);
  const [pageReserved, setPageReserved] = useState(1);
  const [pageBackup, setPageBackup] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [totalReserved, setTotalReserved] = useState(0);
  const [totalBackup, setTotalBackup] = useState(0);
  const [totalHistory, setTotalHistory] = useState(0);
  const [historyActionId, setHistoryActionId] = useState<string | null>(null);
  const [reservedActionId, setReservedActionId] = useState<string | null>(null);
  const [isDomainsLoading, setIsDomainsLoading] = useState(true);
  const [isReservedLoading, setIsReservedLoading] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [isUsingDomain, setIsUsingDomain] = useState(false);
  const [isSuggestingDomain, setIsSuggestingDomain] = useState(false);
  const [reserveTarget, setReserveTarget] = useState<DomainItem | null>(null);
  const [reserveProject, setReserveProject] = useState("");
  const [reserveCountry, setReserveCountry] = useState("");
  const [reservePic, setReservePic] = useState("");
  const [reserveError, setReserveError] = useState("");
  const [reservePicTarget, setReservePicTarget] = useState<DomainItem | null>(null);
  const [reservePicValue, setReservePicValue] = useState("");
  const [assignPicTarget, setAssignPicTarget] = useState<DomainHistoryItem | null>(null);
  const [assignPicValue, setAssignPicValue] = useState("");

  const rowsPerPage = DEFAULT_ROWS_PER_PAGE;
  const totalAvailableRef = useRef(0);
  const totalReservedRef = useRef(0);
  const totalBackupRef = useRef(0);
  const totalHistoryRef = useRef(0);
  const previousDerivedLanguageRef = useRef(deriveLanguageFromCountry(""));
  const suggestCacheRef = useRef<Map<string, DomainItem[]>>(new Map());
  const prefetchedPageCacheRef = useRef<
    Map<string, PaginatedResponse<DomainItem | DomainHistoryItem>>
  >(new Map());
  const refreshInventoryDataRef = useRef<(args?: RefreshInventoryArgs) => Promise<void>>(async () => {});
  const realtimePendingRef = useRef<Required<RefreshInventoryArgs>>({
    refreshDomains: false,
    refreshHistory: false,
    refreshOptions: false,
    includeTotal: false,
    silent: false,
  });
  const realtimeFlushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    totalAvailableRef.current = totalAvailable;
  }, [totalAvailable]);

  useEffect(() => {
    totalHistoryRef.current = totalHistory;
  }, [totalHistory]);

  useEffect(() => {
    totalReservedRef.current = totalReserved;
  }, [totalReserved]);

  useEffect(() => {
    totalBackupRef.current = totalBackup;
  }, [totalBackup]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTabSearches(tabSearches);
    }, 250);

    return () => clearTimeout(timer);
  }, [tabSearches]);

  const filteredPicOptions = useMemo(() => {
    const countryKey = searchCountry.trim();
    if (!countryKey) return picOptions;

    const exactCountryMatch = picByCountryOptions[countryKey];
    if (exactCountryMatch?.length) return exactCountryMatch;

    const normalizedCountryKey = countryKey.toLowerCase();
    const fallbackCountryMatch = Object.entries(picByCountryOptions).find(
      ([country]) => country.toLowerCase() === normalizedCountryKey
    );

    return fallbackCountryMatch?.[1] ?? picOptions;
  }, [picByCountryOptions, picOptions, searchCountry]);

  const languageDisplayOptions = useMemo<Option[]>(
    () =>
      languageOptions.map((option) => ({
        label: getLanguageOptionLabel(option),
        value: option,
      })),
    [languageOptions]
  );

  const loadDomainOptions = async () => {
    setIsOptionsLoading(true);

    try {
      const res = await fetch("/api/domain-options");
      const data: DomainOptionSets = res.ok
        ? await res.json()
        : {
            hosting: [],
            account: [],
            project: [],
            country: [],
            language: DEFAULT_LANGUAGE_OPTIONS,
            pic: [],
            picByCountry: {},
          };

      setHostingOptions(data.hosting);
      setAccountOptions(data.account);
      setProjectOptions(data.project);
      setCountryOptions(data.country);
      setLanguageOptions(data.language);
      setPicOptions(data.pic);
      setPicByCountryOptions(data.picByCountry);
    } finally {
      setIsOptionsLoading(false);
    }
  };

  useEffect(() => {
    void loadDomainOptions().catch((error) => {
      console.error("Failed to load domain options", error);
      setHostingOptions([]);
      setAccountOptions([]);
      setProjectOptions([]);
      setCountryOptions([]);
      setLanguageOptions(DEFAULT_LANGUAGE_OPTIONS);
      setPicOptions([]);
      setPicByCountryOptions({});
      setIsOptionsLoading(false);
    });
  }, []);

  const buildFiltersForSearch = (search: string, includePic = false): DomainFilters => ({
    ...filters,
    search,
    pic: includePic ? filters.pic ?? null : null,
  });

  const fetchPaginatedWithCache = async <T extends DomainItem | DomainHistoryItem>(
    url: string,
    fallback: PaginatedResponse<T>
  ) => {
    const cached = prefetchedPageCacheRef.current.get(url) as
      | PaginatedResponse<T>
      | undefined;

    if (cached) {
      return cached;
    }

    const res = await fetch(url);
    const data: PaginatedResponse<T> = res.ok ? await res.json() : fallback;

    prefetchedPageCacheRef.current.set(
      url,
      data as PaginatedResponse<DomainItem | DomainHistoryItem>
    );

    return data;
  };

  const getDomainPageUrl = ({
    status,
    page,
    includeTotal,
  }: {
    status: "available" | "reserved";
    page: number;
    includeTotal: boolean;
  }) =>
    `/api/domains?${buildInventoryQuery(
      buildFiltersForSearch(
        status === "reserved"
          ? debouncedTabSearches.reserved
          : debouncedTabSearches.available,
        false
      ),
      page,
      rowsPerPage,
      {
        status,
        includeTotal: includeTotal ? "true" : "false",
      }
    )}`;

  const getHistoryPageUrl = ({
    usageType,
    page,
    includeTotal,
  }: {
    usageType: "backup" | "pic";
    page: number;
    includeTotal: boolean;
  }) =>
    `/api/domain-history?${buildInventoryQuery(
      buildFiltersForSearch(
        usageType === "backup"
          ? debouncedTabSearches.backup
          : debouncedTabSearches.history,
        usageType === "pic"
      ),
      page,
      rowsPerPage,
      {
        usageType,
        includeTotal: includeTotal ? "true" : "false",
      }
    )}`;

  const prefetchDomainNextPage = async ({
    status,
    currentPage,
    totalItems,
  }: {
    status: "available" | "reserved";
    currentPage: number;
    totalItems: number;
  }) => {
    const nextPage = currentPage + 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    if (nextPage > totalPages) return;

    const url = getDomainPageUrl({
      status,
      page: nextPage,
      includeTotal: false,
    });

    if (prefetchedPageCacheRef.current.has(url)) return;

    try {
      await fetchPaginatedWithCache<DomainItem>(url, {
        items: [],
        total: 0,
        page: nextPage,
        pageSize: rowsPerPage,
      });
    } catch (error) {
      console.error(`Failed to prefetch ${status} page ${nextPage}`, error);
    }
  };

  const prefetchHistoryNextPage = async ({
    usageType,
    currentPage,
    totalItems,
  }: {
    usageType: "backup" | "pic";
    currentPage: number;
    totalItems: number;
  }) => {
    const nextPage = currentPage + 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    if (nextPage > totalPages) return;

    const url = getHistoryPageUrl({
      usageType,
      page: nextPage,
      includeTotal: false,
    });

    if (prefetchedPageCacheRef.current.has(url)) return;

    try {
      await fetchPaginatedWithCache<DomainHistoryItem>(url, {
        items: [],
        total: 0,
        page: nextPage,
        pageSize: rowsPerPage,
      });
    } catch (error) {
      console.error(`Failed to prefetch ${usageType} page ${nextPage}`, error);
    }
  };

  const matchesAvailableCacheQuery = (item: DomainItem, url: string) => {
    const queryString = url.split("?")[1];
    if (!queryString) return false;

    const params = new URLSearchParams(queryString);
    if (params.get("status") !== "available") return false;

    const exactDomain = params.get("exactDomain")?.trim();
    if (exactDomain && item.domain !== exactDomain) return false;

    const hostingProvider = params.get("hostingProvider");
    if (hostingProvider && item.hosting !== hostingProvider) return false;

    const project = params.get("project");
    if (project && item.project !== project) return false;

    const country = params.get("country");
    if (country && item.country !== country) return false;

    const expiry = params.get("expiry");
    if (expiry && expiry !== "all") {
      if (!item.expiry) return false;

      const now = new Date();
      const expiryDate = new Date(item.expiry);
      if (Number.isNaN(expiryDate.getTime())) return false;

      if (expiry === "expired" && !(expiryDate < now)) return false;

      if (expiry === "le30" || expiry === "le60") {
        const upperBound = new Date(now);
        upperBound.setDate(upperBound.getDate() + (expiry === "le30" ? 30 : 60));
        if (expiryDate < now || expiryDate > upperBound) return false;
      }
    }

    const search = params.get("search")?.trim().toLowerCase();
    if (search) {
      const searchableValues = [
        item.domain,
        item.project,
        item.hosting,
        item.account,
        item.country,
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      if (!searchableValues.some((value) => value.includes(search))) {
        return false;
      }
    }

    return true;
  };

  const removeDomainFromAvailableCaches = (usedDomain: DomainItem) => {
    setDomains((prev) => prev.filter((item) => item.id !== usedDomain.id));

    const nextCache = new Map(prefetchedPageCacheRef.current);

    for (const [url, payload] of nextCache.entries()) {
      if (!url.startsWith("/api/domains?")) continue;

      const domainPayload = payload as PaginatedResponse<DomainItem>;
      const params = new URLSearchParams(url.split("?")[1] ?? "");
      if (params.get("status") !== "available") continue;

      const matchesQuery = matchesAvailableCacheQuery(usedDomain, url);
      if (!matchesQuery) continue;

      const nextItems = domainPayload.items.filter(
        (item) => item.id !== usedDomain.id
      );

      nextCache.set(url, {
        ...domainPayload,
        items: nextItems,
        total:
          typeof domainPayload.total === "number"
            ? Math.max(domainPayload.total - 1, 0)
            : domainPayload.total,
      });
    }

    prefetchedPageCacheRef.current = nextCache;
  };

  const loadDomainsByStatus = async ({
    status,
    page,
    includeTotal,
    silent,
  }: {
    status: "available" | "reserved";
    page: number;
    includeTotal: boolean;
    silent: boolean;
  }) => {
    const setLoading = status === "reserved" ? setIsReservedLoading : setIsDomainsLoading;
    const setRows = status === "reserved" ? setReservedDomains : setDomains;
    const setTotal = status === "reserved" ? setTotalReserved : setTotalAvailable;

    if (!silent) setLoading(true);

    const url = getDomainPageUrl({ status, page, includeTotal });

    try {
      const data = await fetchPaginatedWithCache<DomainItem>(url, {
        items: [],
        total: 0,
        page,
        pageSize: rowsPerPage,
      });

      setRows(data.items);
      if (typeof data.total === "number") {
        setTotal(data.total);
      }

      const effectiveTotal =
        typeof data.total === "number"
          ? data.total
          : status === "reserved"
            ? totalReservedRef.current
            : totalAvailableRef.current;
      if (activeTab === status) {
        void prefetchDomainNextPage({
          status,
          currentPage: page,
          totalItems: effectiveTotal,
        });
      }
    } catch (error) {
      console.error(`Failed to load ${status} domains`, error);
      setRows([]);
      setTotal(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadDomainSummary = async ({
    status,
    silent,
  }: {
    status: "available" | "reserved";
    silent: boolean;
  }) => {
    const query = buildInventoryQuery(
      buildFiltersForSearch(
        status === "reserved"
          ? debouncedTabSearches.reserved
          : debouncedTabSearches.available,
        false
      ),
      1,
      1,
      {
        status,
        includeTotal: "true",
      }
    );
    const setTotal = status === "reserved" ? setTotalReserved : setTotalAvailable;

    try {
      const res = await fetch(`/api/domains?${query}`);
      const data: PaginatedResponse<DomainItem> = res.ok
        ? await res.json()
        : { items: [], total: 0, page: 1, pageSize: 1 };

      if (typeof data.total === "number") {
        setTotal(data.total);
      }
    } catch (error) {
      console.error(`Failed to load ${status} summary`, error);
      if (!silent) {
        setTotal(0);
      }
    }
  };

  const loadHistoryUsage = async ({
    usageType,
    page,
    includeTotal,
    silent,
  }: {
    usageType: "backup" | "pic";
    page: number;
    includeTotal: boolean;
    silent: boolean;
  }) => {
    const setLoading = usageType === "backup" ? setIsBackupLoading : setIsHistoryLoading;
    const setRows = usageType === "backup" ? setBackupHistory : setFinalHistory;
    const setTotal = usageType === "backup" ? setTotalBackup : setTotalHistory;

    if (!silent) setLoading(true);

    const url = getHistoryPageUrl({ usageType, page, includeTotal });

    try {
      const data = await fetchPaginatedWithCache<DomainHistoryItem>(url, {
        items: [],
        total: 0,
        page,
        pageSize: rowsPerPage,
      });

      setRows(data.items);
      if (typeof data.total === "number") {
        setTotal(data.total);
      }

      const isActiveUsage =
        (usageType === "backup" && activeTab === "backup") ||
        (usageType === "pic" && activeTab === "history");
      const effectiveTotal =
        typeof data.total === "number"
          ? data.total
          : usageType === "backup"
            ? totalBackupRef.current
            : totalHistoryRef.current;

      if (isActiveUsage) {
        void prefetchHistoryNextPage({
          usageType,
          currentPage: page,
          totalItems: effectiveTotal,
        });
      }
    } catch (error) {
      console.error(`Failed to load ${usageType} history`, error);
      setRows([]);
      setTotal(0);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadHistorySummary = async ({
    usageType,
    silent,
  }: {
    usageType: "backup" | "pic";
    silent: boolean;
  }) => {
    const setTotal = usageType === "backup" ? setTotalBackup : setTotalHistory;
    const search =
      usageType === "backup" ? debouncedTabSearches.backup : debouncedTabSearches.history;

    const query = buildInventoryQuery(
      buildFiltersForSearch(search, usageType === "pic"),
      1,
      1,
      {
        usageType,
        includeTotal: "true",
      }
    );

    try {
      const res = await fetch(`/api/domain-history?${query}`);
      const data: PaginatedResponse<DomainHistoryItem> = res.ok
        ? await res.json()
        : { items: [], total: 0, page: 1, pageSize: 1 };

      if (typeof data.total === "number") {
        setTotal(data.total);
      }
    } catch (error) {
      console.error(`Failed to load ${usageType} summary`, error);
      if (!silent) {
        setTotal(0);
      }
    }
  };

  useEffect(() => {
    setLoadedTabs((current) =>
      current[activeTab] ? current : { ...current, [activeTab]: true }
    );
  }, [activeTab]);

  useEffect(() => {
    if (!loadedTabs.available) return;

    const includeTotal = pageAvailable === 1 || totalAvailableRef.current === 0;

    void loadDomainsByStatus({
      status: "available",
      page: pageAvailable,
      includeTotal,
      silent: false,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedTabs.available,
    pageAvailable,
    rowsPerPage,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
    debouncedTabSearches.available,
  ]);

  useEffect(() => {
    if (!loadedTabs.reserved) return;

    const includeTotal = pageReserved === 1 || totalReservedRef.current === 0;

    void loadDomainsByStatus({
      status: "reserved",
      page: pageReserved,
      includeTotal,
      silent: false,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedTabs.reserved,
    pageReserved,
    rowsPerPage,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
    debouncedTabSearches.reserved,
  ]);

  useEffect(() => {
    if (!loadedTabs.backup) return;

    const includeTotal = pageBackup === 1 || totalBackupRef.current === 0;

    void loadHistoryUsage({
      usageType: "backup",
      page: pageBackup,
      includeTotal,
      silent: false,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedTabs.backup,
    pageBackup,
    rowsPerPage,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
    debouncedTabSearches.backup,
  ]);

  useEffect(() => {
    if (!loadedTabs.history) return;

    const includeTotal = pageHistory === 1 || totalHistoryRef.current === 0;

    void loadHistoryUsage({
      usageType: "pic",
      page: pageHistory,
      includeTotal,
      silent: false,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedTabs.history,
    pageHistory,
    rowsPerPage,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
    filters.pic,
    debouncedTabSearches.history,
  ]);

  useEffect(() => {
    if (loadedTabs.reserved) return;

    void loadDomainSummary({
      status: "reserved",
      silent: true,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedTabs.reserved,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
    debouncedTabSearches.reserved,
  ]);

  useEffect(() => {
    if (loadedTabs.backup) return;

    void loadHistorySummary({
      usageType: "backup",
      silent: true,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedTabs.backup,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
    debouncedTabSearches.backup,
  ]);

  useEffect(() => {
    if (loadedTabs.history) return;

    void loadHistorySummary({
      usageType: "pic",
      silent: true,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loadedTabs.history,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
    filters.pic,
    debouncedTabSearches.history,
  ]);

  useEffect(() => {
    setPageAvailable(1);
    setPageReserved(1);
    setPageBackup(1);
    setPageHistory(1);
  }, [filters.expiry, filters.hostingProvider, filters.project, filters.country, filters.pic]);

  useEffect(() => {
    setPageAvailable(1);
  }, [debouncedTabSearches.available]);

  useEffect(() => {
    setPageReserved(1);
  }, [debouncedTabSearches.reserved]);

  useEffect(() => {
    setPageBackup(1);
  }, [debouncedTabSearches.backup]);

  useEffect(() => {
    setPageHistory(1);
  }, [debouncedTabSearches.history]);

  const refreshInventoryData = async ({
    refreshDomains = true,
    refreshHistory = true,
    refreshOptions = false,
    includeTotal = false,
    silent = false,
  }: RefreshInventoryArgs = {}) => {
    prefetchedPageCacheRef.current.clear();

    if (refreshDomains) {
      suggestCacheRef.current.clear();
    }

    const jobs: Promise<void>[] = [];

    if (refreshOptions) {
      jobs.push(loadDomainOptions());
    }

    if (refreshDomains) {
      if (loadedTabs.available) {
        jobs.push(
          loadDomainsByStatus({
            status: "available",
            page: pageAvailable,
            includeTotal,
            silent,
          })
        );
      } else {
        jobs.push(loadDomainSummary({ status: "available", silent: true }));
      }

      if (loadedTabs.reserved) {
        jobs.push(
          loadDomainsByStatus({
            status: "reserved",
            page: pageReserved,
            includeTotal,
            silent,
          })
        );
      } else {
        jobs.push(loadDomainSummary({ status: "reserved", silent: true }));
      }
    }

    if (refreshHistory) {
      if (loadedTabs.backup) {
        jobs.push(
          loadHistoryUsage({
            usageType: "backup",
            page: pageBackup,
            includeTotal,
            silent,
          })
        );
      } else {
        jobs.push(
          loadHistorySummary({
            usageType: "backup",
            silent: true,
          })
        );
      }

      if (loadedTabs.history) {
        jobs.push(
          loadHistoryUsage({
            usageType: "pic",
            page: pageHistory,
            includeTotal,
            silent,
          })
        );
      } else {
        jobs.push(
          loadHistorySummary({
            usageType: "pic",
            silent: true,
          })
        );
      }
    }

    await Promise.all(jobs);
  };

  const queueRefresh = (args?: RefreshInventoryArgs) => {
    void refreshInventoryData(args).catch((error) => {
      console.error("Background refresh failed", error);
    });
  };

  refreshInventoryDataRef.current = refreshInventoryData;

  useEffect(() => {
    const source = new EventSource("/api/realtime/domains");

    source.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as RealtimeInventoryUpdate | { type: "connected" | "heartbeat" };
        if (payload.type !== "inventory.updated") return;

        realtimePendingRef.current = {
          refreshDomains:
            realtimePendingRef.current.refreshDomains || payload.refreshDomains,
          refreshHistory:
            realtimePendingRef.current.refreshHistory || payload.refreshHistory,
          refreshOptions:
            realtimePendingRef.current.refreshOptions || payload.refreshOptions,
          includeTotal:
            realtimePendingRef.current.includeTotal || payload.includeTotal,
          silent: true,
        };

        if (realtimeFlushTimerRef.current !== null) return;

        realtimeFlushTimerRef.current = window.setTimeout(() => {
          const pending = realtimePendingRef.current;
          realtimePendingRef.current = {
            refreshDomains: false,
            refreshHistory: false,
            refreshOptions: false,
            includeTotal: false,
            silent: false,
          };
          realtimeFlushTimerRef.current = null;

          void refreshInventoryDataRef.current({
            ...pending,
            silent: true,
          }).catch((error) => {
            console.error("Failed to process realtime update", error);
          });
        }, 150);
      } catch (error) {
        console.error("Invalid realtime payload", error);
      }
    };

    source.onerror = (error) => {
      console.warn("Realtime connection issue", error);
    };

    return () => {
      if (realtimeFlushTimerRef.current !== null) {
        clearTimeout(realtimeFlushTimerRef.current);
        realtimeFlushTimerRef.current = null;
      }
      source.close();
    };
  }, []);


  // ================================
  // Derived Data
  // ================================
  const totalPagesAvailable = Math.max(1, Math.ceil(totalAvailable / rowsPerPage));
  const totalPagesReserved = Math.max(1, Math.ceil(totalReserved / rowsPerPage));
  const totalPagesBackup = Math.max(1, Math.ceil(totalBackup / rowsPerPage));
  const totalPagesHistory = Math.max(1, Math.ceil(totalHistory / rowsPerPage));
  const activeSearch = tabSearches[activeTab];
  const showReservedTab =
    isReservedLoading ||
    totalReserved > 0 ||
    reservedDomains.length > 0 ||
    activeTab === "reserved" ||
    tabSearches.reserved.trim().length > 0;
  const showBackupTab =
    isBackupLoading ||
    totalBackup > 0 ||
    backupHistory.length > 0 ||
    activeTab === "backup" ||
    tabSearches.backup.trim().length > 0;

  const activeTabConfig = {
    available: {
      label: "Available",
      count: totalAvailable,
      searchPlaceholder: "Search available domains",
    },
    reserved: {
      label: "Reserved",
      count: totalReserved,
      searchPlaceholder: "Search reserved domains",
    },
    backup: {
      label: "Backup Pending",
      count: totalBackup,
      searchPlaceholder: "Search backup domains",
    },
    history: {
      label: "History",
      count: totalHistory,
      searchPlaceholder: "Search history or filter PIC",
    },
  } satisfies Record<
    DashboardTab,
    { label: string; count: number; searchPlaceholder: string }
  >;


  // ================================
  // Refs
  // ================================

  const hostingRef = useRef<SelectInstance<Option, false> | null>(null);
  const domainRef = useRef<HTMLInputElement | null>(null);
  const expiryRef = useRef<HTMLInputElement | null>(null);

  const focusNext = (ref: { current: { focus: () => void } | null }) => {
    ref.current?.focus();
  };

  const getProviderWarningText = (
    provider: string | null,
    currentHosting: string,
    pic: string
  ) => {
    if (!provider) return "";

    const isSameProvider =
      provider.trim().toLowerCase() === currentHosting.trim().toLowerCase();

    if (!isSameProvider) return "";

    return `Warning: Last used provider for ${pic} was ${provider}. This domain uses the same provider.`;
  };

  const handlePrevDomain = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNextDomain = () => {
    setCurrentIndex((prev) =>
      Math.min(prev + 1, matchedDomains.length - 1)
    );
  };

  useEffect(() => {
    const derivedLanguage = deriveLanguageFromCountry(country.trim());

    setLanguage((current) => {
      const normalizedCurrent = current.trim().toUpperCase();
      if (!normalizedCurrent) return derivedLanguage;
      return normalizedCurrent === previousDerivedLanguageRef.current
        ? derivedLanguage
        : normalizedCurrent;
    });

    previousDerivedLanguageRef.current = derivedLanguage;
  }, [country]);

  useEffect(() => {
    const selectedDomain = matchedDomains[currentIndex];
    const countryValue = searchCountry.trim();
    const picValue = searchPic.trim();

    if (useMode !== "pic" || !selectedDomain || !countryValue || !picValue) {
      setProviderWarning("");
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({
      country: countryValue,
      pic: picValue,
    });

    void fetch(`/api/domains/last-provider?${params.toString()}`)
      .then(async (res) =>
        res.ok
          ? await res.json() as { lastProvider: string | null }
          : { lastProvider: null }
      )
      .then((payload) => {
        if (cancelled) return;
        setProviderWarning(
          getProviderWarningText(
            payload.lastProvider,
            selectedDomain.hosting,
            picValue
          )
        );
      })
      .catch((error) => {
        console.error("Failed to load last provider", error);
        if (cancelled) return;
        setProviderWarning("");
      });

    return () => {
      cancelled = true;
    };
  }, [currentIndex, matchedDomains, searchCountry, searchPic, useMode]);


  // ================================
  // Filter Setters
  // ================================

  const setSearch = (v: string) =>
    setTabSearches((current) => ({
      ...current,
      [activeTab]: v,
    }));

  const setExpiryFilter = (v: DomainFilters["expiry"]) =>
    setFilters(f => ({ ...f, expiry: v }));

  const setHostingProvider = (v: string | null) =>
    setFilters(f => ({ ...f, hostingProvider: v }));

  const setProjectFilter = (v: string | null) =>
    setFilters(f => ({ ...f, project: v }));

  const setCountryFilter = (v: string | null) =>
    setFilters(f => ({ ...f, country: v }));

  const setPicFilter = (v: string | null) =>
    setFilters((f) => ({ ...f, pic: v }));

  const clearActiveTableFilters = () => {
    setSearch("");
    setExpiryFilter("all");
    setHostingProvider(null);
    setProjectFilter(null);
    setCountryFilter(null);
    setPicFilter(null);
  };

  useEffect(() => {
    if ((activeTab === "backup" && !showBackupTab) || (activeTab === "reserved" && !showReservedTab)) {
      setActiveTab("available");
    }
  }, [activeTab, showBackupTab, showReservedTab]);

  useEffect(() => {
    const isDomainTab = activeTab === "available" || activeTab === "reserved";
    const isLoading = activeTab === "reserved" ? isReservedLoading : isDomainsLoading;
    if (!isDomainTab || !highlightDomainId || isLoading) return;

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`domain-${highlightDomainId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => clearTimeout(timer);
  }, [activeTab, highlightDomainId, isDomainsLoading, isReservedLoading]);

  useEffect(() => {
    if (
      activeTab === "available" ||
      !highlightHistoryDomainId ||
      (activeTab === "backup" ? isBackupLoading : isHistoryLoading)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`history-domain-${highlightHistoryDomainId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => clearTimeout(timer);
  }, [activeTab, highlightHistoryDomainId, isBackupLoading, isHistoryLoading]);


  // ================================
  // Domain CRUD
  // ================================

  const handleAddDomain = async () => {
    setIsAddingDomain(true);
    try {
      const resolvedExpiry = normalizeExpiryInput(
        expiry || expiryRef.current?.value || ""
      );
      const missingFields = [
        !domain.trim() ? "Domain" : null,
        !hosting.trim() ? "Hosting" : null,
        !account.trim() ? "Account" : null,
        !project.trim() ? "Project" : null,
      ].filter(Boolean);

      if (missingFields.length > 0) {
        alert(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }

      if (resolvedExpiry && !isValidExpiryInput(resolvedExpiry)) {
        alert("Expiry must be in YYYY-MM-DD or DD/MM/YYYY format.");
        return;
      }

      const normalizedInput = normalizeDomain(domain);

      const duplicateLookupRes = await fetch(
        `/api/domains?${buildInventoryQuery({
          search: "",
          expiry: "all",
          hostingProvider: null,
          project: null,
          country: null,
        }, 1, 1, { exactDomain: normalizedInput })}`
      );
      const duplicateLookup: PaginatedResponse<DomainItem> = duplicateLookupRes.ok
        ? await duplicateLookupRes.json()
        : { items: [], total: 0, page: 1, pageSize: 1 };
      const duplicate = duplicateLookup.items[0];

      if (duplicate) {
        setDuplicateDomain(duplicate);
        return;
      }

      const newDomain: DomainItem = {
        id: crypto.randomUUID(),
        domain: normalizedInput,
        hosting,
        expiry: resolvedExpiry || null,
        account,
        project,
        country: (capitalizeText(country.trim()) || "-"),
        language: language.trim().toUpperCase() || deriveLanguageFromCountry(country.trim()),
        status: reserveOnCreate ? "reserved" : "available",
        reservedAt: reserveOnCreate ? new Date().toISOString() : null,
        reservedForProject: reserveOnCreate ? capitalizeText(project.trim()) : undefined,
        reservedForCountry: reserveOnCreate
          ? (capitalizeText(country.trim()) || undefined)
          : undefined,
      };

      const res = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDomain),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: "Unexpected server response." };

      if (!res.ok) {
        alert(data.error || "Failed to create domain.");
        return;
      }

      setHostingOptions((prev) =>
        hosting && !prev.includes(hosting) ? [...prev, hosting].sort() : prev
      );
      setAccountOptions((prev) =>
        account && !prev.includes(account) ? [...prev, account].sort() : prev
      );
      setProjectOptions((prev) =>
        project && !prev.includes(project) ? [...prev, project].sort() : prev
      );
      if (country.trim()) {
        const normalizedCountry = capitalizeText(country.trim());
        setCountryOptions((prev) =>
          !prev.includes(normalizedCountry)
            ? [...prev, normalizedCountry].sort()
            : prev
        );
      }
      if (language.trim()) {
        const normalizedLanguage = language.trim().toUpperCase();
        setLanguageOptions((prev) =>
          !prev.includes(normalizedLanguage)
            ? [...prev, normalizedLanguage].sort()
            : prev
        );
      }

      setDomain("");
      setHosting("");
      setProject("");
      setCountry("");
      setLanguage("");
      setAccount("");
      setExpiry("");
      setReserveOnCreate(false);

      domainRef.current?.focus();
      queueRefresh({
        refreshDomains: true,
        refreshHistory: false,
        refreshOptions: false,
        includeTotal: true,
      });
    } finally {
      setIsAddingDomain(false);
    }
  };


  const handleDeleteDomain = async (id: string) => {
    const target = domains.find(d => d.id === id);
    if (!target) return;

    if (target.status !== "available") {
      alert("Only available domains can be deleted");
      return;
    }

    const ok = confirm(`Delete domain "${target.domain}" ?`);
    if (!ok) return;

    await fetch(`/api/domains?id=${id}`, {
      method: "DELETE"
    });

    queueRefresh({
      refreshDomains: true,
      refreshHistory: false,
      refreshOptions: true,
      includeTotal: true,
    });
  };

  const handleOpenReserveModal = (item: DomainItem) => {
    setReserveTarget(item);
    setReserveProject(capitalizeText(searchProject.trim()) || "");
    setReserveCountry(capitalizeText(searchCountry.trim()) || "");
    setReservePic("");
    setReserveError("");
  };

  const closeReserveModal = () => {
    setReserveTarget(null);
    setReserveProject("");
    setReserveCountry("");
    setReservePic("");
    setReserveError("");
  };

  const handleConfirmReserve = async () => {
    if (!reserveTarget) return;

    const projectValue = capitalizeText(reserveProject.trim());
    const countryValue = capitalizeText(reserveCountry.trim());
    const picValue = capitalizeText(reservePic.trim());

    if (!projectValue) {
      setReserveError("Project is required.");
      return;
    }

    if (!countryValue) {
      setReserveError("Country is required.");
      return;
    }

    setReservedActionId(reserveTarget.id);

    try {
      const res = await fetch("/api/domains/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: reserveTarget.id,
          project: projectValue,
          country: countryValue,
          pic: picValue || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReserveError(data.error || "Failed to reserve domain.");
        return;
      }

      if (picValue) {
        setPicOptions((prev) =>
          prev.includes(picValue) ? prev : [...prev, picValue].sort()
        );
        setPicByCountryOptions((prev) => {
          const current = prev[countryValue] ?? [];
          if (current.includes(picValue)) return prev;
          return {
            ...prev,
            [countryValue]: [...current, picValue].sort(),
          };
        });
      }

      closeReserveModal();
      queueRefresh({
        refreshDomains: true,
        refreshHistory: false,
        refreshOptions: true,
        includeTotal: true,
      });
    } finally {
      setReservedActionId(null);
    }
  };

  const handleGoToDuplicate = () => {
    if (!duplicateDomain) return;

    const targetTab: DashboardTab =
      duplicateDomain.status === "available"
        ? "available"
        : duplicateDomain.status === "reserved"
          ? "reserved"
        : duplicateDomain.usedForPic?.trim()
          ? "history"
          : "backup";

    setActiveTab(targetTab);
    setExpiryFilter("all");
    setHostingProvider(null);
    setProjectFilter(null);
    setCountryFilter(null);
    setTabSearches((current) => ({
      ...current,
      [targetTab]: duplicateDomain.domain,
    }));

    if (targetTab === "available") {
      setPageAvailable(1);
      setHighlightDomainId(duplicateDomain.id);
      setHighlightHistoryDomainId(null);
    } else if (targetTab === "reserved") {
      setPageReserved(1);
      setHighlightDomainId(duplicateDomain.id);
      setHighlightHistoryDomainId(null);
    } else if (targetTab === "backup") {
      setPageBackup(1);
      setHighlightHistoryDomainId(duplicateDomain.id);
      setHighlightDomainId(null);
    } else {
      setPageHistory(1);
      setHighlightHistoryDomainId(duplicateDomain.id);
      setHighlightDomainId(null);
    }

    setDuplicateDomain(null);

    window.setTimeout(() => {
      setHighlightDomainId(null);
      setHighlightHistoryDomainId(null);
    }, 5000);
  };

  const closeProjectMismatchModal = () => {
    if (isUsingDomain) return;
    setPendingUseRequest(null);
  };

  const executeUseDomain = async ({
    id,
    usedDomain,
    project,
    country,
    pic,
  }: PendingUseRequest) => {
    setIsUsingDomain(true);
    try {
      const res = await fetch("/api/domains/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          project,
          country,
          pic: pic || undefined,
          useMode,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: "Unexpected server response." };

      if (!res.ok) {
        setRequestError(data.error || "Failed to use domain.");
        return;
      }

      setRequestError("");
      if (usedDomain) {
        removeDomainFromAvailableCaches(usedDomain);
      }
      setSearchCountry(country);
      if (pic) {
        setSearchPic(pic);
        setPicOptions((prev) =>
          !prev.includes(pic) ? [...prev, pic].sort() : prev
        );
        setPicByCountryOptions((prev) => {
          const currentForCountry = prev[country] ?? [];
          if (currentForCountry.includes(pic)) return prev;

          return {
            ...prev,
            [country]: [...currentForCountry, pic].sort(),
          };
        });
      }
      setMatchedDomains([]);
      setCurrentIndex(0);
      setProviderWarning("");
      setPendingUseRequest(null);
      setTotalAvailable((prev) => Math.max(prev - 1, 0));
      setTotalHistory((prev) => prev + 1);
      queueRefresh({
        refreshDomains: true,
        refreshHistory: true,
        refreshOptions: false,
        includeTotal: true,
      });
    } finally {
      setIsUsingDomain(false);
    }
  };

  const handleUseDomain = async (id: string) => {
    const usedDomain = matchedDomains.find((item) => item.id === id) ?? null;
    const projectValue = searchProject.trim();
    const requestCountry = capitalizeText(searchCountry.trim());
    const requestPic = useMode === "pic" ? capitalizeText(searchPic.trim()) : "";

    if (!projectValue) {
      setRequestError("Project name is required.");
      return;
    }

    if (!requestCountry) {
      setRequestError("Country is required before you can use a domain.");
      return;
    }

    if (useMode === "pic" && !requestPic) {
      setRequestError("PIC is required before you can use a domain.");
      return;
    }

    setRequestError("");

    const pendingRequest: PendingUseRequest = {
      id,
      usedDomain,
      project: usedDomain?.project ?? projectValue,
      searchedProject: projectValue,
      country: requestCountry,
      pic: requestPic,
    };

    const recordedProject = normalizeProjectName(usedDomain?.project ?? "");
    const searchedProject = normalizeProjectName(projectValue);

    if (
      usedDomain &&
      recordedProject &&
      searchedProject &&
      recordedProject !== searchedProject
    ) {
      setPendingUseRequest(pendingRequest);
      return;
    }

    await executeUseDomain(pendingRequest);
  };

  const handleUseReservedAsBackup = async (item: DomainItem) => {
    if (!item.reservedForProject || !item.reservedForCountry) {
      alert("Reserved project and country are required before using this domain.");
      return;
    }

    setReservedActionId(item.id);

    try {
      const res = await fetch("/api/domains/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          project: item.reservedForProject,
          country: item.reservedForCountry,
          useMode: "backup",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to use reserved domain as backup.");
        return;
      }

      queueRefresh({
        refreshDomains: true,
        refreshHistory: true,
        refreshOptions: true,
        includeTotal: true,
      });
    } finally {
      setReservedActionId(null);
    }
  };

  const handleUseReservedForPic = async (item: DomainItem) => {
    if (!item.reservedForProject || !item.reservedForCountry) {
      alert("Reserved project and country are required before using this domain.");
      return;
    }

    if (item.reservedForPic?.trim()) {
      setReservedActionId(item.id);

      try {
        const res = await fetch("/api/domains/use", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
            project: item.reservedForProject,
            country: item.reservedForCountry,
            pic: item.reservedForPic,
            useMode: "pic",
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Failed to use reserved domain for PIC.");
          return;
        }

        queueRefresh({
          refreshDomains: true,
          refreshHistory: true,
          refreshOptions: true,
          includeTotal: true,
        });
      } finally {
        setReservedActionId(null);
      }

      return;
    }

    setReservePicTarget(item);
    setReservePicValue("");
  };

  const closeReservePicModal = () => {
    setReservePicTarget(null);
    setReservePicValue("");
  };

  const handleConfirmReservedPicUse = async () => {
    if (!reservePicTarget) return;

    const normalizedPic = capitalizeText(reservePicValue.trim());
    if (!normalizedPic) {
      alert("PIC is required.");
      return;
    }

    setReservedActionId(reservePicTarget.id);

    try {
      const res = await fetch("/api/domains/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: reservePicTarget.id,
          project: reservePicTarget.reservedForProject,
          country: reservePicTarget.reservedForCountry,
          pic: normalizedPic,
          useMode: "pic",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to use reserved domain for PIC.");
        return;
      }

      if (reservePicTarget.reservedForCountry) {
        setPicOptions((prev) =>
          prev.includes(normalizedPic) ? prev : [...prev, normalizedPic].sort()
        );
        setPicByCountryOptions((prev) => {
          const current = prev[reservePicTarget.reservedForCountry!] ?? [];
          if (current.includes(normalizedPic)) return prev;
          return {
            ...prev,
            [reservePicTarget.reservedForCountry!]: [...current, normalizedPic].sort(),
          };
        });
      }

      closeReservePicModal();
      queueRefresh({
        refreshDomains: true,
        refreshHistory: true,
        refreshOptions: true,
        includeTotal: true,
      });
    } finally {
      setReservedActionId(null);
    }
  };

  const handleReleaseReserved = async (item: DomainItem) => {
    const ok = confirm(`Release "${item.domain}" back to available?`);
    if (!ok) return;

    setReservedActionId(item.id);

    try {
      const res = await fetch("/api/domains/release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: item.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to release reserved domain.");
        return;
      }

      queueRefresh({
        refreshDomains: true,
        refreshHistory: false,
        refreshOptions: true,
        includeTotal: true,
      });
    } finally {
      setReservedActionId(null);
    }
  };

  const handleSuggestDomain = async () => {
    setIsSuggestingDomain(true);
    try {
      const projectKey = searchProject.trim().toLowerCase();
      const countryKey = searchCountry.trim().toLowerCase();

      if (!projectKey) {
        setRequestError("Project name is required.");
        return;
      }

      if (!countryKey) {
        setRequestError("Country is required to request a domain.");
        return;
      }

      setRequestError("");

      const cacheKey = `${projectKey}|${countryKey}|${onlyMatchingLanguage ? "1" : "0"}`;
      let matches = suggestCacheRef.current.get(cacheKey);
      let noLanguageMapping = false;
      let responseCountry = searchCountry.trim().toUpperCase();

      if (!matches) {
        const params = new URLSearchParams({
          project: searchProject.trim(),
          country: searchCountry.trim(),
          onlyMatchingLanguage: String(onlyMatchingLanguage),
        });
        const res = await fetch(`/api/domains/suggest?${params.toString()}`);
        const payload = res.ok
          ? await res.json() as {
              matches?: DomainItem[];
              noLanguageMapping?: boolean;
              country?: string;
            } | DomainItem[]
          : [];
        matches = Array.isArray(payload) ? payload : payload.matches ?? [];
        noLanguageMapping = Array.isArray(payload) ? false : payload.noLanguageMapping === true;
        responseCountry = Array.isArray(payload) ? responseCountry : payload.country ?? responseCountry;
        suggestCacheRef.current.set(cacheKey, matches);
      } else {
        const params = new URLSearchParams({
          project: searchProject.trim(),
          country: searchCountry.trim(),
          onlyMatchingLanguage: String(onlyMatchingLanguage),
        });
        const res = await fetch(`/api/domains/suggest?${params.toString()}`);
        const payload = res.ok
          ? await res.json() as {
              matches?: DomainItem[];
              noLanguageMapping?: boolean;
              country?: string;
            } | DomainItem[]
          : [];
        if (!Array.isArray(payload) && payload.matches) {
          matches = payload.matches;
          suggestCacheRef.current.set(cacheKey, matches);
        }
        noLanguageMapping = Array.isArray(payload) ? false : payload.noLanguageMapping === true;
        responseCountry = Array.isArray(payload) ? responseCountry : payload.country ?? responseCountry;
      }

      if (matches.length === 0) {
        if (noLanguageMapping) {
          setRequestError(
            `No language mapping found for ${responseCountry}. Please add a mapping or turn off matching-language filter.`
          );
        } else {
          alert("No available domain found for this project");
        }
        setMatchedDomains([]);
        setCurrentIndex(0);
        setProviderWarning("");
        return;
      }

      setProviderWarning("");
      setMatchedDomains(matches);
      setCurrentIndex(0);
    } finally {
      setIsSuggestingDomain(false);
    }
  };


  const handleUndoHistory = async (item: DomainHistoryItem) => {
    const ok = confirm(`Undo "${item.domain}" and move it back to available domains?`);
    if (!ok) return;

    setHistoryActionId(item.id);

    const res = await fetch(`/api/domain-history/${item.id}`, {
      method: "PATCH",
    });

    const data = await res.json();

    if (!res.ok) {
      setHistoryActionId(null);
      alert(data.error || "Failed to undo history row.");
      return;
    }

    queueRefresh({
      refreshDomains: true,
      refreshHistory: true,
      includeTotal: true,
    });
    setHistoryActionId(null);
  };

  const handleDeleteHistory = async (item: DomainHistoryItem) => {
    const ok = confirm(`Delete the history row for "${item.domain}"?`);
    if (!ok) return;

    setHistoryActionId(item.id);

    const res = await fetch(`/api/domain-history/${item.id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      setHistoryActionId(null);
      alert(data.error || "Failed to delete history row.");
      return;
    }

    queueRefresh({
      refreshDomains: false,
      refreshHistory: true,
      includeTotal: true,
    });
    setHistoryActionId(null);
  };

  const handleAssignHistoryPic = async (item: DomainHistoryItem) => {
    setAssignPicTarget(item);
    setAssignPicValue(capitalizeText((item.usedForPic ?? "").trim()));
  };

  const closeAssignPicModal = () => {
    if (historyActionId) return;
    setAssignPicTarget(null);
    setAssignPicValue("");
  };

  const handleConfirmAssignHistoryPic = async () => {
    if (!assignPicTarget) return;

    const normalizedPic = capitalizeText(assignPicValue.trim());
    if (!normalizedPic) {
      alert("PIC is required.");
      return;
    }

    setHistoryActionId(assignPicTarget.id);

    const res = await fetch(`/api/domain-history/${assignPicTarget.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pic: normalizedPic }),
    });

    const data = await res.json();

    if (!res.ok) {
      setHistoryActionId(null);
      alert(data.error || "Failed to assign PIC.");
      return;
    }

    setPicOptions((prev) =>
      prev.includes(normalizedPic) ? prev : [...prev, normalizedPic].sort()
    );
    if (assignPicTarget.country) {
      setPicByCountryOptions((prev) => {
        const current = prev[assignPicTarget.country] ?? [];
        if (current.includes(normalizedPic)) return prev;

        return {
          ...prev,
          [assignPicTarget.country]: [...current, normalizedPic].sort(),
        };
      });
    }

    queueRefresh({
      refreshDomains: false,
      refreshHistory: true,
      refreshOptions: true,
      includeTotal: true,
    });
    setHistoryActionId(null);
    setAssignPicTarget(null);
    setAssignPicValue("");
  };


  // ================================
  // Edit Domain
  // ================================

  const handleEdit = (domain: DomainItem) => {
    setEditingId(domain.id);
    setEditDomain({
      ...domain,
      language: getSuggestionLanguageLabel(domain.language, domain.country),
    });
  };

  const handleSave = async () => {
    if (!editDomain) return;
    const nextDomain = editDomain;
    const previousDomain = domains.find((item) => item.id === nextDomain.id) ?? null;

    // Optimistic UI update for snappy editing feedback.
    setDomains((prev) =>
      prev.map((item) => (item.id === nextDomain.id ? nextDomain : item))
    );
    setEditingId(null);
    setEditDomain(null);

    void (async () => {
      const res = await fetch(`/api/domains`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextDomain),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: "Unexpected server response." };

      if (!res.ok) {
        throw new Error(data.error || "Failed to update domain.");
      }

      if (nextDomain.language?.trim()) {
        const normalizedLanguage = nextDomain.language.trim().toUpperCase();
        setLanguageOptions((prev) =>
          !prev.includes(normalizedLanguage)
            ? [...prev, normalizedLanguage].sort()
            : prev
        );
      }

      queueRefresh({
        refreshDomains: true,
        refreshHistory: false,
        includeTotal: true,
        silent: true,
      });
    })().catch((error) => {
      if (previousDomain) {
        setDomains((prev) =>
          prev.map((item) =>
            item.id === previousDomain.id ? previousDomain : item
          )
        );
      }

      setEditingId(nextDomain.id);
      setEditDomain(nextDomain);
      alert(error instanceof Error ? error.message : "Failed to update domain.");
    });
  };
  
  
  // ================================
  // Render
  // ================================

  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold">
        Domain Inventory Manager
      </h1>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card title="Record purchased domain">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Input
              ref={domainRef}
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  focusNext(hostingRef);
                }
              }}
            />

            <SmartDropdown
              ref={hostingRef}
              value={hosting}
              setValue={(value) => setHosting(capitalizeText(value))}
              options={hostingOptions}
              setOptions={setHostingOptions}
              placeholder="Hosting provider"
            />

            <Input
              ref={expiryRef}
              type="text"
              value={expiry}
              placeholder="YYYY-MM-DD or DD/MM/YYYY"
              onChange={(e) => setExpiry(normalizeExpiryInput(e.target.value))}
            />

            <SmartDropdown
              value={account}
              setValue={(value) => setAccount(capitalizeText(value))}
              options={accountOptions}
              setOptions={setAccountOptions}
              placeholder="Account"
            />

            <SmartDropdown
              value={project}
              setValue={(value) => setProject(capitalizeText(value))}
              options={projectOptions}
              setOptions={setProjectOptions}
              placeholder="Project Name"
            />

            <div className="grid gap-3 md:col-span-2 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] xl:col-span-1">
              <SmartDropdown
                value={country}
                setValue={(value) => setCountry(capitalizeText(value))}
                options={countryOptions}
                setOptions={setCountryOptions}
                placeholder="Country"
              />

              <SmartDropdown
                value={language}
                setValue={(value) => setLanguage(value.trim().toUpperCase())}
                options={languageOptions}
                displayOptions={languageDisplayOptions}
                setOptions={setLanguageOptions}
                placeholder="Language"
              />
            </div>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={reserveOnCreate}
              onChange={(e) => setReserveOnCreate(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900"
            />
            Reserve
          </label>

          {duplicateDomain && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-red-800 bg-red-950/40 p-4">
              <div className="text-sm text-red-300">
                ⚠ Domain <b>{duplicateDomain.domain}</b> already exists in inventory.
              </div>

              <Button variant="secondary" onClick={handleGoToDuplicate}>
                Go to existing
              </Button>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleAddDomain}
              disabled={isAddingDomain || isOptionsLoading}
            >
              {isAddingDomain ? "Adding..." : "Add domain"}
            </Button>
          </div>
        </Card>

        <Card title="Request / suggest domain">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setUseMode("pic");
                if (requestError) setRequestError("");
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                useMode === "pic"
                  ? "border-violet-500/50 bg-violet-500/15 text-zinc-50"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              Assign PIC
            </button>

            <button
              type="button"
              onClick={() => {
                setUseMode("backup");
                setSearchPic("");
                setProviderWarning("");
                if (requestError) setRequestError("");
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                useMode === "backup"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-100"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              No PIC
            </button>
          </div>

          <div className={`grid gap-4 ${useMode === "backup" ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            <Input
              placeholder="Project"
              value={searchProject}
              onChange={(e) => {
                setSearchProject(capitalizeText(e.target.value));
                if (requestError) setRequestError("");
              }}
            />

            <Input
              placeholder="Country"
              value={searchCountry}
              onChange={(e) => {
                setSearchCountry(capitalizeText(e.target.value));
                if (requestError) setRequestError("");
              }}
              required
            />

            {useMode === "pic" ? (
              <SmartDropdown
                value={searchPic}
                setValue={(value) => {
                  setSearchPic(capitalizeText(value));
                  if (requestError) setRequestError("");
                }}
                options={filteredPicOptions}
                setOptions={setPicOptions}
                placeholder="PIC"
              />
            ) : null}
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            {useMode === "backup"
              ? "Backup keeps the domain in Backup Pending so PIC can be assigned later."
              : "Assign a PIC now to record the domain directly into final history."}
          </p>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                disabled={!searchCountry}
                checked={onlyMatchingLanguage}
                onChange={(e) => setOnlyMatchingLanguage(e.target.checked)}
              />
              Only show matching language
            </label>

            <Button
              variant="secondary"
              onClick={() => void handleSuggestDomain()}
              disabled={isSuggestingDomain}
            >
              {isSuggestingDomain ? "Finding..." : "Suggest domain"}
            </Button>
          </div>

          {requestError && (
            <p className="mt-3 text-sm text-red-400">
              {requestError}
            </p>
          )}

          {matchedDomains.length > 0 && (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Suggested domain
                  </p>

                  <div className="space-y-3">
                    <p className="text-3xl font-semibold tracking-tight text-zinc-50">
                      {matchedDomains[currentIndex].domain}
                    </p>

                    <p className="text-sm font-medium tracking-wide text-zinc-400">
                      {getSuggestionCountryLabel(matchedDomains[currentIndex].country)} ·{" "}
                      {getSuggestionLanguageLabel(
                        matchedDomains[currentIndex].language,
                        matchedDomains[currentIndex].country
                      )}
                    </p>

                    <div className="space-y-2 text-sm text-zinc-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-violet-300">
                          Project
                        </span>
                        <span className="text-sm text-zinc-200">
                          {matchedDomains[currentIndex].project || "-"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
                          Hosting
                        </span>
                        <span className="text-sm text-zinc-200">
                          {matchedDomains[currentIndex].hosting || "-"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-sky-300">
                          Account
                        </span>
                        <span className="text-sm text-zinc-200">
                          {matchedDomains[currentIndex].account || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-medium tracking-wide text-zinc-500">
                    {currentIndex + 1} / {matchedDomains.length}
                  </p>

                  {providerWarning && (
                    <div
                      role="alert"
                      className="mt-2 w-full rounded-xl border border-amber-400/45 bg-gradient-to-r from-amber-500/15 to-orange-500/15 p-3 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-300/20 text-amber-200">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 9v4" />
                            <path d="M12 17h.01" />
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                        </span>

                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/90">
                            Provider Warning
                          </p>
                          <p className="text-sm leading-6 text-amber-100">
                            {providerWarning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 self-start xl:self-center">
                  <Button variant="secondary" onClick={handlePrevDomain}>
                    Back
                  </Button>

                  <Button variant="secondary" onClick={handleNextDomain}>
                    Next
                  </Button>

                  <Button
                    onClick={() => handleUseDomain(matchedDomains[currentIndex].id)}
                    disabled={isUsingDomain}
                  >
                    {isUsingDomain ? "Using..." : useMode === "backup" ? "Use as backup" : "Use"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Domain data">
        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="space-y-2">
              {(["available", "reserved", "backup", "history"] as DashboardTab[])
                .filter((tab) => {
                  if (tab === "reserved") return showReservedTab;
                  if (tab === "backup") return showBackupTab;
                  return true;
                })
                .map((tab) => {
                  const isActive = activeTab === tab;
                  const tabConfig = activeTabConfig[tab];

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-violet-500/50 bg-violet-500/12 text-zinc-50 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]"
                          : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <span className="font-medium">{tabConfig.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isActive
                            ? "bg-violet-400/20 text-violet-100"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {tabConfig.count}
                      </span>
                    </button>
                  );
                })}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {activeTabConfig[activeTab].label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {activeTab === "available"
                      ? "Available inventory ready for assignment."
                      : activeTab === "reserved"
                        ? "Reserved domains waiting to be used or released."
                      : activeTab === "backup"
                        ? "Taken domains waiting for PIC assignment."
                        : "Final usage history with PIC assigned."}
                  </p>
                </div>
              </div>

              <FilterBar
                hostingOptions={hostingOptions}
                projectOptions={projectOptions}
                countryOptions={countryOptions}
                picOptions={picOptions}
                filters={filters}
                searchValue={activeSearch}
                searchPlaceholder={activeTabConfig[activeTab].searchPlaceholder}
                setSearch={setSearch}
                setExpiry={setExpiryFilter}
                setHostingProvider={setHostingProvider}
                setProject={setProjectFilter}
                setCountry={setCountryFilter}
                setPic={setPicFilter}
                showPicFilter={activeTab === "history"}
                onClear={clearActiveTableFilters}
              />
            </div>

            {activeTab === "available" ? (
              <DomainTable
                title="Available domains"
                domains={domains}
                page={pageAvailable}
                totalPages={totalPagesAvailable}
                totalItems={totalAvailable}
                rowsPerPage={rowsPerPage}
                isLoading={isDomainsLoading}
                onPrev={() => setPageAvailable((p) => Math.max(p - 1, 1))}
                onNext={() => setPageAvailable((p) => Math.min(p + 1, totalPagesAvailable))}
                editingId={editingId}
                editDomain={editDomain}
                highlightDomainId={highlightDomainId}
                hostingOptions={hostingOptions}
                accountOptions={accountOptions}
                projectOptions={projectOptions}
                countryOptions={countryOptions}
                languageOptions={languageOptions}
                setHostingOptions={setHostingOptions}
                setAccountOptions={setAccountOptions}
                setProjectOptions={setProjectOptions}
                setCountryOptions={setCountryOptions}
                setLanguageOptions={setLanguageOptions}
                setEditDomain={setEditDomain}
                handleEdit={handleEdit}
                handleSave={handleSave}
                handleDeleteDomain={handleDeleteDomain}
                handleReserveDomain={handleOpenReserveModal}
                setEditingId={setEditingId}
              />
            ) : activeTab === "reserved" ? (
              <ReservedTable
                title="Reserved domains"
                emptyLabel="No reserved domains found."
                highlightDomainId={highlightDomainId}
                domains={reservedDomains}
                page={pageReserved}
                totalPages={totalPagesReserved}
                totalItems={totalReserved}
                rowsPerPage={rowsPerPage}
                isLoading={isReservedLoading}
                reservedActionId={reservedActionId}
                onPrev={() => setPageReserved((p) => Math.max(p - 1, 1))}
                onNext={() => setPageReserved((p) => Math.min(p + 1, totalPagesReserved))}
                onUseForPic={handleUseReservedForPic}
                onUseAsBackup={handleUseReservedAsBackup}
                onRelease={handleReleaseReserved}
              />
            ) : activeTab === "backup" ? (
              <HistoryTable
                title="Backup pending"
                emptyLabel="No backup pending rows found."
                highlightDomainId={highlightHistoryDomainId}
                histories={backupHistory}
                page={pageBackup}
                totalPages={totalPagesBackup}
                totalItems={totalBackup}
                rowsPerPage={rowsPerPage}
                isLoading={isBackupLoading}
                onPrev={() => setPageBackup((p) => Math.max(p - 1, 1))}
                onNext={() => setPageBackup((p) => Math.min(p + 1, totalPagesBackup))}
                historyActionId={historyActionId}
                onAssignPic={handleAssignHistoryPic}
                onUndoHistory={handleUndoHistory}
                onDeleteHistory={handleDeleteHistory}
              />
            ) : (
              <HistoryTable
                title="History"
                emptyLabel="No history rows found."
                highlightDomainId={highlightHistoryDomainId}
                histories={finalHistory}
                page={pageHistory}
                totalPages={totalPagesHistory}
                totalItems={totalHistory}
                rowsPerPage={rowsPerPage}
                isLoading={isHistoryLoading}
                onPrev={() => setPageHistory((p) => Math.max(p - 1, 1))}
                onNext={() => setPageHistory((p) => Math.min(p + 1, totalPagesHistory))}
                historyActionId={historyActionId}
                onAssignPic={handleAssignHistoryPic}
                onUndoHistory={handleUndoHistory}
                onDeleteHistory={handleDeleteHistory}
              />
            )}
          </div>
        </div>
      </Card>

      {pendingUseRequest?.usedDomain ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100">
              Confirm project mismatch
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              This domain is recorded under project{" "}
              <span className="font-semibold text-zinc-100">
                &quot;{pendingUseRequest.usedDomain.project}&quot;
              </span>
              , but you searched for{" "}
              <span className="font-semibold text-zinc-100">
                &quot;{pendingUseRequest.searchedProject}&quot;
              </span>
              . Do you still want to use this domain?
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={closeProjectMismatchModal}
                disabled={isUsingDomain}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void executeUseDomain(pendingUseRequest)}
                disabled={isUsingDomain}
              >
                {isUsingDomain ? "Using..." : "Use anyway"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {assignPicTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100">
              {assignPicTarget.usageType === "backup" ? "Assign PIC" : "Edit PIC"}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {assignPicTarget.domain}
            </p>

            <div className="mt-4">
              <Input
                value={assignPicValue}
                placeholder="PIC"
                onChange={(e) => setAssignPicValue(capitalizeText(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleConfirmAssignHistoryPic();
                  }
                }}
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={closeAssignPicModal}
                disabled={Boolean(historyActionId)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleConfirmAssignHistoryPic()}
                disabled={Boolean(historyActionId)}
              >
                {historyActionId ? "Saving..." : "Save PIC"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {reserveTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100">
              Reserve domain
            </h3>
            <p className="mt-1 text-sm text-zinc-400">{reserveTarget.domain}</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                value={reserveProject}
                placeholder="Project"
                onChange={(e) => {
                  setReserveProject(capitalizeText(e.target.value));
                  if (reserveError) setReserveError("");
                }}
              />
              <Input
                value={reserveCountry}
                placeholder="Country"
                onChange={(e) => {
                  setReserveCountry(capitalizeText(e.target.value));
                  if (reserveError) setReserveError("");
                }}
              />
              <div className="md:col-span-2">
                <SmartDropdown
                  value={reservePic}
                  setValue={(value) => {
                    setReservePic(capitalizeText(value));
                    if (reserveError) setReserveError("");
                  }}
                  options={reserveCountry.trim() ? (picByCountryOptions[reserveCountry.trim()] ?? picOptions) : picOptions}
                  setOptions={setPicOptions}
                  placeholder="PIC (optional)"
                />
              </div>
            </div>

            {reserveError ? (
              <p className="mt-3 text-sm text-red-400">{reserveError}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={closeReserveModal}
                disabled={Boolean(reservedActionId)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleConfirmReserve()}
                disabled={Boolean(reservedActionId)}
              >
                {reservedActionId ? "Reserving..." : "Reserve"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {reservePicTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100">
              Add PIC for reserved domain
            </h3>
            <p className="mt-1 text-sm text-zinc-400">{reservePicTarget.domain}</p>

            <div className="mt-4">
              <SmartDropdown
                value={reservePicValue}
                setValue={(value) => setReservePicValue(capitalizeText(value))}
                options={
                  reservePicTarget.reservedForCountry
                    ? (picByCountryOptions[reservePicTarget.reservedForCountry] ?? picOptions)
                    : picOptions
                }
                setOptions={setPicOptions}
                placeholder="PIC"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={closeReservePicModal}
                disabled={Boolean(reservedActionId)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleConfirmReservedPicUse()}
                disabled={Boolean(reservedActionId)}
              >
                {reservedActionId ? "Using..." : "Use for PIC"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
