import { mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const archiveName = `${packageJson.name}-v${packageJson.version}.zip`;
const archivePath = path.join("dist", archiveName);

await mkdir("dist", { recursive: true });

await run("npm", ["run", "build"]);
await run("zip", ["-r", `../${archiveName}`, "."], {
  cwd: "dist/extension",
});

console.log(`Created ${archivePath}`);

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string }} [options]
 * @returns {Promise<void>}
 */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
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
