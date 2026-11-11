export const MAX_ITEMS = 10;

export function CartBadge({ count }: { count: number }) {
  return <span>{Math.min(count, MAX_ITEMS)}</span>;
}
