import { EventEmitter } from 'node:events';

export function listenerTotal(emitter: EventEmitter): number {
  return emitter.eventNames().length;
}
