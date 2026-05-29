import { createPortal } from 'react-dom';

export default function ModalShell({
  ariaLabel,
  children,
  className = 'work-detail-modal',
}) {
  const modal = (
    <div className={className} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      {children}
    </div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}
