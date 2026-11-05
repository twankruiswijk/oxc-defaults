import { orderTotal } from './orders';

export const formatPrice = (cents: number): string => `EUR ${cents / 100}`;
export const invoiceLine = (cents: number): string => `Total: ${orderTotal(cents)}`;
