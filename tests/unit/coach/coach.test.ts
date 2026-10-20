import { describe, expect, it } from 'vitest';
import { REASON_CODES } from '../../../src/bots/bot';
import { FOLLOW_RULES, LEAD_RULES } from '../../../src/bots/conventions/cardPlay';
import { DISCARD_RULES } from '../../../src/bots/conventions/discard';
import { partnerConventions } from '../../../src/coach/conventions';
import { hintFor } from '../../../src/coach/hint';
import { REASON_TEXT, renderReason } from '../../../src/coach/reasons';
import { sameAction } from '../../../src/engine/actions';
import { legalActions } from '../../../src/engine/game';
import { toPlayerView } from '../../../src/engine/view';
import { STANDARD_RULES } from '../../../src/engine/rules';
import { act, deckFor, gameFromDeck } from '../../helpers/engine';

const bidding = gameFromDeck();
const ordered = act(bidding, 0, { type: 'orderUp', alone: false });
const playing = act(ordered, 3, { type: 'discard', card: 'AC' });

describe('renderReason (CO-2)', () => {
  it('has one line of text for every reason a bot can give', () => {
    const view = toPlayerView(playing, 0);
    expect(Object.keys(REASON_TEXT).sort()).toEqual([...REASON_CODES].sort());
    for (const code of REASON_CODES) {
      const text = renderReason({ code }, view);
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toContain('\n');
      expect(text).not.toMatch(/undefined|NaN/);
    }
  });

  it('fills in trump and the simulation’s sample count', () => {
    expect(renderReason({ code: 'lead-boss-trump' }, toPlayerView(playing, 0))).toContain(
      'diamond'
    );
    expect(renderReason({ code: 'lead-boss-trump' }, toPlayerView(bidding, 0))).toContain('trump');
    expect(
      renderReason({ code: 'play-simulated', params: { samples: 80 } }, toPlayerView(playing, 0))
    ).toContain('80 ways');
    expect(renderReason({ code: 'play-simulated' }, toPlayerView(playing, 0))).toContain('many');
  });
});

describe('hintFor (CO-1)', () => {
  it('suggests a legal action, with its reason, in every phase', () => {
    for (const [state, seat] of [
      [bidding, 0],
      [ordered, 3],
      [playing, 0],
    ] as const) {
      const legal = legalActions(state, seat);
      const hint = hintFor(toPlayerView(state, seat), legal);
      expect(legal.some((a) => sameAction(a, hint.action))).toBe(true);
      expect(hint.reasonText.length).toBeGreaterThan(10);
    }
  });
});

describe('hintFor under house rules', () => {
  it('suggests the farmer’s swap, defending alone and a forced loner', () => {
    const farmer = gameFromDeck(
      deckFor(
        [
          ['9S', 'TS', '9H', 'TH', '9C'],
          ['JS', 'QS', 'KS', 'AS', 'TC'],
          ['JH', 'QH', 'KH', 'AH', 'JC'],
          ['QC', 'KC', 'AC', '9D', 'TD'],
        ],
        ['JD', 'QD', 'KD', 'AD']
      ),
      3,
      { ...STANDARD_RULES, farmersHand: true }
    );
    expect(hintFor(toPlayerView(farmer, 0), legalActions(farmer, 0))).toMatchObject({
      action: { type: 'farmerExchange', cards: ['9C', '9S', '9H'] },
      code: 'farmer-swap',
    });

    const rules = { ...STANDARD_RULES, defendAlone: true, dealerPartnerMustGoAlone: true };
    let s = act(gameFromDeck(undefined, 3, rules), 0, { type: 'orderUp', alone: false });
    s = act(s, 3, { type: 'discard', card: 'AC' });
    expect(hintFor(toPlayerView(s, 1), legalActions(s, 1)).code).toMatch(/^defend-alone-/);

    const forced = act(gameFromDeck(undefined, 3, rules), 0, { type: 'pass' });
    expect(hintFor(toPlayerView(forced, 1), legalActions(forced, 1)).code).toMatch(
      /^bid-forced-alone|^bid-pass-weak/
    );
  });
});

describe('partnerConventions (UI-6)', () => {
  it('describes every rule the partner plays by, in its order', () => {
    const sections = partnerConventions();
    const codes = sections.flatMap((s) => s.conventions.map((c) => c.code));
    for (const rule of [...DISCARD_RULES, ...LEAD_RULES, ...FOLLOW_RULES]) {
      expect(codes).toContain(rule.id);
    }
    const leading = sections.find((s) => s.title === 'Leading')!;
    expect(leading.conventions.map((c) => c.code)).toEqual(LEAD_RULES.map((r) => r.id));
    expect(sections.at(-1)!.intro).toMatch(/imagines \d+ ways/);
  });
});
