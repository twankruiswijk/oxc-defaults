import { readFileSync } from 'node:fs';
const ENCODING = 'utf8';
export interface Order {
  id: string;
  cents: number;
}
export function readOrders(path: string): Order[] {
  return parseOrders(readFileSync(path, ENCODING));
}
function parseOrders(text: string): Order[] {
  return text.split('\n').map((line) => ({ id: line, cents: 0 }));
}
