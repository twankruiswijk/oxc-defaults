export function drain(queue: string[]): void {
  while (true) {
    const job = queue.shift();
    if (job === undefined) {
      break;
    }
    run(job);
  }
}
