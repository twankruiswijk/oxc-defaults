import type { Invoice } from './invoices';
import type { Order } from './orders';

export function invoiceFor(order: Order): Invoice {
  return { orderId: order.id };
}
