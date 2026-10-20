/**
 * The only public way to construct a bot — Technical Spec §6.8.
 *
 * Resolves a serializable `BotSpec` into a `PolicyBot`: the persona sets
 * the style (and any policy overrides), the skill level sets the card-play
 * policy, the selector and the evaluation noise.
 *
 * Pure module: no DOM, no React, no storage.
 */

import type { Bot, BotSpec } from './bot';
import { conventionalBidding } from './conventions/bidding';
import { conventionalCardPlay } from './conventions/cardPlay';
import { conventionalDiscard } from './conventions/discard';
import { conventionalFarmer } from './conventions/farmer';
import { conventionalLoner } from './conventions/loner';
import { HeuristicEvaluator } from './evaluate';
import { personaById } from './personas';
import { simulatedCardPlay } from './simulate/cardPlay';
import type { PolicySet } from './policies';
import { PolicyBot } from './policyBot';
import { bestSelector, noisySelector } from './selectors';
import { SKILLS } from './skills';

const CONVENTIONAL: PolicySet = {
  bidding: conventionalBidding,
  loner: conventionalLoner,
  farmer: conventionalFarmer,
  discard: conventionalDiscard,
  cardPlay: conventionalCardPlay,
};

const evaluator = new HeuristicEvaluator();

export function createBot(spec: BotSpec): Bot {
  const persona = personaById(spec.personaId);
  const skill = SKILLS[spec.skill];
  return new PolicyBot({
    spec,
    policies: {
      ...CONVENTIONAL,
      ...persona.overrides,
      ...(skill.cardPlay === 'simulated' && skill.simulation
        ? { cardPlay: simulatedCardPlay(skill.simulation) }
        : {}),
    },
    style: persona.style,
    selector:
      skill.selector.kind === 'best'
        ? bestSelector
        : noisySelector(skill.selector.mistakeRate, skill.selector.maxRankDrop),
    evaluator,
    evaluationNoise: skill.evaluationNoise,
  });
}

/** The partner always plays at full strength, whatever the opponents' level (PB-2). */
export const PARTNER_SPEC: BotSpec = { role: 'partner', personaId: 'partner', skill: 'sharp' };
