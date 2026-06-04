import { useEffect } from 'react';

export default function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className={`modal-window ${wide ? 'modal-wide' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            {subtitle && <p className="eyebrow">{subtitle}</p>}
            <h2>{title}</h2>
          </div>
          <button className="small ghost" type="button" onClick={onClose}>Закрыть</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
