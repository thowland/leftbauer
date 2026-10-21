# Left Bauer

Left Bauer is Euchre for one player: you and a computer partner against two computer opponents, in a browser or installed on a phone as an app. There are no accounts and no advertising, and once it is installed it plays offline.

The name comes from the left bower, the jack that leaves its own suit to become the second-highest trump; "bower" comes from the German _Bauer_, which is what German card games call the jack.

## Playing

The game is at https://leftbauer.beta-site.us. On an iPhone or iPad, open it in Safari and use **Share**, then **Add to Home Screen**; on Android, open it in Chrome and choose **Install app**. Installed, it runs full screen and needs no network after the first visit. The [beta guide](docs/BETA.md) has the details for each device.

Your partner always plays Sharp, against two opponents drawn from Soopy, Shrubs, Rusty, Smooth and Johnny Blue, who plays as one of the other four, drawn at random each game and never revealed. The opponents play at Casual, Standard or Sharp. The house rules are stick the dealer, game to 5, 7, 10 or 11, defending alone, the dealer's partner must go alone, farmer's hand and loner sweeps, and there is an optional four-color deck. Hints, a rules reference, a page on how your partner plays and lifetime stats are all in the app.

## Status

The first release is 0.1.0, the friends beta, which closed Sprint 10 of the [implementation plan](docs/IMPLEMENTATION_PLAN.md) and is what runs at https://leftbauer.beta-site.us. Johnny Blue was added after that release and is listed under Unreleased in the [changelog](CHANGELOG.md).

## Documents

- [Vision](docs/Left%20Bauer%20Vision.md)
- [Requirements](docs/REQUIREMENTS.md)
- [Technical specification](docs/TECHNICAL_SPEC.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Decisions](docs/decisions/)
- [Changelog](CHANGELOG.md), [credits](CREDITS.md), [contributing](CONTRIBUTING.md) and [security](SECURITY.md)

## Development

Development requires Node 22 or later.

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

A husky `pre-merge-commit` hook runs `npm run verify` before every merge commit, so a branch with a failing gate cannot be merged.

## Deployment

The site is static, served from S3 behind CloudFront at `leftbauer.beta-site.us` (ADR-0006). Copy `deploy.env.example` to `deploy.env` and fill in the hosted zone, then run:

```bash
npm run infra:deploy   # create or update the CloudFormation stack (infra/left-bauer.yaml)
npm run deploy         # run the gate, build and publish (SKIP_VERIFY=1 skips the gate)
npm run icons          # re-render the PNG icons after editing public/icon.svg
```

## Layout

```
src/
  util/      Rng and hashing (pure)
  engine/    Euchre rules (pure)
  bots/      Bot interface, policies and personas (pure)
  coach/     Hints and the partner's conventions (pure)
  session/   TableDriver, seat controllers, pacing (pure, no DOM)
  state/     Saved game, settings and stats (pure)
  workers/   The bot Web Worker (pure)
  assets/    Card presentation data (pure)
  themes/    CSS-variable palettes and motion timings (pure)
  audio/     Sound playback
  ui/        React components
tests/
  unit/  component/  integration/  e2e/
```

ESLint enforces the layer boundaries from Technical Spec §3.1; the rules are in `eslint.config.js`.

## License

Left Bauer is copyright 2026 Tim Howland and is licensed under GPL-3.0-or-later. See [LICENSE](LICENSE).
