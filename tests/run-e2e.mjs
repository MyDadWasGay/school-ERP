import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";

if (process.env.SKIP_E2E_BUILD !== "1") {
  const build = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: "inherit",
  });
  const [buildCode] = await once(build, "exit");
  if (buildCode !== 0) {
    process.exitCode = typeof buildCode === "number" ? buildCode : 1;
    process.exit();
  }
}

const standaloneRoot = path.join(process.cwd(), ".next", "standalone");
mkdirSync(path.join(standaloneRoot, ".next"), { recursive: true });
cpSync(path.join(process.cwd(), ".next", "static"), path.join(standaloneRoot, ".next", "static"), { recursive: true });
const server = spawn(process.execPath, ["server.js"], {
  cwd: standaloneRoot,
  env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: "3000" },
  stdio: "inherit",
});

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:3000");
      if (response.ok || response.status === 307) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next.js test server did not become ready.");
}

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  const exited = Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  await exited;
  if (server.exitCode === null && process.platform === "win32") {
    await new Promise((resolve) => execFile("taskkill", ["/pid", String(server.pid), "/T", "/F"], () => resolve()));
  }
}

let exitCode = 1;
try {
  await waitForServer();
  const runner = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--reporter=line"], {
    cwd: process.cwd(),
    env: { ...process.env, CI: "1" },
    stdio: "inherit",
  });
  const [code] = await once(runner, "exit");
  exitCode = typeof code === "number" ? code : 1;
} finally {
  await stopServer();
}
process.exitCode = exitCode;
