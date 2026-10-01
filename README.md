# LAST FLOOR

A dark sci-fi arcade roguelite about climbing a mysterious 100-floor tower.

## V1

The current build focuses on a strong playable core instead of 100 hand-authored floors.

Implemented:
- 100-floor procedural architecture with deterministic seeds.
- Standard runs and a deterministic Daily Run.
- Five playable room types: Puzzle, Combat, Escape, Challenge and Memory.
- Four boss floors: 25 / 50 / 75 / 100.
- Lives, checkpoints, combo, score and risk/reward modifiers.
- Coins, shards and keys.
- Permanent upgrades: Health, Speed, Shield, Luck, Energy.
- Two-slot ability loadout: Dash, Shield, Time, Pulse, Scan.
- Achievements, cosmetics, profile statistics and options.
- LocalStorage save format with versioning.
- Synthesized browser audio feedback with no external audio dependency.
- Desktop keyboard controls and touch controls for mobile.
- Responsive sci-fi presentation designed to read as a game, not a dashboard.

## Run locally

Requires Node.js 20.9+.

npm install
npm run dev

Then open http://localhost:3000.

For a production check:

npm run typecheck
npm run build
npm start

## Deploy on Vercel

Import ilanjue201293-stack/Last-floor into Vercel. No environment variables are required for V1.

Vercel detects Next.js automatically and uses the build script from package.json.

## Project structure

- app/ — Next.js App Router routes.
- components/ — game presentation and screens.
- game/types.ts — domain types.
- game/data.ts — zones, rooms, abilities, modifiers, upgrades, cosmetics and achievements.
- game/floor-generator.ts — deterministic floor generation.
- game/save.ts — versioned local save system.
- game/audio.ts — lightweight procedural feedback audio.

## Next content layer

The architecture is ready for room variants, enemy families, boss phases, events, secrets, items and authored set-pieces without rewriting the run loop.
