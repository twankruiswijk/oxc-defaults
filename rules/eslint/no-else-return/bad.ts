export function label(count: number): string {
  if (count === 0) {
    return 'empty';
  } else {
    return `${count} items`;
  }
}
