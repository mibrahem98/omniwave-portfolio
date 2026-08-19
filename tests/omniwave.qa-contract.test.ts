import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("OmniWave QA readiness contract", () => {
  it("does not expose raw database errors in optional-server logs", () => {
    const database = read("server/db.ts");
    expect(database).toContain('console.warn("[Database] Connection initialization failed")');
    expect(database).toContain('console.error("[Database] User upsert failed")');
    expect(database).not.toMatch(/console\.(?:warn|error)\([^\n]*,\s*error\)/);
  });

  it("keeps the audited template surfaces free of TODO placeholders", () => {
    const auditedSources = ["drizzle/schema.ts", "server/db.ts", "server/routers.ts", "tests/auth.logout.test.ts"]
      .map(read)
      .join("\n");
    expect(auditedSources).not.toMatch(/\bTODO\b|\bFIXME\b/i);
  });

  it("preserves a CI artifact when production dependency auditing fails", () => {
    const auditScript = read("scripts/run-production-audit.mjs");
    const workflow = read(".github/workflows/quality.yml");
    expect(auditScript).toContain("production-dependency-audit.status");
    expect(auditScript).toContain("pnpm audit --prod --audit-level=high --json");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("pnpm audit:dependencies:report");
  });
});
