import { useEffect, useState } from 'react';

declare function fetchStatus(orderId: string): Promise<string>;

export function OrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    void fetchStatus(orderId).then(setStatus);
  }, [orderId]);

  return <p>{status}</p>;
}
