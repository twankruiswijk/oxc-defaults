export function OrderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}>
      {name}
    </button>
  );
}
