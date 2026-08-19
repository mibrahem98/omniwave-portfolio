import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputDirectory = resolve(process.cwd(), "docs/sale-bundle");
const raw = execFileSync("pnpm", ["licenses", "list", "--json", "--prod"], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
const grouped = JSON.parse(raw);

function reviewStatus(license) {
  const normalized = license.toUpperCase();
  if (!license || normalized.includes("UNKNOWN") || normalized.includes("NOASSERTION")) return "unknown";
  if (/(AGPL|GPL|LGPL|MPL|CC-BY|UNLICENSE|CUSTOM)/.test(normalized)) return "review";
  return "declared";
}

const components = Object.entries(grouped)
  .flatMap(([license, packages]) => packages.map((pkg) => ({
    name: pkg.name,
    versions: pkg.versions ?? [],
    declaredLicense: license,
    homepage: pkg.homepage ?? null,
    status: reviewStatus(license),
    source: "pnpm licenses list --json --prod",
  })))
  .sort((left, right) => left.name.localeCompare(right.name));

const summary = Object.entries(grouped)
  .map(([license, packages]) => ({ license, components: packages.length, status: reviewStatus(license) }))
  .sort((left, right) => left.license.localeCompare(right.license));

const register = {
  format: "OmniWave production dependency license register",
  generatedAt: new Date().toISOString(),
  scope: "Production dependency metadata only; it excludes source-code ownership, external media, fonts, domains, developer accounts, and secrets.",
  command: "pnpm licenses list --json --prod",
  components,
};

const markdown = [
  "# OmniWave Production Dependency License Register",
  "",
  `**Generated:** ${register.generatedAt}  `,
  "**Evidence:** declared package metadata from `pnpm licenses list --json --prod`.  ",
  "**Scope:** production dependencies only; this is not a legal opinion or a transfer of third-party rights.",
  "",
  "## Summary by declared license",
  "",
  "| Declared license | Components | Review status |",
  "| --- | ---: | --- |",
  ...summary.map((item) => `| ${item.license || "Unknown"} | ${item.components} | ${item.status} |`),
  "",
  "## Buyer follow-up",
  "",
  "Review every `review` or `unknown` component against the license text and proposed distribution model. Confirm separate rights for source iconography, external fonts, sample media, generated videos, developer accounts, domains, and secrets. The complete component list is in `OmniWave_LICENSE_REGISTER.json`.",
  "",
  "## Acceptance condition",
  "",
  "A buyer or legal reviewer must sign off on flagged components before claiming license-cleared redistribution.",
  "",
].join("\n");

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(resolve(outputDirectory, "OmniWave_LICENSE_REGISTER.json"), `${JSON.stringify(register, null, 2)}\n`);
writeFileSync(resolve(outputDirectory, "OMNIWAVE_LICENSE_REGISTER.md"), markdown);

console.log(JSON.stringify({ components: components.length, licenses: summary.length, outputDirectory }, null, 2));
