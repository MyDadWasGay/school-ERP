import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const roots = ["app", "components", "config", "db", "features", "lib", "tests", ".github", ".env.example", "middleware.ts", "next.config.mjs", "package.json", "render.yaml", "vercel.json", "Dockerfile"];
const ignored = new Set(["node_modules", ".next", ".git", ".tmp-validation"]);
const findings = [];
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
];

for (const relative of roots) {
  const full = path.join(root, relative);
  if (!existsSync(full)) continue;
  scan(full);
}
if (findings.length) {
  for (const finding of findings) console.error(`${finding.file}:${finding.line}: possible committed secret (${finding.pattern})`);
  process.exitCode = 1;
} else {
  console.log("Secret scan passed: no high-confidence credential patterns found in source files.");
}

function scan(file) {
  const info = statSync(file);
  if (info.isDirectory()) {
    for (const entry of readdirSync(file)) {
      if (!ignored.has(entry)) scan(path.join(file, entry));
    }
    return;
  }
  if (!/\.(?:ts|tsx|mjs|js|json|yml|yaml|md)$/.test(file) || file.endsWith("package-lock.json")) return;
  const content = readFileSync(file, "utf8");
  content.split(/\r?\n/).forEach((line, index) => {
    for (const pattern of secretPatterns) {
      if (pattern.test(line)) findings.push({ file: path.relative(root, file), line: index + 1, pattern: pattern.source });
    }
  });
}
