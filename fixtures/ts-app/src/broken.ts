export function parseOrder(raw: any): string {
  if (raw === null) {
    throw new Error('No order');
  }
  // turn the raw order into an id
  const id = String(raw);
  const trimmed = id.trim();

  return trimmed;
}
