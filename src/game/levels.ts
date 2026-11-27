export const WORLDS = 10;
export const STAGES = 4;
export const TILE = 16;
export const VIEW_H = 240;
export const ROWS = VIEW_H / TILE;

export type Theme = 'overworld' | 'underground' | 'athletic' | 'castle';
export type Kind = 'walker' | 'turtle' | 'redturtle' | 'paratroopa' | 'piranha' | 'firebar' | 'podoboo' | 'boss' | 'lift';
export type Spawn = { kind: Kind; x: number; y: number; speed?: number; len?: number; range?: number; minX?: number; maxX?: number };
export type Deco = { type: 'hill' | 'bush' | 'cloud' | 'castle'; x: number; y: number; size: number };
export type LevelData = {
  world: number; stage: number; theme: Theme; night: boolean; width: number;
  tiles: string[][]; spawns: Spawn[]; decos: Deco[]; cannons: { c: number; r: number }[];
  startCol: number; checkpointCol: number | null; castleDoorX: number | null;
  flagCol: number | null; axe: { c: number; r: number } | null; bridge: { c0: number; c1: number; r: number } | null;
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

const SOLID = 'XB?MSmCE#[]{}Nn=T<>';

export function generateLevel(world: number, stage: number): LevelData {
  const rnd = mulberry32(world * 9973 + stage * 131 + 7);
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p: number) => rnd() < p;
  const theme = (['overworld', 'underground', 'athletic', 'castle'] as const)[stage - 1];
  const diff = world - 1 + (stage - 1) * 0.25;
  const maxWidth = 600;
  const g = Array.from({ length: ROWS }, () => Array<string>(maxWidth).fill(' '));
  const spawns: Spawn[] = [];
  const decos: Deco[] = [];
  const cannons: LevelData['cannons'] = [];
  let checkpointCol: number | null = null;

  const set = (c: number, r: number, ch: string) => {
    if (c >= 0 && c < maxWidth && r >= 0 && r < ROWS) g[r][c] = ch;
  };
  const get = (c: number, r: number) => g[r]?.[c] ?? ' ';
  const ground = (c0: number, c1: number, top = 13) => {
    for (let c = c0; c < c1; c++) for (let r = top; r < ROWS; r++) set(c, r, 'X');
  };
  const enemy = (kind: Spawn['kind'], c: number, from = 10) => {
    let r = from;
    while (r < ROWS && !SOLID.includes(get(c, r))) r++;
    if (r === ROWS || r < 1 || SOLID.includes(get(c, r - 1))) return;
    const h = kind === 'walker' ? 16 : 24;
    spawns.push({ kind, x: c * TILE, y: r * TILE - h });
  };
  const pickEnemy = () => {
    const pool: Spawn['kind'][] = ['walker', 'walker'];
    if (diff >= 0.5) pool.push('turtle');
    if (diff >= 1.5) pool.push('paratroopa');
    if (diff >= 2) pool.push('redturtle');
    if (diff >= 4) pool.push('turtle', 'paratroopa', 'redturtle');
    return pool[ri(0, pool.length - 1)];
  };
  const placeEnemies = (c0: number, c1: number, from = 10) => {
    const n = Math.min(4, ri(1, 1 + Math.floor(diff / 2.5)));
    let c = ri(c0, Math.max(c0, c1 - n * 2));
    const kind = pickEnemy();
    for (let i = 0; i < n && c < c1; i++, c += 2) {
      enemy(i === 0 || chance(0.6) ? kind : pickEnemy(), c, from);
    }
  };
  const pipe = (x: number, h: number, piranhaChance: number) => {
    const top = 13 - h;
    set(x, top, '[');
    set(x + 1, top, ']');
    for (let r = top + 1; r <= 12; r++) {
      set(x, r, '{');
      set(x + 1, r, '}');
    }
    if (chance(piranhaChance)) spawns.push({ kind: 'piranha', x: x * TILE + 8, y: top * TILE });
  };

  const chunkPlain = (c: number) => {
    const w = ri(8, 13);
    ground(c, c + w);
    placeEnemies(c + 2, c + w - 1);
    return c + w;
  };
  const chunkBlocks = (c: number) => {
    const w = ri(10, 14);
    ground(c, c + w);
    const len = ri(3, 6);
    const bc = c + ri(2, w - len - 1);
    for (let i = 0; i < len; i++) set(bc + i, 9, chance(0.45) ? '?' : 'B');
    if (chance(0.6)) set(bc + ri(0, len - 1), 9, chance(0.5) ? 'M' : 'm');
    if (chance(0.18)) set(bc + ri(0, len - 1), 9, 'C');
    if (chance(0.08)) set(bc + ri(0, len - 1), 9, 'S');
    if (chance(0.45)) {
      const uc = bc + ri(0, Math.max(0, len - 2));
      set(uc, 5, '?');
      if (chance(0.5)) set(uc + 1, 5, 'B');
    }
    if (chance(0.1) && get(c + w - 2, 9) === ' ') set(c + w - 2, 9, 'U');
    placeEnemies(c + 1, c + w - 1);
    return c + w;
  };
  const chunkPipes = (c: number, maxH: number) => {
    let x = c + ri(2, 3);
    const n = ri(1, 2);
    const pc = diff >= 1 ? Math.min(0.85, 0.3 + diff * 0.08) : 0;
    for (let i = 0; i < n; i++) {
      pipe(x, ri(2, maxH), pc);
      x += 2;
      const gap = ri(3, 6);
      if (gap >= 4 && chance(0.6)) enemy('walker', x + 1);
      x += gap;
    }
    ground(c, x);
    return x;
  };
  const chunkGap = (c: number) => {
    const a = ri(2, 4);
    ground(c, c + a);
    const gw = ri(2, Math.min(4, 2 + Math.floor(diff / 2)));
    if (chance(0.45)) {
      for (let i = 0; i < gw; i++) set(c + a + i, i > 0 && i < gw - 1 ? 8 : 9, 'o');
    }
    const b = ri(2, 4);
    ground(c + a + gw, c + a + gw + b);
    return c + a + gw + b;
  };
  const chunkStairs = (c: number) => {
    const h = ri(3, 4);
    ground(c, c + 1);
    let x = c + 1;
    for (let k = 0; k < h; k++) {
      ground(x + k, x + k + 1);
      for (let j = 0; j <= k; j++) set(x + k, 12 - j, '#');
    }
    x += h;
    if (diff >= 1 && chance(0.6)) x += 2;
    for (let k = 0; k < h; k++) {
      ground(x + k, x + k + 1);
      for (let j = 0; j < h - k; j++) set(x + k, 12 - j, '#');
    }
    x += h;
    ground(x, x + 3);
    return x + 3;
  };
  const chunkFloating = (c: number) => {
    const w = ri(13, 16);
    ground(c, c + w);
    if (diff >= 1 && chance(0.5)) {
      const g0 = c + ri(5, 7), gl = ri(2, 3);
      for (let x = g0; x < g0 + gl; x++) {
        set(x, 13, ' ');
        set(x, 14, ' ');
      }
    }
    for (let x = c + 2; x < c + 6; x++) set(x, 9, chance(0.3) ? '?' : 'B');
    for (let x = c + 6; x < c + w - 1; x++) set(x, 5, chance(0.25) ? '?' : 'B');
    enemy('walker', c + 8, 3);
    if (diff >= 1) enemy('walker', c + 10, 3);
    return c + w;
  };
  const chunkCannons = (c: number) => {
    const w = ri(10, 13);
    ground(c, c + w);
    const n = ri(1, 2);
    for (let i = 0; i < n; i++) {
      const x = c + 2 + i * 5;
      const h = ri(1, 2);
      set(x, 13 - h, 'N');
      for (let r = 14 - h; r <= 12; r++) set(x, r, 'n');
      cannons.push({ c: x, r: 13 - h });
    }
    return c + w;
  };
  const chunkRaised = (c: number) => {
    const w = ri(7, 11), top = ri(10, 11);
    ground(c, c + 2);
    ground(c + 2, c + 2 + w, top);
    placeEnemies(c + 3, c + 1 + w, 3);
    ground(c + 2 + w, c + 4 + w);
    return c + 4 + w;
  };
  const chunkPillars = (c: number) => {
    const w = 12;
    ground(c, c + w);
    for (const x of [c + 3, c + 8]) {
      const h = ri(2, 4);
      for (let r = 12; r > 12 - h; r--) {
        set(x, r, 'B');
        set(x + 1, r, 'B');
      }
      set(x, 12 - h, 'o');
      set(x + 1, 12 - h, 'o');
    }
    enemy(pickEnemy(), c + 6);
    return c + w;
  };
  const chunkCoinShelf = (c: number) => {
    const w = 12;
    ground(c, c + w);
    for (let x = c + 2; x < c + 10; x++) {
      set(x, 9, x === c + 5 ? 'M' : 'B');
      set(x, 12, 'o');
    }
    for (let x = c + 3; x < c + 9; x++) set(x, 8, 'o');
    placeEnemies(c + 2, c + 10);
    return c + w;
  };

  let width: number;
  let flagCol: number | null = null;
  let castleDoorX: number | null = null;
  let axe: LevelData['axe'] = null;
  let bridge: LevelData['bridge'] = null;
  const startCol = 3;

  const ending = (c: number) => {
    ground(c, c + 3);
    let x = c + 3;
    for (let k = 0; k < 8; k++) {
      ground(x + k, x + k + 1);
      for (let j = 0; j <= k; j++) set(x + k, 12 - j, '#');
    }
    x += 8;
    ground(x, x + 1);
    for (let j = 0; j < 8; j++) set(x, 12 - j, '#');
    x += 1;
    ground(x, x + 30);
    flagCol = x + 4;
    set(flagCol, 12, '#');
    const castleCol = flagCol + 5;
    decos.push({ type: 'castle', x: castleCol * TILE, y: 13 * TILE, size: 1 });
    castleDoorX = castleCol * TILE + 32;
    return x + 30;
  };

  if (theme === 'overworld' || theme === 'underground') {
    ground(0, 16);
    let c = 16;
    const n = 8 + Math.floor(diff * 0.9);
    const under = theme === 'underground';
    const chunks = under
      ? [chunkPlain, chunkBlocks, (x: number) => chunkPipes(x, 3), chunkGap, chunkPillars, chunkCoinShelf, chunkRaised]
      : [chunkPlain, chunkBlocks, chunkBlocks, (x: number) => chunkPipes(x, diff >= 2 ? 4 : 3), chunkGap, chunkStairs, chunkFloating, chunkRaised];
    if (!under && diff >= 2) chunks.push(chunkCannons);
    c = chunkBlocks(c);
    for (let i = 0; i < n; i++) {
      if (i === Math.floor(n / 2)) {
        ground(c, c + 8);
        checkpointCol = c + 3;
        c += 8;
      }
      c = chunks[ri(0, chunks.length - 1)](c);
    }
    if (under) {
      for (let x = 0; x < c; x++) set(x, 2, 'B');
      for (let r = 3; r <= 12; r++) set(0, r, 'B');
    }
    width = ending(c);
  } else if (theme === 'athletic') {
    ground(0, 14);
    let c = 14;
    let tr = 13;
    const n = 14 + Math.floor(diff);
    const treetop = (x: number, w: number, row: number) => {
      set(x, row, '<');
      for (let i = 1; i < w - 1; i++) set(x + i, row, 'T');
      set(x + w - 1, row, '>');
      const trunk = x + Math.floor(w / 2);
      for (let r = row + 1; r < ROWS; r++) set(trunk, r, '|');
    };
    for (let i = 0; i < n; i++) {
      if (i === Math.floor(n / 2)) {
        c += 2;
        ground(c, c + 8);
        checkpointCol = c + 3;
        c += 8;
        tr = 13;
      }
      let maxUp = 3;
      if (diff >= 1 && chance(0.25)) {
        const gw = ri(5, 7);
        spawns.push({ kind: 'lift', x: c * TILE + gw * TILE / 2 - 24, y: Math.min(tr, 12) * TILE, range: (gw * TILE - 48) / 2 });
        c += gw;
        maxUp = 0;
      } else {
        const gap = ri(2, Math.min(4, 2 + Math.floor(diff / 2)));
        c += gap;
        if (gap >= 4) maxUp = 2;
      }
      const newTr = Math.max(6, Math.min(12, tr + ri(-maxUp, 2), tr === 13 ? 12 : 99));
      const minW = Math.max(3, 7 - Math.floor(diff / 2));
      const w = ri(minW, Math.max(minW, 9 - Math.floor(diff / 3)));
      tr = Math.max(newTr, tr - maxUp);
      treetop(c, w, tr);
      if (chance(0.4)) for (let x = c + 1; x < c + w - 1; x++) set(x, tr - 2, 'o');
      if (w >= 4 && chance(0.35 + diff * 0.05)) {
        const k = pickEnemy();
        enemy(k === 'turtle' ? 'redturtle' : k, c + Math.floor(w / 2), 3);
      }
      if (chance(0.15)) set(c + Math.floor(w / 2), tr - 4, chance(0.5) ? 'M' : '?');
      c += w;
    }
    width = ending(c + 2);
  } else {
    const ceil = (c0: number, c1: number, bottom = 2) => {
      for (let x = c0; x < c1; x++) for (let r = 0; r <= bottom; r++) set(x, r, 'X');
    };
    const lava = (c0: number, c1: number) => {
      for (let x = c0; x < c1; x++) {
        set(x, 13, 'L');
        set(x, 14, 'l');
      }
    };
    const firebar = (c: number, r: number, long = false) => {
      set(c, r, 'E');
      const speed = (chance(0.5) ? 1 : -1) * (0.025 + Math.min(diff, 9) * 0.003);
      const len = long && diff >= 6 && chance(0.4) ? 12 : 6;
      spawns.push({ kind: 'firebar', x: c * TILE + 8, y: r * TILE + 8, speed, len });
    };
    const podoboo = (c: number, w: number) => {
      spawns.push({ kind: 'podoboo', x: c * TILE + w * TILE / 2 - 7, y: 240 });
    };
    ground(0, 12);
    set(7, 9, 'M');
    let c = 12;
    const n = 6 + Math.floor(diff * 0.7);
    for (let i = 0; i < n; i++) {
      const kind = ri(0, 4);
      if (kind === 0) {
        const w = ri(8, 12);
        ground(c, c + w);
        firebar(c + ri(3, w - 3), 9, true);
        if (chance(0.3)) enemy('walker', c + w - 2);
        c += w;
      } else if (kind === 1) {
        ground(c, c + 2);
        const gw = ri(2, Math.min(4, 2 + Math.floor(diff / 3)));
        lava(c + 2, c + 2 + gw);
        podoboo(c + 2, gw);
        ground(c + 2 + gw, c + 4 + gw);
        c += 4 + gw;
      } else if (kind === 2) {
        const w = ri(8, 12);
        ground(c, c + w);
        ceil(c, c + w, 6);
        firebar(c + ri(3, w - 3), 12);
        c += w;
      } else if (kind === 3) {
        const w = ri(6, 9);
        ground(c, c + 1);
        ground(c + 1, c + 1 + w, 10);
        if (chance(0.5)) firebar(c + 1 + Math.floor(w / 2), 6);
        ground(c + 1 + w, c + 3 + w);
        c += 3 + w;
      } else {
        const pillars = ri(2, 3);
        ground(c, c + 2);
        c += 2;
        for (let p = 0; p < pillars; p++) {
          const gw = ri(2, 3);
          lava(c, c + gw);
          if (chance(0.5)) podoboo(c, gw);
          c += gw;
          ground(c, c + 2, ri(10, 12));
          c += 2;
        }
        lava(c, c + 2);
        ground(c + 2, c + 4);
        c += 4;
      }
      if (i === Math.floor(n / 2)) {
        ground(c, c + 3);
        set(c + 1, 9, chance(0.5) ? 'M' : '?');
        c += 3;
      }
    }

    ground(c, c + 3);
    ground(c + 3, c + 5, 11);
    ground(c + 5, c + 10, 9);
    const b0 = c + 10, b1 = b0 + 13;
    for (let x = b0; x < b1; x++) set(x, 9, '=');
    lava(b0, b1);
    ground(b1, b1 + 4, 9);
    ceil(b1, b1 + 4, 5);
    for (let r = 3; r <= 14; r++) set(b1 + 4, r, 'X');
    set(b1, 8, 'A');
    axe = { c: b1, r: 8 };
    bridge = { c0: b0, c1: b1, r: 9 };
    spawns.push({ kind: 'boss', x: (b1 - 4) * TILE, y: 9 * TILE - 32, minX: (b1 - 8) * TILE, maxX: (b1 - 2) * TILE });
    width = b1 + 5;
    ceil(0, width, 2);
  }

  if (theme === 'overworld' || theme === 'athletic') {
    for (let x = 0; x < width; x += ri(6, 12)) {
      decos.push({ type: 'cloud', x: x * TILE, y: ri(1, 4) * TILE + 4, size: ri(1, 3) });
    }
  }
  if (theme === 'overworld') {
    for (let x = 0; x < width - 20; x += ri(8, 16)) {
      if (get(x, 13) !== 'X' || get(x + 3, 13) !== 'X' || get(x, 12) !== ' ') continue;
      if (chance(0.5)) decos.push({ type: 'hill', x: x * TILE, y: 13 * TILE, size: ri(1, 2) });
      else decos.push({ type: 'bush', x: x * TILE, y: 13 * TILE, size: ri(1, 3) });
    }
  }

  spawns.sort((a, b) => a.x - b.x);
  return {
    world, stage, theme, night: (theme === 'overworld' || theme === 'athletic') && world % 3 === 0,
    width, tiles: g.map(row => row.slice(0, width)), spawns, decos, cannons, startCol, checkpointCol,
    flagCol, castleDoorX, axe, bridge, time: theme === 'castle' ? 300 : 400,
  };
}
