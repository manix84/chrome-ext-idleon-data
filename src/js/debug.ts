/// <reference path="../globals.d.ts" />

const LOG_PREFIX = "Idleon API Downloader";
const DEBUG_LEVEL_STORAGE_KEY = "idleonApiDownloaderDebugLevel";
const DEBUG_LEVELS: DebugLogLevel[] = ["off", "info", "verbose"];
let currentDebugLevel: DebugLogLevel = "off";

const normalizeDebugLevel = (value: unknown): DebugLogLevel => {
  if (DEBUG_LEVELS.includes(value as DebugLogLevel)) {
    return value as DebugLogLevel;
  }

  return "off";
};

const setDebugLevel = (value: unknown): DebugLogLevel => {
  currentDebugLevel = normalizeDebugLevel(value);
  return currentDebugLevel;
};

const getDebugLevel = (): DebugLogLevel => {
  return currentDebugLevel;
};

const shouldLog = (level: Exclude<DebugLogLevel, "off">): boolean => {
  if (currentDebugLevel === "verbose") {
    return true;
  }

  return currentDebugLevel === "info" && level === "info";
};

/** Writes consistent extension debug messages without logging raw save payloads. */
const logInfo = (message: string, details?: UnknownRecord): void => {
  if (!shouldLog("info")) {
    return;
  }

  if (details) {
    console.info(`[${LOG_PREFIX}] ${message}`, details);
    return;
  }

  console.info(`[${LOG_PREFIX}] ${message}`);
};

const logVerbose = (message: string, details?: UnknownRecord): void => {
  if (!shouldLog("verbose")) {
    return;
  }

  if (details) {
    console.debug(`[${LOG_PREFIX}] ${message}`, details);
    return;
  }

  console.debug(`[${LOG_PREFIX}] ${message}`);
};

const logError = (message: string, error?: unknown): void => {
  console.error(`[${LOG_PREFIX}] ${message}`, error);
};

export {
  DEBUG_LEVEL_STORAGE_KEY,
  getDebugLevel,
  logError,
  logInfo,
  logVerbose,
  normalizeDebugLevel,
  setDebugLevel,
};
