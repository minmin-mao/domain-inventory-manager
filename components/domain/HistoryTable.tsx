 import Card from "@/components/Card";
import Button from "@/components/Button";
import SmartDropdown from "@/components/SmartDropdown";
import React from "react";
import { getDaysLeft } from "@/lib/domain/domainUtils";
import type { DomainItem } from "@/lib/domain/domainTypes";

type Props = {
  page: number
  totalPages: number
  totalItems: number
  rowsPerPage: number
  onPrev: () => void
  onNext: () => void

  domains: DomainItem[]
  editingId: string | null
  editDomain: DomainItem | null
  highlightDomainId: string | null

  projectOptions: string[]
  countryOptions: string[]
  setProjectOptions: (v: string[]) => void
  setCountryOptions: (v: string[]) => void

  setEditDomain: React.Dispatch<React.SetStateAction<DomainItem | null>>
  handleEdit: (item: DomainItem) => void
  handleSave: () => void
  handleDeleteDomain: (id: string) => void
  handleUndoDomain: (id: string) => void
  setEditingId: (id: string | null) => void
}

export default function DomainTable(props: Props) {
  const {
    page,
    totalPages,
    totalItems,
    rowsPerPage,
    onPrev,
    onNext,
    domains,
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
    handleUndoDomain,
    setEditingId,
  } = props;

  return (
 
      <Card title="4. History sheet">
        <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Domain</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Hosting</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Country</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-left">Days Left</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {domains.map((item, index) => {

                const daysLeft = getDaysLeft(item.expiry);

                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.domain}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-red-800/15 px-2 py-1 text-xs text-red-400">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.hosting}</td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <SmartDropdown
                          value={editDomain?.project || ""}
                          setValue={(v) =>
                            setEditDomain((prev) => prev && { ...prev, project: v })
                          }
                          options={projectOptions}
                          setOptions={setProjectOptions}
                          placeholder="Project"
                        />
                      ) : (
                        item.project
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{editingId === item.id ? (
                      <SmartDropdown
                        value={editDomain?.country || ""}
                        setValue={(v) =>
                          setEditDomain((prev) => prev && { ...prev, country: v })
                        }
                        options={countryOptions}
                        setOptions={setCountryOptions}
                        placeholder="Country"
                      />
                      ) : (
                        item.country
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === item.id ? (
                        <input
                          type="date"
                          className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded"
                          value={editDomain?.expiry || ""}
                          onChange={(e) =>
                            setEditDomain((prev) => prev && { ...prev, expiry: e.target.value })
                          }
                        />
                      ) : (
                        item.expiry
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {daysLeft !== null ? (
                        <>
                          {daysLeft} days
                          {daysLeft <= 30 && (
                            <span className="ml-2 text-red-500 text-xs">⚠ Expiring soon</span>
                          )}
                        </>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {editingId === item.id ? (
                        <>
                          <Button onClick={handleSave}>Save</Button>

                          <Button
                            variant="secondary"
                            onClick={() => {
                              setEditingId(null);
                              setEditDomain(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </Button>

                          {/* Domain sheet */}
                          <Button
                            variant="secondary"
                            onClick={() => handleDeleteDomain(item.id)}
                          >
                            Delete
                          </Button>

                          {/* History sheet */}
                          {item.previousState && (
                            <Button
                              variant="secondary"
                              onClick={() => handleUndoDomain(item.id)}
                            >
                              Undo
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )})}
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
    )}