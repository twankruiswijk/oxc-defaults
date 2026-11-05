export function saveAll(items: string[]): void {
  for (const item of items) {
    save(item);
  }
}
