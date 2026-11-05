export function saveAll(items: string[]): void {
  items.forEach((item) => save(item));
}
