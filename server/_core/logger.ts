type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function write(level: LogLevel, event: string, payload: LogPayload) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(event: string, payload: LogPayload = {}) {
    write("info", event, payload);
  },
  warn(event: string, payload: LogPayload = {}) {
    write("warn", event, payload);
  },
  error(event: string, payload: LogPayload = {}) {
    write("error", event, payload);
  },
};
