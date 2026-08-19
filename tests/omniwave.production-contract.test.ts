import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

describe("OmniWave production architecture contract", () => {
  it("centralizes bounded request handling for REST and tRPC", () => {
    const asyncBoundary = read("lib/_core/async.ts");
    const api = read("lib/_core/api.ts");
    const trpc = read("lib/trpc.ts");
    expect(asyncBoundary).toContain("DEFAULT_NETWORK_TIMEOUT_MS = 12_000");
    expect(asyncBoundary).toContain("AbortController");
    expect(asyncBoundary).toContain("OperationTimeoutError");
    expect(api).toContain("withTimeout(");
    expect(api).toContain('throw new Error("API request timed out")');
    expect(trpc).toContain("withTimeout(");
  });

  it("keeps recovery, typed route policy, and localization fallback explicit", () => {
    const navigation = read("lib/omniwave/navigation.ts");
    const localization = read("lib/localization.ts");
    const rootLayout = read("app/_layout.tsx");
    expect(navigation).toContain("APP_ROUTE_DEFINITIONS");
    expect(navigation).toContain("canAccessRoute");
    expect(navigation).toContain("LOCAL_ROUTE_ACCESS");
    expect(localization).toContain("export function translate");
    expect(rootLayout).toContain("export function ErrorBoundary");
  });

  it("does not reintroduce explicit any assertions into the hardened core files", () => {
    for (const path of ["lib/_core/async.ts", "lib/_core/api.ts", "lib/trpc.ts", "lib/omniwave/navigation.ts", "constants/oauth.ts", "server/storage.ts"]) {
      expect(read(path)).not.toMatch(/(:\s*any\b|as\s+any\b|<any>)/);
    }
  });
});
