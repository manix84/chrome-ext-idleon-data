/// <reference path="../globals.d.ts" />
const s = document.createElement("script");
s.src = chrome.runtime.getURL("js/injected.js");
s.onload = () => {
  s.remove();
};
(document.head || document.documentElement).appendChild(s);
chrome.storage.local.set({ data: null, updatedAt: null });

window.addEventListener(
  "PassSaveToInject",
  (event) => {
    const jsonData = (event as CustomEvent).detail;
    chrome.storage.local.set({ saveData: jsonData });
    checkTempData();
  },
  false
);

window.addEventListener(
  "PassCharNameToInject",
  (event) => {
    const jsonData = (event as CustomEvent).detail;
    chrome.storage.local.set({ charNameData: jsonData });
    checkTempData();
  },
  false
);

window.addEventListener(
  "PassGuildInfoToInject",
  (event) => {
    const jsonData = (event as CustomEvent).detail;
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
        }
      });
    });
  });
};
