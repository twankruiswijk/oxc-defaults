export async function checkout(cart: Cart): Promise<void> {
  const order = validated(cart);
  const priced = withPrices(order);
  await charge(priced);
  await sendReceipt(priced);
}
