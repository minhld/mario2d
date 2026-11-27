import { TILE, VIEW_H, type Kind, type LevelData, type Spawn } from './levels';

// Physics tuned to match the classic feel (pixels per frame at 60 fps).
export const WALK_MAX = 1.5;
const RUN_MAX = 2.5;
const WALK_ACC = 0.045;
const RUN_ACC = 0.065;
const FRICTION = 0.06;
const SKID_DEC = 0.14;
const MAX_FALL = 4.5;

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  a: boolean;
  b: boolean;
}
export type Session = { world: number; stage: number; lives: number; coins: number; score: number; size: number; checkpoint: boolean };
export type Status = 'playing' | 'dying' | 'flag' | 'walk' | 'tally' | 'axe';

type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean };
export type EntKind = Exclude<Kind, 'redturtle' | 'paratroopa'> |
  'shell' | 'mushroom' | 'flower' | 'star' | 'oneup' | 'fireball' | 'bullet' | 'bossfire';
export type Ent = Body & {
  kind: EntKind;
  id: number; dead: boolean; startX: number; startY: number; age: number; range: number; hp: number;
  flipped?: boolean; squash?: number; emerge?: number; winged?: boolean; red?: boolean;
  speed?: number; angle?: number; len?: number; minX?: number; maxX?: number;
  phase?: number; offset?: number; kickGrace?: number; revive?: number; chain?: number;
  fireT?: number; jumpT?: number; targetY?: number; hurt?: number;
};
export const newSession = (world: number): Session => ({ world, stage: 1, lives: 3, coins: 0, score: 0, size: 0, checkpoint: false });
type Bounds = Pick<Body, 'x' | 'y' | 'w' | 'h'>;
const overlap = (a: Bounds, b: Bounds, inset = 2) =>
  a.x + inset < b.x + b.w - inset && a.x + a.w - inset > b.x + inset &&
  a.y + inset < b.y + b.h - inset && a.y + a.h - inset > b.y + inset;
const solids = 'XB?MSmCE#[]{}Nn=T<>';
const STOMP_SCORES = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];
export type Effect = { kind: 'score' | 'coin' | 'debris'; x: number; y: number; vx: number; vy: number; t: number; text?: string };
type Bump = { c: number; r: number; t: number; ch: string };
const dimensions: Partial<Record<Ent['kind'], [number, number]>> = {
  turtle: [16, 24], lift: [48, 8], boss: [32, 32], fireball: [8, 8], bossfire: [24, 8],
  bullet: [16, 14], firebar: [8, 8], podoboo: [14, 14], piranha: [16, 24], shell: [16, 16],
};

export type Player = Body & { dir: number; inv: number; star: number; crouch: boolean; skid: boolean; walkPhase: number; jumpHold: number; jumpFall: number; takeoff: number; visible: boolean; onLift: number | null; chain: number };

export class Game {
  readonly tiles: string[][];
  readonly player: Player;
  ents: Ent[] = [];
  effects: Effect[] = [];
  bumps: Bump[] = [];
  readonly hidden = new Set<string>();
  readonly secVersion: number[];
  freeze = 0;
  morph: 'grow' | 'shrink' | 'fire' | null = null;
  flagY = 2 * TILE + 8;
  private bridgeLeft = -1;
  private nextId = 1;
  private readonly multiCoin = new Map<string, { start: number; hits: number }>();
  private readonly cannonT: number[];
  frame = 0;
  camX = 0;
  time: number;
  result: 'dead' | 'clear' | null = null;
  status: Status = 'playing';
  private statusTime = 0;
  private previousJump = false;
  private previousFire = false;
  private readonly spawns: Spawn[];
  private spawnIdx = 0;

  constructor(readonly level: LevelData, readonly session: Session, public viewW: number) {
    this.tiles = level.tiles.map(row => [...row]);
    this.time = level.time;
    this.secVersion = Array<number>(Math.ceil(level.width / 16)).fill(0);
    this.cannonT = level.cannons.map(() => Math.floor(Math.random() * 120));
    const start = (session.checkpoint ? level.checkpointCol : null) ?? level.startCol;
    let groundRow = 13;
    for (let r = 3; r < level.tiles.length; r++) {
      if (this.solid(start, r)) { groundRow = r; break; }
    }
    const height = session.size ? 32 : 16;
    this.player = {
      x: start * TILE + 2, y: groundRow * TILE - height, w: 12, h: height,
      vx: 0, vy: 0, onGround: true, dir: 1, inv: 0, star: 0, crouch: false, skid: false, walkPhase: 0, jumpHold: 0.125, jumpFall: 0.4375, takeoff: 0, chain: 0, visible: true, onLift: null,
    };
    this.spawns = level.spawns.filter(spawn => spawn.x > this.player.x + 64 || spawn.x < this.player.x - 400);
    this.camX = Math.max(0, Math.min(this.player.x - 48, this.maxCam()));
  }

  tile(c: number, r: number) {
    if (r < 0 || r >= this.tiles.length || c >= this.level.width) return ' ';
    return c < 0 ? '#' : this.tiles[r][c];
  }

  solid(c: number, r: number) {
    return solids.includes(this.tile(c, r));
  }

  setTile(c: number, r: number, ch: string) {
    if (c < 0 || c >= this.level.width || r < 0 || r >= this.tiles.length) return;
    this.tiles[r][c] = ch;
    this.secVersion[Math.floor(c / 16)]++;
  }

  bumpOffset(t: number) {
    return -[0, 3, 5, 6, 6, 5, 4, 3, 2, 1][Math.min(t, 9)];
  }

  setViewW(viewW: number) {
    this.viewW = viewW;
    this.camX = Math.min(this.camX, this.maxCam());
  }

  maxCam() {
    return Math.max(0, this.level.width * TILE - this.viewW);
  }

  private updateCamera() {
    const p = this.player;
    const target = p.x + p.w / 2 - this.viewW * 0.42;
    if (target > this.camX) this.camX = Math.min(target, this.maxCam());
  }

  private add(kind: Ent['kind'], x: number, y: number, vx = 0, range = 0) {
    const [w, h] = dimensions[kind] ?? [16, 16];
    const ent: Ent = { id: this.nextId++, kind, x, y, w, h, vx, vy: 0, onGround: false, dead: false, startX: x, startY: y, age: 0, range, hp: 5 };
    this.ents.push(ent);
    return ent;
  }

  addScore(value: number, x?: number, y?: number) {
    this.session.score += value;
    if (x !== undefined && y !== undefined) this.effects.push({ kind: 'score', x, y, vx: 0, vy: -1, t: 0, text: String(value) });
  }

  private oneUp(x: number, y: number) {
    this.session.lives++;
    this.effects.push({ kind: 'score', x, y, vx: 0, vy: -1, t: 0, text: '1UP' });
  }

  private chainScore(index: number, x: number, y: number) {
    if (index >= STOMP_SCORES.length) this.oneUp(x, y);
    else this.addScore(STOMP_SCORES[index], x, y);
  }

  private coin() {
    this.session.score += 200;
    if (++this.session.coins >= 100) {
      this.session.lives++;
      this.session.coins -= 100;
    }
  }

  private coinPop(c: number, r: number) {
    this.coin();
    this.effects.push({ kind: 'coin', x: c * TILE + 4, y: r * TILE - 16, vx: 0, vy: -5, t: 0 });
  }

  private bumpAbove(c: number, r: number) {
    const x = c * TILE, top = r * TILE;
    for (const e of this.ents) {
      if (e.dead || e.flipped || Math.abs(e.y + e.h - top) > 3 || e.x + e.w <= x || e.x >= x + TILE) continue;
      const dir = e.x + e.w / 2 < x + 8 ? -1 : 1;
      if (e.kind === 'walker' || e.kind === 'turtle' || e.kind === 'shell') this.knockOut(e, 100, dir);
      else if (e.kind === 'mushroom' || e.kind === 'oneup' || e.kind === 'star') {
        e.vy = -4;
        e.vx = dir * Math.abs(e.vx || 1);
      }
    }
    if (this.tile(c, r - 1) === 'o') {
      this.setTile(c, r - 1, ' ');
      this.coinPop(c, r);
    }
  }

  private hitBlock(c: number, r: number) {
    const tile = this.tile(c, r);
    const x = c * TILE, y = r * TILE;
    const key = c + ',' + r;
    if (this.hidden.has(key)) return;

    if (tile === 'B' && this.session.size) {
      this.setTile(c, r, ' ');
      this.addScore(50);
      this.bumpAbove(c, r);
      for (const [dx, dy, vx, vy] of [[0, 0, -1, -6], [8, 0, 1, -6], [0, 8, -1, -4], [8, 8, 1, -4]]) {
        this.effects.push({ kind: 'debris', x: x + dx, y: y + dy, vx, vy, t: 0 });
      }
      return;
    }
    if (tile === '?' || tile === 'C') {
      this.coinPop(c, r);
      if (tile === '?') this.setTile(c, r, 'E');
      else {
        const block = this.multiCoin.get(key) ?? { start: this.frame, hits: 0 };
        block.hits++;
        if (block.hits >= 10 || this.frame - block.start > 240) {
          this.setTile(c, r, 'E');
          this.multiCoin.delete(key);
        } else this.multiCoin.set(key, block);
      }
    } else if ('MmSU'.includes(tile)) {
      const kind = tile === 'U' ? 'oneup' : tile === 'S' ? 'star' : this.session.size ? 'flower' : 'mushroom';
      this.add(kind, x, y).emerge = 32;
      this.setTile(c, r, 'E');
    } else if (tile !== 'B') return;

    this.bumps.push({ c, r, t: 0, ch: this.tile(c, r) });
    this.hidden.add(key);
    this.secVersion[Math.floor(c / 16)]++;
    this.bumpAbove(c, r);
  }

  private updateEffects() {
    const spawned: Effect[] = [];
    this.effects = this.effects.filter(effect => {
      effect.t++;
      effect.x += effect.vx;
      effect.y += effect.vy;
      if (effect.kind === 'score') {
        effect.vy = effect.t < 30 ? -1 : 0;
        return effect.t < 50;
      }
      effect.vy += effect.kind === 'coin' ? 0.35 : 0.3;
      if (effect.kind === 'coin' && effect.t >= 26) {
        spawned.push({ kind: 'score', x: effect.x, y: effect.y, vx: 0, vy: -1, t: 0, text: '200' });
        return false;
      }
      return effect.y < VIEW_H + 16;
    });
    this.effects.push(...spawned);
    this.bumps = this.bumps.filter(bump => {
      if (++bump.t < 10) return true;
      this.hidden.delete(bump.c + ',' + bump.r);
      this.secVersion[Math.floor(bump.c / 16)]++;
      return false;
    });
  }

  private moveX(e: Body) {
    e.x += e.vx;
    const top = Math.floor(e.y / TILE);
    const bot = Math.floor((e.y + e.h - 0.01) / TILE);
    if (e.vx > 0) {
      const c = Math.floor((e.x + e.w - 0.01) / TILE);
      for (let r = top; r <= bot; r++) {
        if (this.solid(c, r)) { e.x = c * TILE - e.w; return true; }
      }
    } else if (e.vx < 0) {
      const c = Math.floor(e.x / TILE);
      for (let r = top; r <= bot; r++) {
        if (this.solid(c, r)) { e.x = (c + 1) * TILE; return true; }
      }
    }
    return false;
  }

  /** Returns the column and row of a ceiling block hit. */
  private moveY(e: Body, isPlayer = false): { c: number; r: number } | null {
    e.y += e.vy;
    e.onGround = false;
    const left = Math.floor(e.x / TILE);
    const right = Math.floor((e.x + e.w - 0.01) / TILE);
    if (e.vy >= 0) {
      const r = Math.floor((e.y + e.h - 0.01) / TILE);
      for (let c = left; c <= right; c++) {
        if (this.solid(c, r)) {
          e.y = r * TILE - e.h;
          e.vy = 0;
          e.onGround = true;
          return null;
        }
      }
    } else {
      const r = Math.floor(e.y / TILE);
      const hits: number[] = [];
      for (let c = left; c <= right; c++) {
        if (this.solid(c, r) || (isPlayer && this.tile(c, r) === 'U')) hits.push(c);
      }
      if (hits.length) {
        e.y = (r + 1) * TILE;
        e.vy = 0;
        const center = Math.floor((e.x + e.w / 2) / TILE);
        return { c: hits.includes(center) ? center : hits[0], r };
      }
    }
    return null;
  }

  private resize(height: number) {
    this.player.y += this.player.h - height;
    this.player.h = height;
  }

  private hurt() {
    const p = this.player;
    if (p.inv || p.star || this.status !== 'playing' || this.freeze) return;
    if (this.session.size) {
      this.session.size = 0;
      p.crouch = false;
      this.resize(16);
      p.inv = 120;
      this.freeze = 50;
      this.morph = 'shrink';
    } else {
      this.die();
    }
  }

  die() {
    if (this.status === 'dying') return;
    this.status = 'dying';
    this.statusTime = 0;
    this.session.size = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.resize(16);
  }

  private stepPlayer(input: Input) {
    const p = this.player;
    p.inv = Math.max(0, p.inv - 1);
    p.star = Math.max(0, p.star - 1);
    if (p.onLift !== null) {
      const lift = this.ents.find(e => e.id === p.onLift);
      if (lift && !lift.dead) {
        p.x += lift.vx;
        p.y = lift.y - p.h;
      }
    }
    if (this.session.size > 0 && p.onGround) {
      if (input.down && !p.crouch) {
        p.crouch = true;
        this.resize(16);
      } else if (!input.down && p.crouch) {
        const top = Math.floor((p.y + p.h - 32) / TILE);
        const bottom = Math.floor((p.y - 0.01) / TILE);
        let room = true;
        for (let row = top; row <= bottom; row++) {
          for (let col = Math.floor(p.x / TILE); col <= Math.floor((p.x + p.w - 0.01) / TILE); col++) {
            if (this.solid(col, row)) room = false;
          }
        }
        if (room) { p.crouch = false; this.resize(32); }
      }
    }
    let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (p.crouch && p.onGround) dir = 0;
    const max = input.b ? RUN_MAX : WALK_MAX;
    const acc = input.b ? RUN_ACC : WALK_ACC;
    p.skid = false;
    if (dir !== 0) {
      if (p.onGround && p.vx * dir < 0) {
        p.vx += dir * SKID_DEC;
        p.skid = true;
        if (p.vx * dir > 0) p.vx = 0;
      } else {
        p.vx += dir * acc;
        const limit = p.onGround ? max : Math.max(max, p.takeoff);
        if (Math.abs(p.vx) > limit) {
          p.vx = p.onGround ? Math.sign(p.vx) * Math.max(limit, Math.abs(p.vx) - FRICTION) : Math.sign(p.vx) * limit;
        }
      }
      if (p.onGround) p.dir = dir;
    } else if (p.onGround) {
      if (Math.abs(p.vx) <= FRICTION) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * FRICTION;
    }

    const jump = input.a || input.up;
    if (jump && !this.previousJump && p.onGround) {
      const s = Math.abs(p.vx);
      if (s < 1) { p.vy = -4; p.jumpHold = 0.125; p.jumpFall = 0.4375; }
      else if (s < 2.3) { p.vy = -4; p.jumpHold = 0.117; p.jumpFall = 0.375; }
      else { p.vy = -5; p.jumpHold = 0.156; p.jumpFall = 0.5625; }
      p.takeoff = s;
      p.onGround = false;
    }
    this.previousJump = jump;
    p.vy = Math.min(MAX_FALL, p.vy + (p.vy < 0 && jump ? p.jumpHold : p.jumpFall));
    if (input.b && !this.previousFire && this.session.size === 2 && !p.crouch &&
        this.ents.filter(e => e.kind === 'fireball').length < 2) {
      this.add('fireball', p.dir > 0 ? p.x + p.w : p.x - 8, p.y + 6, p.dir * 4).vy = 2;
    }
    this.previousFire = input.b;
    if (this.moveX(p)) p.vx = 0;
    if (p.x < this.camX) { p.x = this.camX; if (p.vx < 0) p.vx = 0; }
    if (p.x > this.level.width * TILE - p.w) { p.x = this.level.width * TILE - p.w; p.vx = 0; }
    const beforeBottom = p.y + p.h;
    const head = this.moveY(p, true);
    if (head) this.hitBlock(head.c, head.r);
    p.onLift = null;
    if (!p.onGround && p.vy >= 0) {
      const platform = this.ents.find(e => e.kind === 'lift' && p.x < e.x + e.w && p.x + p.w > e.x &&
        beforeBottom <= e.y + 4 && p.y + p.h >= e.y);
      if (platform) {
        p.y = platform.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.onLift = platform.id;
      }
    }
    if (p.onGround) {
      p.chain = 0;
      p.jumpFall = 0.4375;
      p.walkPhase += Math.abs(p.vx);
    }
  }

  private knockOut(e: Ent, score: number, dir: number) {
    e.flipped = true;
    e.vy = -3;
    e.vx = dir * 0.8;
    if (e.kind === 'turtle' || e.kind === 'shell') e.h = 16;
    if (score) this.addScore(score, e.x, e.y);
  }

  private kickShell(e: Ent) {
    const p = this.player;
    e.vx = p.x + p.w / 2 < e.x + e.w / 2 ? 3 : -3;
    e.kickGrace = 12;
    e.chain = 2;
    e.revive = 0;
    this.addScore(400, e.x, e.y);
  }

  private interact(e: Ent) {
    const p = this.player;
    if (e.dead || e.flipped || e.squash !== undefined || e.emerge || e.kickGrace) return;
    if (e.kind === 'firebar') {
      for (let i = 0; i < (e.len ?? 6); i++) {
        const x = e.startX + Math.cos(e.angle ?? 0) * i * 8 - 4;
        const y = e.startY + Math.sin(e.angle ?? 0) * i * 8 - 4;
        if (overlap(p, { x, y, w: 8, h: 8 })) {
          this.hurt();
          break;
        }
      }
      return;
    }
    if (!overlap(p, e)) return;
    switch (e.kind) {
      case 'lift': case 'fireball': return;
      case 'mushroom': case 'flower':
        e.dead = true;
        this.addScore(1000, e.x, e.y);
        if (this.session.size === 0) {
          this.session.size = 1;
          p.crouch = false;
          this.resize(32);
          this.freeze = 50;
          this.morph = 'grow';
        } else if (e.kind === 'flower' && this.session.size === 1) {
          this.session.size = 2;
          this.freeze = 40;
          this.morph = 'fire';
        }
        return;
      case 'oneup':
        e.dead = true;
        this.oneUp(e.x, e.y);
        return;
      case 'star':
        e.dead = true;
        p.star = 660;
        this.addScore(1000, e.x, e.y);
        return;
      case 'piranha':
        if ((e.offset ?? 24) >= 22) return;
        if (p.star) this.knockOut(e, 200, p.dir);
        else this.hurt();
        return;
      case 'walker': case 'turtle': case 'shell': case 'bullet': break;
      default: this.hurt(); return;
    }
    if (p.star) {
      this.knockOut(e, 0, p.x < e.x ? 1 : -1);
      this.chainScore(Math.min(p.chain++, 9), e.x, e.y);
      return;
    }
    if (p.vy > 0 && p.y + p.h - e.y < 10) {
      p.vy = -4;
      p.jumpHold = 0.125;
      if (e.kind === 'walker') {
        e.squash = 30;
        e.vx = 0;
      } else if (e.kind === 'turtle') {
        if (e.winged) {
          e.winged = false;
          e.vy = 0;
        } else {
          e.kind = 'shell';
          e.y += 8;
          e.h = 16;
          e.vx = 0;
          e.revive = 0;
          e.kickGrace = 10;
        }
      } else if (e.kind === 'shell') {
        if (!e.vx) { this.kickShell(e); return; }
        e.vx = 0;
        e.revive = 0;
        e.kickGrace = 10;
      } else this.knockOut(e, 0, 0);
      this.chainScore(p.chain++, e.x, e.y);
    } else if (e.kind === 'shell' && !e.vx) this.kickShell(e);
    else this.hurt();
  }

  private spawnAhead() {
    const near = this.camX + this.viewW + 32;
    while (this.spawnIdx < this.spawns.length && this.spawns[this.spawnIdx].x < near) {
      const s = this.spawns[this.spawnIdx++];
      const kind = s.kind === 'redturtle' || s.kind === 'paratroopa' ? 'turtle' : s.kind;
      const still = s.kind === 'lift' || s.kind === 'piranha' || s.kind === 'firebar' || s.kind === 'podoboo';
      const e = this.add(kind, s.x, s.kind === 'podoboo' ? 250 : s.y, still ? 0 : -0.5, s.range ?? 32);
      e.red = s.kind === 'redturtle';
      e.winged = s.kind === 'paratroopa';
      if (s.kind === 'firebar') {
        e.angle = Math.random() * Math.PI * 2;
        e.speed = s.speed ?? 0.03;
        e.len = s.len ?? 6;
      }
      if (s.kind === 'podoboo') e.age = Math.floor(Math.random() * 90);
      if (s.kind === 'boss') {
        e.minX = s.minX;
        e.maxX = s.maxX;
        e.fireT = 90;
        e.jumpT = 120;
      }
    }
  }

  private updateCannons() {
    this.level.cannons.forEach(({ c, r }, i) => {
      const x = c * TILE;
      if (x < this.camX - 16 || x > this.camX + this.viewW + 16) return;
      const period = 200 - Math.min(80, this.level.world * 8);
      if (++this.cannonT[i] > period && Math.abs(this.player.x - x) > 36) {
        this.cannonT[i] = Math.floor(Math.random() * 60);
        this.add('bullet', x, r * TILE + 1, this.player.x < x ? -1.5 : 1.5);
      }
    });
  }

  private updateLifts() {
    for (const e of this.ents) {
      if (e.kind !== 'lift') continue;
      const x = e.startX + Math.sin(++e.age * 0.02) * e.range;
      e.vx = x - e.x;
      e.x = x;
    }
  }

  private updatePiranha(e: Ent) {
    const p = this.player;
    const near = Math.abs(p.x + p.w / 2 - (e.x + 8)) < 28;
    let offset = e.offset ?? 24;
    switch (e.phase ?? 0) {
      case 0:
        if (e.age > 90 && !near) { e.phase = 1; e.age = 0; }
        break;
      case 1:
        offset = Math.max(0, offset - 0.75);
        if (offset === 0) { e.phase = 2; e.age = 0; }
        break;
      case 2:
        if (e.age > 60) { e.phase = 3; e.age = 0; }
        break;
      case 3:
        offset = Math.min(24, offset + 0.75);
        if (offset === 24) { e.phase = 0; e.age = 0; }
        break;
    }
    e.offset = offset;
    e.y = e.startY - 24 + offset;
  }

  private updateBoss(e: Ent) {
    if (e.hurt) e.hurt--;
    if (e.x <= (e.minX ?? e.startX - 64)) e.vx = 0.5;
    if (e.x >= (e.maxX ?? e.startX + 32)) e.vx = -0.5;
    e.x += e.vx;
    this.gravityBody(e, 0.25);
    this.moveY(e);
    e.jumpT = (e.jumpT ?? 0) - 1;
    if (e.onGround && e.jumpT <= 0) {
      e.vy = -4;
      e.jumpT = 90 + Math.floor(Math.random() * 120);
    }
    e.fireT = (e.fireT ?? 0) - 1;
    if (e.x < this.camX + this.viewW && e.fireT <= 0) {
      const p = this.player;
      const left = p.x < e.x;
      const shot = this.add('bossfire', left ? e.x - 24 : e.x + e.w, e.y + 8, left ? -1.6 : 1.6);
      shot.targetY = Math.random() < 0.5 ? p.y + p.h - 12 : e.y + 8;
      e.fireT = Math.max(70, 170 - this.level.world * 9) + Math.floor(Math.random() * 60);
    }
  }

  private updateEnt(e: Ent) {
    if (e.kind === 'lift' || e.dead) return;
    e.age++;
    if (e.flipped) {
      e.vy += 0.3;
      e.x += e.vx;
      e.y += e.vy;
      if (e.y > VIEW_H + 32) e.dead = true;
      return;
    }
    if (e.x + e.w < this.camX - 96 && e.kind !== 'firebar' && e.kind !== 'boss' ||
        e.y > VIEW_H + 32 && e.kind !== 'podoboo') {
      e.dead = true;
      return;
    }
    if (e.squash !== undefined) {
      if (--e.squash <= 0) e.dead = true;
      return;
    }
    if (e.emerge) {
      e.emerge--;
      e.y -= 0.5;
      if (!e.emerge && e.kind !== 'flower') e.vx = e.kind === 'star' ? 1.2 : 1;
      return;
    }
    switch (e.kind) {
      case 'flower': return;
      case 'piranha': this.updatePiranha(e); return;
      case 'firebar': e.angle = (e.angle ?? 0) + (e.speed ?? 0.03); return;
      case 'boss': this.updateBoss(e); return;
      case 'podoboo':
        if (e.y >= e.startY && e.vy >= 0) {
          e.y = e.startY;
          e.vy = 0;
          if (e.age > 150) { e.vy = -7.2; e.age = 0; }
        } else e.vy += 0.2;
        e.y += e.vy;
        return;
      case 'bullet': case 'bossfire':
        e.x += e.vx;
        if (e.targetY !== undefined && Math.abs(e.y - e.targetY) > 0.5) e.y += Math.sign(e.targetY - e.y) * 0.5;
        if (e.x < this.camX - 48 || e.x > this.camX + this.viewW + 48) e.dead = true;
        return;
    }
    if (e.kind === 'shell') {
      if (e.kickGrace) e.kickGrace--;
      this.gravityBody(e);
      if (e.vx === 0) {
        e.revive = (e.revive ?? 0) + 1;
        if (e.revive > 480) {
          e.kind = 'turtle';
          e.y -= 8;
          e.h = 24;
          e.vx = this.player.x < e.x ? -0.5 : 0.5;
          e.revive = 0;
        }
      } else if (this.moveX(e)) e.vx = -e.vx;
      this.moveY(e);
      if (e.vx !== 0 && e.x > this.camX + this.viewW + 64) e.dead = true;
      return;
    }
    if (e.kind === 'fireball') {
      this.updateFireball(e);
      return;
    }
    this.gravityBody(e, e.winged || e.kind === 'star' ? 0.2 : 0.3);
    if (this.moveX(e)) e.vx = -e.vx;
    this.moveY(e);
    if (e.onGround) {
      if (e.kind === 'star') e.vy = -4.5;
      else if (e.winged) e.vy = -3.5;
    }
    if (e.red && !e.winged && e.kind === 'turtle' && e.onGround) {
      const ahead = Math.floor((e.vx < 0 ? e.x - 1 : e.x + e.w) / TILE);
      if (!this.solid(ahead, Math.floor((e.y + e.h + 1) / TILE))) e.vx = -e.vx;
    }
    if ((e.kind === 'mushroom' || e.kind === 'oneup' || e.kind === 'star') &&
        e.x > this.camX + this.viewW + 64) e.dead = true;
  }

  private gravityBody(e: Ent, gravity = 0.3) {
    e.vy = Math.min(MAX_FALL, e.vy + gravity);
  }

  private updateFireball(e: Ent) {
    e.vy = Math.min(4, e.vy + 0.35);
    if (this.moveX(e)) { e.dead = true; return; }
    this.moveY(e);
    if (e.onGround) e.vy = -3;
    if (e.x < this.camX - 16 || e.x > this.camX + this.viewW + 16) { e.dead = true; return; }
    for (const target of this.ents) {
      if (target === e || target.dead || target.flipped || !overlap(e, target, 0)) continue;
      if (target.kind === 'walker' || target.kind === 'turtle' || target.kind === 'shell' ||
          (target.kind === 'piranha' && (target.offset ?? 24) < 22)) {
        this.knockOut(target, 200, Math.sign(e.vx));
      } else if (target.kind === 'boss') {
        target.hurt = 10;
        if (--target.hp <= 0) this.knockOut(target, 5000, Math.sign(e.vx));
      } else continue;
      e.dead = true;
      break;
    }
  }

  private enemyInteractions() {
    const walkers = this.ents.filter(e => !e.dead && !e.flipped && e.squash === undefined &&
      (e.kind === 'walker' || e.kind === 'turtle' || e.kind === 'shell'));
    for (const [i, a] of walkers.entries()) {
      for (let j = i + 1; j < walkers.length; j++) {
        const b = walkers[j];
        if (a.flipped || b.flipped || !overlap(a, b, 1)) continue;
        const movingA = a.kind === 'shell' && a.vx !== 0;
        const movingB = b.kind === 'shell' && b.vx !== 0;
        if (movingA && movingB) {
          this.knockOut(a, 0, Math.sign(a.vx));
          this.knockOut(b, 0, Math.sign(b.vx));
        } else if (movingA || movingB) {
          const shell = movingA ? a : b;
          const victim = movingA ? b : a;
          shell.chain = (shell.chain ?? 2) + 1;
          this.knockOut(victim, 0, Math.sign(shell.vx));
          this.chainScore(shell.chain, victim.x, victim.y);
        } else if (a.kind !== 'shell' && b.kind !== 'shell') {
          if ((b.x - a.x) * a.vx > 0) a.vx *= -1;
          if ((a.x - b.x) * b.vx > 0) b.vx *= -1;
        }
      }
    }
  }

  private startFlag(flagCol: number) {
    const p = this.player;
    this.status = 'flag';
    this.statusTime = 0;
    p.vx = p.vy = 0;
    p.crouch = false;
    if (this.session.size) this.resize(32);
    const pole = flagCol * TILE + 7;
    p.x = pole - p.w + 2;
    const h = 12 * TILE - (p.y + p.h);
    this.addScore(h >= 128 ? 5000 : h >= 96 ? 2000 : h >= 64 ? 800 : h >= 32 ? 400 : 100, pole + 4, p.y);
    this.ents = this.ents.filter(e => e.kind === 'lift');
  }

  private updateEnding() {
    const p = this.player;
    switch (this.status) {
      case 'dying':
        if (++this.statusTime === 30) p.vy = -5;
        if (this.statusTime > 30) p.y += (p.vy += 0.25);
        if (this.statusTime > 170) this.result = 'dead';
        break;
      case 'flag': {
        const base = 12 * TILE;
        if (p.y + p.h < base) p.y = Math.min(p.y + 2, base - p.h);
        if (this.flagY < 11 * TILE - 4) this.flagY += 2;
        if (p.y + p.h >= base && this.flagY >= 11 * TILE - 4) {
          if (++this.statusTime === 10) {
            p.dir = -1;
            p.x = (this.level.flagCol ?? 0) * TILE + 8;
          }
          if (this.statusTime > 35) { p.dir = 1; this.status = 'walk'; }
        }
        break;
      }
      case 'walk':
        p.vx = 1.2;
        p.vy = Math.min(MAX_FALL, p.vy + 0.4);
        this.moveX(p);
        this.moveY(p);
        p.walkPhase += p.vx;
        this.updateCamera();
        if (p.x >= (this.level.castleDoorX ?? 0)) {
          p.visible = false;
          this.status = 'tally';
          this.statusTime = 0;
        }
        break;
      case 'axe': {
        this.statusTime++;
        const bridge = this.level.bridge;
        if (bridge && this.bridgeLeft >= bridge.c0) {
          if (this.statusTime % 4 === 0) this.setTile(this.bridgeLeft--, bridge.r, ' ');
          return;
        }
        for (const boss of this.ents) boss.y += (boss.vy = Math.min(MAX_FALL, boss.vy + 0.25));
        this.ents = this.ents.filter(e => e.y <= VIEW_H + 40);
        if (!this.ents.length && this.statusTime > 60) {
          this.status = 'tally';
          this.statusTime = 0;
        }
        break;
      }
      case 'tally':
        if (this.time > 0) {
          const n = Math.min(this.time, 2);
          this.time -= n;
          this.addScore(50 * n);
        } else if (++this.statusTime > 90) this.result = 'clear';
        break;
    }
  }

  step(input: Input) {
    if (this.result) return;
    const p = this.player;
    this.frame++;
    this.updateEffects();
    if (this.status === 'dying') { this.updateEnding(); return; }
    if (this.freeze > 0) {
      this.previousJump = input.a || input.up;
      this.previousFire = input.b;
      if (--this.freeze === 0) this.morph = null;
      return;
    }
    if (this.status !== 'playing') { this.updateEnding(); return; }
    if (this.frame % 24 === 0 && this.time > 0 && --this.time === 0) { this.die(); return; }

    this.spawnAhead();
    this.updateLifts();
    this.stepPlayer(input);
    const { checkpointCol, flagCol, axe, bridge } = this.level;
    for (let r = Math.floor(p.y / TILE); r <= Math.floor((p.y + p.h - 0.01) / TILE); r++) {
      for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) {
        const tile = this.tile(c, r);
        if ((tile === 'L' || tile === 'l') && p.y + p.h > r * TILE + 6) { this.die(); return; }
        if (tile === 'o') { this.setTile(c, r, ' '); this.coin(); }
      }
    }
    if (p.y > VIEW_H + 8) { this.die(); return; }
    if (checkpointCol !== null && p.x > checkpointCol * TILE) this.session.checkpoint = true;
    if (flagCol !== null && p.x + p.w >= flagCol * TILE + 6) { this.startFlag(flagCol); return; }
    if (axe && overlap(p, { x: axe.c * TILE, y: axe.r * TILE, w: TILE, h: TILE }, 0)) {
      this.status = 'axe';
      this.statusTime = 0;
      this.bridgeLeft = bridge ? bridge.c1 - 1 : -1;
      p.vx = p.vy = 0;
      this.setTile(axe.c, axe.r, ' ');
      this.ents = this.ents.filter(e => e.kind === 'boss');
      return;
    }
    this.updateCannons();
    for (const e of this.ents) this.updateEnt(e);
    this.enemyInteractions();
    for (const e of this.ents) {
      if (this.status !== 'playing') break;
      this.interact(e);
    }
    this.ents = this.ents.filter(e => !e.dead);
    this.updateCamera();
  }
}
