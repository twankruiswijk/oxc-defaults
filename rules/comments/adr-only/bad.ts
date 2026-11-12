export function retryDelayMs(): number {
  // wait a fixed second, backoff overloads the payment provider
  return 1000;
}
