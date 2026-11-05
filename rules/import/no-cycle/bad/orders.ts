import { formatPrice } from './invoices';

export const orderTotal = (cents: number): string => formatPrice(cents);
