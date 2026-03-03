/**
 * Production-ready structured logger
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(level: LogLevel, message: string, meta?: LogMeta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta || {}),
  };

  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(entry);
  }

  const prefix = `[${entry.timestamp}] ${level.toUpperCase().padEnd(5)}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(meta)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    if (shouldLog("debug")) console.debug(formatLog("debug", message, meta));
  },
  info(message: string, meta?: LogMeta) {
    if (shouldLog("info")) console.info(formatLog("info", message, meta));
  },
  warn(message: string, meta?: LogMeta) {
    if (shouldLog("warn")) console.warn(formatLog("warn", message, meta));
  },
  error(message: string, meta?: LogMeta) {
    if (shouldLog("error")) console.error(formatLog("error", message, meta));
  },
};
