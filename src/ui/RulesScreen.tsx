import {
  dealerPartnerMustGoAloneActive,
  defendAloneActive,
  LONE_DEFENCE_POINTS,
  type RuleSet,
} from '../engine/rules';
import { Card } from './Card';
import { Page, Section } from './Page';

interface RulesScreenProps {
  readonly rules: RuleSet;
  readonly onDone: () => void;
}

/** How to play — UI-2. Written from the active rules, so house rules show as played. */
export function RulesScreen({ rules, onDone }: RulesScreenProps) {
  return (
    <Page title="How to play" onDone={onDone}>
      <Section title="The deal">
        <p>
          Euchre is played by four players in two teams; you and your partner sit across from each
          other. The deck has 24 cards, the nine through the ace of each suit. Each player gets five
          cards, and the dealer turns the top card of the four left over face up.
        </p>
        {rules.farmersHand && (
          <p>
            <strong>Farmer’s hand.</strong> A player dealt nothing but 9s and 10s may, before
            bidding, swap any three of them for the three face-down cards under the upcard, sight
            unseen.
          </p>
        )}
      </Section>

      <Section title="Bidding">
        <p>
          <strong>Round one.</strong> Starting left of the dealer, each player may pass, or order
          the dealer to pick up the face-up card. Its suit becomes trump, and the dealer takes the
          card and discards one.
        </p>
        <p>
          <strong>Round two.</strong> If everyone passes, the card is turned down. Each player may
          now name any other suit as trump, or pass.{' '}
          {rules.stickTheDealer
            ? 'With “stick the dealer”, the dealer cannot pass and must name a suit.'
            : 'If everyone passes again, the cards are thrown in and the next player deals.'}
        </p>
        <p>The team that names trump are the makers, and must take at least three tricks.</p>
      </Section>

      <Section title="The bowers">
        <p>
          The jack of trump, the <strong>right bower</strong>, is the highest card. The other jack
          of the same color, the <strong>left bower</strong>, is second: it leaves its own suit and
          counts as trump. Then come the ace, king, queen, ten and nine of trump. With hearts as
          trump:
        </p>
        <div className="rules-cards" aria-label="Hearts trump, highest first">
          {(['JH', 'JD', 'AH', 'KH'] as const).map((card) => (
            <Card key={card} card={card} className="rules-card" />
          ))}
        </div>
      </Section>

      <Section title="Playing the tricks">
        <p>
          The player left of the dealer leads. Everyone must follow the suit led if they can; the
          left bower counts as a trump, never as its own suit. If you cannot follow, you may play
          any card, including trump. The highest trump wins the trick, or, if none was played, the
          highest card of the suit led. The winner leads the next trick.
        </p>
      </Section>

      {rules.lonersAllowed && (
        <Section title="Going alone">
          <p>
            A player who names trump may go alone: their partner sits the hand out, and they play
            against both opponents by themselves for a bigger score.
          </p>
          {dealerPartnerMustGoAloneActive(rules) && (
            <p>
              The dealer’s partner may order the dealer up only by going alone. The dealer then sits
              out, and the upcard is set aside.
            </p>
          )}
          {defendAloneActive(rules) && (
            <p>
              Once trump is named, either defender may also choose to play alone against the makers,
              and their partner sits out.
            </p>
          )}
        </Section>
      )}

      <Section title="Scoring">
        <ul className="rules-list">
          <li>Makers take three or four tricks: 1 point.</li>
          <li>Makers take all five (a march): 2 points.</li>
          <li>Makers take fewer than three: they are euchred, and the other team scores 2.</li>
          {rules.lonersAllowed && (
            <li>A loner who takes all five: {rules.lonerSweepPoints} points.</li>
          )}
          {defendAloneActive(rules) && (
            <li>A lone defender who euchres the makers: {LONE_DEFENCE_POINTS} points.</li>
          )}
        </ul>
        <p>The first team to {rules.targetScore} points wins.</p>
      </Section>
    </Page>
  );
}
