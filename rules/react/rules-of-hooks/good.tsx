import { useState } from 'react';

export function DiscountField({ hasCode }: { hasCode: boolean }) {
  const [code, setCode] = useState('');
  if (!hasCode) {
    return null;
  }

  return <input aria-label="Discount code" value={code} onChange={(event) => setCode(event.target.value)} />;
}
