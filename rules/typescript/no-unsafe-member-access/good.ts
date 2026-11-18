export async function orderTotal(response: Response): Promise<number> {
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('total' in body) || typeof body.total !== 'number') {
    throw new Error('Order response has no total');
  }

  return body.total;
}
