export function size(count: number): string {
  if (count > 100) {
    return 'large';
  }
  if (count > 10) {
    return 'medium';
  }
  return 'small';
}
