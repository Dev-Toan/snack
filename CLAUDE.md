# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Classic snake game ("Rắn Săn Mồi") built with Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript 6 (`strict`). One screen, no navigation, no backend. The README, code comments, test names and all UI copy are in Vietnamese; keep that convention when adding code or text. Audio is `expo-audio` (not `expo-av`).

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm start`, or `npm run android` / `npm run ios` / `npm run web` |
| All tests | `npm test` |
| One test file | `npx jest src/__tests__/loop.test.ts` |
| One test by name | `npx jest src/__tests__/engine.test.ts -t "đâm tường"` |
| Typecheck | `npx tsc --noEmit` (no npm script for it) |
| Check deps against SDK 57 | `npx expo install --check` |
| Regenerate sound assets | `node scripts/gen-sfx.js` (synthesizes `assets/sfx/*.wav`, no external assets) |

There is no lint script or ESLint config. Jest uses the `jest-expo` preset with `testEnvironment: 'node'` and only matches `**/__tests__/**/*.test.ts`, so component (`.tsx`) tests are not picked up unless `jest.config.js` is changed.

`babel-preset-expo` is declared as a devDependency on purpose, even though `expo` depends on it: npm nests expo's copy under `node_modules/expo/node_modules`, and `babel.config.js` cannot resolve it from there, which breaks every Jest run. Do not remove it. Keep its range in step with the `expo` package's own dependency range.

## Architecture

Three layers with a strict dependency direction (UI → hook → pure logic). Game rules and loop behaviour belong in the pure layer and are tested there; the hook only adapts them to React; the UI renders state and forwards input.

### Pure logic: `src/engine.ts`, `src/loop.ts`, `src/progression.ts`, `src/constants.ts`

- No React, no side effects, no timers. Randomness is an injectable `rng` (defaults to `Math.random`) so tests are deterministic.
- `engine.ts`: `stepSnake(snake, dir, food)` returns `{ snake, ate, dead }` and never throws; on death it returns the *unchanged* snake. Collision rule: when not eating, the tail is dropped **before** the self-collision check, so moving into the cell the tail is vacating is legal. `resolveDirection` is the single place that rejects 180° reversals at step time.
- `loop.ts`: the whole simulation of one run as an immutable `Sim` value. `enqueueDirection` is the input queue (capped at `MAX_INPUT_BUFFER`, rejects duplicates and reversals relative to the **last queued** direction, not the current one). `runFrame(sim, dtMs, rng)` accumulates delta time, runs as many steps as `tickForScore` allows, re-reads the tick after every step (eating can speed the snake up mid-frame), stops on death, and caps at `MAX_STEPS_PER_FRAME` while discarding leftover time. Multi-step frames must advance the snake multiple cells; there is a regression test for that.
- `constants.ts` is both config and game-design data: grid size, speed curve, colors, AsyncStorage keys (all prefixed `@snake/`), combo tuning, `SKINS`, `MISSIONS`, and the shared `Point` / `Direction` types. `COMBO_WINDOW_STEPS` is measured in steps, not milliseconds, so combo difficulty does not change as the snake speeds up.
- `progression.ts`: `computeCombo(prevCombo, stepsSinceLastEat)` and mission progress (`mergeProgress`, `unlockedSkinIds`, `newlyCompleted`). `relaxEats` missions accumulate across runs; `max*Run` missions keep the best single run.

### Hook: `src/useSnakeGame.ts`

- A thin adapter. The authoritative `Sim` lives in `simRef` and is updated synchronously inside the `requestAnimationFrame` callback; React state (`GameState`: `snake, food, score, best, status`) is only a render snapshot, written at most once per frame. Never read game state from React state inside the loop: that was the cause of a bug where multi-step frames repeated the same step and drained the input queue.
- `status: idle | running | paused | over`. A `useEffect` on `status` starts/stops the loop and zeroes the accumulator on resume so paused time is never replayed. An `AppState` listener auto-pauses when the app leaves the foreground.
- Best score lives in `bestRef` and is written to AsyncStorage (fire-and-forget) whenever it is beaten.

### UI: `App.tsx`, `src/GameBoard.tsx`

- `App.tsx` computes a square board from window dimensions and shows start/over/paused overlays keyed on `status`. Swipes are decided on the first move past `SWIPE_THRESHOLD_PX`, one direction per touch, without waiting for release; the board wrapper claims touches at start (overlay `Pressable`s still win). The D-pad fires on `onPressIn`, not `onPress`, for the same latency reason.
- `GameBoard` is `React.memo`'d; segments are absolutely positioned from `cell = size / COLS` and keyed by cell coordinate, so a step only mounts the new head and unmounts the tail instead of recreating every segment. The grid lines are a separate memo keyed only on `size`.

### Side effects: `src/effects.ts`

Wraps `expo-haptics` as fire-and-forget calls that no-op on web and swallow all errors. Follow the same pattern for sound: effects must never throw into the game loop, and the pure layer must never call them.

## Work in progress (uncommitted; delete this section once it lands)

The working tree contains additions that are **not wired in yet**, so do not assume they are live:

- `constants.ts` defines combo tuning, `SKINS` (with `unlockMission`), `MISSIONS`, and storage keys for skin, missions and a "relax" (no speed-up) mode.
- `src/progression.ts` (tested) and `src/effects.ts` exist but nothing imports them. `GameBoard` still reads `COLORS`, not the active skin. The hook has no combo counter, relax mode or mission tracking.
- `expo-audio` and `expo-haptics` are in `package.json`, `expo-audio` in `app.json` plugins, and `assets/sfx/{eat,combo,death}.wav` exist, but no code plays them.
- `README.md` still states the game intentionally has no sound; update it when this work lands.
