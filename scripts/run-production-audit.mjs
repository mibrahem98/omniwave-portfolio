import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const artifactsDirectory = resolve(process.cwd(), "artifacts");
const rawReportPath = resolve(artifactsDirectory, "production-dependency-audit.json");
const summaryPath = resolve(artifactsDirectory, "production-dependency-audit.md");
const statusPath = resolve(artifactsDirectory, "production-dependency-audit.status");
const command = "pnpm audit --prod --audit-level=high --json";

mkdirSync(artifactsDirectory, { recursive: true });

let status = "passed";
let output = "";
let parsed = null;

try {
  output = execFileSync("pnpm", ["audit", "--prod", "--audit-level=high", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (error) {
  status = "failed";
  output = typeof error.stdout === "string" ? error.stdout : "";
}

try {
  parsed = output ? JSON.parse(output) : null;
} catch {
  parsed = null;
}

const record = {
  generatedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null,
  command,
  auditStatus: status,
  parsed,
  rawOutput: parsed ? undefined : output,
};

const summary = [
  "# Production Dependency Audit",
  "",
  `- Generated: ${record.generatedAt}`,
  `- Commit: ${record.commit ?? "local run"}`,
  `- Command: \`${command}\``,
  `- Status: **${status.toUpperCase()}**`,
  "",
  "The JSON artifact contains the package-manager output. A failed status means the CI job must not be considered dependency-clean until findings are resolved or formally accepted.",
  "",
].join("\n");

writeFileSync(rawReportPath, `${JSON.stringify(record, null, 2)}\n`);
writeFileSync(summaryPath, summary);
writeFileSync(statusPath, `${status}\n`);

console.log(`Wrote ${rawReportPath}`);
console.log(`Wrote ${summaryPath}`);

if (status !== "passed") process.exit(1);
