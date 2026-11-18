export async function orderTotal(response: Response): Promise<number> {
  const body = (await response.json()) as any;

  return body.total;
}
