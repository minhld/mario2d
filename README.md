# Super Plumber

Super Plumber is a pixel-art, 2D side-scrolling platformer for browsers, iOS, and Android. Jump over gaps, dodge enemies, and collect coins and power-ups as you race the clock to the end of each stage.

Play through 10 worlds with four generated stages each. Every world takes you from the overworld through an underground stage and a platforming course before ending in a castle. Reach the flagpole in the first three stages and grab the axe to clear the castle.

## Run locally

```sh
npm ci
npm run web
```

To play on an iOS or Android phone or tablet, run `npm start` and open the development server in an Expo Go version compatible with SDK 58. Use `npm run ios` or `npm run android` with a configured simulator or emulator. Keep the computer and the device on the same network.

`npm run typecheck` checks the TypeScript source. `npm run build` exports the web site and both native JavaScript bundles to `dist/`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move or crouch | Arrows or WASD | Direction pad |
| Jump | Z, Space, or K | A |
| Run or throw a fireball with the fire power-up | X, Shift, or J | B |
| Pause | P or Escape | Pause button |

Hold jump to jump higher. On touchscreens, you can hold a direction and jump at the same time.

## Source

`App.tsx` handles the menus, session, and game loop. `src/game` contains the level generator, physics, and pixel art. `src/components` renders the playfield, controls, and score display.

## Photo recovery status

The [JPEG transcript](ma-nguon-tu-anh-jpeg.txt) records the photographed source by file and image. The app entry point, TypeScript config, and package versions were checked against the photos. This workspace also includes a Metro web dependency and local build and type-check scripts.

The game uses the photographed menus, HUD layout, controls, hero frames, walking and jumping constants, animation timing, camera movement, timer, and level seed function. The recovered movement uses the current collision system.

| Needed for the original version | Reference photos | What to look for |
| --- | --- | --- |
| `src/game/engine.ts` | 2093–2105 | Original entity and collision code, block bumps and effects, enemy interactions, and end-of-stage sequences. |
| `src/game/levels.ts` | 2106–2111 | Full stage generator. Several long lines are split by OCR or obscured by editor overlays. |
| `src/components/GameView.tsx` | 2089–2091 | Original renderer, especially decorations, entity drawing, and section caching. |
| `src/game/sprites.ts` | 2115–2120 | Original enemy, item, and effect pixel rows. The repeated characters are easy for OCR to misread. |
| `src/game/tiles.ts` | 2121–2124 | Tile palettes and pixel rows. A tooltip covers the palette declarations in 2121. |
| `src/components/Hud.tsx`, `src/input.ts` | 2092, 2125 | Tooltip covers parts of the WORLD and TIME labels and input initialization. The current project has working values there. |
| `assets/` | 2126, 2134 | Original `icon.png`, `favicon.png`, `splash-icon.png`, and three `android-icon-*.png` files. Only names are visible. |
| `package-lock.json`, `.gitignore`, `AGENTS.md` | Project sidebar | The original contents are not visible. The lockfile and ignore file in this workspace were generated for this restored project. |
