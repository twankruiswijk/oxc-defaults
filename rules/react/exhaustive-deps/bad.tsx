import { useEffect, useState } from 'react';

declare function fetchStatus(orderId: string): Promise<string>;

export function OrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    void fetchStatus(orderId).then(setStatus);
  }, []);

  return <p>{status}</p>;
}
