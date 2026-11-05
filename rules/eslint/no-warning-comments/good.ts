export async function load(url: string): Promise<Response> {
  return fetchWithRetry(url);
}
