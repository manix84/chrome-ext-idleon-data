import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { Script } from "node:vm";

const requiredPopupIds = [
  "clearDataBtn",
  "content",
  "loader",
  "status",
  "rawCopyLink",
  "rawDownloadLink",
  "cleanJsonCopyLink",
  "cleanJsonDownloadLink",
  "lootyCopyLink",
  "questsCopyLink",
  "familyCopyLink",
  "guildCopyLink",
  "guildExportCsvCopyLink",
];

for (let i = 0; i < 9; i += 1) {
  requiredPopupIds.push(`char${i}CopyLink`);
}

/**
 * @typedef {object} ValidationContext
 * @property {string[]} failures
 * @property {string} rootDir
 *
 * @typedef {object} ExtensionManifest
 * @property {number} [manifest_version]
 * @property {{ default_popup?: string }} [action]
 * @property {Array<{ js?: string[] }>} [content_scripts]
 * @property {Array<{ resources?: string[] }>} [web_accessible_resources]
 */

/**
 * @param {string} [rootDir]
 * @returns {Promise<string[]>}
 */
export async function validateExtension(rootDir = process.cwd()) {
  /** @type {ValidationContext} */
  const context = {
    failures: [],
    rootDir,
  };

  await validateManifest(context);
  await validateIndex(context);
  await validateScripts(context);

  return context.failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const failures = await validateExtension(rootDir);

  if (failures.length > 0) {
    console.error("Extension validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Extension validation passed.");
}

/**
 * @param {ValidationContext} context
 * @returns {Promise<void>}
 */
async function validateManifest(context) {
  const manifest = /** @type {ExtensionManifest | null} */ (
    await readJson(context, "manifest.json")
  );
  if (!manifest) {
    return;
  }

  if (manifest.manifest_version !== 3) {
    context.failures.push("manifest.json must use Manifest V3.");
  }

  await requirePath(context, manifest.action?.default_popup, "manifest action popup");

  for (const script of manifest.content_scripts ?? []) {
    for (const jsFile of script.js ?? []) {
      await requirePath(context, jsFile, "content script");
    }
  }

  for (const resourceGroup of manifest.web_accessible_resources ?? []) {
    for (const resource of resourceGroup.resources ?? []) {
      await requirePath(context, resource, "web accessible resource");
    }
  }
}

/**
 * @param {ValidationContext} context
 * @returns {Promise<void>}
 */
async function validateIndex(context) {
  const html = await readText(context, "index.html");
  if (!html) {
    return;
  }

  for (const id of requiredPopupIds) {
    if (!html.includes(`id="${id}"`)) {
      context.failures.push(`index.html is missing #${id}.`);
    }
  }

  const assetRefs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
    (match) => match[1]
  );
  for (const ref of assetRefs) {
    if (ref.startsWith("http") || ref.startsWith("#")) {
      continue;
    }
    await requirePath(context, ref, "index.html reference");
  }
}

/**
 * @param {ValidationContext} context
 * @returns {Promise<void>}
 */
async function validateScripts(context) {
  const html = (await readText(context, "index.html")) ?? "";
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(
    (match) => match[1]
  );
  scripts.push("js/inject.js", "js/injected.js");

  for (const scriptPath of new Set(scripts)) {
    const source = await readText(context, scriptPath);
    if (!source) {
      continue;
    }

    try {
      new Script(source, { filename: scriptPath });
    } catch (error) {
      context.failures.push(`${scriptPath} has a syntax error: ${getErrorMessage(error)}`);
    }
  }
}

/**
 * @param {ValidationContext} context
 * @param {string} relativePath
 * @returns {Promise<unknown | null>}
 */
async function readJson(context, relativePath) {
  const text = await readText(context, relativePath);
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    context.failures.push(`${relativePath} is not valid JSON: ${getErrorMessage(error)}`);
    return null;
  }
}

/**
 * @param {ValidationContext} context
 * @param {string} relativePath
 * @returns {Promise<string | null>}
 */
async function readText(context, relativePath) {
  try {
    return await readFile(path.join(context.rootDir, relativePath), "utf8");
  } catch (error) {
    context.failures.push(`Unable to read ${relativePath}: ${getErrorMessage(error)}`);
    return null;
  }
}

/**
 * @param {ValidationContext} context
 * @param {string | undefined} relativePath
 * @param {string} label
 * @returns {Promise<void>}
 */
async function requirePath(context, relativePath, label) {
  if (!relativePath) {
    context.failures.push(`Missing ${label} path.`);
    return;
  }

  try {
    await access(path.join(context.rootDir, relativePath), constants.R_OK);
  } catch {
    context.failures.push(`${label} path does not exist: ${relativePath}`);
  }
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
