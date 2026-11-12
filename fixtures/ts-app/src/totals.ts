export function orderTotal(lineCents: number[], vatRate: number): number {
  // ADR-003: a plain loop, because reduce hides the running subtotal
  let subtotal = 0;
  for (const cents of lineCents) {
    subtotal += cents;
  }
  const vat = Math.round(subtotal * vatRate);

  return subtotal + vat;
}
