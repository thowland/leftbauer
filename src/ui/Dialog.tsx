import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  readonly title: string;
  readonly children: ReactNode;
  /** The buttons; the first one receives focus when the dialog opens. */
  readonly actions: ReactNode;
  /** Escape closes the dialog; without it, Escape does nothing. */
  readonly onClose?: () => void;
  /** `sheet` rises from the bottom on portrait phones, clear of the trick. */
  readonly placement?: 'center' | 'sheet';
}

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]';

/**
 * A modal panel over the table. It takes the focus, keeps Tab inside
 * itself, and gives the focus back to whatever had it when it closes.
 */
export function Dialog({ title, children, actions, onClose, placement = 'center' }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement;
    actionsRef.current?.querySelector('button')?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  // The latest onClose, so the key handler never needs re-adding.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (panel === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeRef.current !== undefined) {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items.at(-1);
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className={`dialog-backdrop${placement === 'sheet' ? ' dialog-backdrop-sheet' : ''}`}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions" ref={actionsRef}>
          {actions}
        </div>
      </div>
    </div>
  );
}
