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
import { applyFilters } from "@/lib/domain/domainUtils";
import { capitalizeText } from "@/lib/domain/textUtils";
import type {
  DomainFilters,
  DomainHistoryItem,
  DomainItem,
} from "@/lib/domain/domainTypes";

// React
import { useEffect, useState, useRef } from "react";
import type { SelectInstance } from "react-select";


// ================================
// Types
// ================================

type Option = {
  label: string;
  value: string;
};

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
  const [strictCountry, setStrictCountry] = useState(false);
  const [requestError, setRequestError] = useState("");

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDomain, setEditDomain] = useState<DomainItem | null>(null);

  // warnings
  const [providerWarning, setProviderWarning] = useState("");
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [duplicateDomain, setDuplicateDomain] = useState<DomainItem | null>(null);
  const [highlightDomainId, setHighlightDomainId] = useState<string | null>(null);

  // dropdown options
  const [hostingOptions, setHostingOptions] = useState<string[]>([]);
  const [accountOptions, setAccountOptions] = useState<string[]>([]);
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);

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
  const [historyActionId, setHistoryActionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const rowsPerPage = 10;

  const loadInventoryData = async () => {
    setIsLoading(true);

    try {
      const [domainsRes, historyRes] = await Promise.all([
        fetch("/api/domains"),
        fetch("/api/domain-history"),
      ]);

      const domainsData = domainsRes.ok ? await domainsRes.json() : [];
      const historyData = historyRes.ok ? await historyRes.json() : [];

      setDomains(domainsData);
      setHistory(historyData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void loadInventoryData().catch((error) => {
      console.error("Failed to load inventory data", error);
      if (cancelled) return;
      setDomains([]);
      setHistory([]);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);


  // ================================
  // Derived Data
  // ================================

  const availableDomains = domains.filter(d => d.status === "available");

  const filteredAvailable = applyFilters(availableDomains, filters);
  const filteredHistory = applyFilters(history, filters);

  const totalPagesAvailable = Math.ceil(filteredAvailable.length / rowsPerPage);
  const totalPagesHistory = Math.ceil(filteredHistory.length / rowsPerPage);

  const paginatedAvailable = filteredAvailable.slice(
    (pageAvailable - 1) * rowsPerPage,
    pageAvailable * rowsPerPage
  );

  const paginatedHistory = filteredHistory.slice(
    (pageHistory - 1) * rowsPerPage,
    pageHistory * rowsPerPage
  );


  // ================================
  // Refs
  // ================================

  const hostingRef = useRef<SelectInstance<Option, false> | null>(null);
  const domainRef = useRef<HTMLInputElement | null>(null);
  const expiryRef = useRef<HTMLInputElement | null>(null);

  const focusNext = (ref: { current: { focus: () => void } | null }) => {
    ref.current?.focus();
  };


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

    const duplicate = domains.find(
      d => normalizeDomain(d.domain) === normalizedInput
    );

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

    await loadInventoryData();

    setDomain("");
    setHosting("");
    setProject("");
    setCountry("");
    setAccount("");
    setExpiry("");

    domainRef.current?.focus();
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

    await loadInventoryData();
  };

  const handleGoToDuplicate = () => {
    if (!duplicateDomain) return; 
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
    const projectValue = searchProject.trim();
    const requestCountry = capitalizeText(searchCountry.trim());

    if (!projectValue) {
      setRequestError("Project name is required.");
      return;
    }

    if (!requestCountry) {
      setRequestError("Country is required before you can use a domain.");
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
    setMatchedDomains([]);
    setCurrentIndex(0);
    setProviderWarning("");
    await loadInventoryData();
  };

  const handleSuggestDomain = () => {
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

    const matches = domains.filter((d) => {
      if (d.status !== "available") return false;

      const dProject = d.project.trim().toLowerCase();
      const projectMatch = dProject.includes(projectKey);

      if (!projectMatch) return false;

      if (!countryKey) return true;

      const dCountry = (d.country || "").trim().toLowerCase();
      const domainHasNoCountry =
        dCountry === "" || dCountry === "-" || dCountry === "—";

      if (strictCountry) {
        return dCountry === countryKey;
      }

      return dCountry === countryKey || domainHasNoCountry;
    });

    if (matches.length === 0) {
      alert("No available domain found for this project");
      setMatchedDomains([]);
      setCurrentIndex(0);
      return;
    }

    setMatchedDomains(matches);
    setCurrentIndex(0);
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

    await loadInventoryData();
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

    await loadInventoryData();
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

    const res = await fetch(`/api/domains`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editDomain),
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : { error: "Unexpected server response." };

    if (!res.ok) {
      alert(data.error || "Failed to update domain.");
      return;
    }

    setEditingId(null);
    setEditDomain(null);

    await loadInventoryData();
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
          <Button onClick={handleAddDomain} disabled={isLoading}>
            {isLoading ? "Loading..." : "Add domain"}
          </Button>
        </div>
      </Card>

      {/* Request Domain */}

    <Card title="2. Request domain for project">
      <div className="grid gap-4 md:grid-cols-2">

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

      </div>

      {requestError && (
        <p className="mt-3 text-sm text-red-400">
          {requestError}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={handleSuggestDomain}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "Suggest domain"}
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
        <div className="mt-6 p-4 border border-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400 mb-2">
            Suggested domain
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {matchedDomains[currentIndex].domain}
              </p>
              <p className="text-xs text-zinc-400">
                {currentIndex + 1} / {matchedDomains.length}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  setCurrentIndex(i => Math.max(i - 1, 0))
                }
              >
                Back
              </Button>

              <Button
                variant="secondary"
                onClick={() =>
                  setCurrentIndex(i =>
                    Math.min(i + 1, matchedDomains.length - 1)
                  )
                }
              >
                Next
              </Button>

              <Button
                onClick={() =>
                  handleUseDomain(matchedDomains[currentIndex].id)
                }
              >
                Use
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>

      <FilterBar
        domains={domains}
        filters={filters}
        setSearch={setSearch}
        setExpiry={setExpiryFilter}
        setHostingProvider={setHostingProvider}
        setProject={setProjectFilter}
        setCountry={setCountryFilter}
      />


      {/* Tables */}

      <DomainTable
        domains={paginatedAvailable}
        page={pageAvailable}
        totalPages={totalPagesAvailable}
        totalItems={filteredAvailable.length}
        rowsPerPage={rowsPerPage}
        isLoading={isLoading}
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
        histories={paginatedHistory}
        page={pageHistory}
        totalPages={totalPagesHistory}
        totalItems={filteredHistory.length}
        rowsPerPage={rowsPerPage}
        isLoading={isLoading}
        onPrev={() => setPageHistory(p => Math.max(p - 1, 1))}
        onNext={() => setPageHistory(p => Math.min(p + 1, totalPagesHistory))}
        historyActionId={historyActionId}
        onUndoHistory={handleUndoHistory}
        onDeleteHistory={handleDeleteHistory}
      />
    </>
  );
}
