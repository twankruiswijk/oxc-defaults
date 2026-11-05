export async function load(url: string): Promise<Response> {
  // TODO: retry when the request fails
  return fetch(url);
}
