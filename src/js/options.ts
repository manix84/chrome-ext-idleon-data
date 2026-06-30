/// <reference path="../globals.d.ts" />
import {
  DEBUG_LEVEL_STORAGE_KEY,
  logError,
  logInfo,
  normalizeDebugLevel,
  setDebugLevel,
} from "./debug";

const descriptions: Record<DebugLogLevel, string> = {
  off: "Only errors are written to the console.",
  info: "Important capture, copy, download, and parsing milestones are written to the console.",
  verbose: "Detailed capture polling and storage-change diagnostics are written to the console.",
};

const getDebugInputs = (): HTMLInputElement[] => {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[name="debugLevel"]'));
};

const setStatus = (message: string): void => {
  const status = document.getElementById("status");
  if (!status) {
    return;
  }

  status.innerText = message;
};

const setDescription = (debugLevel: DebugLogLevel): void => {
  const description = document.getElementById("debugDescription");
  if (!description) {
    return;
  }

  description.innerText = descriptions[debugLevel];
};

const renderDebugLevel = (debugLevel: DebugLogLevel): void => {
  setDebugLevel(debugLevel);
  for (const input of getDebugInputs()) {
    input.checked = input.value === debugLevel;
  }
  setDescription(debugLevel);
};

const saveDebugLevel = (debugLevel: DebugLogLevel): void => {
  chrome.storage.local.set({ [DEBUG_LEVEL_STORAGE_KEY]: debugLevel }, () => {
    setDebugLevel(debugLevel);
    logInfo("Debug level saved from options page.", { debugLevel });
    setStatus(`Debug logging set to ${debugLevel}.`);
  });
};

const initializeOptions = (): void => {
  chrome.storage.local.get(DEBUG_LEVEL_STORAGE_KEY, (result: UnknownRecord) => {
    const debugLevel = normalizeDebugLevel(result[DEBUG_LEVEL_STORAGE_KEY]);
    renderDebugLevel(debugLevel);
    setStatus(`Debug logging is ${debugLevel}.`);
  });

  for (const input of getDebugInputs()) {
    input.addEventListener("change", () => {
      const debugLevel = normalizeDebugLevel(input.value);
      renderDebugLevel(debugLevel);
      saveDebugLevel(debugLevel);
    });
  }
};

try {
  initializeOptions();
} catch (error: unknown) {
  logError("Failed to initialize options page.", error);
  setStatus("Options could not be loaded.");
}
