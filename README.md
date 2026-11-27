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

Hold jump to jump higher. On touchscreens, slide on the D-pad for diagonals and press between A and B to hold both. Landscape overlays the controls on the game. Portrait puts them below.

## Source

`App.tsx` handles the menus, session, and game loop. `src/game` contains the level generator, physics, and pixel art. `src/components` renders the playfield, controls, and score display.

## Photo recovery status

The HEIC photos in `iCloud_1` cover the level generator, game rules, SVG renderer, sprites, and tile art. The generator, engine, and renderer were restored from that sequence and integrated into the Expo app. A second comparison checked the stage chunk parameters, app and control layouts, and the engine code for tile collisions, spawn filtering, stomps, fireballs, and stage completion. Some longer sprite and tile rows, including portions of the boss and plant art, still contain reconstructed pixels where repeated characters were hard to distinguish. The [earlier JPEG transcript](ma-nguon-tu-anh-jpeg.txt) remains available for reference.

The photographed `app.json` names a separate favicon and Android adaptive icon layers. The photos show the filenames but do not contain the PNG files. This checkout uses its existing `assets/icon.png`. The lockfile photos capture only a portion of the generated dependency entries, so this checkout uses its installed Expo dependency set and matching lockfile. The photos show `AGENTS.md` and `.gitignore` in the file tree only.
