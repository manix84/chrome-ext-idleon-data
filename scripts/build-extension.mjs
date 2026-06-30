import { cp, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const extensionRoot = "dist/extension";
const staticFiles = ["assets", "index.html", "manifest.json", "PRIVACY.md", "README.md"];

await rm(extensionRoot, { recursive: true, force: true });
await mkdir(extensionRoot, { recursive: true });

for (const file of staticFiles) {
  await cp(file, `${extensionRoot}/${file}`, { recursive: true });
}

await run("tsc", ["-p", "tsconfig.extension.json"]);

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
