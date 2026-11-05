export function drain(queue: string[]): void {
  let job = queue.shift();
  while (job !== undefined) {
    run(job);
    job = queue.shift();
  }
}
