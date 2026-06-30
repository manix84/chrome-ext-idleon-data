/// <reference path="../globals.d.ts" />
import {
  DEBUG_LEVEL_STORAGE_KEY,
  logError,
  logInfo,
  logVerbose,
  setDebugLevel,
} from "./debug";

const dispatchDebugLevel = (debugLevel: DebugLogLevel): void => {
  window.dispatchEvent(new CustomEvent("IdleonApiDownloaderDebugLevelChanged", { detail: debugLevel }));
};

chrome.storage.onChanged.addListener((changes: UnknownRecord, namespace: string) => {
  if (namespace !== "local") {
    return;
  }

  const debugLevelChange = changes[DEBUG_LEVEL_STORAGE_KEY] as { newValue?: unknown } | undefined;
  if (!debugLevelChange) {
    return;
  }

  const debugLevel = setDebugLevel(debugLevelChange.newValue);
  logInfo("Debug level changed.", { debugLevel });
  dispatchDebugLevel(debugLevel);
});

const setCaptureStatus = (status: CaptureStatusUpdate): void => {
  const captureStatus: CaptureStatus = {
    ...status,
    updatedAt: Date.now(),
  };
  const logDetails = {
    stage: captureStatus.stage,
    attempt: captureStatus.attempt,
    missingKeys: captureStatus.missingKeys,
    receivedKeys: captureStatus.receivedKeys,
  };
  if (captureStatus.stage === "firebase-polling" || captureStatus.stage === "partial-data") {
    logVerbose(captureStatus.message, logDetails);
  } else {
    logInfo(captureStatus.message, logDetails);
  }
  chrome.storage.local.set({ captureStatus });
};

const injectCaptureScript = (debugLevel: DebugLogLevel): void => {
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL("js/injected.js");
  s.dataset.debugLevel = debugLevel;
  s.onload = () => {
    setCaptureStatus({
      stage: "injected-script-loaded",
      message: "Injected script loaded into the Idleon page.",
    });
    dispatchDebugLevel(debugLevel);
    s.remove();
  };
  (document.head || document.documentElement).appendChild(s);
};

setCaptureStatus({
  stage: "content-script-loaded",
  message: "Content script loaded on Idleon page.",
});

chrome.storage.local.get(DEBUG_LEVEL_STORAGE_KEY, (result: UnknownRecord) => {
  const debugLevel = setDebugLevel(result[DEBUG_LEVEL_STORAGE_KEY]);
  chrome.storage.local.set({ data: null, updatedAt: null });
  setCaptureStatus({
    stage: "injected-script-loading",
    message: "Injecting Idleon data capture script.",
  });
  injectCaptureScript(debugLevel);
});

window.addEventListener(
  "IdleonApiDownloaderStatus",
  (event) => {
    const detail = (event as CustomEvent<CaptureStatusUpdate>).detail;
    setCaptureStatus(detail);
  },
  false
);

window.addEventListener(
  "PassSaveToInject",
  (event) => {
    const jsonData = (event as CustomEvent).detail;
    setCaptureStatus({
      stage: "save-data-captured",
      message: "Save data received from Idleon.",
      receivedKeys: ["saveData"],
    });
    chrome.storage.local.set({ saveData: jsonData });
    checkTempData();
  },
  false
);

window.addEventListener(
  "PassCharNameToInject",
  (event) => {
    const jsonData = (event as CustomEvent).detail;
    setCaptureStatus({
      stage: "char-names-captured",
      message: "Character names received from Idleon.",
      receivedKeys: ["charNameData"],
    });
    chrome.storage.local.set({ charNameData: jsonData });
    checkTempData();
  },
  false
);

window.addEventListener(
  "PassGuildInfoToInject",
  (event) => {
    const jsonData = (event as CustomEvent).detail;
    setCaptureStatus({
      stage: "guild-info-captured",
      message: "Guild info received from Idleon.",
      receivedKeys: ["guildInfo"],
    });
    chrome.storage.local.set({ guildInfo: jsonData });
    checkTempData();
  },
  false
);

const checkTempData = (): void  => {
  chrome.storage.local.get("saveData", (result: UnknownRecord) => {
    const saveData = result.saveData;
    chrome.storage.local.get("charNameData", (secondResult: UnknownRecord) => {
      const charNameData = secondResult.charNameData;
      chrome.storage.local.get("guildInfo", (thirdResult: UnknownRecord) => {
        const guildInfo = thirdResult.guildInfo;
        if (saveData != null && charNameData != null && guildInfo != null) {
          setCaptureStatus({
            stage: "data-ready",
            message: "All Idleon data pieces captured. Preparing popup data.",
            receivedKeys: ["saveData", "charNameData", "guildInfo"],
          });
          // send combined data to actual storage for popup.js to use
          const combined = {
            saveData: saveData,
            charNameData: charNameData,
            guildInfo: guildInfo,
          };
          chrome.storage.local.set({
            data: combined,
            updatedAt: Date.now(),
            saveData: null,
            charNameData: null,
            guildInfo: null,
          });
          return;
        }
        const missingKeys = [
          saveData == null ? "saveData" : null,
          charNameData == null ? "charNameData" : null,
          guildInfo == null ? "guildInfo" : null,
        ].filter((key): key is string => key !== null);
        setCaptureStatus({
          stage: "partial-data",
          message: `Waiting for ${missingKeys.join(", ")}.`,
          missingKeys,
        });
      });
    });
  });
};

window.addEventListener("error", (event) => {
  const errorMessage = event.message || "Unknown content script error.";
  logError("Content script error.", event.error);
  setCaptureStatus({
    stage: "error",
    message: "The content script hit an error while capturing Idleon data.",
    errorMessage,
  });
});
