# Contributing

Left Bauer is a personal project, but issues and suggestions are welcome.

- **Bugs:** open an issue with the device, the browser, what you did and what happened. A screenshot helps. If you can, include the `?seed=N` from the address bar so the deal can be replayed.
- **Rules and house rules:** say which table plays it that way and how it works there.
- **Pull requests:** open an issue first to talk it over, so the work fits the design.

## Working on the code

Read `CLAUDE.md` for the commands and the architecture, then `docs/TECHNICAL_SPEC.md` for the design. Before you send a change:

- `npm run verify` must pass: lint, typecheck, unit and component tests with 80% coverage, and the Playwright suite on four devices.
- Tests stay silent: every E2E URL uses `?e2e`, and only a test about sound may add `?sound`.
- Keep the layer rules (`eslint.config.js`) and the invariants in `CLAUDE.md`, above all that bots never see the hidden game state.

By contributing, you agree that your work is licensed under the GPL-3.0-or-later, the same as the rest of the project.
