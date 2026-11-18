export function notify(handlers: Record<string, any>, event: string): void {
  handlers[event]();
}
