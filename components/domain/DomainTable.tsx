import Card from "@/components/Card";
import Button from "@/components/Button";
import type { DomainItem } from "@/lib/domain/domainTypes";
import DomainRow from "./DomainRow";

type Props = {
  page: number
  totalPages: number
  totalItems: number
  rowsPerPage: number
  onPrev: () => void
  onNext: () => void
  
  domains: DomainItem[];
  editingId: string | null;
  editDomain: DomainItem | null;
  duplicateDomain: DomainItem | null;
  highlightDomainId: string | null;

  projectOptions: string[];
  countryOptions: string[];

  setProjectOptions: (v: string[]) => void;
  setCountryOptions: (v: string[]) => void;
  setEditDomain: React.Dispatch<React.SetStateAction<DomainItem | null>>;

  handleEdit: (item: DomainItem) => void;
  handleSave: () => void;
  handleDeleteDomain: (id: string) => void;
  handleGoToDuplicate: () => void;
  setEditingId: (id: string | null) => void;
};

export default function DomainTable(props: Props) {
  const {
    page,
    totalPages,
    totalItems,
    rowsPerPage,
    onPrev,
    onNext,
    domains,
    duplicateDomain,
    highlightDomainId,
    editingId,
    editDomain,
    projectOptions,
    countryOptions,
    setProjectOptions,
    setCountryOptions,
    setEditDomain,
    handleEdit,
    handleSave,
    handleDeleteDomain,
    handleGoToDuplicate,
    setEditingId
  } = props;

  return (
    <Card title="3. Domain sheet">
      {/* Duplicate warning */}
      {duplicateDomain && (
        <div className="mb-4 flex items-center justify-between rounded-lg p-3 text-sm text-yellow-400">
          <span>
            ⚠ Domain {duplicateDomain.domain} already exists in inventory.
          </span>

          <Button variant="secondary" onClick={handleGoToDuplicate}>
            Go to existing
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Domain</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Hosting</th>
              <th className="px-4 py-3 text-left">Account</th>
              <th className="px-4 py-3 text-left">Project</th>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-left">Expiry</th>
              <th className="px-4 py-3 text-left">Days Left</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {domains.map((item, index) => (
              <DomainRow
                key={item.id}
                item={item}
                index={index}
                highlightDomainId={highlightDomainId}
                editingId={editingId}
                editDomain={editDomain}
                projectOptions={projectOptions}
                countryOptions={countryOptions}
                setProjectOptions={setProjectOptions}
                setCountryOptions={setCountryOptions}
                setEditDomain={setEditDomain}
                handleEdit={handleEdit}
                handleSave={handleSave}
                handleDeleteDomain={handleDeleteDomain}
                setEditingId={setEditingId}
              />
            ))}
          </tbody>
        </table>
          <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-sm text-zinc-400">
          <span>
            Showing {(page - 1) * rowsPerPage + 1}–
            {Math.min(page * rowsPerPage, totalItems)} of {totalItems}
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
    </Card>
  );
}