export function shippingLabel(express: boolean, total: number): string {
  let label = 'standard';
  if (express) {
    label = 'next day';
  } else if (total > 50) {
    label = 'free';
  }
  return label;
}
