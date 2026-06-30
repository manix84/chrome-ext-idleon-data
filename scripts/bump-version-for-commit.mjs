import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const packageJsonPath = "package.json";
const packageLockPath = "package-lock.json";
const manifestPath = "manifest.json";
const releasablePatterns = [
  /^src\//,
  /^assets\//,
  /^scripts\//,
  /^test\//,
  /^tools\//,
  /^\.github\/workflows\//,
  /^index\.html$/,
  /^manifest\.json$/,
  /^package(-lock)?\.json$/,
  /^tsconfig.*\.json$/,
  /^eslint\.config\.mjs$/,
];
const broadChangeFileCount = 10;
const broadChangeLineCount = 500;
const broadSourceFileCount = 8;

const dryRun = process.argv.includes("--dry-run");
const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  log("No staged files; skipping version bump.");
  process.exit(0);
}

if (stagedFiles.includes(packageJsonPath)) {
  log("package.json is already staged; assuming the version was handled manually.");
  process.exit(0);
}

const releasableFiles = stagedFiles.filter(isReleasableFile);
if (releasableFiles.length === 0) {
  log("Only non-release files are staged; skipping version bump.");
  process.exit(0);
}

const requestedBump = process.env.VERSION_BUMP?.toLowerCase();
const bumpType = requestedBump ?? inferBumpType(releasableFiles);

if (bumpType === "none" || bumpType === "skip") {
  log("VERSION_BUMP requested no version bump.");
  process.exit(0);
}

if (bumpType !== "patch" && bumpType !== "minor") {
  throw new Error("VERSION_BUMP must be patch, minor, or none.");
}

const packageJson = readJson(packageJsonPath);
const currentVersion = String(packageJson.version);
const nextVersion = bumpVersion(currentVersion, bumpType);

log(`${dryRun ? "Would bump" : "Bumping"} ${bumpType} version: ${currentVersion} -> ${nextVersion}`);

if (!dryRun) {
  packageJson.version = nextVersion;
  writeJson(packageJsonPath, packageJson);

  const packageLock = readJson(packageLockPath);
  packageLock.version = nextVersion;
  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = nextVersion;
  }
  writeJson(packageLockPath, packageLock);

  const manifest = readJson(manifestPath);
  manifest.version = nextVersion;
  writeJson(manifestPath, manifest);

  execFileSync("git", ["add", packageJsonPath, packageLockPath, manifestPath], {
    stdio: "inherit",
  });
}

/**
 * @returns {string[]}
 */
function getStagedFiles() {
  const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    encoding: "utf8",
  });
  return output.split("\n").filter(Boolean);
}

/**
 * @param {string} file
 * @returns {boolean}
 */
function isReleasableFile(file) {
  return releasablePatterns.some((pattern) => pattern.test(file));
}

/**
 * @param {string[]} files
 * @returns {"patch" | "minor"}
 */
function inferBumpType(files) {
  const sourceFileCount = files.filter((file) => file.startsWith("src/")).length;
  const changedLines = countChangedLines(files);

  if (
    files.length >= broadChangeFileCount ||
    changedLines >= broadChangeLineCount ||
    sourceFileCount >= broadSourceFileCount
  ) {
    return "minor";
  }

  return "patch";
}

/**
 * @param {string[]} files
 * @returns {number}
 */
function countChangedLines(files) {
  const output = execFileSync("git", ["diff", "--cached", "--numstat", "--", ...files], {
    encoding: "utf8",
  });

  return output
    .split("\n")
    .filter(Boolean)
    .reduce((total, line) => {
      const [added, removed] = line.split("\t");
      return total + parseStatNumber(added) + parseStatNumber(removed);
    }, 0);
}

/**
 * @param {string} value
 * @returns {number}
 */
function parseStatNumber(value) {
  return Number.parseInt(value, 10) || 0;
}

/**
 * @param {string} version
 * @param {"patch" | "minor"} bumpType
 * @returns {string}
 */
function bumpVersion(version, bumpType) {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Expected package version to be major.minor.patch, got ${version}.`);
  }

  const [major, minor, patch] = parts;
  if (bumpType === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

/**
 * @param {string} path
 * @returns {Record<string, unknown>}
 */
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * @param {string} path
 * @param {Record<string, unknown>} value
 * @returns {void}
 */
function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * @param {string} message
 * @returns {void}
 */
function log(message) {
  console.log(`[version-bump] ${message}`);
}
