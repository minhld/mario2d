import type { Ent } from './engine';

const walker = [
  '....rrr.....', '..rrrrrrr...', '.rrrrrrrrr..', '.rrsrrsrrr..',
  'rrrsrrsrrrr.', 'rrrrrrrrrrr.', '..yyyyyyy...', '...yyyyy....',
  '..hhhhh.hh..', '.hhhh.hhhhh.',
];
const turtle = [
  '.........yy.', '........yys.', '........yyy.', '.........yy.', '.........yy.',
  '...ggg..yy..', '..gggggyyy..', '.ggtgggyyy..', '.ggggggyy...',
  '..yyyyyyy...', '..hh...hh...',
];
const plant = [
  '...rrr...', '..ryrrr..', '.rryyyrr.', '..rrrrr..', '...rrr...',
  '....g....', '.gg.g.gg.', '..ggggg..', '....g....',
];

const palette: Record<string, string> = {
  g: '#7dba62', y: '#ffd293', t: '#1d7e79', b: '#263c58',
  s: '#202534', h: '#51384c', r: '#ce594e', w: '#fff4bf',
};

export function pixelLayers(rows: string[], colors = palette) {
  const paths: Record<string, string> = {};
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!colors[ch]) continue;
      let stop = x + 1;
      while (row[stop] === ch) stop++;
      paths[ch] = (paths[ch] ?? '') + `M${x} ${y}h${stop - x}v1H${x}Z`;
      x = stop - 1;
    }
  });
  return Object.entries(paths).map(([ch, d]) => ({ d, fill: colors[ch] }));
}

export function entitySprite(kind: Ent['kind']) {
  if (kind === 'walker') return { rows: walker, colors: palette };
  if (kind === 'turtle' || kind === 'redturtle' || kind === 'paratroopa' || kind === 'boss') {
    return { rows: turtle, colors: kind === 'redturtle' || kind === 'boss' ? { ...palette, g: '#d65861' } : palette };
  }
  if (kind === 'piranha') return { rows: plant, colors: palette };
  if (kind === 'shell') return { rows: ['...gggg...', '..ggtggg..', '.gggggggg.', 'yyyyyyyyyy'], colors: palette };
  return null;
}

export type Layer = { fill: string; d: string };
export type Sprite = { w: number; h: number; layers: Layer[]; flipped: Layer[] };
export type Palette = Record<string, string>;

const EPS = 0.04;

export function rowsToRuns(rows: string[]) {
  const runs: { ch: string; x: number; y: number; n: number }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') { x++; continue; }
      let n = 1;
      while (x + n < row.length && row[x + n] === ch) n++;
      runs.push({ ch, x, y, n });
      x += n;
    }
  });
  return runs;
}

export function runPath(x: number, y: number, n: number): string {
  return `M${x} ${y}h${n + EPS}v${1 + EPS}h${-(n + EPS)}z`;
}

export function makeSprite(input: string[], pal: Palette): Sprite {
  const rows = input.slice();
  while (rows.length && /^\.*$/.test(rows[rows.length - 1])) rows.pop();
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const norm = new Map<string, string>();
  const flip = new Map<string, string>();
  for (const r of rowsToRuns(rows.map((r) => r.padEnd(w, '.')))) {
    const fill = pal[r.ch];
    if (!fill) continue;
    norm.set(fill, (norm.get(fill) ?? '') + runPath(r.x, r.y, r.n));
    flip.set(fill, (flip.get(fill) ?? '') + runPath(w - r.x - r.n, r.y, r.n));
  }
  return {
    w,
    h,
    layers: [...norm].map(([fill, d]) => ({ fill, d })),
    flipped: [...flip].map(([fill, d]) => ({ fill, d })),
  };
}

const HEAD = [
  '......RRRRR.....',
  '....RRRRRRRRR...',
  '...RRRRWWRRRRR..',
  '...RRRRRRRRRRRRR',
  '...HHSSSWKSS....',
  '..HSHSSSWKSSSS..',
  '..HSSSSSSSSSSSS.',
  '...HSSSHHHHHH...',
];

const SMALL_BODY: Record<string, string[]> = {
  stand: [
    '....SSSSSSSS....',
    '...RRBRRRRBRR...',
    '..RRRBRRRRBRRR..',
    '.SSRRBBBBBBRRSS.',
    '.SS.BBYBBYBB.SS.',
    '....BBBBBBBB....',
    '...HHHH..HHHH...',
    '..HHHHH..HHHHH..',
  ],
  walk1: [
    '....SSSSSSSS....',
    '...RRBRRRRBRR...',
    '..RRRBRRRRBRRSS.',
    '.SSRRBBBBBBRRSS.',
    '.SS.BBYBBYBBB...',
    '..BBBBB..BBBB...',
    '.HHHH.....HHHH..',
    'HHHH.......HHHH.',
  ],
  walk2: [
    '....SSSSSSSS....',
    '....RBRRRRBR....',
    '...RRBRRRRBRR...',
    '...RSSBBBBBRR...',
    '....SSYBBYBB....',
    '.....BBBBBB.....',
    '....HHHHHHH.....',
    '....HHHHHHHH....',
  ],
  walk3: [
    '....SSSSSSSS....',
    '...RRBRRRRBRR...',
    '..SSRBRRRRBRR...',
    '..SSRBBBBBBRR...',
    '....BBYBBYBBSS..',
    '...BBBB.BBBBSS..',
    '..HHHH...HHHH...',
    '..HHH.....HHHH..',
  ],
  jump: [
    '....SSSSSSSS.SS.',
    '...RRBRRRRBRRSS.',
    '..RRRBRRRRBRRR..',
    '.SSRRBBBBBBRR...',
    '.SS.BBYBBYBBB...',
    '...BBBBBBBBBHH..',
    '..HHHH..BBBHHH..',
    '.HHHH.......HH..',
  ],
  skid: [
    '....SSSSSSSS....',
    '..SSRRBRRRBRR...',
    '..SSRRBRRRBRRR..',
    '...RRRBBBBBBR...',
    '....BBYBBYBBB...',
    '...BBBBBBBBB....',
    '..HHHH.HHHH.....',
    '.HHHH...HHHH....',
  ],
};

const SMALL_DIE = [
  '......RRRR......',
  '....RRRRRRRR....',
  '...RRRRWWRRRR...',
  '..RRRRRRRRRRRR..',
  '..HSSWKSSKWSSH..',
  'SSHSSWKSSKWSSHSS',
  'SS.SSSSSSSSSS.SS',
  'SS.SHHHHHHHHS.SS',
  'RR..SSSSSSSS..RR',
  '.RRRRBRRRRBRRRR.',
  '..RRRBRRRRBRRR..',
  '....BBBBBBBB....',
  '...BBYBBBBYBB...',
  '...BBBBBBBBBB...',
  '..HHHH....HHHH..',
  '..HHHH....HHHH..',
];

const BIG_TORSO = [
  '....SSSSSSSS....',
  '....SSSSSSS.....',
  '....RRRRRRRR....',
  '...RRRRBRRBRR...',
  '..RRRRRBRRBRRR..',
  '.RRRRRRBRRBRRRR.',
  '.RRRRRRBBBBRRRR.',
  'RRRRRRBBBBBBRRRR',
  'SSRRRBBYBBYBBRSS',
  'SSS.RBBBBBBBBSSS',
  'SS..BBBBBBBBB.SS',
  '....BBBBBBBBB...',
  '...BBBBBBBBBBB..',
  '...BBBBB.BBBBB..',
];

const BIG_TORSO_JUMP = [
  '....SSSSSSSS.SSS',
  '....SSSSSSS..SSS',
  '....RRRRRRRR.RRR',
  '...RRRRBRRBRRRR.',
  '..RRRRRBRRBRRR..',
  '.RRRRRRBRRBRR...',
  '.RRRRRRBBBBRR...',
  'RRRRRRBBBBBBB...',
  'SSRRRBBYBBYBB...',
  'SSS.RBBBBBBBB...',
  'SS..BBBBBBBBB...',
  '....BBBBBBBBB...',
  '...BBBBBBBBBBB..',
  '...BBBBB.BBBBB..',
];

const BIG_LEGS: Record<string, string[]> = {
  stand: [
    '...BBBB...BBBB..',
    '...BBBB...BBBB..',
    '...BBBB...BBBB..',
    '...BBBB...BBBB..',
    '...BBBB...BBBB..',
    '...BBBB...BBBB..',
    '..HHHHH...HHHHH.',
    '.HHHHHH...HHHHHH',
    '.HHHHHH...HHHHHH',
  ],
  walk1: [
    '..BBBB.....BBBB.',
    '.BBBB.......BBB.',
    '.BBBB.......BBB.',
    'BBBB........BBB.',
    'BBB.........BBB.',
    'BBB.........BBB.',
    'HHHH.......HHHH.',
    'HHHHH......HHHHH',
    'HHHHH......HHHHH',
  ],
  walk2: [
    '....BBBBBBB.....',
    '.....BBBBB......',
    '.....BBBBB......',
    '.....BBBBB......',
    '.....BBBBB......',
    '.....BBBBB......',
    '....HHHHHH......',
    '....HHHHHHH.....',
    '....HHHHHHH.....',
  ],
  walk3: [
    '...BBBB..BBBB...',
    '..BBBB....BBBB..',
    '..BBBB....BBBB..',
    '..BBB......BBB..',
    '..BBB......BBB..',
    '..BBB......BBB..',
    '.HHHH.....HHHH..',
    '.HHHHH....HHHHH.',
    '.HHHHH....HHHHH.',
  ],
  jump: [
    '...BBBB....BBBBH',
    '..BBBB......HHHH',
    '..BBBB......HHHH',
    '.BBBB........HH.',
    '.BBB............',
    'HHHH............',
    'HHHHH...........',
    'HHHH............',
    '................',
  ],
};

const BIG_CROUCH = [
  ...HEAD,
  '....SSSSSSSS....',
  '..RRRRBRRBRRRR..',
  '.SSRRRBBBBRRRSS.',
  'SSSRRBBYBYBBRSSS',
  '.SSBBBBBBBBBBSS.',
  '..BBBBBBBBBBBB..',
  '..HHHHH..HHHHH..',
  '.HHHHHHHHHHHHHH.',
];

export const HERO_PALETTES: Palette[] = [
  { R: '#d82800', B: '#2038ec', S: '#fcb890', H: '#7c3c00', K: '#000000', W: '#fcfcfc', Y: '#fce000' },
  { R: '#f8f8f8', B: '#d82800', S: '#fcb890', H: '#7c3c00', K: '#000000', W: '#d82800', Y: '#fce000' },
  { R: '#00a800', B: '#000000', S: '#fcb890', H: '#d82800', K: '#000000', W: '#fcfcfc', Y: '#fce000' },
  { R: '#000000', B: '#d82800', S: '#fca044', H: '#7c3c00', K: '#fcfcfc', W: '#fcfcfc', Y: '#fce000' },
];

export type HeroFrame = 'stand' | 'walk1' | 'walk2' | 'walk3' | 'jump' | 'skid' | 'crouch' | 'die';

function heroRows(big: boolean, f: HeroFrame): string[] {
  if (f === 'die') return SMALL_DIE;
  if (!big) return [...HEAD, ...SMALL_BODY[f === 'crouch' ? 'stand' : f]];
  if (f === 'crouch') return BIG_CROUCH;
  const legs = BIG_LEGS[f === 'skid' ? 'walk3' : f];
  return [...HEAD, ...(f === 'jump' ? BIG_TORSO_JUMP : BIG_TORSO), ...legs];
}

const heroCache = new Map<string, Sprite>();
export function heroSprite(big: boolean, f: HeroFrame, pal: number): Sprite {
  const key = `${big}-${f}-${pal}`;
  let s = heroCache.get(key);
  if (!s) {
    s = makeSprite(heroRows(big, f), HERO_PALETTES[pal]);
    heroCache.set(key, s);
  }
  return s;
}
