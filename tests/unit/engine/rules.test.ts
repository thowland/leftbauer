import { describe, expect, it } from 'vitest';
import {
  assertSupportedRules,
  STANDARD_RULES,
  UnsupportedRuleError,
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
      farmersHand: null,
    });
  });

  it('accepts the rules implemented so far', () => {
    expect(() =>
      assertSupportedRules({
        ...STANDARD_RULES,
        stickTheDealer: true,
        lonersAllowed: false,
        lonerSweepPoints: 5,
        targetScore: 5,
      })
    ).not.toThrow();
  });

  it.each(['defendAlone', 'dealerPartnerMustGoAlone'] as const)(
    'rejects %s until Sprint 9',
    (rule) => {
      expect(() => assertSupportedRules({ ...STANDARD_RULES, [rule]: true })).toThrow(
        UnsupportedRuleError
      );
    }
  );
});
