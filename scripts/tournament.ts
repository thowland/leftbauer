/**
 * Bot tournament — Technical Spec §11.3.
 *
 *   npm run tournament -- --games=400 --seed=1
 *
 * Each persona (at Standard) plays the by-the-book baseline, then the
 * difficulty levels play each other.
 */
import type { BotSpec, PersonaId, SkillLevel } from '../src/bots/bot';
import { PERSONAS } from '../src/bots/personas';
import { formatReport, runMatch, type TeamEntry } from '../src/session/tournament';

const arg = (name: string, fallback: number) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? Number(found.split('=')[1]) : fallback;
};
const games = arg('games', 200);
const seed = arg('seed', 1);

const team = (personaId: PersonaId, skill: SkillLevel): TeamEntry => {
  const spec: BotSpec = { role: 'opponent', personaId, skill };
  return { label: `${personaId} (${skill})`, specs: [spec, spec] };
};

const baseline = team('smooth', 'standard');
for (const persona of PERSONAS.filter((p) => p.id !== 'smooth')) {
  console.log(
    formatReport(await runMatch(team(persona.id, 'standard'), baseline, { games, seed }))
  );
  console.log();
}
console.log(formatReport(await runMatch(baseline, team('smooth', 'casual'), { games, seed })));
