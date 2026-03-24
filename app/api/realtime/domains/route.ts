import { subscribeInventoryEvents } from "@/lib/realtime/domainEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toSseData(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function GET() {
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(
        encoder.encode(
          toSseData({
            type: "connected",
            at: new Date().toISOString(),
          })
        )
      );

      const unsubscribe = subscribeInventoryEvents((event) => {
        controller.enqueue(encoder.encode(toSseData(event)));
      });

      const keepAlive = setInterval(() => {
        controller.enqueue(
          encoder.encode(
            toSseData({
              type: "heartbeat",
              at: new Date().toISOString(),
            })
          )
        );
      }, 25000);

      const close = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };

      cleanup = close;
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
