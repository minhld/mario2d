import { makeSprite, rowsToRuns, runPath, type Palette, type Sprite } from './sprites';
import type { Theme } from './levels';

const COMMON: Palette = {
  K: '#000000', W: '#fcfcfc', w: '#bcbcbc', s: '#7c7c7c',
  q: '#7c3c00', e: '#b0542a', G: '#00a800', g: '#b8f818', h: '#005800',
  L: '#d82800', l: '#fca044', Y: '#fcbc3c', t: '#e8a060', u: '#a05020',
  j: '#51954b', k: '#7ab84f', v: '#b5d96a', z: '#376e42', a: '#c08a4e', d: '#4e3424', b: '#a66939', f: '#704725',
};

export const THEME_PALETTES: Record<Theme, Palette> = {
  overworld: { ...COMMON, O: '#c84c0c', P: '#fcbcb0', D: '#3c1800' },
  athletic: { ...COMMON, O: '#c84c0c', P: '#fcbcb0', D: '#3c1800' },
  underground: { ...COMMON, O: '#00788c', P: '#9cfcf0', D: '#002838' },
  castle: { ...COMMON, O: '#8c8c8c', P: '#dcdcdc', D: '#383838' },
};

export const QBLOCK_COLORS = ['#fca044', '#fca044', '#fca044', '#e07020', '#c84c0c', '#e07020'];

const grid = (fn: (x: number, y: number) => string, w = 16, h = 16) =>
  Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => fn(x, y)).join(''));

const GROUND = [
  'PPPPPPPPPDPPPPPP',
  'POOOOOOOODPOOOOD',
  'POOOOOOOODPOOOOD',
  'POOOOOOOODPOOOOD',
  'POOOOOOOODPOOOOD',
  'POOOOOOOODDPOOOD',
  'POOOOOOOODPDDOOD',
  'POOOOOOODPPPDDDD',
  'POOOOOOODPOOOOOD',
  'DDOOOOOODPOOOOOD',
  'PPDDOOOODPOOOOOD',
  'POOPDDDDPOOOOOOD',
  'POOOPPPDPOOOOOOD',
  'POOOOOPDPOOOOOOD',
  'POOOOOPDPOOOOODD',
  'PDDDDDDDPDDDDDDD',
];
const BRICK = [
  'PPPPPPPPPPPPPPPP',
  'OOOOOOODOOOOOOOD',
  'OOOOOOODOOOOOOOD',
  'OOOOOOODOOOOOOOD',
  'DDDDDDDDDDDDDDDD',
  'OOODOOOOOOODOOOO',
  'OOODOOOOOOODOOOO',
  'OOODOOOOOOODOOOO',
  'DDDDDDDDDDDDDDDD',
  'OOOOOOODOOOOOOOD',
  'OOOOOOODOOOOOOOD',
  'OOOOOOODOOOOOOOD',
  'DDDDDDDDDDDDDDDD',
  'OOOOOOOOOOODOOOO',
  'OOOOOOOOOOODOOOO',
  'DDDDDDDDDDDDDDDD',
];
const QUESTION = [
  '.qqqqqqqqqqqqqq.',
  'qQQQQQQQQQQQQQQK',
  'qQKQQQQQQQQQQKQK',
  'qQQQQQqqqqQQQQQK',
  'qQQQqqKKKqqQQQQK',
  'qQQQqqKQQqqKQQQK',
  'qQQQQKKQQqqKQQQK',
  'qQQQQQQQqqKKQQQK',
  'qQQQQQQqqKKQQQQK',
  'qQQQQQQqqKQQQQQK',
  'qQQQQQQQKKQQQQQK',
  'qQQQQQQqqQQQQQQK',
  'qQQQQQQqqKQQQQQK',
  'qQKQQQQQKKQQQKQK',
  'qQQQQQQQQQQQQQQK',
  'KKKKKKKKKKKKKKKK',
];
const USED = grid((x, y) => {
  if ((x === 0 || x === 15) && (y === 0 || y === 15)) return '.';
  if (x === 0 || y === 0 || x === 15 || y === 15 || ((x === 2 || x === 13) && (y === 2 || y === 13))) return 'K';
  return 'e';
});
const HARD = grid((x, y) => {
  const b = 15 - y, r = 15 - x;
  const m = Math.min(x, y, b, r);
  return m >= 4 ? 'O' : m === b || m === r ? 'D' : 'P';
});

function pipeShade(x: number, x0: number, x1: number) {
  if (x === x0 || x === x1) return 'K';
  const rel = (x - x0) / (x1 - x0);
  if (rel < 0.12) return 'G';
  if (rel < 0.3) return 'g';
  if (rel < 0.38) return 'G';
  if (rel < 0.45) return 'g';
  return rel < 0.75 ? 'G' : 'h';
}
const pipeLip = (ox: number) => grid((x, y) => y === 0 || y === 15 ? 'K' : pipeShade(x + ox, 0, 31));
const pipeBody = (ox: number) => grid(x => x + ox < 2 || x + ox > 29 ? '.' : pipeShade(x + ox, 2, 29));
const COIN_TILE = grid((x, y) => {
  const dx = (x - 7.5) / 5, dy = (y - 7.5) / 7.5;
  const d = dx * dx + dy * dy;
  if (d > 1) return '.';
  if (d > 0.65) return 'q';
  return x === 6 && Math.abs(y - 7.5) < 4 ? 'W' : 'Y';
});
const LAVA_TOP = grid((x, y) => {
  const wave = 2 + Math.round(Math.sin(x / 16 * Math.PI * 2) * 1.5);
  if (y < wave) return '.';
  if (y < wave + 2) return 'l';
  return (x * 5 + y * 3) % 13 === 0 ? 'l' : 'L';
});
const LAVA = grid((x, y) => (x * 5 + y * 3) % 13 === 0 ? 'l' : 'L');
const BRIDGE = grid((x, y) => {
  if (y < 3) return (x + y) % 4 === 0 ? 'w' : '.';
  if (y === 3 || y === 9) return 'K';
  return y < 9 ? x % 8 === 7 ? 'K' : 'e' : '.';
});
const AXE = [
  '....WWWW........',
  '..WWWWWWWW......',
  '.WWWWWWWWWWK....',
  '.WWWWWWWWWKuK...',
  'WWWWWWWWWWKuK...',
  'WWWWWWWWWWKKuK..',
  '.WWWWWWWWW..uK..',
  '..WWWWWWW...uK..',
  '....WWW.....uuK.',
  '............uuK.',
  '............uuK.',
  '............uuK.',
  '............uuK.',
  '............uuK.',
  '............uuK.',
  '............KKK.',
];
// Overlapping clusters form the canopy. Light comes from the upper left.
const leafClusters = [
  [4, 7, 5, 5], [8, 3, 6, 5], [14, 6, 6, 6], [11, 10, 7, 5], [3, 11, 4, 3],
] as const;
const treeTop = (kind: '<' | 'T' | '>') => grid((x, y) => {
  const edgeX = kind === '>' ? 15 - x : x;
  const outer = kind !== 'T';
  const crest = [0, 1, 2, 2, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0];
  const top = outer && edgeX < 6 ? [6, 4, 3, 2, 1, 1][edgeX] : crest[edgeX];
  const bottom = outer && edgeX < 6 ? [9, 11, 12, 13, 14, 14][edgeX] : 15;
  if (y < top || y > bottom) return '.';
  let shade = y > 10 ? 'z' : 'j';
  for (const [cx, cy, rx, ry] of leafClusters) {
    const dx = (edgeX - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const light = -dy - dx * 0.45;
    shade = light > 0.55 ? 'v' : light > -0.18 ? 'k' : 'j';
  }
  return shade;
});

function treeTrunk(row: number, height: number) {
  return grid((x, y) => {
    const depth = row * 16 + y;
    const spread = depth >= height - 6 ? Math.floor((depth - height + 6) / 2) : 0;
    const shoulder = Math.max(0, 3 - depth);
    const left = 3 - spread - shoulder, right = 12 + spread + shoulder;
    if (x < left || x > right) return '.';
    if (x === left || x === right) return 'd';
    if (x === 6 + Math.round(Math.sin(depth / 7))) return 'a';
    if (x >= 10 || (x === 8 && depth % 13 > 7)) return 'f';
    return 'b';
  });
}
const STEM = treeTrunk(0, 16);
const CANNON = grid((x, y) => {
  if (y < 1 || x < 1 || x > 14) return '.';
  if (y > 13) return 's';
  if (y >= 4 && y <= 9 && x >= 5 && x <= 10) return (x + y) % 3 === 0 ? 'K' : 'w';
  return y === 2 && x > 2 && x < 13 ? 's' : 'K';
});
const PEDESTAL = grid((x, y) => {
  if (x < 3 || x > 12) return '.';
  return x === 3 || x === 12 || y % 8 === 0 ? 'K' : 's';
});

export const TILE_ART: Record<string, string[]> = {
  X: GROUND, B: BRICK, S: BRICK, m: BRICK, C: BRICK, '?': QUESTION, M: QUESTION,
  E: USED, '#': HARD, '[': pipeLip(0), ']': pipeLip(16), '{': pipeBody(0), '}': pipeBody(16),
  o: COIN_TILE, L: LAVA_TOP, l: LAVA, '=': BRIDGE, A: AXE,
  '<': treeTop('<'), T: treeTop('T'), '>': treeTop('>'), '|': STEM, N: CANNON, n: PEDESTAL,
};

const TILE_RUNS = Object.fromEntries(Object.entries(TILE_ART).map(([ch, art]) => [ch, rowsToRuns(art)]));
const trunkRuns = new Map<number, ReturnType<typeof rowsToRuns>>();
function trunkTileRuns(row: number, height: number) {
  const key = height * 16 + row;
  let runs = trunkRuns.get(key);
  if (!runs) {
    runs = rowsToRuns(treeTrunk(row, height * 16));
    trunkRuns.set(key, runs);
  }
  return runs;
}

export type TileLayer = { key: string; d: string };

/** Compile sixteen columns into one SVG path per palette key. */
export function compileSection(tiles: string[][], section: number, hidden: Set<string>): TileLayer[] {
  const out = new Map<string, string[]>();
  const start = section * 16;
  for (let c = start; c < Math.min(start + 16, tiles[0].length); c++) {
    for (let r = 0; r < tiles.length; r++) {
      const ch = tiles[r][c];
      let runs = TILE_RUNS[ch];
      if (ch === '|') {
        let top = r;
        while (top > 0 && tiles[top - 1][c] === '|') top--;
        runs = trunkTileRuns(r - top, tiles.length - top);
      }
      if (!runs || hidden.has(c + ',' + r)) continue;
      for (const run of runs) {
        let parts = out.get(run.ch);
        if (!parts) { parts = []; out.set(run.ch, parts); }
        parts.push(runPath(c * 16 + run.x, r * 16 + run.y, run.n));
      }
    }
  }
  return [...out].map(([key, parts]) => ({ key, d: parts.join('') }));
}

const spriteCache = new Map<string, Sprite>();
export function tileSprite(ch: string, theme: Theme, qColor: string): Sprite | null {
  const art = TILE_ART[ch];
  if (!art) return null;
  const key = ch + '-' + theme + '-' + qColor;
  let sprite = spriteCache.get(key);
  if (!sprite) {
    sprite = makeSprite(art, { ...THEME_PALETTES[theme], Q: qColor });
    spriteCache.set(key, sprite);
  }
  return sprite;
}

const CASTLE_ART = grid((x, y) => {
  const brick = y % 8 === 7 || (x + Math.floor(y / 8) % 2 * 8) % 16 === 15 ? 'D' : 'O';
  if (y < 40) {
    if (x < 16 || x > 63) return '.';
    if (y < 8) return Math.floor((x - 16) / 8) % 2 === 0 ? brick : '.';
    if (y >= 16 && y < 32 && ((x >= 24 && x < 32) || (x >= 48 && x < 56))) return 'K';
    return brick;
  }
  if (y < 48) return Math.floor(x / 8) % 2 === 0 ? brick : '.';
  if (x >= 32 && x < 48 && y >= 56) {
    const dx = x - 39.5, dy = y - 64;
    if (y >= 64 || dx * dx + dy * dy <= 64) return 'K';
  }
  return brick;
}, 80, 80);

export function castleSprite(theme: Theme): Sprite {
  const key = 'castle-' + theme;
  let sprite = spriteCache.get(key);
  if (!sprite) {
    sprite = makeSprite(CASTLE_ART, THEME_PALETTES[theme === 'castle' ? 'castle' : 'overworld']);
    spriteCache.set(key, sprite);
  }
  return sprite;
}
