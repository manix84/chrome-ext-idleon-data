import { mkdir, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const releaseFiles = [
  "assets",
  "js",
  "index.html",
  "manifest.json",
  "PRIVACY.md",
  "README.md",
];

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const archiveName = `${packageJson.name}-v${packageJson.version}.zip`;
const archivePath = path.join("dist", archiveName);

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await run("zip", ["-r", archivePath, ...releaseFiles]);

console.log(`Created ${archivePath}`);

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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
