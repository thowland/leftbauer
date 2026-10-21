# Contributing

Left Bauer is a personal project, but issues and suggestions are welcome, and the notes below say what makes each kind most useful.

## Issues

- **Bugs:** give the device, the browser, what you did and what happened, with a screenshot if you have one. If the address bar shows a `?seed=N`, include it, because the same seed replays the same deals.
- **Rules and house rules:** say which table plays it that way and how it works there, since house rules differ from one table to the next.
- **Pull requests:** open an issue first so we can talk it over; a change that fits the design is much easier to take than one that has to be reworked after the fact.

## Working on the code

Start with `CLAUDE.md` for the commands and the architecture, then `docs/TECHNICAL_SPEC.md` for the design. A change is ready to send when it meets these conditions:

- `npm run verify` passes. That covers lint, the typecheck, the unit, component and integration tests at 80% coverage, and the Playwright suite on four device projects.
- The tests stay silent: every E2E URL uses `?e2e`, and only a test about sound may add `?sound`.
- The layer rules in `eslint.config.js` and the invariants in `CLAUDE.md` still hold. The one that matters most is that bots never see the hidden game state; they get a `PlayerView` and the legal actions, and nothing else.

## License

By contributing, you agree that your work is licensed under GPL-3.0-or-later, the same as the rest of the project.
