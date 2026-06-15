"use client";

import Pusher from "pusher-js";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

type PusherClient = InstanceType<typeof Pusher>;
type PusherConstructor = typeof Pusher;

let cachedPusherClient: PusherClient | null | undefined;

export const isPusherConfigured = Boolean(key && cluster);

export function getPusherClient() {
  if (cachedPusherClient !== undefined) return cachedPusherClient;

  if (!key || !cluster || typeof window === "undefined") {
    cachedPusherClient = null;
    return cachedPusherClient;
  }

  const ImportedPusher = Pusher as PusherConstructor & {
    default?: PusherConstructor;
  };
  const PusherClientConstructor = ImportedPusher.default ?? ImportedPusher;

  cachedPusherClient = new PusherClientConstructor(key, {
    cluster,
  });

  return cachedPusherClient;
}
