const PADDING = { 2: 'p-2', 4: 'p-4' } as const;

export function Box({ size }: { size: 2 | 4 }) {
  return <div className={PADDING[size]}>Content</div>;
}
