# Left Bauer

An installable, browser-based Euchre game for one player against three computer players, one of them your partner. No accounts, no advertising, and it plays offline once installed.

The name comes from the left bower, the jack that leaves its own suit to become the second-highest trump. "Bower" comes from the German _Bauer_, the name for the jack in German card games.

> **Status:** Sprint 7 of the [implementation plan](docs/IMPLEMENTATION_PLAN.md). Play a full game, with animation and sound, alongside a Sharp partner against two of four named opponents at Casual, Standard or Sharp.

## Documents

- [Vision](docs/Left%20Bauer%20Vision.md)
- [Requirements](docs/REQUIREMENTS.md)
- [Technical specification](docs/TECHNICAL_SPEC.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Decisions](docs/decisions/)

## Development

Requires Node 22 or later.

```bash
npm install
npx playwright install webkit chromium   # first time only
npm run dev                              # http://localhost:5173
npm run dev -- --host                    # also reachable from a phone on the same network
```

| Command                 | What it does                                                             |
| ----------------------- | ------------------------------------------------------------------------ |
| `npm run lint`          | ESLint (including layer-boundary rules) and the Prettier check           |
| `npm run typecheck`     | `tsc -b`                                                                 |
| `npm test`              | Unit, component and integration tests                                    |
| `npm run test:coverage` | The same, failing below 80% on lines, statements, functions or branches  |
| `npm run test:e2e`      | Playwright on iPhone, iPhone landscape, iPad (WebKit) and desktop Chrome |
| `npm run verify`        | All of the above, in order: the sprint exit gate                         |

`npm run verify` also runs automatically before every merge commit (a husky `pre-merge-commit` hook), so a sprint branch cannot be merged with a failing gate.

## Layout

```
src/
  util/      Rng and hashing (pure)
  engine/    Euchre rules (pure)
  bots/      Bot interface and bots (pure)
  session/   TableDriver, seat controllers, pacing (pure, no DOM)
  assets/    Card presentation data (pure)
  themes/    CSS-variable palettes (pure)
  ui/        React components
tests/
  unit/  component/  integration/  e2e/
```

Layer boundaries from Technical Spec §3.1 are enforced by ESLint; see `eslint.config.js`.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
