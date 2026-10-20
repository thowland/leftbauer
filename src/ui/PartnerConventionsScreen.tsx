import { partnerConventions } from '../coach/conventions';
import { Page, Section } from './Page';

/** How your partner plays — UI-6, PB-4, generated from the partner's own rules. */
export function PartnerConventionsScreen({ onDone }: { onDone: () => void }) {
  return (
    <Page title="How your partner plays" onDone={onDone}>
      <p className="page-lede">
        Your partner plays the same way every time, so you can learn to read it.
      </p>
      {partnerConventions().map((section) => (
        <Section key={section.title} title={section.title}>
          <p>{section.intro}</p>
          {section.conventions.length > 0 && (
            <ol className="rules-list">
              {section.conventions.map((c) => (
                <li key={c.code}>{c.text}</li>
              ))}
            </ol>
          )}
        </Section>
      ))}
    </Page>
  );
}
