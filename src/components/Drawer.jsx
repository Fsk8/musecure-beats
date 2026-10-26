import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Panel lateral que entra desde la derecha. Su contenido queda montado aunque esté cerrado,
 * así no se pierde lo que estabas escribiendo ni un registro en curso.
 * `wide`: para galería, batallas y árbol (más espacio, se superpone al estudio).
 * Accesible: enfoca el primer control, mantiene el Tab adentro y al cerrar devuelve el foco al botón que lo abrió.
 */
export function Drawer({ open, title, onClose, wide = false, children }) {
  const ref = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    const el = ref.current;
    // El primer control del contenido (si no hay, el botón de cerrar).
    const first = el?.querySelector(`.drawer-body ${FOCUSABLE.split(', ').join(', .drawer-body ')}`) || el?.querySelector('.drawer-head button');
    setTimeout(() => first?.focus({ preventScroll: true }), 50);
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const firstItem = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); firstItem.focus(); }
      else if (!el.contains(document.activeElement)) { e.preventDefault(); firstItem.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Devuelve el foco a quien abrió el panel.
      const back = opener.current;
      if (back && document.contains(back)) setTimeout(() => back.focus({ preventScroll: true }), 0);
    };
  }, [open, onClose]);

  return (
    <>
      <div className={`drawer-backdrop${open ? ' show' : ''}${wide ? ' wide' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className={`drawer${open ? ' open' : ''}${wide ? ' wide' : ''}`} aria-label={title} aria-hidden={!open}
        role="dialog" aria-modal={open && wide ? 'true' : undefined} inert={open ? undefined : ''} tabIndex={-1}>
        <div className="drawer-head">
          <button className="drawer-back" onClick={onClose}>← Studio</button>
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Close panel">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}
