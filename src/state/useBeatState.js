import { useCallback, useEffect, useState } from 'react';
import { loadState, saveState } from '../music/patterns';

/**
 * Estado del beat persistido en localStorage.
 * `mutate(fn)` recibe una copia editable del estado: se modifica directamente y se guarda.
 * El guardado espera 400 ms sin cambios, para no escribir en cada movimiento de un slider.
 */
export function useBeatState() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    const id = setTimeout(() => saveState(state), 400);
    return () => clearTimeout(id);
  }, [state]);

  const mutate = useCallback((fn) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  return [state, mutate, setState];
}
