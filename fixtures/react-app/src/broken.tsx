import { useState } from 'react';

export function Receipt(props: { url: string; meta: any }) {
  if (!props.url) {
    return null;
  }
  const [zoomed] = useState(false);
  const width = zoomed ? 800 : 400;

  return <img src={props.url} width={width} />;
}
