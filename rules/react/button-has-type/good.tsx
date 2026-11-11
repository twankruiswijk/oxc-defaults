export function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" onClick={onClear}>
      Clear
    </button>
  );
}
