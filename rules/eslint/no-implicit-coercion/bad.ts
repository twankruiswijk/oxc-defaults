export function parse(items: string[], input: string, id: number): void {
  const hasItems = !!items.length;
  const quantity = +input;
  const label = '' + id;
  show(hasItems, quantity, label);
}
