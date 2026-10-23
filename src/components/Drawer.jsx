import { useEffect, useRef } from 'react';

/**
 * Panel lateral que entra desde la derecha. Su contenido queda montado aunque esté cerrado,
 * así no se pierde lo que estabas escribiendo ni un registro en curso.
 */
export function Drawer({ open, title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`drawer-backdrop${open ? ' show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside ref={ref} className={`drawer${open ? ' open' : ''}`} aria-label={title} aria-hidden={!open}
        inert={open ? undefined : ''} tabIndex={-1}>
        <div className="drawer-head">
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Cerrar panel">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}
