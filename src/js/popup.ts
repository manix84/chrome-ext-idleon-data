/// <reference path="../globals.d.ts" />
import { getCharacterCsv, getFamilyCsv, getGuildCsv } from "./calculatorParse";
import { guildExportCsv } from "./guildParse";
import { parseData } from "./parse";

type ParsedAction = {
  id: string;
  data: string | null;
};

/** Reads cached save data and wires popup copy/download actions. */
const updateAllButtons = (): void  => {
  chrome.storage.local.get(["data", "updatedAt"], (result: UnknownRecord) => {
    const rawJson = result.data;
    const updatedAt = result.updatedAt;
    const content = document.getElementById("content");
    const loader = document.getElementById("loader");

    if (!rawJson) {
      content.style.display = "none";
      loader.style.display = "block";
      setStatus("Open Idleon and reach character selection to capture data.");
      return;
    }

    content.style.display = "block";
    loader.style.display = "none";
    if (updatedAt) {
      setStatus("Last updated: " + new Date(updatedAt as string | number | Date).toLocaleString());
    } else {
      setStatus("Data ready.");
    }

    const rawString = safeStringify(rawJson);
    const cleanJson = parseAnyData<RawIdleonData, CleanIdleonData>(parseData, rawJson as RawIdleonData);
    const cleanString = safeStringify(cleanJson);
    const lootyString = parseAnyData((data: RawIdleonData) => {
      return data.saveData.Cards1.replace(/"/g, "\\");
    }, rawJson as RawIdleonData);
    const questsString = parseAnyData((data: CleanIdleonData) => {
      return safeStringify(data.account.quests);
    }, cleanJson);
    const familyCsv = parseAnyData(getFamilyCsv, cleanJson);
    const guildCsv = parseAnyData(getGuildCsv, cleanJson);
    const guildExportCsvString = parseAnyData(guildExportCsv, cleanJson);

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
      const charData = parseAnyData(() => {
        return getCharacterCsv(cleanJson, i);
      }, cleanJson);
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
  });
};

const safeStringify = (value: unknown): string | null  => {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch (e) {
    console.error("Failed to stringify data.", e);
    return null;
  }
};

const parseAnyData = <T, R>(func: (data: T) => R, data: T | null | undefined): R | null  => {
  if (data === null || data === undefined) {
    return null;
  }
  try {
    return func(data);
  } catch (e) {
    console.error("Unable to parse function.", e);
    return null;
  }
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
        copyTextToClipboard(data)
          .then(() => {
            showTooltip(e, "Copied!");
          })
          .catch(() => {
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
    showTooltip(e, "Downloaded!");
  };
};

const setStatus = (text: string): void  => {
  const status = document.getElementById("status");
  status.innerText = text;
  status.style.display = "block";
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

updateAllButtons();
chrome.storage.onChanged.addListener((changes: UnknownRecord, namespace: string) => {
  if (namespace !== "local") {
    return;
  }
  if (changes.data || changes.updatedAt) {
    updateAllButtons();
  }
});

document.getElementById("clearDataBtn").addEventListener("click", () => {
  chrome.storage.local.set(
    {
      data: null,
      updatedAt: null,
      saveData: null,
      charNameData: null,
      guildInfo: null,
    },
    () => {
      document.getElementById("content").style.display = "none";
      document.getElementById("loader").style.display = "block";
      setStatus("Cached data cleared.");
    }
  );
});
