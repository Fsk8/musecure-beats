// Posición del cursor de reproducción, fuera del estado de React.
// Así solo se redibuja la cuadrícula en cada paso, no toda la app.
import { useSyncExternalStore } from 'react';

let current = -1;
const listeners = new Set();

export const playhead = {
  set(step) {
    if (step === current) return;
    current = step;
    listeners.forEach((fn) => fn());
  },
  get: () => current,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const usePlayhead = () => useSyncExternalStore(playhead.subscribe, playhead.get);
