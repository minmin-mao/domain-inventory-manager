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

// React
import { useEffect, useState, useRef } from "react";
import { SelectInstance } from "react-select";


// ================================
// Types
// ================================

type Option = {
  label: string;
  value: string;
};

type DomainItem = {
  id: string;
  domain: string;
  hosting: string;
  expiry: string;
  account: string;
  project: string;
  country: string;
  status: "taken" | "available";

  usedAt?: string;
  usedForProject?: string;
  usedForCountry?: string;

  previousState?: {
    status: "available" | "taken";
    usedAt?: string;
    usedForProject?: string;
    usedForCountry?: string;
  };
};

type DomainFilters = {
  search: string;
  expiry: "all" | "le30" | "le60" | "expired";
  hostingProvider: string | null;
  project: string | null;
  country: string | null;
};


// ================================
// Component
// ================================

export default function DomainManager() {

  // ================================
  // Domain Inventory State
  // ================================

  const [domains, setDomains] = useState<DomainItem[]>([]);

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

  const rowsPerPage = 10;

  useEffect(() => {
    fetch("/api/domains")
      .then(res => res.json())
      .then(data => setDomains(data));
  }, []);


  // ================================
  // Derived Data
  // ================================

  const availableDomains = domains.filter(d => d.status === "available");

  const usedDomains = domains
    .filter(d => d.status === "taken")
    .sort((a, b) => (b.usedAt || "").localeCompare(a.usedAt || ""));

  const filteredAvailable = applyFilters(availableDomains, filters);
  const filteredUsed = applyFilters(usedDomains, filters);

  const totalPagesAvailable = Math.ceil(filteredAvailable.length / rowsPerPage);
  const totalPagesHistory = Math.ceil(filteredUsed.length / rowsPerPage);

  const paginatedAvailable = filteredAvailable.slice(
    (pageAvailable - 1) * rowsPerPage,
    pageAvailable * rowsPerPage
  );

  const paginatedHistory = filteredUsed.slice(
    (pageHistory - 1) * rowsPerPage,
    pageHistory * rowsPerPage
  );


  // ================================
  // Refs
  // ================================

  const hostingRef = useRef<SelectInstance<Option, false> | null>(null);
  const domainRef = useRef<HTMLInputElement | null>(null);

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

    if (!domain || !hosting || !project || !account) {
      alert("Domain, Hosting, Account, and Project are required");
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
      expiry,
      account,
      project,
      country: (country.trim().toUpperCase() || "-"),
      status: "available",
    };

    await fetch("/api/domains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newDomain),
    });

    const res = await fetch("/api/domains");
    const data = await res.json();
    setDomains(data);

    setDomain("");
    setHosting("");
    setProject("");
    setCountry("");
    setAccount("");

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

    const res = await fetch("/api/domains");
    const data = await res.json();
    setDomains(data);
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


  const handleUseDomain = (id: string) => {

    const now = new Date().toISOString();

    setDomains(prev =>
      prev.map(d =>
        d.id === id
          ? {
              ...d,
              previousState: {
                status: d.status,
                usedAt: d.usedAt,
                usedForProject: d.usedForProject,
                usedForCountry: d.usedForCountry,
              },
              status: "taken",
              usedAt: now,
              usedForProject: searchProject.trim(),
              usedForCountry: searchCountry.trim(),
            }
          : d
      )
    );

    setMatchedDomains([]);
    setCurrentIndex(0);
  };

  const handleSuggestDomain = () => {
    const projectKey = searchProject.trim().toLowerCase();
    const countryKey = searchCountry.trim().toLowerCase();

    if (!projectKey) {
      alert("Please enter a project name");
      return;
    }

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


  const handleUndoDomain = (id: string) => {

    setDomains(prev =>
      prev.map(d => {

        if (d.id !== id || !d.previousState) return d;

        return {
          ...d,
          status: d.previousState.status,
          usedAt: d.previousState.usedAt,
          usedForProject: d.previousState.usedForProject,
          usedForCountry: d.previousState.usedForCountry,
          previousState: undefined,
        };
      })
    );
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

    await fetch(`/api/domains`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editDomain),
    });

    setEditingId(null);
    setEditDomain(null);

    const res = await fetch("/api/domains");
    const data = await res.json();
    setDomains(data);
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
            setValue={setHosting}
            options={hostingOptions}
            setOptions={setHostingOptions}
            placeholder="Hosting provider"
          />

          <Input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />

          <SmartDropdown
            value={account}
            setValue={setAccount}
            options={accountOptions}
            setOptions={setAccountOptions}
            placeholder="Account"
          />

          <SmartDropdown
            value={project}
            setValue={setProject}
            options={projectOptions}
            setOptions={setProjectOptions}
            placeholder="Project Name"
          />

          <SmartDropdown
            value={country}
            setValue={setCountry}
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
          <Button onClick={handleAddDomain}>
            Add domain
          </Button>
        </div>
      </Card>

      {/* Request Domain */}

    <Card title="2. Request domain for project">
      <div className="grid gap-4 md:grid-cols-2">

        <Input
          placeholder="Project Name"
          value={searchProject}
          onChange={(e) => setSearchProject(e.target.value)}
        />

        <Input
          placeholder="Preferred country (optional)"
          value={searchCountry}
          onChange={(e) => setSearchCountry(e.target.value)}
        />

      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={handleSuggestDomain}
        >
          Suggest domain
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
        onPrev={() => setPageAvailable(p => Math.max(p - 1, 1))}
        onNext={() => setPageAvailable(p => Math.min(p + 1, totalPagesAvailable))}
        editingId={editingId}
        editDomain={editDomain}
        highlightDomainId={highlightDomainId}
        duplicateDomain={duplicateDomain}
        projectOptions={projectOptions}
        countryOptions={countryOptions}
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
        domains={paginatedHistory}
        page={pageHistory}
        totalPages={totalPagesHistory}
        totalItems={filteredUsed.length}
        rowsPerPage={rowsPerPage}
        onPrev={() => setPageHistory(p => Math.max(p - 1, 1))}
        onNext={() => setPageHistory(p => Math.min(p + 1, totalPagesHistory))}
        editingId={editingId}
        highlightDomainId={highlightDomainId}
        editDomain={editDomain}
        projectOptions={projectOptions}
        countryOptions={countryOptions}
        setProjectOptions={setProjectOptions}
        setCountryOptions={setCountryOptions}
        setEditDomain={setEditDomain}
        handleEdit={handleEdit}
        handleSave={handleSave}
        handleDeleteDomain={handleDeleteDomain}
        handleUndoDomain={handleUndoDomain}
        setEditingId={setEditingId}
      />
    </>
  );
}