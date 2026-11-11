interface Order {
  id: string;
  name: string;
}

export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul>
      {orders.map((order, index) => (
        <li key={index}>{order.name}</li>
      ))}
    </ul>
  );
}
