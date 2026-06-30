# Privacy 🔒

Idleon API Downloader runs locally in your browser as an unpacked Chrome extension.

The extension captures Idleon save data from `legendsofidleon.com` after the game loads it in the browser. It stores the captured data in Chrome extension local storage so the popup can copy or download it.

The extension also stores lightweight local settings and status values, including the selected debug logging level and the current capture progress state. These values are used only by the popup, options page, and capture scripts.

The extension does not send captured data to a server owned by this project. Copying or downloading data is initiated from the popup by the user.

Debug logging is off by default. Errors are always written to the browser console. If debug logging is enabled from the extension options page, logs are intended to show capture progress and troubleshooting details without printing raw save payloads.

The extension requests:

1. `storage` permission, used to cache the latest captured save data for the popup.
2. Host access for `*.legendsofidleon.com`, used to inject the capture script only on the Idleon site.

Use "Clear Cached Data" in the popup to remove cached save data from extension storage. Debug logging can be changed from the extension options page.
