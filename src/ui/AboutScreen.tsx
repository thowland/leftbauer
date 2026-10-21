// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Tim Howland

import { CREDITS } from '../assets/manifest';
import { Page, Section } from './Page';

/** Where the GPL's corresponding source lives. */
export const SOURCE_URL = 'https://github.com/thowland/leftbauer';

/** About — UI-3: the name, the credits, the license and the version. */
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
      </Section>

      <Section title="License">
        <p>Copyright © 2026 Tim Howland.</p>
        <p>
          Left Bauer is free software: you can redistribute it and change it under the terms of the{' '}
          <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noreferrer">
            GNU General Public License
          </a>
          , version 3 or later. It comes with no warranty. The{' '}
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            source code
          </a>{' '}
          is on GitHub.
        </p>
      </Section>

      <p className="page-lede">Version {__APP_VERSION__}</p>
    </Page>
  );
}
