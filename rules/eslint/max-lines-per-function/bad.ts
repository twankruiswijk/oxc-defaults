export async function checkout(cart: Cart): Promise<void> {
  if (cart.items.length === 0) throw new Error('The cart is empty');
  let total = 0;
  for (const item of cart.items) total += item.price * item.quantity;
  const shipping = total > 5000 ? 0 : 495;
  await charge(cart.customer, total + shipping);
  await sendReceipt(cart.customer, total + shipping);
  // ...and 110 more lines
}
