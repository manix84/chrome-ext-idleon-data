import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { validateExtension } from "../tools/validate-extension.mjs";

test("accepts a valid extension fixture", async () => {
  const rootDir = await createFixture();

  const failures = await validateExtension(rootDir);

  assert.deepEqual(failures, []);
});

test("reports missing popup controls", async () => {
  const rootDir = await createFixture({
    indexHtml: baseIndexHtml().replace('id="rawCopyLink"', 'id="wrongId"'),
  });

  const failures = await validateExtension(rootDir);

  assert.ok(failures.includes("index.html is missing #rawCopyLink."));
});

test("reports JavaScript syntax errors", async () => {
  const rootDir = await createFixture({
    popupJs: "function broken(",
  });

  const failures = await validateExtension(rootDir);

  assert.ok(failures.some((failure) => failure.startsWith("js/popup.js has a syntax error:")));
});

/**
 * @param {{ indexHtml?: string, optionsHtml?: string, popupJs?: string }} [overrides]
 * @returns {Promise<string>}
 */
async function createFixture(overrides = {}) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "idleon-validator-"));

  await mkdir(path.join(rootDir, "assets"));
  await mkdir(path.join(rootDir, "js"));

  await writeFile(path.join(rootDir, "manifest.json"), JSON.stringify(baseManifest(), null, 2));
  await writeFile(path.join(rootDir, "index.html"), overrides.indexHtml ?? baseIndexHtml());
  await writeFile(path.join(rootDir, "options.html"), overrides.optionsHtml ?? baseOptionsHtml());
  await writeFile(path.join(rootDir, "assets", "copy.svg"), "<svg></svg>");
  await writeFile(path.join(rootDir, "assets", "download.svg"), "<svg></svg>");
  await writeFile(path.join(rootDir, "assets", "options.css"), "");
  await writeFile(path.join(rootDir, "js", "inject.js"), "const injected = true;");
  await writeFile(path.join(rootDir, "js", "injected.js"), "const pageScript = true;");
  await writeFile(path.join(rootDir, "js", "options.js"), "const options = true;");
  await writeFile(path.join(rootDir, "js", "popup.js"), overrides.popupJs ?? "const popup = true;");

  return rootDir;
}

function baseManifest() {
  return {
    manifest_version: 3,
    name: "Fixture",
    version: "0.0.0",
    action: {
      default_popup: "index.html",
    },
    options_page: "options.html",
    content_scripts: [
      {
        matches: ["*://example.com/*"],
        js: ["js/inject.js"],
      },
    ],
    web_accessible_resources: [
      {
        resources: ["js/injected.js"],
        matches: ["*://example.com/*"],
      },
    ],
  };
}

function baseOptionsHtml() {
  return `
    <!doctype html>
    <html>
      <head>
        <link rel="stylesheet" href="assets/options.css">
      </head>
      <body>
        <script src="js/options.js"></script>
      </body>
    </html>
  `;
}

function baseIndexHtml() {
  const ids = [
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
    ...Array.from({ length: 9 }, (_, index) => `char${index}CopyLink`),
  ];

  return `
    <!doctype html>
    <html>
      <head>
        <link rel="stylesheet" href="assets/copy.svg">
      </head>
      <body>
        ${ids.map((id) => `<button id="${id}" type="button"></button>`).join("\n")}
        <img src="assets/download.svg" alt="">
        <script src="js/popup.js"></script>
      </body>
    </html>
  `;
}
