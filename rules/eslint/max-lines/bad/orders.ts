export const withTax = (cents: number): number => Math.round(cents * 1.21);
export const discounted = (cents: number, percent: number): number => Math.round(cents * (1 - percent / 100));

export const shippingCost = (cents: number): number => (cents > 5000 ? 0 : 495);
export const deliveryDays = (express: boolean): number => (express ? 1 : 3);

export const receiptSubject = (orderId: string): string => `Your order ${orderId}`;
export const shippedSubject = (orderId: string): string => `Order ${orderId} is on its way`;

// ...and 600 more lines of pricing, shipping and emails
