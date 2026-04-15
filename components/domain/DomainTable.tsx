import type { DomainItem } from "@/lib/domain/domainTypes";
import DomainRow from "./DomainRow";

type Props = {
  title?: string;
  page: number
  totalPages: number
  totalItems: number
  rowsPerPage: number
  isLoading: boolean
  onPrev: () => void
  onNext: () => void
  
  domains: DomainItem[];
  editingId: string | null;
  editDomain: DomainItem | null;
  highlightDomainId: string | null;

  hostingOptions: string[];
  accountOptions: string[];
  projectOptions: string[];
  countryOptions: string[];
  languageOptions: string[];

  setHostingOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setAccountOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setProjectOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setCountryOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setLanguageOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setEditDomain: React.Dispatch<React.SetStateAction<DomainItem | null>>;

  handleEdit: (item: DomainItem) => void;
  handleSave: () => void;
  handleDeleteDomain: (id: string) => void;
  handleReserveDomain?: (item: DomainItem) => void;
  setEditingId: (id: string | null) => void;
};

export default function DomainTable(props: Props) {
  const {
    title,
    page,
    totalPages,
    totalItems,
    rowsPerPage,
    isLoading,
    onPrev,
    onNext,
    domains,
    highlightDomainId,
    editingId,
    editDomain,
    hostingOptions,
    accountOptions,
    projectOptions,
    countryOptions,
    languageOptions,
    setHostingOptions,
    setAccountOptions,
    setProjectOptions,
    setCountryOptions,
    setLanguageOptions,
    setEditDomain,
    handleEdit,
    handleSave,
    handleDeleteDomain,
    handleReserveDomain,
    setEditingId
  } = props;

  return (
    <div>
      {title ? (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
        <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="w-12 px-4 py-3 text-left">#</th>
              <th className="min-w-[220px] px-4 py-3 text-left">Domain</th>
              <th className="min-w-[120px] px-4 py-3 text-left">Status</th>
              <th className="min-w-[140px] px-4 py-3 text-left">Hosting</th>
              <th className="min-w-[120px] px-4 py-3 text-left">Account</th>
              <th className="min-w-[120px] px-4 py-3 text-left">Project</th>
              <th className="min-w-[110px] px-4 py-3 text-left">Country</th>
              <th className="min-w-[110px] px-4 py-3 text-left">Language</th>
              <th className="min-w-[120px] px-4 py-3 text-left">Expiry</th>
              <th className="min-w-[140px] px-4 py-3 text-left">Days Left</th>
              <th className="min-w-[190px] px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {isLoading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  Loading domains...
                </td>
              </tr>
            ) : domains.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  No available domains found.
                </td>
              </tr>
            ) : (
              domains.map((item, index) => (
                <DomainRow
                  key={item.id}
                  item={item}
                  index={index}
                  highlightDomainId={highlightDomainId}
                  editingId={editingId}
                  editDomain={editDomain}
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
                  handleReserveDomain={handleReserveDomain}
                  setEditingId={setEditingId}
                />
              ))
            )}
          </tbody>
        </table>
        </div>
        <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-sm text-zinc-400">
          <span>
            {totalItems === 0
              ? "Showing 0 of 0"
              : `Showing ${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, totalItems)} of ${totalItems}`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={page === 1}
              className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40"
            >
              ← Prev
            </button>

            <span>{page} / {totalPages || 1}</span>

            <button
              onClick={onNext}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded border border-zinc-700 hover:bg-zinc-800 disabled:opacity-40"
            >
              Next →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
