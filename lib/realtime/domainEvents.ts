import { pusher } from "@/lib/pusher";

type InventoryRealtimeEvent = {
  type: "inventory.updated";
  refreshDomains: boolean;
  refreshHistory: boolean;
  refreshOptions: boolean;
  includeTotal: boolean;
  source: "domains" | "history" | "use";
  at: string;
};

export async function notifyInventoryUpdated(
  partial: Omit<InventoryRealtimeEvent, "type" | "at">
) {
  const timestamp = Date.now();
  const event: InventoryRealtimeEvent = {
    type: "inventory.updated",
    at: new Date(timestamp).toISOString(),
    ...partial,
  };

  if (!pusher) return;

  try {
    await pusher.trigger("domains", "domains:updated", {
      timestamp,
      ...event,
    });
  } catch (error) {
    console.error(
      "Pusher domains:updated trigger failed",
      error instanceof Error ? error.message : error
    );
  }
}
