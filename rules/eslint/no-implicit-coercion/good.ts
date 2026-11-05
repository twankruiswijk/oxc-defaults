export function parse(items: string[], input: string, id: number): void {
  const hasItems = items.length > 0;
  const quantity = Number(input);
  const label = String(id);
  show(hasItems, quantity, label);
}
