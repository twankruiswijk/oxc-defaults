import { formatPrice } from './money';

export const orderTotal = (cents: number): string => formatPrice(cents);
