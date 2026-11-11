import { useState } from 'react';

export function DiscountField({ hasCode }: { hasCode: boolean }) {
  if (!hasCode) {
    return null;
  }

  const [code, setCode] = useState('');

  return <input aria-label="Discount code" value={code} onChange={(event) => setCode(event.target.value)} />;
}
