export function invoiceTotal(lineCents: number[], vatRate: number): number {
  let subtotal = 0;
  for (const cents of lineCents) subtotal += cents;
  const vat = Math.round(subtotal * vatRate);

  return subtotal + vat;
}

export function discountCents(cents: number, code: string): number {
  if (code === 'HALF') return cents / 2;
  if (code === 'TENOFF') return cents - 1000;
  return cents;
}
