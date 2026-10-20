import { describe, expect, it } from 'vitest';
import {
  dealerPartnerMustGoAloneActive,
  defendAloneActive,
  isRuleSet,
  STANDARD_RULES,
} from '../../../src/engine/rules';

describe('rule set', () => {
  it('defaults to standard rules with every optional rule off', () => {
    expect(STANDARD_RULES).toEqual({
      targetScore: 10,
      stickTheDealer: false,
      lonersAllowed: true,
      lonerSweepPoints: 4,
      defendAlone: false,
      dealerPartnerMustGoAlone: false,
      farmersHand: false,
    });
  });

  it('recognizes valid rule sets and rejects malformed ones', () => {
    expect(isRuleSet(STANDARD_RULES)).toBe(true);
    expect(isRuleSet({ ...STANDARD_RULES, targetScore: 5, lonerSweepPoints: 5 })).toBe(true);
    expect(isRuleSet(null)).toBe(false);
    expect(isRuleSet({ ...STANDARD_RULES, targetScore: 8 })).toBe(false);
    expect(isRuleSet({ ...STANDARD_RULES, lonerSweepPoints: 3 })).toBe(false);
    expect(isRuleSet({ ...STANDARD_RULES, farmersHand: null })).toBe(false);
  });

  it('turns the alone house rules off along with loners (RU-16)', () => {
    const all = { ...STANDARD_RULES, defendAlone: true, dealerPartnerMustGoAlone: true };
    expect(defendAloneActive(all)).toBe(true);
    expect(dealerPartnerMustGoAloneActive(all)).toBe(true);
    const noLoners = { ...all, lonersAllowed: false };
    expect(defendAloneActive(noLoners)).toBe(false);
    expect(dealerPartnerMustGoAloneActive(noLoners)).toBe(false);
  });
});
