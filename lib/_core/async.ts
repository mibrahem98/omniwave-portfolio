export const DEFAULT_NETWORK_TIMEOUT_MS = 12_000;

export class OperationTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation exceeded the ${timeoutMs}ms timeout`);
    this.name = "OperationTimeoutError";
  }
}

export class OperationAbortedError extends Error {
  constructor() {
    super("Operation was aborted");
    this.name = "OperationAbortedError";
  }
}

export type TimedOperationOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

export type RetriedOperationOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
  shouldRetry?: (error: unknown, failedAttempt: number) => boolean;
};

function abortReason(signal: AbortSignal | undefined): OperationAbortedError | Error | undefined {
  if (!signal?.aborted) return undefined;
  return signal.reason instanceof Error ? signal.reason : new OperationAbortedError();
}

async function waitForRetry(delayMs: number, signal: AbortSignal | undefined): Promise<void> {
  const aborted = abortReason(signal);
  if (aborted) throw aborted;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortReason(signal) ?? new OperationAbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Retry a bounded number of independently safe operations with exponential backoff.
 * The caller supplies `shouldRetry` so state-changing requests are never replayed by default.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  {
    maxAttempts = 3,
    initialDelayMs = 150,
    maxDelayMs = 1_000,
    signal,
    shouldRetry = () => true,
  }: RetriedOperationOptions = {},
): Promise<T> {
  const attempts = Number.isFinite(maxAttempts) ? Math.max(1, Math.min(3, Math.floor(maxAttempts))) : 3;
  const safeInitialDelay = Number.isFinite(initialDelayMs) ? Math.max(1, Math.min(1_000, Math.floor(initialDelayMs))) : 150;
  const safeMaxDelay = Number.isFinite(maxDelayMs) ? Math.max(safeInitialDelay, Math.min(2_000, Math.floor(maxDelayMs))) : 1_000;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const aborted = abortReason(signal);
    if (aborted) throw aborted;
    try {
      return await operation(attempt);
    } catch (error) {
      const cancellation = abortReason(signal);
      if (cancellation) throw cancellation;
      if (attempt === attempts || !shouldRetry(error, attempt)) throw error;
      const delayMs = Math.min(safeMaxDelay, safeInitialDelay * 2 ** (attempt - 1));
      await waitForRetry(delayMs, signal);
    }
  }

  throw new Error("Retry attempts were exhausted");
}

/**
 * Execute an abort-aware asynchronous operation with one bounded timeout.
 * Callers must pass the supplied signal to the native/network primitive.
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  { timeoutMs = DEFAULT_NETWORK_TIMEOUT_MS, signal: callerSignal }: TimedOperationOptions = {},
): Promise<T> {
  const safeTimeout = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(15_000, Math.floor(timeoutMs))) : DEFAULT_NETWORK_TIMEOUT_MS;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(new OperationAbortedError());
  callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new OperationTimeoutError(safeTimeout);
      controller.abort(error);
      reject(error);
    }, safeTimeout);
  });

  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } catch (error) {
    if (controller.signal.reason instanceof Error) throw controller.signal.reason;
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
