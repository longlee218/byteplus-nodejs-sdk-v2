const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

/**
 * Exponential backoff with random jitter (Python
 * ExponentialWithRandomJitterBackoffStrategy): base = minDelay * 2**attempt;
 * delay = min(maxDelay, base + rand(0, base)). `attempt` is 0-based.
 */
export function backoffDelayMs(attempt: number, minDelayMs = 300, maxDelayMs = 300000): number {
  const base = minDelayMs * 2 ** attempt;
  return Math.min(maxDelayMs, base + Math.random() * base);
}

export const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
