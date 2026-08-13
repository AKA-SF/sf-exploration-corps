import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function ModalShell({
  ariaLabel,
  children,
  className = 'work-detail-modal',
  onClose,
}) {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!onCloseRef.current) return undefined;

    const modal = modalRef.current;
    const appRoot = document.getElementById('root');
    const invokedBy = document.activeElement;
    const rootWasInert = appRoot?.hasAttribute('inert') ?? false;

    appRoot?.setAttribute('inert', '');
    modal?.querySelector(focusableSelector)?.focus();

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = [...modal.querySelectorAll(focusableSelector)];
      if (focusableElements.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    modal?.addEventListener('keydown', handleKeyDown);
    return () => {
      modal?.removeEventListener('keydown', handleKeyDown);
      if (!rootWasInert) appRoot?.removeAttribute('inert');
      if (invokedBy instanceof HTMLElement && invokedBy.isConnected) invokedBy.focus();
    };
  }, []);

  const modal = (
    <div className={className} role="dialog" aria-modal="true" aria-label={ariaLabel} ref={modalRef} tabIndex={-1}>
      {children}
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}
