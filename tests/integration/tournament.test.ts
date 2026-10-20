import { describe, expect, it } from 'vitest';
import type { BotSpec } from '../../src/bots/bot';
import { formatReport, mergeReports, runMatch, type TeamEntry } from '../../src/session/tournament';

const team = (
  skill: BotSpec['skill'],
  personaId: BotSpec['personaId'] = 'smooth',
  role: BotSpec['role'] = 'opponent'
): TeamEntry => {
  const spec: BotSpec = { role, personaId, skill };
  return { label: `${personaId} (${skill})`, specs: [spec, spec] };
};

/**
 * Fixed-seed strength gates (Implementation Plan, Sprints 4 and 7):
 * Standard must beat Casual, and the partner at Sharp must beat Standard
 * opponents, each by a clear margin. The full tournament
 * (`npm run tournament`, docs/tournaments/sprint-07.md) measures the
 * margins over 10,000 games.
 */
describe('tournament harness', () => {
  it('confirms Standard beats Casual', async () => {
    const report = await runMatch(team('standard'), team('casual'), { games: 200, seed: 11 });
    expect(report.a.wins + report.b.wins).toBe(200);
    expect(report.a.wins / report.games).toBeGreaterThan(0.55);
    expect(report.a.made / report.a.calls).toBeGreaterThan(report.b.made / report.b.calls);
  });

  it('confirms the partner at Sharp beats Standard opponents', { timeout: 180_000 }, async () => {
    const report = await runMatch(team('sharp', 'partner', 'partner'), team('standard'), {
      games: 40,
      seed: 12,
    });
    expect(report.a.wins / report.games).toBeGreaterThan(0.55);
  });

  it('splits a match into shards that merge into the same result', async () => {
    const whole = await runMatch(team('standard'), team('casual'), { games: 6, seed: 5 });
    const shards = await Promise.all(
      [0, 2, 4].map((firstGame) =>
        runMatch(team('standard'), team('casual'), { games: 2, seed: 5, firstGame })
      )
    );
    expect(mergeReports(shards)).toEqual(whole);
  });

  it('is reproducible from its seed and reports every team', async () => {
    const a = await runMatch(team('standard'), team('standard'), { games: 6, seed: 3 });
    const b = await runMatch(team('standard'), team('standard'), { games: 6, seed: 3 });
    expect(a).toEqual(b);
    const text = formatReport(a);
    expect(text).toMatch(/^6 games, \d+ hands, \d+ redeals/);
    expect(text).toContain('smooth (standard)');
    expect(a.hands).toBeGreaterThan(6);
  });
});
