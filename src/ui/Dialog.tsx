import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  readonly title: string;
  readonly children: ReactNode;
  /** The buttons; the first one receives focus when the dialog opens. */
  readonly actions: ReactNode;
}

/** A modal panel over the table, used for the hand summary and game over. */
export function Dialog({ title, children, actions }: DialogProps) {
  const titleId = useId();
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    actionsRef.current?.querySelector('button')?.focus();
  }, []);

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
