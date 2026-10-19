# ADR-0002: The game loop lives outside React

**Status:** Accepted
**Date:** 2026-10-19
**Sprint:** 3

## Context

Gammon runs its game loop as a reducer inside a React provider, with an effect that drives the AI. Left Bauer needs the same loop in four places: the app, the integration tests, the tournament harness (Sprint 4) and, eventually, a multiplayer host (Phase 3). Bots will also run in a Web Worker (Sprint 7).

## Decision

- A plain TypeScript `TableDriver` in `src/session/` owns the loop: ask the seat to act, apply through the engine, emit events to sinks, pace bot turns, wait for the hand summary to be acknowledged, deal on.
- Every seat is a `SeatController` (`HumanSeatController`, `BotSeatController`; `RemoteSeatController` later). The driver never knows which kind it is talking to, except to pace bots.
- React reads the driver with `useSyncExternalStore(driver.subscribe, driver.snapshot)` and sends the human's choices to `HumanSeatController.submit`, which ignores anything not currently legal.
- All waiting (human input, bot decisions, pacing, the hand summary) is cancellable through an `AbortSignal`. Every `await` in the loop re-checks its signal, so a stopped run can never publish or act again. This matters because React StrictMode stops and immediately restarts the driver in development; a regression test covers it.
- A stopped driver resumes from its current state with `start()`, which is also how a saved game will resume in Sprint 5.

## Consequences

- The same driver runs the app, the tests (with an immediate scheduler and `autoContinue`) and the tournament harness.
- Side effects (audio, animation, stats, saving) will attach as `EventSink`s rather than as diffs of React state.
- The UI receives the full `GameState` in the snapshot but renders only the human's `PlayerView`; dev mode is the one place that reveals hidden hands.
