export const WORLDS = 10;
export const STAGES = 4;
export const TILE = 16;
export const VIEW_H = 240;
export const ROWS = VIEW_H / TILE;

export type Theme = 'overworld' | 'underground' | 'athletic' | 'castle';
export type Kind = 'walker' | 'turtle' | 'redturtle' | 'paratroopa' | 'piranha' | 'firebar' | 'podoboo' | 'bullet' | 'boss' | 'lift';
export type Spawn = { kind: Kind; x: number; y: number; range?: number };
export type LevelData = {
  world: number; stage: number; theme: Theme; night: boolean; width: number;
  tiles: string[][]; spawns: Spawn[]; startCol: number; checkpointCol: number;
  flagCol: number | null; axe: { c: number; r: number } | null; bridge: [number, number] | null;
  time: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateLevel(world: number, stage: number): LevelData {
  const theme = (['overworld', 'underground', 'athletic', 'castle'] as const)[stage - 1];
  const random = mulberry32(world * 9973 + stage * 131 + 7);
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const tiles = Array.from({ length: ROWS }, () => Array<string>(420).fill(' '));
  const spawns: Spawn[] = [];
  const set = (c: number, r: number, ch: string) => { tiles[r][c] = ch; };
  const ground = (from: number, to: number, row = 13) => {
    for (let c = from; c < to; c++) for (let r = row; r < ROWS; r++) set(c, r, 'X');
  };
  const lava = (from: number, to: number) => {
    for (let c = from; c < to; c++) set(c, 14, 'L');
  };
  const spawn = (kind: Kind, c: number, r: number, range?: number) => {
    spawns.push({ kind, x: c * TILE, y: r * TILE, range });
  };

  ground(0, 12);
  let c = 12;
  let checkpointCol = 2;
  set(8, 9, 'M');
  for (let section = 0; section < 10 + world; section++) {
    const width = between(9, 13);
    const variant = between(0, 4);
    if (section === Math.floor((10 + world) / 2)) checkpointCol = c + 2;
    ground(c, c + width);

    if (variant === 0 || variant === 1) {
      const row = between(8, 9);
      for (let x = c + 2; x <= c + 6; x++) set(x, row, x === c + 4 ? 'M' : 'B');
      for (let x = c + 2; x <= c + 6; x++) if (random() > 0.5) set(x, row - 1, 'o');
      if (theme === 'underground') for (let x = c; x < c + width; x++) set(x, 2, 'X');
    } else if (variant === 2 && theme !== 'castle') {
      const top = between(10, 11);
      for (let r = top; r < 13; r++) {
        set(c + 4, r, r === top ? '[' : '{');
        set(c + 5, r, r === top ? ']' : '}');
      }
      if (world > 1) spawn('piranha', c + 4.5, top);
    } else if (variant === 2) {
      set(c + 5, 8, 'E');
      spawn('firebar', c + 5.5, 8.5, 45);
    } else if (variant === 3) {
      for (let i = 0; i < 3; i++) set(c + 3 + i, 12 - i, 'B');
      set(c + 5, 8, section % 3 === 0 ? 'N' : '?');
    } else {
      set(c + 5, 12, 'C');
      if (world > 2 && theme !== 'castle') spawn('bullet', c + 5, 11);
      set(c + 3, 9, section % 2 ? 'S' : 'M');
    }

    if (variant !== 3 && section % 4 !== 0) {
      const pool: Kind[] = ['walker', 'walker', 'turtle', 'redturtle', 'paratroopa'];
      const kind = pool[between(0, Math.min(4, 1 + Math.floor(world / 2)))];
      spawn(kind, c + width - 2.5, kind === 'walker' ? 12 : 11.5);
    }

    c += width;
    if (section % 3 === 2) {
      const gap = between(2, 3);
      if (theme === 'castle') {
        lava(c, c + gap);
        if (world > 2) spawn('podoboo', c + 1, 14);
      }
      if (theme === 'athletic') spawn('lift', c, 11.5, gap * TILE - 12);
      for (let x = c; x < c + gap; x++) set(x, 10, 'o');
      c += gap;
    }
  }

  let flagCol: number | null = null;
  let axe: LevelData['axe'] = null;
  let bridge: LevelData['bridge'] = null;
  ground(c, c + 9);
  if (theme === 'castle') {
    const from = c + 9;
    const to = from + 13;
    bridge = [from, to];
    lava(from, to);
    for (let x = from; x < to; x++) set(x, 13, '=');
    spawn('boss', to - 4, 11, 66);
    ground(to, to + 7);
    axe = { c: to + 1, r: 12 };
    set(axe.c, axe.r, 'A');
    c = to + 7;
  } else {
    flagCol = c + 10;
    ground(c + 9, c + 20);
    c += 20;
  }

  return {
    world, stage, theme, night: (theme === 'overworld' || theme === 'athletic') && world % 3 === 0,
    width: c, tiles: tiles.map(row => row.slice(0, c)), spawns, startCol: 2, checkpointCol,
    flagCol, axe, bridge, time: theme === 'castle' ? 300 : 400,
  };
}
