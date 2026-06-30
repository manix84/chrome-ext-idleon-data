updateAllButtons();
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (namespace !== "local") {
    return;
  }
  if (changes.data || changes.updatedAt) {
    updateAllButtons();
  }
});

document.getElementById("clearDataBtn").addEventListener("click", function () {
  chrome.storage.local.set(
    {
      data: null,
      updatedAt: null,
      saveData: null,
      charNameData: null,
      guildInfo: null,
    },
    function () {
      document.getElementById("content").style.display = "none";
      document.getElementById("loader").style.display = "block";
      setStatus("Cached data cleared.");
    }
  );
});

function updateAllButtons() {
  chrome.storage.local.get(["data", "updatedAt"], function (result) {
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
      setStatus("Last updated: " + new Date(updatedAt).toLocaleString());
    } else {
      setStatus("Data ready.");
    }

    const rawString = safeStringify(rawJson);
    const cleanJson = parseAnyData(parseData, rawJson);
    const cleanString = safeStringify(cleanJson);
    const lootyString = parseAnyData(function (data) {
      return data.saveData.Cards1.replace(/"/g, "\\");
    }, rawJson);
    const questsString = parseAnyData(function (data) {
      return safeStringify(data.account.quests);
    }, cleanJson);
    const familyCsv = parseAnyData(getFamilyCsv, cleanJson);
    const guildCsv = parseAnyData(getGuildCsv, cleanJson);
    const guildExportCsvString = parseAnyData(guildExportCsv, cleanJson);

    const actions = [
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
      const charData = parseAnyData(function () {
        return getCharacterCsv(cleanJson, i);
      }, cleanJson);
      actions.push({ id: characters[i].id, data: charData });
    }

    actions.forEach(function (action) {
      setCopyButtonState(action.id, action.data);
    });

    setDownloadButtonState("rawDownloadLink", rawString, "rawData.json");
    setDownloadButtonState(
      "cleanJsonDownloadLink",
      cleanString,
      "cleanData.json"
    );
  });
}

function safeStringify(value) {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch (e) {
    console.error("Failed to stringify data.", e);
    return null;
  }
}

function parseAnyData(func, data) {
  if (data === null || data === undefined) {
    return null;
  }
  try {
    return func(data);
  } catch (e) {
    console.error("Unable to parse function.", e);
    return null;
  }
}

async function copyTextToClipboard(text) {
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
}

function setCopyButtonState(elementId, data) {
  const button = document.getElementById(elementId);
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
    : function (e) {
        copyTextToClipboard(data)
          .then(function () {
            showTooltip(e, "Copied!");
          })
          .catch(function () {
            showTooltip(e, "Copy failed");
          });
      };
}

function setDownloadButtonState(elementId, dataString, fileName) {
  const downloadButton = document.getElementById(elementId);
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
  downloadButton.onclick = function (e) {
    showTooltip(e, "Downloaded!");
  };
}

function setStatus(text) {
  const status = document.getElementById("status");
  status.innerText = text;
  status.style.display = "block";
}

function showTooltip(e, text) {
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
}
