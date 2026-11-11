export function CancelOrder({ onCancel }: { onCancel: () => void }) {
  return <a onClick={onCancel}>Cancel order</a>;
}
