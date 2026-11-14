import React, { useEffect, useId, useRef } from 'react';
export default function StoryModal({ title, onClose, children, wide = false }) {
  const ref = useRef(null), id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input,textarea,button')?.focus();
    return () => { document.body.style.overflow = bodyOverflow; previous?.focus?.(); };
  }, []);
  return <div className="bs-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`bs-modal${wide ? ' bs-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
        if (e.key === 'Tab') {
          const list = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')];
          const first = list[0], last = list.at(-1);
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }}>
      <header className="bs-modal-header"><h2 id={id}>{title}</h2><button aria-label="Dialog schließen" onClick={onClose}>×</button></header>
      {children}
    </section>
  </div>;
}
