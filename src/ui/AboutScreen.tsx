import { CREDITS } from '../assets/manifest';
import { Page, Section } from './Page';

/** About — UI-3: the name, the credits and the version. */
export function AboutScreen({ onDone }: { onDone: () => void }) {
  return (
    <Page title="About" onDone={onDone}>
      <Section title="The name">
        <p>
          In Euchre the <strong>left bower</strong> is the jack of the same color as trump. It
          leaves its own suit to become the second-highest trump, and it is the rule that most often
          trips up a new player.
        </p>
        <p>
          “Bower” comes from the German <em>Bauer</em>, meaning farmer, which was also the name for
          the jack in German card games. The game is generally thought to have reached America with
          German-speaking settlers in Pennsylvania, and the older spelling tips its hat to that
          lineage.
        </p>
      </Section>

      <Section title="Credits">
        <p>The cards are drawn in code for this game.</p>
        <ul className="rules-list">
          {CREDITS.map((credit) => (
            <li key={credit.work}>
              {credit.usedFor}:{' '}
              <a href={credit.url} target="_blank" rel="noreferrer">
                {credit.work}
              </a>{' '}
              by {credit.author}, under{' '}
              <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
                {credit.license}
              </a>
              .
            </li>
          ))}
        </ul>
        <p>Left Bauer is free software under the GNU General Public License, version 3 or later.</p>
      </Section>

      <p className="page-lede">Version {__APP_VERSION__}</p>
    </Page>
  );
}
