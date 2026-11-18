export function Badge({ label }: { label: string }) {
  return <span className="rounded bg-brand px-2 text-sm text-white dark:bg-black">{label}</span>;
}
