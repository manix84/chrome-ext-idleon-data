# Changelog 📝

Notable changes to this project are summarized here by released or package version.

## [0.5.10] - 2026-06-30

### Added

- Added a popup overview that summarizes detected parsed data, including character count, highest level, storage entries, card count, Looty count, and guild member count.
- Added a visible warning when parsed characters use class IDs that are not yet mapped.

### Changed

- Ignored local captured raw data fixtures so personal save data is not accidentally committed.

## [0.5.9] - 2026-06-30

### Fixed

- Fixed clean-data parsing for captured Idleon saves that mix JSON strings with already-parsed arrays and objects.
- Made unknown or newly added class IDs fall back safely instead of breaking character parsing.
- Made star talent parsing tolerate missing legacy talent-page map keys.
- Updated the popup character export controls to render the actual parsed character count instead of a fixed 9-character list.

## [0.5.8] - 2026-06-30

### Fixed

- Added an in-popup parser error message so the first failing export shows its parser label and error text.
- Made JSON field parsing tolerate raw Idleon values that are already parsed arrays or objects.

## [0.5.7] - 2026-06-30

### Fixed

- Added labeled popup parser errors so failed export paths identify the specific parser that failed in the console.
- Made missing or malformed guild data fall back to empty guild bonuses and members instead of breaking the full clean-data parse.

## [0.5.6] - 2026-06-30

### Added

- Added normalized raw character data handling inspired by IdleonToolbox's parser structure.
- Added raw item/card identifiers alongside mapped display names so exports are easier to debug when game data changes.

### Changed

- Typed guild parsing around explicit raw guild member fields and clean exported member records.
- Routed character parser lookups through normalized per-character raw fields instead of repeated dynamic key construction.

## [0.5.3] - 2026-06-30

### Fixed

- Fixed character name capture after Idleon stopped exposing the previous minified username-list global.
- Added a fallback that reads character names from Idleon's current `getUserNameList` command bridge.

## [0.5.2] - 2026-06-30

### Added

- Added a temporary suggested project icon.
- Added the icon to the extension manifest and action icon configuration.
- Added a transparent-background README icon preview.
- Documented that the icon is temporary and should be replaced if the project owner chooses a better official icon.

## [0.5.1] - 2026-06-30

### Fixed

- Fixed data capture after Idleon stopped exposing the previous minified `userId` and `guildId` globals.
- Added fallbacks that resolve the signed-in user from Firebase auth and the current guild id from Firebase realtime database membership data.

## [0.5.0] - 2026-06-30

### Added

- Added a dedicated extension options page.
- Added configurable debug logging with `Off`, `Info`, and `Verbose` levels.
- Added capture progress status so the popup can explain what data it is waiting for while Idleon loads.
- Added shared debug logging helpers that prefix messages with `Idleon API Downloader`.
- Added validation coverage for the options page and its bundled script.

### Changed

- Debug logging is now off by default for regular users.
- Error logging remains enabled regardless of the selected debug level.
- Build packaging now includes `options.html`, `assets/options.css`, and `js/options.js`.
- Documentation now explains the options page, debug levels, and support workflow for stuck captures.

## [0.4.0] - 2026-06-30

### Added

- Added `AI_DECLARATION.md` to clarify that code is written, reviewed, and maintained by human developers while AI may help with documentation, review notes, commit messages, changelog wording, and other project paperwork.
- Added project metadata badges to the README.

### Changed

- Refreshed Idleon map data from current public game data, including item, card, mob/card source, card level, talent, class talent, star sign, fishing, and card set mappings.
- Updated README badges to use repository-relative workflow links.
- Removed ownership claims from community and documentation files to keep the project suitable for merging back upstream.

## [0.3.1] - 2026-06-30

### Added

- Added workflow badges to the README.
- Added friendlier Markdown formatting and emoji across project documentation.
- Added improved development instructions for installing hooks and running lint, type-checks, tests, and validation.
- Added a smart pre-commit hook that bumps patch versions by default and minor versions for broad releasable changes.

### Changed

- Removed the deprecated TypeScript `node10` module resolution setting.

## [0.3.0] - 2026-06-30

### Added

- Added GitHub Actions workflows for linting, tests, type-checking, and release packaging.
- Added release packaging for compiled extension builds.
- Added community health files, including contribution, support, security, code of conduct, issue template, and pull request template documentation.
- Added TypeScript project configuration for extension source and tooling.

### Changed

- Migrated the extension to Manifest V3.
- Converted extension source from JavaScript to TypeScript under `src/js`.
- Bundled TypeScript extension entrypoints into CommonJS-compatible browser output.
- Updated release automation to publish packaged builds when versioned code is merged into `main`.
- Removed the manual release trigger so releases are driven by main branch merges.
- Improved popup behavior, including cached-data clearing, parse failure icons, and last-captured status.

## Pre-versioned History

### Added

- Added the original Idleon save-data capture flow.
- Added raw JSON copying and downloading from captured browser data.
- Added cleaned JSON export support for spreadsheet and tool usage.
- Added character, family, guild, quest, Looty, and guild CSV export paths.
- Added parsing for many account and character data areas, including cards, stamps, bribes, obols, alchemy, refinery, anvil data, cogs, minigame plays, player gender, insta revives, purchased packs, guild info, and task data.
- Added and expanded map data for items, mobs, talents, elite classes, card naming, large bubbles, event mobs, secret items, and newer Idleon content.
- Added popup loading and error states for data that is not ready or fails to parse.

### Changed

- Reworked the data injection approach to use Idleon's Firebase objects.
- Reorganized JavaScript into a `js/` folder before the later TypeScript migration.
- Improved parser resilience around inconsistent Idleon data shapes and variable types.
- Reworked popup update handling so storage changes refresh the UI more predictably.
- Cleaned up formatting, comments, map naming conventions, and integer normalization across parser output.

### Fixed

- Fixed crashes related to missing or outdated elite class talent mappings.
- Fixed inventory bag indexing.
- Fixed card naming and family obol handling.
- Fixed loading-screen display behavior when data was not ready.
- Fixed parser failures so raw data could still be displayed when cleaned parsing failed.
