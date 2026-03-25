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
import { FilterBar } from "@/components/filters/FilterBar";

// Utilities
import { normalizeDomain } from "@/lib/domain/domainUtils";
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

const DEFAULT_ROWS_PER_PAGE = 10;

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
  const [history, setHistory] = useState<DomainHistoryItem[]>([]);

  // form fields
  const [domain, setDomain] = useState("");
  const [hosting, setHosting] = useState("");
  const [account, setAccount] = useState("");
  const [country, setCountry] = useState("");
  const [project, setProject] = useState("");
  const [expiry, setExpiry] = useState("");

  // suggestion
  const [matchedDomains, setMatchedDomains] = useState<DomainItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchProject, setSearchProject] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [searchPic, setSearchPic] = useState("");
  const [strictCountry, setStrictCountry] = useState(false);
  const [requestError, setRequestError] = useState("");

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState<DomainItem | null>(null);

  // warnings
  const [providerWarning, setProviderWarning] = useState("");
  const [duplicateDomain, setDuplicateDomain] = useState<DomainItem | null>(null);
  const [highlightDomainId, setHighlightDomainId] = useState<string | null>(null);

  // dropdown options
  const [hostingOptions, setHostingOptions] = useState<string[]>([]);
  const [accountOptions, setAccountOptions] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [picByCountryOptions, setPicByCountryOptions] = useState<Record<string, string[]>>({});

  // filters
  const [filters, setFilters] = useState<DomainFilters>({
    search: "",
    expiry: "all",
    hostingProvider: null,
    project: null,
    country: null,
  });

  // pagination state
  const [pageAvailable, setPageAvailable] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [totalHistory, setTotalHistory] = useState(0);
  const [historyActionId, setHistoryActionId] = useState<string | null>(null);
  const [isDomainsLoading, setIsDomainsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [isUsingDomain, setIsUsingDomain] = useState(false);
  const [isSuggestingDomain, setIsSuggestingDomain] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const rowsPerPage = DEFAULT_ROWS_PER_PAGE;
  const totalAvailableRef = useRef(0);
  const totalHistoryRef = useRef(0);
  const suggestCacheRef = useRef<Map<string, DomainItem[]>>(new Map());
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
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 250);

    return () => clearTimeout(timer);
  }, [filters.search]);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

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
            pic: [],
            picByCountry: {},
          };

      setHostingOptions(data.hosting);
      setAccountOptions(data.account);
      setProjectOptions(data.project);
      setCountryOptions(data.country);
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
      setPicOptions([]);
      setPicByCountryOptions({});
      setIsOptionsLoading(false);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const includeTotal = pageAvailable === 1 || totalAvailableRef.current === 0;
    const query = buildInventoryQuery(
      queryFilters,
      pageAvailable,
      rowsPerPage,
      {
        status: "available",
        includeTotal: includeTotal ? "true" : "false",
      }
    );

    setIsDomainsLoading(true);

    void fetch(`/api/domains?${query}`)
      .then(async (res) => {
        const data: PaginatedResponse<DomainItem> = res.ok
          ? await res.json()
          : { items: [], total: 0, page: 1, pageSize: rowsPerPage };

        if (cancelled) return;
        setDomains(data.items);
        if (typeof data.total === "number") {
          setTotalAvailable(data.total);
        }
      })
      .catch((error) => {
        console.error("Failed to load domains", error);
        if (cancelled) return;
        setDomains([]);
        setTotalAvailable(0);
      })
      .finally(() => {
        if (!cancelled) setIsDomainsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryFilters, pageAvailable, rowsPerPage]);

  useEffect(() => {
    let cancelled = false;
    const includeTotal = pageHistory === 1 || totalHistoryRef.current === 0;
    const query = buildInventoryQuery(
      queryFilters,
      pageHistory,
      rowsPerPage,
      { includeTotal: includeTotal ? "true" : "false" }
    );

    setIsHistoryLoading(true);

    void fetch(`/api/domain-history?${query}`)
      .then(async (res) => {
        const data: PaginatedResponse<DomainHistoryItem> = res.ok
          ? await res.json()
          : { items: [], total: 0, page: 1, pageSize: rowsPerPage };

        if (cancelled) return;
        setHistory(data.items);
        if (typeof data.total === "number") {
          setTotalHistory(data.total);
        }
      })
      .catch((error) => {
        console.error("Failed to load domain history", error);
        if (cancelled) return;
        setHistory([]);
        setTotalHistory(0);
      })
      .finally(() => {
        if (!cancelled) setIsHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryFilters, pageHistory, rowsPerPage]);

  useEffect(() => {
    setPageAvailable(1);
    setPageHistory(1);
  }, [
    filters.search,
    filters.expiry,
    filters.hostingProvider,
    filters.project,
    filters.country,
  ]);

  const refreshInventoryData = async ({
    refreshDomains = true,
    refreshHistory = true,
    refreshOptions = false,
    includeTotal = false,
    silent = false,
  }: RefreshInventoryArgs = {}) => {
    if (refreshDomains) {
      suggestCacheRef.current.clear();
    }

    if (!silent && refreshDomains) setIsDomainsLoading(true);
    if (!silent && refreshHistory) setIsHistoryLoading(true);

    const jobs: Promise<void>[] = [];

    if (refreshOptions) {
      jobs.push(loadDomainOptions());
    }

    if (refreshDomains) {
      jobs.push(
        fetch(
          `/api/domains?${buildInventoryQuery(
            queryFilters,
            pageAvailable,
            rowsPerPage,
            {
              status: "available",
              includeTotal: includeTotal ? "true" : "false",
            }
          )}`
        )
          .then(async (res) => (res.ok
            ? res.json() as Promise<PaginatedResponse<DomainItem>>
            : { items: [], total: 0, page: 1, pageSize: rowsPerPage }))
          .then((data) => {
            setDomains(data.items);
            if (typeof data.total === "number") {
              setTotalAvailable(data.total);
            }
          })
          .finally(() => {
            if (!silent) setIsDomainsLoading(false);
          })
      );
    }

    if (refreshHistory) {
      jobs.push(
        fetch(
          `/api/domain-history?${buildInventoryQuery(
            queryFilters,
            pageHistory,
            rowsPerPage,
            { includeTotal: includeTotal ? "true" : "false" }
          )}`
        )
          .then(async (res) => (res.ok
            ? res.json() as Promise<PaginatedResponse<DomainHistoryItem>>
            : { items: [], total: 0, page: 1, pageSize: rowsPerPage }))
          .then((data) => {
            setHistory(data.items);
            if (typeof data.total === "number") {
              setTotalHistory(data.total);
            }
          })
          .finally(() => {
            if (!silent) setIsHistoryLoading(false);
          })
      );
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
  const totalPagesHistory = Math.max(1, Math.ceil(totalHistory / rowsPerPage));


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
    pic: string,
    country: string
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
    const selectedDomain = matchedDomains[currentIndex];
    const countryValue = searchCountry.trim();
    const picValue = searchPic.trim();

    if (!selectedDomain || !countryValue || !picValue) {
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
            picValue,
            countryValue
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
  }, [currentIndex, matchedDomains, searchCountry, searchPic]);


  // ================================
  // Filter Setters
  // ================================

  const setSearch = (v: string) =>
    setFilters(f => ({ ...f, search: v }));

  const setExpiryFilter = (v: DomainFilters["expiry"]) =>
    setFilters(f => ({ ...f, expiry: v }));

  const setHostingProvider = (v: string | null) =>
    setFilters(f => ({ ...f, hostingProvider: v }));

  const setProjectFilter = (v: string | null) =>
    setFilters(f => ({ ...f, project: v }));

  const setCountryFilter = (v: string | null) =>
    setFilters(f => ({ ...f, country: v }));


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
        status: "available",
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

      setDomain("");
      setHosting("");
      setProject("");
      setCountry("");
      setAccount("");
      setExpiry("");

      domainRef.current?.focus();
      queueRefresh({
        refreshDomains: true,
        refreshHistory: false,
        refreshOptions: false,
        includeTotal: false,
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

  const handleGoToDuplicate = () => {
    if (!duplicateDomain) return; 
    setFilters((current) => ({
      ...current,
      search: duplicateDomain.domain,
    }));
    setPageAvailable(1);
    setHighlightDomainId(duplicateDomain.id); 
    setTimeout(() => { 
      const el = document.getElementById(`domain-${duplicateDomain.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100); 

    // clear duplicate warning
    setDuplicateDomain(null); 

    // remove highlight after 3 seconds 
    setTimeout(() => { 
      setHighlightDomainId(null); 
    }, 5000); };


  const handleUseDomain = async (id: string) => {
    setIsUsingDomain(true);
    try {
      const projectValue = searchProject.trim();
      const requestCountry = capitalizeText(searchCountry.trim());
      const requestPic = capitalizeText(searchPic.trim());

      if (!projectValue) {
        setRequestError("Project name is required.");
        return;
      }

      if (!requestCountry) {
        setRequestError("Country is required before you can use a domain.");
        return;
      }

      if (!requestPic) {
        setRequestError("PIC is required before you can use a domain.");
        return;
      }

      const res = await fetch("/api/domains/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          project: projectValue,
          country: requestCountry,
          pic: requestPic,
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
      setSearchCountry(requestCountry);
      setSearchPic(requestPic);
      setPicOptions((prev) =>
        requestPic && !prev.includes(requestPic) ? [...prev, requestPic].sort() : prev
      );
      setPicByCountryOptions((prev) => {
        const currentForCountry = prev[requestCountry] ?? [];
        if (currentForCountry.includes(requestPic)) return prev;

        return {
          ...prev,
          [requestCountry]: [...currentForCountry, requestPic].sort(),
        };
      });
      setMatchedDomains([]);
      setCurrentIndex(0);
      setProviderWarning("");
      setTotalAvailable((prev) => Math.max(prev - 1, 0));
      setTotalHistory((prev) => prev + 1);
      queueRefresh({
        refreshDomains: true,
        refreshHistory: true,
        refreshOptions: false,
        includeTotal: false,
      });
    } finally {
      setIsUsingDomain(false);
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

      const cacheKey = `${projectKey}|${countryKey}|${strictCountry ? "1" : "0"}`;
      let matches = suggestCacheRef.current.get(cacheKey);

      if (!matches) {
        const params = new URLSearchParams({
          project: searchProject.trim(),
          country: searchCountry.trim(),
          strictCountry: String(strictCountry),
        });
        const res = await fetch(`/api/domains/suggest?${params.toString()}`);
        const payload = res.ok
          ? await res.json() as { matches?: DomainItem[] } | DomainItem[]
          : [];
        matches = Array.isArray(payload) ? payload : payload.matches ?? [];
        suggestCacheRef.current.set(cacheKey, matches);
      } else {
        const params = new URLSearchParams({
          project: searchProject.trim(),
          country: searchCountry.trim(),
          strictCountry: String(strictCountry),
        });
        const res = await fetch(`/api/domains/suggest?${params.toString()}`);
        const payload = res.ok
          ? await res.json() as { matches?: DomainItem[] } | DomainItem[]
          : [];
        if (!Array.isArray(payload) && payload.matches) {
          matches = payload.matches;
          suggestCacheRef.current.set(cacheKey, matches);
        }
      }

      if (matches.length === 0) {
        alert("No available domain found for this project");
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


  // ================================
  // Edit Domain
  // ================================

  const handleEdit = (domain: DomainItem) => {
    setEditingId(domain.id);
    setEditDomain(domain);
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

      queueRefresh({
        refreshDomains: true,
        refreshHistory: false,
        includeTotal: false,
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

      {/* Record Domain */}

      <Card title="1. Record purchased domain">
        <div className="grid gap-5 md:grid-cols-3">

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

          <SmartDropdown
            value={country}
            setValue={(value) => setCountry(capitalizeText(value))}
            options={countryOptions}
            setOptions={setCountryOptions}
            placeholder="Country"
          />

        </div>

        {duplicateDomain && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-4 flex items-center justify-between">
            <div className="text-sm text-red-300">
              ⚠ Domain <b>{duplicateDomain.domain}</b> already exists in inventory.
            </div>

            <Button
              variant="secondary"
              onClick={handleGoToDuplicate}
            >
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

      {/* Request Domain */}

    <Card title="2. Request domain for project">
      <div className="grid gap-4 md:grid-cols-3">

        <Input
          placeholder="Project Name"
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

      </div>

      {requestError && (
        <p className="mt-3 text-sm text-red-400">
          {requestError}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => void handleSuggestDomain()}
          disabled={isSuggestingDomain}
        >
          {isSuggestingDomain ? "Finding..." : "Suggest domain"}
        </Button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          disabled={!searchCountry}
          checked={strictCountry}
          onChange={(e) => setStrictCountry(e.target.checked)}
        />
        Exact country match only
      </label>

      {/* Suggested result */}
      {matchedDomains.length > 0 && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="mb-3 text-sm font-medium tracking-wide text-zinc-400">
            Suggested domain
          </p>

          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <p className="text-3xl font-semibold tracking-tight text-zinc-50">
                {matchedDomains[currentIndex].domain}
              </p>

              <div className="space-y-2 text-sm text-zinc-300">
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

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handlePrevDomain}
              >
                Back
              </Button>

              <Button
                variant="secondary"
                onClick={handleNextDomain}
              >
                Next
              </Button>

              <Button
                onClick={() =>
                  handleUseDomain(matchedDomains[currentIndex].id)
                }
                disabled={isUsingDomain || !searchPic.trim()}
              >
                {isUsingDomain ? "Using..." : "Use"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>

      <FilterBar
        hostingOptions={hostingOptions}
        projectOptions={projectOptions}
        countryOptions={countryOptions}
        filters={filters}
        setSearch={setSearch}
        setExpiry={setExpiryFilter}
        setHostingProvider={setHostingProvider}
        setProject={setProjectFilter}
        setCountry={setCountryFilter}
      />


      {/* Tables */}

      <DomainTable
        domains={domains}
        page={pageAvailable}
        totalPages={totalPagesAvailable}
        totalItems={totalAvailable}
        rowsPerPage={rowsPerPage}
        isLoading={isDomainsLoading}
        onPrev={() => setPageAvailable(p => Math.max(p - 1, 1))}
        onNext={() => setPageAvailable(p => Math.min(p + 1, totalPagesAvailable))}
        editingId={editingId}
        editDomain={editDomain}
        highlightDomainId={highlightDomainId}
        duplicateDomain={duplicateDomain}
        hostingOptions={hostingOptions}
        accountOptions={accountOptions}
        projectOptions={projectOptions}
        countryOptions={countryOptions}
        setHostingOptions={setHostingOptions}
        setAccountOptions={setAccountOptions}
        setProjectOptions={setProjectOptions}
        setCountryOptions={setCountryOptions}
        setEditDomain={setEditDomain}
        handleEdit={handleEdit}
        handleSave={handleSave}
        handleDeleteDomain={handleDeleteDomain}
        handleGoToDuplicate={handleGoToDuplicate}
        setEditingId={setEditingId}
      />

      <HistoryTable
        histories={history}
        page={pageHistory}
        totalPages={totalPagesHistory}
        totalItems={totalHistory}
        rowsPerPage={rowsPerPage}
        isLoading={isHistoryLoading}
        onPrev={() => setPageHistory(p => Math.max(p - 1, 1))}
        onNext={() => setPageHistory(p => Math.min(p + 1, totalPagesHistory))}
        historyActionId={historyActionId}
        onUndoHistory={handleUndoHistory}
        onDeleteHistory={handleDeleteHistory}
      />
    </>
  );
}
