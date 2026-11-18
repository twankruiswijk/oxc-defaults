export function Box({ size }: { size: 2 | 4 }) {
  return <div className={`p-${size}`}>Content</div>;
}
