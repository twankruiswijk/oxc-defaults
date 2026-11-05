import { orderTotal } from './orders';

export const invoiceLine = (cents: number): string => `Total: ${orderTotal(cents)}`;
