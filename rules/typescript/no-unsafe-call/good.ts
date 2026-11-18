export function notify(handlers: ReadonlyMap<string, () => void>, event: string): void {
  const handler = handlers.get(event);
  if (handler === undefined) {
    return;
  }

  handler();
}
