export function readCount(text: string): number {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'number') {
    throw new Error('Count is not a number');
  }

  return parsed;
}
