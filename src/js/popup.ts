/// <reference path="../globals.d.ts" />
import { getCharacterCsv, getFamilyCsv, getGuildCsv } from "./calculatorParse";
import {
  DEBUG_LEVEL_STORAGE_KEY,
  logError,
  logInfo,
  logVerbose,
  setDebugLevel,
} from "./debug";
import { guildExportCsv } from "./guildParse";
import { parseData } from "./parse";

type ParsedAction = {
  id: string;
  data: string | null;
};

type ParseFailure = {
  label: string;
  message: string;
};

/** Reads cached save data and wires popup copy/download actions. */
const updateAllButtons = (): void  => {
  logVerbose("Popup refresh requested.");
  chrome.storage.local.get(["data", "updatedAt", "captureStatus"], (result: UnknownRecord) => {
    const parseFailures: ParseFailure[] = [];
    const rawJson = result.data;
    const updatedAt = result.updatedAt;
    const captureStatus = readCaptureStatus(result.captureStatus);
    const content = document.getElementById("content");
    const loader = document.getElementById("loader");

    if (!rawJson) {
      content.style.display = "none";
      loader.style.display = "block";
      const statusText = getWaitingStatusText(captureStatus);
      logVerbose("No cached Idleon data available for popup.", {
        stage: captureStatus?.stage,
        missingKeys: captureStatus?.missingKeys,
      });
      setStatus(statusText);
      setParseErrorStatus([]);
      return;
    }

    logInfo("Cached Idleon data found. Preparing export actions.", {
      updatedAt: updatedAt === undefined ? undefined : String(updatedAt),
    });
    content.style.display = "block";
    loader.style.display = "none";
    if (updatedAt) {
      setStatus("Last updated: " + new Date(updatedAt as string | number | Date).toLocaleString());
    } else {
      setStatus("Data ready.");
    }

    const rawString = safeStringify(rawJson);
    const cleanJson = parseAnyData<RawIdleonData, CleanIdleonData>("cleanJson", parseData, rawJson as RawIdleonData, parseFailures);
    const cleanString = safeStringify(cleanJson);
    const lootyString = parseAnyData("lootyString", (data: RawIdleonData) => {
      return data.saveData.Cards1.replace(/"/g, "\\");
    }, rawJson as RawIdleonData, parseFailures);
    const questsString = parseAnyData("questsString", (data: CleanIdleonData) => {
      return safeStringify(data.account.quests);
    }, cleanJson, parseFailures);
    const familyCsv = parseAnyData("familyCsv", getFamilyCsv, cleanJson, parseFailures);
    const guildCsv = parseAnyData("guildCsv", getGuildCsv, cleanJson, parseFailures);
    const guildExportCsvString = parseAnyData("guildExportCsv", guildExportCsv, cleanJson, parseFailures);

    const actions: ParsedAction[] = [
      { id: "rawCopyLink", data: rawString },
      { id: "cleanJsonCopyLink", data: cleanString },
      { id: "lootyCopyLink", data: lootyString },
      { id: "questsCopyLink", data: questsString },
      { id: "familyCopyLink", data: familyCsv },
      { id: "guildCopyLink", data: guildCsv },
      { id: "guildExportCsvCopyLink", data: guildExportCsvString },
    ];

    const characters = document.querySelectorAll(".characters > li > button");
    for (let i = 0; i < 9; i++) {
      const charData = parseAnyData(`characterCsv:${i}`, () => {
        return getCharacterCsv(cleanJson, i);
      }, cleanJson, parseFailures);
      actions.push({ id: characters[i].id, data: charData });
    }

    actions.forEach((action) => {
      setCopyButtonState(action.id, action.data);
    });

    setDownloadButtonState("rawDownloadLink", rawString, "rawData.json");
    setDownloadButtonState(
      "cleanJsonDownloadLink",
      cleanString,
      "cleanData.json"
    );
    setParseErrorStatus(parseFailures);
  });
};

chrome.storage.local.get(DEBUG_LEVEL_STORAGE_KEY, (result: UnknownRecord) => {
  setDebugLevel(result[DEBUG_LEVEL_STORAGE_KEY]);
  updateAllButtons();
});

const safeStringify = (value: unknown): string | null  => {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch (e) {
    logError("Failed to stringify data.", e);
    return null;
  }
};

const parseAnyData = <T, R>(label: string, func: (data: T) => R, data: T | null | undefined, parseFailures: ParseFailure[]): R | null  => {
  if (data === null || data === undefined) {
    logVerbose(`Skipping ${label}; source data is unavailable.`);
    return null;
  }
  try {
    return func(data);
  } catch (e) {
    logError(`Unable to parse ${label}.`, e);
    parseFailures.push({
      label,
      message: getErrorMessage(e)
    });
    return null;
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const copyTextToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "absolute";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
};

const setCopyButtonState = (elementId: string, data: string | null): void  => {
  const button = document.getElementById(elementId) as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  const invalid =
    data === null || data === undefined || data === "null" || data === "";
  button.classList.toggle("disabled", invalid);
  button.disabled = invalid;
  button.setAttribute("aria-disabled", String(invalid));

  const icon = button.querySelector("img");
  if (icon) {
    icon.src = invalid ? "assets/error.svg" : "assets/copy.svg";
    icon.alt = invalid ? "parsing error" : "copy";
  }

  button.onclick = invalid
    ? null
    : (e) => {
        logInfo(`Copy requested for ${elementId}.`);
        copyTextToClipboard(data)
          .then(() => {
            logInfo(`Copy completed for ${elementId}.`);
            showTooltip(e, "Copied!");
          })
          .catch((error: unknown) => {
            logError(`Copy failed for ${elementId}.`, error);
            showTooltip(e, "Copy failed");
          });
      };
};

const setDownloadButtonState = (elementId: string, dataString: string | null, fileName: string): void  => {
  const downloadButton = document.getElementById(elementId) as HTMLAnchorElement | null;
  if (!downloadButton) {
    return;
  }

  const invalid =
    dataString === null ||
    dataString === undefined ||
    dataString === "null" ||
    dataString === "";
  downloadButton.classList.toggle("disabled", invalid);
  downloadButton.setAttribute("aria-disabled", String(invalid));

  const icon = downloadButton.querySelector("img");
  if (icon) {
    icon.src = invalid ? "assets/error.svg" : "assets/download.svg";
    icon.alt = invalid ? "parsing error" : "download";
  }

  if (invalid) {
    downloadButton.removeAttribute("href");
    downloadButton.removeAttribute("download");
    downloadButton.onclick = null;
    return;
  }

  const data = "text/json;charset=utf-8," + encodeURIComponent(dataString);
  downloadButton.setAttribute("download", fileName);
  downloadButton.setAttribute("href", "data:" + data);
  downloadButton.onclick = (e) => {
    logInfo(`Download requested for ${elementId}.`, { fileName });
    showTooltip(e, "Downloaded!");
  };
};

const setStatus = (text: string): void  => {
  const status = document.getElementById("status");
  status.innerText = text;
  status.style.display = "block";
};

const setParseErrorStatus = (parseFailures: ParseFailure[]): void => {
  const status = document.getElementById("parseErrorStatus");
  if (!status) {
    return;
  }

  if (parseFailures.length === 0) {
    status.innerText = "";
    status.style.display = "none";
    return;
  }

  const firstFailure = parseFailures[0];
  status.innerText = `Parser error in ${firstFailure.label}: ${firstFailure.message}`;
  status.style.display = "block";
};

const readCaptureStatus = (value: unknown): CaptureStatus | null => {
  if (value === null || value === undefined || typeof value !== "object") {
    return null;
  }

  const record = value as UnknownRecord;
  if (typeof record.stage !== "string" || typeof record.message !== "string") {
    return null;
  }

  return value as CaptureStatus;
};

const getWaitingStatusText = (captureStatus: CaptureStatus | null): string => {
  if (!captureStatus) {
    return "Open Idleon and reach character selection to capture data. No capture status has been received yet.";
  }

  const ageSeconds = Math.max(0, Math.round((Date.now() - captureStatus.updatedAt) / 1000));
  const ageText = ageSeconds <= 1 ? "just now" : `${ageSeconds}s ago`;
  const missingText = captureStatus.missingKeys && captureStatus.missingKeys.length > 0
    ? ` Missing: ${captureStatus.missingKeys.join(", ")}.`
    : "";
  const attemptText = captureStatus.attempt === undefined
    ? ""
    : ` Attempt ${captureStatus.attempt}.`;
  const errorText = captureStatus.errorMessage
    ? ` ${captureStatus.errorMessage}`
    : "";

  return `${captureStatus.message}${missingText}${attemptText} Updated ${ageText}.${errorText}`;
};

const showTooltip = (e: MouseEvent, text: string): void  => {
  const tooltip = document.getElementById("tooltip");
  tooltip.innerText = text;
  if (e.clientX + 80 > window.innerWidth) {
    tooltip.style.top = e.clientY + 20 + "px";
    tooltip.style.left = e.clientX - 60 + "px";
  } else if (e.clientY + 50 > window.innerHeight) {
    tooltip.style.top = e.clientY - 50 + "px";
    tooltip.style.left = e.clientX + 20 + "px";
  } else {
    tooltip.style.top = e.clientY + 20 + "px";
    tooltip.style.left = e.clientX + 20 + "px";
  }
  tooltip.style.display = "block";
  setTimeout(() => {
    tooltip.style.display = "none";
  }, 1000);
};

chrome.storage.onChanged.addListener((changes: UnknownRecord, namespace: string) => {
  if (namespace !== "local") {
    return;
  }
  const debugLevelChange = changes[DEBUG_LEVEL_STORAGE_KEY] as { newValue?: unknown } | undefined;
  if (debugLevelChange) {
    setDebugLevel(debugLevelChange.newValue);
  }
  if (changes.data || changes.updatedAt || changes.captureStatus) {
    logVerbose("Popup observed local storage change.", {
      keys: Object.keys(changes).join(", "),
    });
    updateAllButtons();
  }
});

document.getElementById("clearDataBtn").addEventListener("click", () => {
  logInfo("Clearing cached Idleon data.");
  chrome.storage.local.set(
    {
      data: null,
      updatedAt: null,
      saveData: null,
      charNameData: null,
      guildInfo: null,
      captureStatus: {
        stage: "cache-cleared",
        message: "Cached data cleared. Waiting for new Idleon data.",
        updatedAt: Date.now(),
      } satisfies CaptureStatus,
    },
    () => {
      document.getElementById("content").style.display = "none";
      document.getElementById("loader").style.display = "block";
      setStatus("Cached data cleared.");
    }
  );
});
