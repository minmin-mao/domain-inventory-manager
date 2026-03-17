"use client";

import Button from "@/components/Button";
import Card from "@/components/Card";
import { getDaysLeft } from "@/lib/domain/domainUtils";
import type { DomainHistoryItem } from "@/lib/domain/domainTypes";

type Props = {
  page: number;
  totalPages: number;
  totalItems: number;
  rowsPerPage: number;
  onPrev: () => void;
  onNext: () => void;
  histories: DomainHistoryItem[];
  historyActionId: string | null;
  onUndoHistory: (item: DomainHistoryItem) => void | Promise<void>;
  onDeleteHistory: (item: DomainHistoryItem) => void | Promise<void>;
};

export default function HistoryTable({
  page,
  totalPages,
  totalItems,
  rowsPerPage,
  onPrev,
  onNext,
  histories,
  historyActionId,
  onUndoHistory,
  onDeleteHistory,
}: Props) {
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
            {histories.map((item, index) => {
              const daysLeft = getDaysLeft(item.expiry ?? undefined);
              const isBusy = historyActionId === item.id;

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
                  <td className="px-4 py-3">{item.project}</td>
                  <td className="px-4 py-3 text-zinc-400">{item.country}</td>
                  <td className="px-4 py-3">
                    {item.expiry
                      ? new Date(item.expiry).toISOString().split("T")[0]
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {daysLeft !== null ? `${daysLeft} days` : "-"}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                </tr>
              );
            })}
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
