declare function sendInvoice(invoiceId: string): void;

export function handleMessage(data: string): void {
  const invoiceId: unknown = JSON.parse(data);
  if (typeof invoiceId !== 'string') {
    throw new Error('Message has no invoice id');
  }

  sendInvoice(invoiceId);
}
