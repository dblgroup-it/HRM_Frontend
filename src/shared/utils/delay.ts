/** Promise-based sleep used to simulate latency in the mock API. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
