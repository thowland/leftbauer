/**
 * Bot tournament — Technical Spec §11.3.
 *
 *   npm run tournament -- --games=10000 --seed=7 --jobs=12 --out=docs/tournaments/sprint-07.md
 *
 * Confirms the difficulty ordering (Sharp > Standard > Casual), that the
 * partner team at Sharp beats every opponent at Standard, and how each
 * persona compares with the by-the-book baseline. Each match is split
 * into ranges of games run in parallel child processes; the merged
 * result is identical to one long run.
 */
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { BotSpec, PersonaId, SkillLevel } from '../src/bots/bot';
import { SKILLS } from '../src/bots/skills';
import {
  formatReport,
  mergeReports,
  runMatch,
  type MatchReport,
  type TeamEntry,
} from '../src/session/tournament';

interface Shard {
  readonly a: TeamEntry;
  readonly b: TeamEntry;
  readonly games: number;
  readonly firstGame: number;
  readonly seed: number;
}

const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

// A child process runs one shard and prints its report as JSON.
const shardArg = arg('shard');
if (shardArg !== undefined) {
  const { a, b, games, firstGame, seed } = JSON.parse(shardArg) as Shard;
  process.stdout.write(JSON.stringify(await runMatch(a, b, { games, seed, firstGame })));
  process.exit(0);
}

const games = Number(arg('games') ?? 400);
const seed = Number(arg('seed') ?? 1);
const jobs = Number(arg('jobs') ?? Math.max(1, availableParallelism() - 2));
const out = arg('out');

const team = (personaId: PersonaId, skill: SkillLevel, role: BotSpec['role'] = 'opponent') => {
  const spec: BotSpec = { role, personaId, skill };
  return { label: `${personaId} (${skill})`, specs: [spec, spec] } satisfies TeamEntry;
};

function runShard(shard: Shard): Promise<MatchReport> {
  const script = fileURLToPath(import.meta.url);
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', script, `--shard=${JSON.stringify(shard)}`],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    let json = '';
    child.stdout.on('data', (chunk: Buffer) => (json += chunk.toString()));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve(JSON.parse(json) as MatchReport) : reject(new Error(`shard ${code}`))
    );
  });
}

async function match(a: TeamEntry, b: TeamEntry): Promise<MatchReport> {
  const shards: Shard[] = [];
  const size = Math.ceil(games / jobs);
  for (let first = 0; first < games; first += size) {
    shards.push({ a, b, games: Math.min(size, games - first), firstGame: first, seed });
  }
  return mergeReports(await Promise.all(shards.map(runShard)));
}

/** Win rate with a 95% confidence interval. */
function verdict(report: MatchReport): string {
  const p = report.a.wins / report.games;
  const margin = 1.96 * Math.sqrt((p * (1 - p)) / report.games);
  const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
  const call = p - margin > 0.5 ? 'stronger' : p + margin < 0.5 ? 'weaker' : 'no clear difference';
  return `${report.a.label} wins ${pct(p)} (95% CI ${pct(p - margin)}–${pct(p + margin)}): ${call}`;
}

const sections: { title: string; report: MatchReport; seconds: number }[] = [];
async function play(title: string, a: TeamEntry, b: TeamEntry) {
  const start = Date.now();
  const report = await match(a, b);
  const seconds = (Date.now() - start) / 1000;
  sections.push({ title, report, seconds });
  console.log(`## ${title}\n\n${formatReport(report)}\n${verdict(report)}\n`);
}

const smooth = (skill: SkillLevel) => team('smooth', skill);
await play('Sharp against Standard', smooth('sharp'), smooth('standard'));
await play('Standard against Casual', smooth('standard'), smooth('casual'));
await play('Sharp against Casual', smooth('sharp'), smooth('casual'));
for (const opponent of ['soopy', 'shrubs', 'rusty', 'smooth'] as const) {
  await play(
    `The partner (Sharp) against ${opponent} (Standard)`,
    team('partner', 'sharp', 'partner'),
    team(opponent, 'standard')
  );
}

if (out !== undefined) {
  const { samples, timeBudgetMs } = SKILLS.sharp.simulation!;
  const body = sections
    .map(
      ({ title, report, seconds }) =>
        `## ${title}\n\n\`\`\`\n${formatReport(report)}\n\`\`\`\n\n${verdict(report)}. (${seconds.toFixed(0)} s)\n`
    )
    .join('\n');
  writeFileSync(
    out,
    `# Tournament report\n\nGenerated with \`npm run tournament -- --games=${games} --seed=${seed}\` on ${new Date().toISOString().slice(0, 10)}. ` +
      `Sharp samples ${samples} deals per card decision (time budget ${timeBudgetMs} ms). ` +
      'Teams swap seats every game and the first dealer rotates. "Calls" counts hands where the team made trump; "Made" is the share of those it made; "Euchres" counts euchres the team inflicted; "Loners" is made / attempted. The interval is a 95% confidence interval on the win rate.\n\n' +
      body
  );
  console.log(`Wrote ${out}`);
}
