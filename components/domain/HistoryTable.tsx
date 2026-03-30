"use client";

import Button from "@/components/Button";
import type { DomainHistoryItem } from "@/lib/domain/domainTypes";

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
  histories: DomainHistoryItem[];
  historyActionId: string | null;
  onAssignPic?: (item: DomainHistoryItem) => void | Promise<void>;
  onUndoHistory: (item: DomainHistoryItem) => void | Promise<void>;
  onDeleteHistory: (item: DomainHistoryItem) => void | Promise<void>;
};

export default function HistoryTable({
  title,
  emptyLabel = "No history records found.",
  highlightDomainId = null,
  page,
  totalPages,
  totalItems,
  rowsPerPage,
  isLoading,
  onPrev,
  onNext,
  histories,
  historyActionId,
  onAssignPic,
  onUndoHistory,
  onDeleteHistory,
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
        <table className="min-w-[1220px] w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="w-12 px-4 py-3 text-left">#</th>
              <th className="min-w-[220px] px-4 py-3 text-left">Domain</th>
              <th className="min-w-[120px] px-4 py-3 text-left">Status</th>
              <th className="min-w-[140px] px-4 py-3 text-left">Hosting</th>
              <th className="min-w-[120px] px-4 py-3 text-left">Account</th>
              <th className="min-w-[120px] px-4 py-3 text-left">Project</th>
              <th className="min-w-[110px] px-4 py-3 text-left">Country</th>
              <th className="min-w-[140px] px-4 py-3 text-left">PIC</th>
              <th className="min-w-[180px] px-4 py-3 text-left">Used At</th>
              <th className="min-w-[210px] px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {isLoading ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  Loading history...
                </td>
              </tr>
            ) : histories.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-sm text-zinc-500"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              histories.map((item, index) => {
                const isBusy = historyActionId === item.id;
                const isBackup = item.usageType === "backup";
                const statusLabel = isBackup ? "backup" : item.status;

                return (
                  <tr
                    key={item.id}
                    id={`history-domain-${item.domainId}`}
                    className={`transition ${
                      highlightDomainId === item.domainId
                        ? "bg-blue-500/10"
                        : "hover:bg-zinc-800/40"
                    }`}
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.domain}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          isBackup
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-red-800/15 text-red-400"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.hosting}</td>
                    <td className="px-4 py-3">{item.account}</td>
                    <td className="px-4 py-3">{item.project}</td>
                    <td className="px-4 py-3 text-zinc-400">{item.country || "-"}</td>
                    <td className="px-4 py-3 text-zinc-300">{item.usedForPic || "-"}</td>
                    <td className="px-4 py-3">
                      {new Date(item.createdAt).toLocaleString("en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[190px] flex-wrap justify-end gap-2">
                        {isBackup && onAssignPic ? (
                          <Button
                            variant="secondary"
                            disabled={isBusy || item.id.startsWith("legacy-")}
                            onClick={() => onAssignPic(item)}
                          >
                            {isBusy ? "Saving..." : "Assign PIC"}
                          </Button>
                        ) : null}

                        {item.canUndo ? (
                          <Button
                            variant="secondary"
                            disabled={isBusy}
                            onClick={() => onUndoHistory(item)}
                          >
                            {isBusy ? "Undoing..." : "Undo"}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            disabled={isBusy || item.id.startsWith("legacy-")}
                            onClick={() => onDeleteHistory(item)}
                          >
                            {isBusy ? "Deleting..." : "Delete"}
                          </Button>
                        )}
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
