import React, { useEffect, useRef } from 'react';

export default function Modal({
  isOpen,
  title,
  children,
  onClose,
  onConfirm,
  confirmText = 'Valider',
  isSubmitting = false,
  disableConfirm = false,
  ariaDescribedBy
}) {
  const contentRef = useRef(null);
  const titleId = 'modal-title';

  useEffect(() => {
    if (!isOpen) return;
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'textarea', 'input', 'select',
      '[tabindex]:not([tabindex="-1"])'
    ];
    const getFocusable = () => Array.from(contentEl.querySelectorAll(focusableSelectors.join(','))).filter(el => !el.hasAttribute('disabled'));
    const focusables = getFocusable();
    (focusables[0] || contentEl).focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = getFocusable();
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    contentEl.addEventListener('keydown', onKeyDown);
    return () => contentEl.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        ref={contentRef}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 id={titleId} style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} className="btn-secondary" aria-label="Fermer la fenêtre">✖</button>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          {children}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={onConfirm} className="btn-primary" disabled={isSubmitting || disableConfirm}>
            {isSubmitting ? '⏳ En cours...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}