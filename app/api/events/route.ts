import { SSE_HEARTBEAT_INTERVAL } from "@/lib/constants";
import { requireHousehold } from "@/lib/household";
import { unauthorized } from "@/lib/http-error";
import {
  hasHouseholdMembership,
  subscribeToHouseholdChanges,
} from "@/lib/realtime";

export async function GET(request: Request) {
  const context = await requireHousehold();
  if (!context) {
    return unauthorized();
  }

  const householdId = context.household.id;
  const userId = context.session.user.id;
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: string) => {
        if (!closed) {
          controller.enqueue(encoder.encode(payload));
        }
      };

      const close = () => {
        if (closed) {
          return;
        }
        closed = true;
        unsubscribe?.();
        if (heartbeat) {
          clearInterval(heartbeat);
        }
        request.signal.removeEventListener("abort", close);
        controller.close();
      };

      cleanup = close;
      request.signal.addEventListener("abort", close, { once: true });
      send(`event: ready\ndata: ${JSON.stringify({ viewerId: userId })}\n\n`);

      try {
        const stop = await subscribeToHouseholdChanges(
          householdId,
          async (change) => {
            if (closed) {
              return;
            }
            try {
              if (!(await hasHouseholdMembership(householdId, userId))) {
                close();
                return;
              }
            } catch {
              close();
              return;
            }
            send(`data: ${JSON.stringify(change)}\n\n`);
          },
          close,
        );
        if (closed) {
          stop();
          return;
        }
        unsubscribe = stop;
        heartbeat = setInterval(
          () => send(": keepalive\n\n"),
          SSE_HEARTBEAT_INTERVAL,
        );
      } catch {
        close();
      }
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
