export function shippingCost(weightGrams: number): number {
  if (weightGrams <= 0) {
    throw new Error('weight must be positive');
  }

  return weightGrams * 0.01;
}
