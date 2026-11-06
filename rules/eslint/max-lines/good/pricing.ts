export const withTax = (cents: number): number => Math.round(cents * 1.21);
export const discounted = (cents: number, percent: number): number => Math.round(cents * (1 - percent / 100));
