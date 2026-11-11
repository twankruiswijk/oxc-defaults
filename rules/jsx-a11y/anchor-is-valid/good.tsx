export function CancelOrder({ onCancel }: { onCancel: () => void }) {
  return (
    <p>
      <button type="button" onClick={onCancel}>
        Cancel order
      </button>
      <a href="/orders">Back to your orders</a>
    </p>
  );
}
