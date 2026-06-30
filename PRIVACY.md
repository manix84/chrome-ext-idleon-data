# Privacy 🔒

Idleon API Downloader runs locally in your browser as an unpacked Chrome extension.

The extension captures Idleon save data from `legendsofidleon.com` after the game loads it in the browser. It stores the captured data in Chrome extension local storage so the popup can copy or download it.

The extension does not send captured data to a server owned by this project. Copying or downloading data is initiated from the popup by the user.

The extension requests:

1. `storage` permission, used to cache the latest captured save data for the popup.
2. Host access for `*.legendsofidleon.com`, used to inject the capture script only on the Idleon site.

Use "Clear Cached Data" in the popup to remove cached save data from extension storage.
