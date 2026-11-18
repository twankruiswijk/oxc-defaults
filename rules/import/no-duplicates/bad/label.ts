import { formatPrice } from './money.ts';
import { roundCents } from './money.ts';

export function label(cents: number): string {
  return formatPrice(roundCents(cents));
}
