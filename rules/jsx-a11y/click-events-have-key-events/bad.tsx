export function OrderRow({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen}>
      {name}
    </div>
  );
}
