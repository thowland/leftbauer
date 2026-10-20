import type { ReactNode } from 'react';

interface PageProps {
  readonly title: string;
  readonly onDone: () => void;
  readonly doneLabel?: string;
  readonly children: ReactNode;
}

/** A scrolling reading screen with a title and a way back. */
export function Page({ title, onDone, doneLabel = 'Done', children }: PageProps) {
  return (
    <main className="settings page" aria-label={title}>
      <header className="settings-header">
        <h1 className="settings-title">{title}</h1>
        <button type="button" className="button button-primary" onClick={onDone}>
          {doneLabel}
        </button>
      </header>
      {children}
    </main>
  );
}

/** A titled section of a page. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group page-section" aria-label={title}>
      <h2 className="page-heading">{title}</h2>
      {children}
    </section>
  );
}
