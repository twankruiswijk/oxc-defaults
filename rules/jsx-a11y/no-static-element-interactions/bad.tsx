export function OrderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <div onClick={onOpen} onKeyDown={onOpen}>
      {name}
    </div>
  );
}
