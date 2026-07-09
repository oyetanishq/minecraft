# Minecraft Web — Survival Lite

A browser-based, Minecraft-style voxel game built from scratch with **React + Vite + TypeScript + Three.js + TailwindCSS v4 + Zustand + React Router**.

Procedurally-generated infinite terrain with biomes, day/night, walking + flying physics, and block break/place — all rendered by an imperative Three.js engine, with React handling only the 2D UI.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Other scripts: `pnpm build` (typecheck + production build), `pnpm preview`, `pnpm typecheck`.

## Controls

| Input | Action |
| --- | --- |
| Click canvas | Lock mouse / play |
| `W A S D` | Move |
| Mouse | Look |
| `Space` | Jump (double-tap = toggle fly) |
| `F` | Toggle fly |
| `Ctrl` | Sprint |
| `Shift` | Descend (while flying) |
| Left click | Break block |
| Right click | Place block |
| `1`–`9` / scroll | Select hotbar slot |
| `F3` | Debug overlay + FPS panel |
| `Esc` | Pause |

## Features

- **Procedural world** — multi-octave simplex-noise terrain, 6 biomes (ocean, plains, forest, desert, mountains, snowy), water bodies, sandy beaches, seamless cross-chunk trees.
- **Chunked voxel engine** — 16×128×16 chunks streamed around the player; generation + face-culling/ambient-occlusion meshing run in a **Web Worker pool** with zero-copy transferables.
- **Physics** — swept-AABB collision, gravity, jumping, and a creative fly mode.
- **Building** — DDA voxel raycasting for targeting; break/place with immediate re-meshing.
- **Day/night cycle** — orbiting sun, shifting sky/fog colours, hemisphere lighting.
- **Procedural textures** — original 16×16 pixel-art atlas generated in code (no assets).
- **HUD** — hotbar, health, crosshair, F3 debug overlay, pause menu with in-place settings.

## Architecture

React renders **only** the UI overlay (menus, HUD); the game world is driven imperatively by a Three.js `Engine` in a `requestAnimationFrame` loop. Zustand bridges the two — the engine mirrors a low-frequency slice of state (health, hotbar, throttled position/FPS) into stores the React HUD subscribes to. This avoids reconciling thousands of chunk meshes through React every frame.

```
src/
  engine/    engine loop, chunk manager, player, physics, raycast, sky, worker pool
  workers/   chunk.worker + generation & meshing algorithms (run off-thread)
  world/     block registry, biome definitions
  textures/  procedural pixel-art atlas
  state/     zustand stores (game + player)
  routes/    main menu, game screen, settings
  ui/        hotbar, crosshair, health bar, debug overlay, pause menu
```

## Notes

- Uses `pnpm`, kebab-case filenames, and the `@/` → `src/` import alias.
- No StrictMode (it would double-mount the WebGL engine in dev).
- Not yet implemented (scoped out of v1): crafting, mobs, world save/load, audio, multiplayer.
