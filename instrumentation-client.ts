import type { LogFields, LogLevel } from "@/lib/log";

function browserLog(
  level: LogLevel,
  event: string,
  fields?: Omit<LogFields, "event">,
) {
  if (process.env.NODE_ENV === "production" && level === "debug") return;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...fields,
    }),
  );
}

export function logClientError(
  event: string,
  fields?: Omit<LogFields, "event">,
) {
  browserLog("error", event, fields);
}

export function logClientInfo(
  event: string,
  fields?: Omit<LogFields, "event">,
) {
  browserLog("info", event, fields);
}
