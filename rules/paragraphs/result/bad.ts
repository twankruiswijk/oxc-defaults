export function invoiceTotal(lineCents: number[], vatRate: number): number {
  let subtotal = 0;
  for (const cents of lineCents) {
    subtotal += cents;
  }
  const vat = Math.round(subtotal * vatRate);
  return subtotal + vat;
}
