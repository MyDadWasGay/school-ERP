import { copyFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`${name} is required.`);
  return path.resolve(value);
}

const source = argument("--source");
const destination = argument("--destination");
if (source === destination) throw new Error("Backup source and destination must be different files.");
if (!statExists(source)) throw new Error(`Backup source does not exist: ${source}`);
mkdirSync(path.dirname(destination), { recursive: true });
copyFileSync(source, destination);
const bytes = statSync(destination).size;
console.log(`SQLite backup created: ${destination} (${bytes} bytes).`);

function statExists(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

