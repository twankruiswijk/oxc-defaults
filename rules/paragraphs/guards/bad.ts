export function shippingCents(weightGrams: number, country: string): number {
  if (weightGrams <= 0) {
    throw new Error('weight must be positive');
  }
  const base = country === 'NL' ? 495 : 1295;
  const perKilo = Math.ceil(weightGrams / 1000) * 150;
  console.log(`shipping to ${country}`);

  return base + perKilo;
}
