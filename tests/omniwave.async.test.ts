import { describe, expect, it } from "vitest";

import { OperationAbortedError, OperationTimeoutError, withRetry, withTimeout } from "../lib/_core/async";

describe("OmniWave async boundary", () => {
  it("returns a completed operation before the shared timeout", async () => {
    await expect(withTimeout(async () => "ready", { timeoutMs: 40 })).resolves.toBe("ready");
  });

  it("aborts an operation with a typed timeout error", async () => {
    await expect(withTimeout(() => new Promise<never>(() => undefined), { timeoutMs: 5 })).rejects.toBeInstanceOf(OperationTimeoutError);
  });

  it("preserves a caller cancellation signal", async () => {
    const controller = new AbortController();
    const operation = withTimeout(() => new Promise<never>(() => undefined), { timeoutMs: 1_000, signal: controller.signal });
    controller.abort();
    await expect(operation).rejects.toBeInstanceOf(OperationAbortedError);
  });

  it("retries a transient operation with bounded attempts", async () => {
    let attempts = 0;
    await expect(withRetry(async () => {
      attempts += 1;
      if (attempts < 2) throw new Error("temporary failure");
      return "recovered";
    }, { initialDelayMs: 1, maxAttempts: 2 })).resolves.toBe("recovered");
    expect(attempts).toBe(2);
  });

  it("does not retry a failure rejected by its policy", async () => {
    let attempts = 0;
    await expect(withRetry(async () => {
      attempts += 1;
      throw new Error("invalid request");
    }, { initialDelayMs: 1, shouldRetry: () => false })).rejects.toThrow("invalid request");
    expect(attempts).toBe(1);
  });
});
