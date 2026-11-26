import { TILE, VIEW_H, type Kind, type LevelData, type Spawn } from './levels';

// Physics tuned to match the classic feel (pixels per frame at 60 fps).
const WALK_MAX = 1.5;
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
type Body = { x: number; y: number; w: number; h: number; vx: number; vy: number; grounded: boolean };
export type Ent = Body & {
  kind: Kind | 'shell' | 'mushroom' | 'flower' | 'star' | 'oneup' | 'fire' | 'breath';
  dead: boolean; startX: number; startY: number; age: number; range: number; hp: number;
};
export const newSession = (world: number): Session => ({ world, stage: 1, lives: 3, coins: 0, score: 0, size: 0, checkpoint: false });
const overlap = (a: Body, b: Body) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const solids = 'XB?MNSU[]{}EC=';
const dimensions: Partial<Record<Ent['kind'], [number, number]>> = {
  turtle: [14, 24], redturtle: [14, 24], paratroopa: [14, 24], lift: [26, 5],
  boss: [25, 30], fire: [6, 6], breath: [12, 7], bullet: [14, 10],
  firebar: [8, 8], podoboo: [10, 10], piranha: [12, 18], shell: [14, 11],
};

export class Game {
  readonly tiles: string[][];
  readonly player: Body & { dir: number; inv: number; star: number; crouch: boolean; skid: boolean; walkPhase: number; jumpHold: number; jumpFall: number; takeoff: number };
  ents: Ent[] = [];
  points: { x: number; y: number; value: string; age: number }[] = [];
  frame = 0;
  camX = 0;
  time: number;
  result: 'dead' | 'clear' | null = null;
  status: 'playing' | 'dying' | 'flag' | 'axe' = 'playing';
  private statusTime = 0;
  private previousJump = false;
  private previousFire = false;
  private chain = 0;
  private pending: Spawn[];

  constructor(readonly level: LevelData, readonly session: Session, public viewW: number) {
    this.tiles = level.tiles.map(row => [...row]);
    this.time = level.time;
    const start = session.checkpoint ? level.checkpointCol : level.startCol;
    const height = session.size ? 27 : 15;
    this.player = {
      x: start * TILE + 2, y: 13 * TILE - height, w: 12, h: height,
      vx: 0, vy: 0, grounded: true, dir: 1, inv: 0, star: 0, crouch: false, skid: false, walkPhase: 0, jumpHold: 0.125, jumpFall: 0.4375, takeoff: 0,
    };
    this.pending = level.spawns.filter(spawn => spawn.x >= this.player.x - 42);
    this.camX = Math.max(0, Math.min(this.player.x - 40, this.maxCam()));
  }

  tile(c: number, r: number) {
    return this.tiles[r]?.[c] ?? ' ';
  }

  setViewW(viewW: number) {
    this.viewW = viewW;
    this.camX = Math.min(this.camX, this.maxCam());
  }

  private maxCam() {
    return Math.max(0, this.level.width * TILE - this.viewW);
  }

  private updateCamera() {
    const p = this.player;
    const target = p.x + p.w / 2 - this.viewW * 0.42;
    if (target > this.camX) this.camX = Math.min(target, this.maxCam());
  }

  private add(kind: Ent['kind'], x: number, y: number, vx = 0, range = 0) {
    const [w, h] = dimensions[kind] ?? [14, 15];
    const ent = { kind, x, y, w, h, vx, vy: 0, grounded: false, dead: false, startX: x, startY: y, age: 0, range, hp: 5 };
    this.ents.push(ent);
    return ent;
  }

  private score(value: number, x: number, y: number) {
    this.session.score += value;
    this.points.push({ x, y, value: String(value), age: 0 });
  }

  private coin(x: number, y: number) {
    this.score(200, x, y);
    if (++this.session.coins === 100) {
      this.session.lives++;
      this.session.coins = 0;
    }
  }

  private hitBlock(c: number, r: number) {
    const tile = this.tile(c, r);
    const x = c * TILE;
    const y = r * TILE;
    if (tile === 'B' && this.session.size) {
      this.tiles[r][c] = ' ';
      this.score(50, x, y);
    } else if ('?MNS'.includes(tile) && tile !== ' ') {
      this.tiles[r][c] = 'U';
      if (tile === '?') this.coin(x, y);
      else this.add(tile === 'N' ? 'oneup' : tile === 'S' ? 'star' : this.session.size ? 'flower' : 'mushroom',
        x + 1, y - 15, tile === 'M' && this.session.size ? 0 : 0.65);
    }
  }

  private move(body: Body, axis: 'x' | 'y', distance: number) {
    if (!distance) return false;
    body[axis] += distance;
    const c0 = Math.floor(body.x / TILE);
    const c1 = Math.floor((body.x + body.w - 0.01) / TILE);
    const r0 = Math.floor(body.y / TILE);
    const r1 = Math.floor((body.y + body.h - 0.01) / TILE);
    let hit = false;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!solids.includes(this.tile(c, r))) continue;
      const size = axis === 'x' ? body.w : body.h;
      const tile = axis === 'x' ? c : r;
      const edge = distance > 0 ? tile * TILE - size : (tile + 1) * TILE;
      body[axis] = distance > 0 ? Math.min(body[axis], edge) : Math.max(body[axis], edge);
      hit = true;
      if (body === this.player && axis === 'y' && distance < 0) this.hitBlock(c, r);
    }
    return hit;
  }

  private resize(height: number) {
    this.player.y += this.player.h - height;
    this.player.h = height;
  }

  private hurt() {
    const p = this.player;
    if (p.inv || p.star) return;
    if (this.session.size) {
      this.session.size = 0;
      this.resize(15);
      p.inv = 120;
    } else {
      this.die();
    }
  }

  private die() {
    this.status = 'dying';
    this.statusTime = 0;
    this.player.vy = -4.2;
  }

  private stepPlayer(input: Input) {
    const p = this.player;
    p.inv = Math.max(0, p.inv - 1);
    p.star = Math.max(0, p.star - 1);
    p.crouch = this.session.size > 0 && input.down && p.grounded;
    if (p.crouch && p.h > 16) this.resize(16);
    if (this.session.size && !p.crouch && p.h < 27) {
      const top = Math.floor((p.y + p.h - 27) / TILE);
      const bottom = Math.floor((p.y - 0.01) / TILE);
      let room = true;
      for (let row = top; row <= bottom; row++) {
        for (let col = Math.floor(p.x / TILE); col <= Math.floor((p.x + p.w - 0.01) / TILE); col++) {
          if (solids.includes(this.tile(col, row))) room = false;
        }
      }
      if (room) this.resize(27);
    }
    // Player motion from IMG_2097.jpeg, using the current collision fields.
    let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (p.crouch && p.grounded) dir = 0;
    const max = input.b ? RUN_MAX : WALK_MAX;
    const acc = input.b ? RUN_ACC : WALK_ACC;
    p.skid = false;
    if (dir !== 0) {
      if (p.grounded && p.vx * dir < 0) {
        p.vx += dir * SKID_DEC;
        p.skid = true;
        if (p.vx * dir > 0) p.vx = 0;
      } else {
        p.vx += dir * acc;
        const limit = p.grounded ? max : Math.max(max, p.takeoff);
        if (Math.abs(p.vx) > limit) {
          p.vx = p.grounded ? Math.sign(p.vx) * Math.max(limit, Math.abs(p.vx) - FRICTION) : Math.sign(p.vx) * limit;
        }
      }
      if (p.grounded) p.dir = dir;
    } else if (p.grounded) {
      if (Math.abs(p.vx) <= FRICTION) p.vx = 0;
      else p.vx -= Math.sign(p.vx) * FRICTION;
    }

    const jump = input.a || input.up;
    if (jump && !this.previousJump && p.grounded) {
      const s = Math.abs(p.vx);
      if (s < 1) { p.vy = -4; p.jumpHold = 0.125; p.jumpFall = 0.4375; }
      else if (s < 2.3) { p.vy = -4; p.jumpHold = 0.117; p.jumpFall = 0.375; }
      else { p.vy = -5; p.jumpHold = 0.156; p.jumpFall = 0.5625; }
      p.takeoff = s;
      p.grounded = false;
    }
    this.previousJump = jump;
    if (this.move(p, 'x', p.vx)) p.vx = 0;
    if (p.x < this.camX) { p.x = this.camX; if (p.vx < 0) p.vx = 0; }
    if (p.x > this.level.width * TILE - p.w) { p.x = this.level.width * TILE - p.w; p.vx = 0; }
    const lift = this.ents.find(e => e.kind === 'lift' && p.vy >= 0 &&
      p.x < e.x + e.w && p.x + p.w > e.x && Math.abs(p.y + p.h - e.y) < 2);
    if (lift) p.x += lift.vx;
    p.vy = Math.min(MAX_FALL, p.vy + (p.vy < 0 && jump ? p.jumpHold : p.jumpFall));
    const beforeBottom = p.y + p.h;
    const landed = this.move(p, 'y', p.vy);
    const platform = lift ?? this.ents.find(e => e.kind === 'lift' &&
      p.x < e.x + e.w && p.x + p.w > e.x && beforeBottom <= e.y && p.y + p.h >= e.y);
    p.grounded = p.vy >= 0 && (landed || !!platform);
    if (platform && p.grounded) p.y = platform.y - p.h;
    if (landed || p.grounded) p.vy = 0;
    if (p.grounded) {
      this.chain = 0;
      p.jumpFall = 0.4375;
      p.walkPhase += Math.abs(p.vx) * 0.12;
    }
    if (input.b && !this.previousFire && this.session.size === 2 && this.ents.filter(e => e.kind === 'fire').length < 2) {
      this.add('fire', p.x + 6 + p.dir * 7, p.y + 10, p.dir * 3.6);
    }
    this.previousFire = input.b;
  }

  private interact(e: Ent, previousBottom: number) {
    const p = this.player;
    if (!overlap(p, e)) return;
    switch (e.kind) {
      case 'lift': case 'fire': return;
      case 'mushroom': case 'flower': case 'star': case 'oneup':
        if (e.kind === 'star') p.star = 600;
        else if (e.kind === 'oneup') this.session.lives++;
        else this.session.size = e.kind === 'flower' ? 2 : Math.max(1, this.session.size);
        e.dead = true;
        this.score(1000, e.x, e.y);
        return;
    }
    if (p.star) {
      if (e.kind !== 'firebar' && e.kind !== 'podoboo') e.dead = true;
      return;
    }
    if (p.vy > 0 && previousBottom <= e.y + 7 &&
        (e.kind === 'walker' || e.kind === 'turtle' || e.kind === 'redturtle' || e.kind === 'paratroopa' || e.kind === 'shell' || e.kind === 'bullet')) {
      p.y = e.y - p.h;
      p.vy = -3.6;
      this.score(100 * (2 ** Math.min(5, this.chain++)), e.x, e.y);
      if (e.kind === 'walker' || e.kind === 'bullet') e.dead = true;
      else if (e.kind === 'shell') e.vx = e.vx ? 0 : p.dir * 3.4;
      else {
        e.y += e.h - 11;
        e.h = 11;
        e.kind = 'shell';
        e.vx = 0;
      }
    } else if (e.kind === 'shell' && !e.vx) {
      e.vx = p.dir * 3.4;
      e.x = p.dir > 0 ? p.x + p.w : p.x - e.w;
    } else this.hurt();
  }

  private stepEntities(previousBottom: number) {
    const near = this.camX + this.viewW + 32;
    this.pending = this.pending.filter(s => {
      if (s.x > near) return true;
      const speed = s.kind === 'boss' ? -0.55 : s.kind === 'bullet' ? -1.85 : -0.48;
      this.add(s.kind, s.x, s.y, speed, s.range);
      return false;
    });

    for (const e of this.ents) {
      if (e.dead) continue;
      e.age++;
      switch (e.kind) {
        case 'lift': {
          const x = e.startX + (1 - Math.cos(e.age / 45)) * e.range / 2;
          e.vx = x - e.x;
          e.x = x;
          break;
        }
        case 'piranha':
          e.y = e.startY - 17 * Math.max(0, Math.sin(e.age / 39));
          if (e.y >= e.startY - 5) continue;
          break;
        case 'firebar':
          e.x = e.startX + Math.cos(e.age / 38) * e.range - 4;
          e.y = e.startY + Math.sin(e.age / 38) * e.range - 4;
          break;
        case 'podoboo':
          e.y = e.startY - 58 * Math.max(0, Math.sin(e.age / 32));
          break;
        case 'breath': case 'bullet':
          e.x += e.vx;
          break;
        default: {
          if (e.kind === 'boss' && e.age % 145 === 0) this.add('breath', e.x - 10, e.y + 9, -2.2);
          if (e.kind === 'boss' && Math.abs(e.x - e.startX) >= e.range) e.vx = Math.sign(e.startX - e.x) * 0.55;
          if (this.move(e, 'x', e.vx)) {
            if (e.kind === 'fire') e.dead = true;
            else e.vx *= -1;
          }
          e.vy = Math.min(4.5, e.vy + 0.23);
          if (this.move(e, 'y', e.vy)) {
            e.grounded = e.vy > 0;
            e.vy = e.kind === 'fire' && e.grounded ? -2.4 : 0;
            if ((e.kind === 'star' || e.kind === 'paratroopa') && e.grounded) e.vy = -3.2;
            if (e.kind === 'redturtle' && e.grounded) {
              const ahead = Math.floor((e.vx < 0 ? e.x - 1 : e.x + e.w + 1) / TILE);
              if (!solids.includes(this.tile(ahead, Math.floor((e.y + e.h + 1) / TILE)))) e.vx *= -1;
            }
          }
        }
      }
      if (!e.dead && this.status === 'playing') this.interact(e, previousBottom);
      if (e.kind === 'fire' && e.age > 130) e.dead = true;
    }
    for (const shot of this.ents) {
      if (shot.dead || !(shot.kind === 'fire' || (shot.kind === 'shell' && shot.vx))) continue;
      for (const target of this.ents) {
        if (shot === target || target.dead || target.kind === 'shell' ||
          !['walker', 'turtle', 'redturtle', 'paratroopa', 'boss', 'piranha', 'bullet'].includes(target.kind) ||
          !overlap(shot, target)) continue;
        if (target.kind !== 'boss' || --target.hp <= 0) {
          target.dead = true;
          this.score(target.kind === 'boss' ? 5000 : 200, target.x, target.y);
        }
        if (shot.kind === 'fire') { shot.dead = true; break; }
      }
    }
    this.ents = this.ents.filter(e => !e.dead && e.y < VIEW_H + 42 && e.x + e.w >= this.camX - 100);
  }

  step(input: Input) {
    if (this.result) return;
    const p = this.player;
    this.frame++;
    this.points = this.points.filter(point => ++point.age < 42);
    if (this.status === 'dying') {
      p.y += p.vy;
      p.vy += 0.22;
      if (++this.statusTime > 72) this.result = 'dead';
      return;
    }
    if (this.status === 'flag' || this.status === 'axe') {
      if (this.status === 'flag') {
        if (this.statusTime < 42) p.y = Math.min(13 * TILE - p.h, p.y + 1.8);
        else p.x += 1.3;
      }
      if (++this.statusTime >= 100) {
        this.session.score += this.time * 50;
        this.result = 'clear';
      }
      this.updateCamera();
      return;
    }
    if (this.frame % 24 === 0 && this.time > 0) {
      this.time--;
      if (this.time === 0) { this.die(); return; }
    }
    const previousBottom = p.y + p.h;
    this.stepPlayer(input);
    this.updateCamera();
    this.stepEntities(previousBottom);
    if (this.status !== 'playing') return;
    if (p.x >= this.level.checkpointCol * TILE) this.session.checkpoint = true;

    for (let r = Math.floor(p.y / TILE); r <= Math.floor((p.y + p.h - 0.01) / TILE); r++) {
      for (let c = Math.floor(p.x / TILE); c <= Math.floor((p.x + p.w - 0.01) / TILE); c++) {
        const tile = this.tile(c, r);
        if (tile === 'L') { this.die(); return; }
        if (tile === 'o') {
          this.tiles[r][c] = ' ';
          this.coin(c * TILE, r * TILE);
        }
        if (tile === 'A' && this.level.bridge) {
          this.status = 'axe';
          const [from, to] = this.level.bridge;
          this.tiles[13].fill(' ', from, to);
          this.tiles[r][c] = ' ';
          this.ents = this.ents.filter(e => e.kind !== 'boss' && e.kind !== 'breath');
          this.score(5000, p.x, p.y);
        }
      }
    }
    if (p.y > VIEW_H + 18) this.die();
    if (this.level.flagCol !== null && p.x + p.w >= this.level.flagCol * TILE + 7) {
      this.status = 'flag';
      this.score(Math.min(5000, 100 + Math.floor((13 * TILE - p.y) / 24) * 200), p.x, p.y);
    }
  }
}
