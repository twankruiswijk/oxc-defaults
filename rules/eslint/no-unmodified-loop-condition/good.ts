export function countdown(start: number): void {
  let remaining = start;
  while (remaining > 0) {
    console.log(remaining);
    remaining -= 1;
  }
}
