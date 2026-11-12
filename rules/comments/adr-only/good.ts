const FIXED_RETRY_DELAY_MS = 1000;

export function retryDelayMs(): number {
  // ADR-014: a fixed delay, because backoff bursts overload the payment provider
  return FIXED_RETRY_DELAY_MS;
}
