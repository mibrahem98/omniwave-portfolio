import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("OmniWave security hardening contract", () => {
  it("does not request recording permission for a playback-only product", () => {
    const appConfig = read("app.config.ts");
    expect(appConfig).toContain("microphonePermission: false");
    expect(appConfig).toContain("recordAudioAndroid: false");
  });

  it("does not write storage backend response bodies into server logs", () => {
    const storageProxy = read("server/_core/storageProxy.ts");
    expect(storageProxy).not.toContain("forgeResp.text()");
    expect(storageProxy).not.toContain("console.error(\"[StorageProxy] failed:\", err)");
  });

  it("keeps the OAuth core free of explicit any assertions and audits production dependencies in CI", () => {
    const oauth = read("server/_core/oauth.ts");
    const sdk = read("server/_core/sdk.ts");
    const packageJson = read("package.json");
    const workflow = read(".github/workflows/quality.yml");
    expect(`${oauth}\n${sdk}`).not.toMatch(/(:\s*any\b|as\s+any\b|<any>)/);
    expect(packageJson).toContain('"audit:dependencies": "pnpm audit --prod --audit-level=high"');
    expect(workflow).toContain("pnpm audit:dependencies");
  });
});
