import { cp, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import * as esbuild from "esbuild";

const extensionRoot = "dist/extension";
const staticFiles = ["assets", "index.html", "options.html", "manifest.json", "PRIVACY.md", "README.md"];

await rm(extensionRoot, { recursive: true, force: true });
await mkdir(extensionRoot, { recursive: true });

for (const file of staticFiles) {
  await cp(file, `${extensionRoot}/${file}`, { recursive: true });
}

await run("tsc", ["-p", "tsconfig.extension.json", "--noEmit"]);

await esbuild.build({
  bundle: true,
  entryPoints: {
    "js/inject": "src/js/inject.ts",
    "js/injected": "src/js/injected.ts",
    "js/options": "src/js/options.ts",
    "js/popup": "src/js/popup.ts",
  },
  format: "iife",
  outdir: extensionRoot,
  platform: "browser",
  target: "es2022",
});

console.log(`Built ${extensionRoot}`);

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
