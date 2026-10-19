import { describe, expect, it } from 'vitest';
import type { BotSpec } from '../../src/bots/bot';
import { formatReport, runMatch, type TeamEntry } from '../../src/session/tournament';

const team = (skill: BotSpec['skill']): TeamEntry => {
  const spec: BotSpec = { role: 'opponent', personaId: 'smooth', skill };
  return { label: `smooth (${skill})`, specs: [spec, spec] };
};

/**
 * A fixed-seed strength gate (Implementation Plan, Sprint 4): Standard
 * must beat Casual by a clear margin. The full tournament
 * (`npm run tournament`) shows about 64% over 1,000 games.
 */
describe('tournament harness', () => {
  it('confirms Standard beats Casual', async () => {
    const report = await runMatch(team('standard'), team('casual'), { games: 200, seed: 11 });
    expect(report.a.wins + report.b.wins).toBe(200);
    expect(report.a.wins / report.games).toBeGreaterThan(0.55);
    expect(report.a.made / report.a.calls).toBeGreaterThan(report.b.made / report.b.calls);
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
