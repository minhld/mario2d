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

const BIG_TORSO_WALK = [...BIG_TORSO.slice(0, 11), '.....BBBBBBB....'];

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

export const WALK_FRAMES = ['step0', 'step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'] as const;
export const RUN_FRAMES = ['run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7'] as const;
type RunFrame = (typeof RUN_FRAMES)[number];
type WalkFrame = (typeof WALK_FRAMES)[number];
export type HeroFrame = 'stand' | 'jump' | 'skid' | 'crouch' | 'die' | WalkFrame | RunFrame;

// One foot sweeps backward at ground level while the other bends and swings forward.
const FOOT_X = [4, 2, 0, -2, -4, -2, 0, 2];
const FOOT_LIFT = [0, 0, 0, 0, 0, 2, 3, 2];

const RUN_FOOT_X = [6, 4, 1, -3, -6, -4, -1, 4];
const RUN_FOOT_LIFT = [0, 0, 0, 0, 0, 3, 4, 2];

function walkingLegs(big: boolean, phase: number, running: boolean): string[] {
  const height = big ? 11 : 4;
  const rows = Array.from({ length: height }, () => Array<string>(16).fill('.'));

  for (const far of [true, false]) {
    const step = (phase + (far ? 4 : 0)) % WALK_FRAMES.length;
    const center = far ? 7 : 8;
    const hip = big ? center + (far ? -1 : 1) : center;
    const rise = (running ? RUN_FOOT_LIFT : FOOT_LIFT)[step];
    const lift = big ? rise : Number(rise > 0);
    const ankle = center + (running ? RUN_FOOT_X : FOOT_X)[step];
    const knee = Math.round((hip + ankle) / 2) + Number(lift > 0);
    const boot = height - lift - 2;

    for (let y = 0; y < boot; y++) {
      const progress = y / boot;
      const x = progress < 0.5
        ? hip + (knee - hip) * progress * 2
        : knee + (ankle - knee) * (progress * 2 - 1);
      const column = Math.round(x);
      for (let i = column - 1; i <= column + (big ? 1 : 0); i++) rows[y][i] = 'B';
    }
    for (let x = Math.max(0, ankle - 1); x <= Math.min(15, ankle + (big ? 2 : 1)); x++) rows[boot][x] = far ? 'h' : 'H';
    for (let x = Math.max(0, ankle - 1); x <= Math.min(15, ankle + (big ? 3 : 2)); x++) rows[boot + 1][x] = far ? 'h' : 'H';
  }
  return rows.map(row => row.join(''));
}

function heroRows(big: boolean, f: HeroFrame): string[] {
  if (f === 'die') return SMALL_DIE;
  if (f === 'crouch' && big) return BIG_CROUCH;
  const run = RUN_FRAMES.indexOf(f as RunFrame);
  const walk = run >= 0 ? run : WALK_FRAMES.indexOf(f as WalkFrame);
  if (walk >= 0) {
    const swing = ['walk1', 'walk1', 'walk2', 'walk3', 'walk3', 'walk3', 'walk2', 'walk1'][walk];
    const legs = walkingLegs(big, walk, run >= 0);
    if (big) return [...HEAD, ...BIG_TORSO_WALK, ...legs];
    return [...HEAD, ...SMALL_BODY[swing].slice(0, 5), ...legs.slice(1)];
  }
  if (!big) return [...HEAD, ...SMALL_BODY[f === 'crouch' ? 'stand' : f]];
  const legs = BIG_LEGS[f === 'skid' ? 'walk3' : f];
  return [...HEAD, ...(f === 'jump' ? BIG_TORSO_JUMP : BIG_TORSO), ...legs];
}

function shadow(hex: string): string {
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.72)
    .toString(16).padStart(2, '0')).join('');
}

const heroCache = new Map<string, Sprite>();
export function heroSprite(big: boolean, f: HeroFrame, pal: number): Sprite {
  const key = `${big}-${f}-${pal}`;
  let s = heroCache.get(key);
  if (!s) {
    const colors = HERO_PALETTES[pal];
    s = makeSprite(heroRows(big, f), { ...colors, h: shadow(colors.H) });
    heroCache.set(key, s);
  }
  return s;
}

const WALKER = [
  '......DDDD......',
  '....DDDDDDDD....',
  '...DDDDDDDDDD...',
  '..DDKKDDDDKKDD..',
  '.DDDWWKDDKWWDDD.',
  '.DDDWKWDDWKWDDD.',
  'DDDDWWWDDWWWDDDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDDKKKKKKDDDDD',
  '.DDDKKKKKKKKDDD.',
  '....TTTTTTTT....',
  '...TTTTTTTTTT...',
  '...TTTTTTTTTTKK.',
  '..KKKTTTTTTKKKK.',
  '.KKKKKTTTTKKKKK.',
  '.KKKKK....KKKK..',
];
const WALKER_FLAT = [
  '....DDDDDDDD....',
  '..DDKWWDDWWKDD..',
  '.DDDDDKKKKDDDDD.',
  'DDDDDDDDDDDDDDDD',
  '..TTTTTTTTTTTT..',
  '.KKKKK....KKKKK.',
];
const WALKER_PAL = { D: '#c84c0c', T: '#fcb890', K: '#000000', W: '#fcfcfc' };

const TURTLE_TOP = [
  '....YYY.........',
  '...YYYYY........',
  '..YYKWYY........',
  '..YYKWYY........',
  '.YYYYYYY........',
  '.YYYYYYY........',
  '..YYYYY.........',
  '...YYYY.........',
  '....YYY..GGGG...',
  '....YYY.GGWGGG..',
  '....YYYGGWGGWGG.',
  '....YYGGWGGWGGG.',
  '....YYGWGGWGGWGG',
  '....YYGGWGGWGGGG',
  '...YYYWWGGWGGGG.',
  '...YYYWWGGWGGWGW',
  '...YYYYWWWWWWWW.',
  '....YYYYWWWWWW..',
  '.....YYYYYYYY...',
];
const TURTLE_LEGS = [
  ['......YYY.YYY...', '.....YYYY.YYYY..', '....HHHH..HHHH..', '...HHHHH.HHHHH..'],
  ['.....YYY...YYY..', '....YYYY...YYYY.', '...HHHH...HHHH..', '..HHHHH..HHHHH..'],
];
const SHELL = [
  '.....GGGGGG.....', '...GGGGGGGGGG...', '..GGGGWGGWGGGG..', '.GGGGGGGGGGGGGG.',
  '.GGGGGGGGGGGGGG.', 'GGGGGGGGGGGGGGGG', 'GGGWGGGGGGWGGGGG', 'GGGGGGGGGGGGGGGG',
  '.WWWWWWWWWWWWWW.', '..YYYYYYYYYYYY..', '...YYYYYYYYYY...', '....KKKKKKKK....',
];
const WINGS = [
  ['..WW....', '.WWWW...', 'WWWWWW..', 'WWWWWWK.', '.WWWWWK.', '..WWWK..'],
  ['........', '........', 'WWWWWW..', 'WWWWWWK.', '.WWWWWK.', '...WWK..'],
];
const TURTLE_PAL = { Y: '#f8d878', G: '#00a800', W: '#fcfcfc', K: '#000000', H: '#e09030' };
const RED_TURTLE_PAL = { ...TURTLE_PAL, G: '#d82800' };

const PIRANHA_OPEN = [
  '...R.......R...', '..RRR.....RRR..', '.RRWRR...RRWRR.', '.RRRRR...RRRRR.',
  'RRRRRRR.RRRRRRR', 'RRRRRRR.RRRRRRR', 'RRRRRRRRRRRRRRRR', '.RRWRRWRRRRWRR.',
  '..RRRRRRRRWRRR..', '...RRRWWRRRR....', '....RRRRRRRR....', '......GGGG......',
];
const PIRANHA_CLOSED = [
  '......RRRR......', '....RRRRRRRR....', '...RRRRWRRRRR...', '..RWRRRRRRRRRR..',
  '..RRRRRRRRRRRR..', '..RRRRRRRRRRRR..', '..WWWWWWWWWWWW..', '..RRRRRRRRRRRR..',
  '..RRWRRRRRWRRR..', '...RRRRRRRRRR...', '....RRRRRRRR....', '......GGGG......',
];
const PIRANHA_STEM = [
  '.......GG.......', '..GG...GG...GG..', '.GGGG..GG..GGGG.', 'GGGGGG.GG.GGGGGG',
  'GgGGGGGGGGGGGGgG', 'GGgGGGGGGGGGGgGG', '.GGgGGGGGGGGgGG.', '..GGGGGGGGGGGG..',
  '....GGGGGGGG....', '.......GG.......', '.......GG.......', '.......GG.......',
];
const PIRANHA_PAL = { R: '#d82800', W: '#fcfcfc', G: '#00a800', g: '#80d010' };

const BULLET = [
  '....KKKKKKKK....', '..KKKKKKKKKKKK..', '.KKKKKKKKKKKKKK.', '.KKKKKKKKKKKKKK.',
  'KKKKKKKKKKKKKKKK', 'KKKKKKKKKKKKKKKK', 'KKKKKKKKKKKKKKKK', 'KKKWWWKKKKKKKKKK',
  'KKWWWWWWKKKKKKKK', 'KKKKKKKKKKKKKKKK', '.KKKKKKKKKKKKKK.', '.KKKKKKKKKKKKKK.',
  '..KKKKKKKKKKKK..', '....KKKKKKKK....',
];
const PODOBOO = [
  '.....YYYY.....', '...YYRRRRYY...', '..YRRWRWRRY..', '.YRRWWWRRRRY.',
  '.YRRWRRRRRRY.', 'YRRWRRRRRRRRRY', 'YRRRRRRRRRRRRY', 'YRRRRRRRRRRRRY',
  '.YRRRRRRRRRY.', '..YRRRRRRRY...', '...YRRRRRY....', '....YRRRY.....',
  '.....YRRY.....', '......YY......',
];
const BOSS = [
  '..........W......W..............', '.........WW.....WW..............',
  '........WWGRRRGGWW..............', '......GGGRRRRRRRGGG.............',
  '.....GGGGRRRRRRRGGGG............', '....GGWKGGRRRGGGGGGGG...........',
  '...GGGKGGGGGGGGGGGGGGG..........', '..GGGGGGGGGGGGGGGGGGGG...SSS....',
  '.GWWGGGGGGGGGGGGGGGGGG..SSWSS...', 'GWWGGGGGGGGGGGGGGGGGG..SSWSSS...',
  'KGGGGGGGGGGGGGGGGGGG..SSSSSSSS..', 'GGGGGGGGGGGGGGGGGGG..SSSSSSSSSS.',
  '.GWWWGGGGGGGGGGGGG..SSWSSSSSSSS.', '..GGWGGGGGGGGGGGG..SSWSSSSSSSSS.',
  '...WWWGGGGGGGGGG..SSSSWSSSSSSSS.', '......YYYYYYGG..SSSSSSSSSSSSSSS.',
  '.....YYYYYYYYGSSSSSSSSSSSSSSSSS.', '....YYYYYYYYYSSSSSSSSSSSSSSSSS..',
  '...GGYYYYYYYYYSSSSSSSSSSSSSSSS..', '..GGGYYYYYYYYYSSSSSSSSSSSSSSS...',
  '..GGWGYYYYYYYYYYSSSSSSSSSSSS....', '...GGGYYYYYYYYYYYSSSSSSSSSS.....',
  '......YYYYYYYYYYYYYSSSS.........', '......YYYYYYYYYYYYYGGG..........',
  '.......YYYYYYYYYYYYGGGG.........', '........YYYYYYYYYYGGGGGG........',
  '........GGGGGG...GGGGGGGGG......', '.......GGGGGGG...GGGGGGG........',
  '......GGGGGGG....GGGGGG.........', '......GGGGGG.....GGGGG..........',
];
const BOSS_PAL = { G: '#00a800', W: '#fcfcfc', K: '#000000', R: '#d82800', Y: '#f8d878', S: '#e09030' };
const BOSS_FIRE = [
  '....RRRRRRRRYYYY........', '..RRYYYYYYYYYYYYRR......', 'RRYYYYYWWWWYYYYYYYRR....',
  '..RRYYYYYYYYYYYYRR......', '....RRRRRRRRYYYY........',
];
const MUSHROOM = [
  '......RRRR......', '....RRWWWWRR....', '...RRWWWWWWRR...', '..RRRWWWWWWRRR..',
  '.RRRRRWWWWRRRRR.', '.RWWRRRRRRRRWWR.', 'RWWWRRRRRRRRWWWR', 'RWWWWRRRRRRWWWWR',
  'RWWWRRRRRRRRWWWR', '.RRRKTTTTTTKRRR.', '...TTKTTTKT.....', '...TTKTTTKTT....',
  '...TTTTTTTTT....', '....TTTTTTT.....', '.....TTTTTT.....',
];
const FLOWER = [
  '....FFFFFFFF....', '..FFOOOOOOOOFF..', '.FOOYYYYYYYYOOF.', 'FOOYYYYYYYYYYOOF',
  '.FOOYYYYYYYYOOF.', '..FFOOOOOOOOFF..', '....FFFFFFFF....', '.......GG.......',
  'GG.....GG.....GG', 'GGG....GG....GGG', '.GGG...GG...GGG.', '..GGG..GG..GGG..',
  '...GGGGGGGGGG...', '....GGGGGGGG....', '.....GGGGGG.....', '......GGGG......',
];
const STAR = [
  '.......YY.......', '......YYYY......', '......YYYY......', '.....YYYYYY.....',
  'YYYYYYYYYYYYYYYY', '.YYYYYYYYYYYYYY.', '..YYYYYYYYYYYY..', '...YYYYYYYYYY...',
  '....YYYYYYYY....', '...YYYYYYYYYY...', '..YYYYYYYYYYYY..', '..YYYY..YYYY....',
  '.YYYY....YYYY...', '.YYY......YYY...', 'YY..........YY..',
];
const FIREBALL = [
  '..RRRR..',
  '.RYYYYR.',
  'RYYWWYYR',
  'RYWWWWYR',
  'RYWWWWYR',
  'RYYWWYYR',
  '.RYYYYR.',
  '..RRRR..',
];
const DEBRIS = [
  '..DDDD..',
  '.DOOOOD.',
  'DOOPOOOD',
  'DOPOOOOD',
  'DOOOOOOD',
  'DOOOOOOD',
  '.DOOOOD.',
  '..DDDD..',
];
const FLAG = [
  'WWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWW',
  '..WWWWGGGGWWWWWW',
  '...WWGGWWGGWWWWW',
  '....WGWGGWGWWWWW',
  '.....GGWWGGWWWWW',
  '......WGGGGWWWWW',
  '.......WWWWWWWWW',
  '........WWWWWWWW',
  '.........WWWWWWW',
  '..........WWWWWW',
  '...........WWWWW',
  '............WWWW',
  '.............WWW',
  '..............WW',
  '...............W',
];

function coinRows(width: number): string[] {
  const half = width / 2;
  const rows: string[] = [];
  for (let y = 0; y < 14; y++) {
    let row = '';
    const dy = (y - 6.5) / 7;
    for (let x = 0; x < 8; x++) {
      const dx = (x - 3.5) / Math.max(half, 0.5);
      const d = dx * dx + dy * dy;
      row += d > 1 ? '.' : d > 0.6 ? 'O' : width > 3 && x === 3 ? 'W' : 'Y';
    }
    rows.push(row);
  }
  return rows;
}

const COIN_PAL = { Y: '#fcbc3c', O: '#c84c0c', W: '#fcfcfc' };
const FIRE_PAL = { R: '#d82800', Y: '#fca044', W: '#fce000' };
const FLOWER_PALS = [
  { F: '#d82800', O: '#fca044', Y: '#fcfcfc', K: '#000000', G: '#00a800' },
  { F: '#00a800', O: '#fcfcfc', Y: '#fca044', K: '#000000', G: '#00a800' },
  { F: '#fca044', O: '#d82800', Y: '#fce000', K: '#000000', G: '#00a800' },
  { F: '#2038ec', O: '#fcfcfc', Y: '#fca044', K: '#000000', G: '#00a800' },
];

export const SPRITES = {
  walker: makeSprite(WALKER, WALKER_PAL),
  walkerFlat: makeSprite(WALKER_FLAT, WALKER_PAL),
  turtle: TURTLE_LEGS.map(legs => makeSprite([...TURTLE_TOP, ...legs], TURTLE_PAL)),
  redTurtle: TURTLE_LEGS.map(legs => makeSprite([...TURTLE_TOP, ...legs], RED_TURTLE_PAL)),
  shell: makeSprite(SHELL, TURTLE_PAL),
  redShell: makeSprite(SHELL, RED_TURTLE_PAL),
  wings: WINGS.map(rows => makeSprite(rows, { W: '#fcfcfc', K: '#000000' })),
  piranha: [PIRANHA_OPEN, PIRANHA_CLOSED].map(head => makeSprite([...head, ...PIRANHA_STEM], PIRANHA_PAL)),
  bullet: makeSprite(BULLET, { K: '#202020', W: '#bcbcbc' }),
  podoboo: makeSprite(PODOBOO, { R: '#fc7400', Y: '#fce000', W: '#fcfcfc', K: '#000000' }),
  boss: makeSprite(BOSS, BOSS_PAL),
  bossHurt: makeSprite(BOSS, { ...BOSS_PAL, G: '#fcfcfc', Y: '#fca044' }),
  bossFire: makeSprite(BOSS_FIRE, FIRE_PAL),
  mushroom: makeSprite(MUSHROOM, { R: '#d82800', W: '#fcfcfc', T: '#fcd8a8', K: '#000000' }),
  oneup: makeSprite(MUSHROOM, { R: '#00a800', W: '#fcfcfc', T: '#fcd8a8', K: '#000000' }),
  flower: FLOWER_PALS.map(pal => makeSprite(FLOWER, pal)),
  star: ['#fce000', '#fca044', '#fcfcfc', '#80d010'].map(Y => makeSprite(STAR, { Y, K: '#000000' })),
  fireball: makeSprite(FIREBALL, FIRE_PAL),
  coin: [8, 5, 2, 5].map(w => makeSprite(coinRows(w), COIN_PAL)),
  flag: makeSprite(FLAG, { W: '#fcfcfc', G: '#00a800' }),
};

const debrisCache = new Map<string, Sprite>();
export function debrisSprite(pal: Palette): Sprite {
  const key = pal.O;
  let sprite = debrisCache.get(key);
  if (!sprite) {
    sprite = makeSprite(DEBRIS, pal);
    debrisCache.set(key, sprite);
  }
  return sprite;
}
