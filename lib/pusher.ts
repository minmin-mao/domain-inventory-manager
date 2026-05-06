import "server-only";
import Pusher from "pusher";

const globalForPusher = globalThis as unknown as {
  pusher?: Pusher | null;
};

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER;

export const pusher =
  globalForPusher.pusher ??
  (appId && key && secret && cluster
    ? new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      })
    : null);

globalForPusher.pusher = pusher;
