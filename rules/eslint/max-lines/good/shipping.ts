export const shippingCost = (cents: number): number => (cents > 5000 ? 0 : 495);
export const deliveryDays = (express: boolean): number => (express ? 1 : 3);
