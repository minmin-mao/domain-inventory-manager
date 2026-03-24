type InventoryRealtimeEvent = {
  type: "inventory.updated";
  refreshDomains: boolean;
  refreshHistory: boolean;
  refreshOptions: boolean;
  includeTotal: boolean;
  source: "domains" | "history" | "use";
  at: string;
};

type Listener = (event: InventoryRealtimeEvent) => void;

const globalForRealtime = globalThis as unknown as {
  inventoryListeners?: Set<Listener>;
};

const listeners =
  globalForRealtime.inventoryListeners ?? new Set<Listener>();

if (!globalForRealtime.inventoryListeners) {
  globalForRealtime.inventoryListeners = listeners;
}

export function subscribeInventoryEvents(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifyInventoryUpdated(
  partial: Omit<InventoryRealtimeEvent, "type" | "at">
) {
  const event: InventoryRealtimeEvent = {
    type: "inventory.updated",
    at: new Date().toISOString(),
    ...partial,
  };

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("Realtime listener failed", error);
    }
  });
}
