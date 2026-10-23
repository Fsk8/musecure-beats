import { useEffect, useState } from 'react';

const UI_KEY = 'msb-ui-panels';

function readOpen(id, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY))?.[id];
    return typeof saved === 'boolean' ? saved : fallback;
  } catch {
    return fallback;
  }
}

function writeOpen(id, open) {
  try {
    const all = JSON.parse(localStorage.getItem(UI_KEY)) || {};
    all[id] = open;
    localStorage.setItem(UI_KEY, JSON.stringify(all));
  } catch {
    // preferencia de pantalla: si no se puede guardar, no pasa nada
  }
}

/**
 * Módulo desplegable. Recuerda si estaba abierto en este navegador.
 * `summary` se muestra en la barra cuando está cerrado.
 */
export function Panel({ id, title, summary, defaultOpen = true, className = '', plain = false, children }) {
  const [open, setOpen] = useState(() => readOpen(id, defaultOpen));

  useEffect(() => {
    writeOpen(id, open);
  }, [id, open]);

  // Otros botones pueden abrir este módulo: window.dispatchEvent(new CustomEvent('msb:open-panel', { detail: id }))
  useEffect(() => {
    const onOpen = (e) => {
      if (e.detail !== id) return;
      setOpen(true);
      requestAnimationFrame(() => document.getElementById(`panel-${id}`)?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    window.addEventListener('msb:open-panel', onOpen);
    return () => window.removeEventListener('msb:open-panel', onOpen);
  }, [id]);

  // Dentro de un panel lateral no hace falta desplegar: se muestra siempre, sin cabecera.
  if (plain) return <section className={`panel plain ${className}`}>{children}</section>;

  return (
    <section className={`panel collapsible${open ? ' is-open' : ''} ${className}`}>
      <button className="panel-head" aria-expanded={open} aria-controls={`panel-${id}`}
        onClick={() => setOpen((o) => !o)}>
        <span className="chev" aria-hidden="true">▸</span>
        <span className="label">{title}</span>
        {!open && summary && <span className="panel-summary">{summary}</span>}
      </button>
      <div id={`panel-${id}`} className="panel-body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
