import { copyFileSync, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import path from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`${name} is required.`);
  return path.resolve(value);
}

if (!process.argv.includes("--confirm-restore")) {
  throw new Error("Restoration is destructive. Re-run with --confirm-restore after verifying the exact target path.");
}
const source = argument("--source");
const target = argument("--target");
if (source === target) throw new Error("Restore source and target must be different files.");
if (!isFile(source)) throw new Error(`Restore source does not exist: ${source}`);
mkdirSync(path.dirname(target), { recursive: true });
const rollback = `${target}.pre-restore-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.bak`;
if (isFile(target)) copyFileSync(target, rollback);
const staged = `${target}.restore-${process.pid}.tmp`;
copyFileSync(source, staged);
renameSync(staged, target);
console.log(`SQLite restore completed: ${target}.`);
if (isFile(rollback)) console.log(`Previous database preserved at: ${rollback}.`);

function isFile(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

