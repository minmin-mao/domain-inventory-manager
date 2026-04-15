"use client";

import Button from "@/components/Button";
import { getSuggestionLanguageLabel } from "@/lib/domain/languageUtils";
import type { DomainItem } from "@/lib/domain/domainTypes";

type Props = {
  title?: string;
  emptyLabel?: string;
  highlightDomainId?: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  rowsPerPage: number;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  domains: DomainItem[];
  reservedActionId: string | null;
  onUseForPic: (item: DomainItem) => void | Promise<void>;
  onUseAsBackup: (item: DomainItem) => void | Promise<void>;
  onRelease: (item: DomainItem) => void | Promise<void>;
};

export default function ReservedTable({
  title,
  emptyLabel = "No reserved domains found.",
  highlightDomainId = null,
  page,
  totalPages,
  totalItems,
  rowsPerPage,
  isLoading,
  onPrev,
  onNext,
  domains,
  reservedActionId,
  onUseForPic,
  onUseAsBackup,
  onRelease,
}: Props) {
  return (
    <div>
      {title ? (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl ring-1 ring-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1360px] w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="w-12 px-4 py-3 text-left">#</th>
                <th className="min-w-[220px] px-4 py-3 text-left">Domain</th>
                <th className="min-w-[140px] px-4 py-3 text-left">Hosting</th>
                <th className="min-w-[120px] px-4 py-3 text-left">Account</th>
                <th className="min-w-[120px] px-4 py-3 text-left">Project</th>
                <th className="min-w-[110px] px-4 py-3 text-left">Country</th>
                <th className="min-w-[110px] px-4 py-3 text-left">Language</th>
                <th className="min-w-[140px] px-4 py-3 text-left">PIC</th>
                <th className="min-w-[180px] px-4 py-3 text-left">Reserved At</th>
                <th className="min-w-[320px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-zinc-400">
                    Loading reserved domains...
                  </td>
                </tr>
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                domains.map((item, index) => {
                  const isBusy = reservedActionId === item.id;

                  return (
                    <tr
                      key={item.id}
                      id={`domain-${item.id}`}
                      className={`transition ${
                        highlightDomainId === item.id
                          ? "bg-blue-500/10"
                          : "hover:bg-zinc-800/40"
                      }`}
                    >
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{item.domain}</td>
                      <td className="px-4 py-3">{item.hosting}</td>
                      <td className="px-4 py-3">{item.account}</td>
                      <td className="px-4 py-3">{item.reservedForProject || "-"}</td>
                      <td className="px-4 py-3 text-zinc-400">{item.reservedForCountry || "-"}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {getSuggestionLanguageLabel(item.language, item.country)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{item.reservedForPic || "-"}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {item.reservedAt
                          ? new Date(item.reservedAt).toLocaleString("en-GB", {
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[300px] flex-wrap justify-end gap-2">
                          <Button
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => onUseForPic(item)}
                          >
                            {isBusy ? "Working..." : "Use for PIC"}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => onUseAsBackup(item)}
                          >
                            {isBusy ? "Working..." : "Use as Backup"}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => onRelease(item)}
                          >
                            {isBusy ? "Working..." : "Release"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
