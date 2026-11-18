declare function sendInvoice(invoiceId: string): void;

export function handleMessage(data: string): void {
  sendInvoice(JSON.parse(data));
}
