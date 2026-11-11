export function parseOrder(raw: any): string {
  if (raw === null) {
    throw new Error('No order');
  }
  const id = String(raw);
  const trimmed = id.trim();

  return trimmed;
}
