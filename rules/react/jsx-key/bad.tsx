interface Order {
  id: string;
  name: string;
}

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map((order) => (
        <li>{order.name}</li>
      ))}
    </ul>
  );
}
