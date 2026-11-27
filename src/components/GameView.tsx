import { memo, type ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { WALK_MAX, type Ent, type Game } from '../game/engine';
import { TILE, VIEW_H, type Deco, type Theme } from '../game/levels';
import { debrisSprite, heroSprite, RUN_FRAMES, WALK_FRAMES, SPRITES, type HeroFrame, type Palette, type Sprite } from '../game/sprites';
import { castleSprite, compileSection, QBLOCK_COLORS, THEME_PALETTES, tileSprite, type TileLayer } from '../game/tiles';

const SpriteNode = memo(function SpriteNode({
  sprite, x, y, flip = false, vFlip = false,
}: { sprite: Sprite; x: number; y: number; flip?: boolean; vFlip?: boolean }) {
  const layers = flip ? sprite.flipped : sprite.layers;
  const tx = Math.round(x), ty = Math.round(y);
  const transform = vFlip ? `translate(${tx} ${ty + sprite.h}) scale(1 -1)` : `translate(${tx} ${ty})`;
  return <G transform={transform}>
    {layers.map((layer, i) => <Path key={i} d={layer.d} fill={layer.fill} />)}
  </G>;
});

const SectionNode = memo(function SectionNode({
  layers, palette, qColor,
}: { layers: TileLayer[]; palette: Palette; qColor: string }) {
  return <>{layers.map(layer => <Path key={layer.key} d={layer.d} fill={layer.key === 'Q' ? qColor : palette[layer.key]} />)}</>;
});

const DecoNode = memo(function DecoNode({ d, theme, night }: { d: Deco; theme: Theme; night: boolean }) {
  if (d.type === 'castle') return <SpriteNode sprite={castleSprite(theme)} x={d.x} y={d.y - 80} />;
  if (d.type === 'cloud') {
    const widthScale = 0.45 + d.size * 0.2;
    const heightScale = 0.68 + d.size * 0.09;
    const mirrored = Math.floor(d.x / TILE) % 2 === 0;
    const tx = d.x + (mirrored ? 72 * widthScale : 0);
    const transform = `translate(${tx} ${d.y - 6}) scale(${mirrored ? -widthScale : widthScale} ${heightScale})`;
    return <G transform={transform}>
      <Path fill={night ? '#70829e' : '#bfdaef'} d="M11 26C4 26 0 23 0 19c0-5 5-8 11-8 3-4 8-6 13-5C28 0 36-2 43 2c4 2 6 5 8 8 7-2 12 2 13 6 5 0 8 2 8 5 0 5-7 7-16 7H18c-3 0-5-1-7-2Z" />
      <Path fill={night ? '#9cacc2' : '#f6fbff'} d="M7 20c-4-1-5-4-2-6 2-2 5-3 8-2 2-5 9-7 13-5 4-6 11-8 17-4 3 2 5 5 5 8 6-2 11 1 12 5 4 0 8 2 8 4-1 3-7 4-16 4H22c-8 0-12-1-15-4Z" />
      <Path fill={night ? '#879bb8' : '#e1eff9'} d="M17 20c5 2 10 0 12-3 4 5 11 6 16 3 3 3 9 4 15 2-2 3-8 4-15 4H25c-6 0-10-2-8-6Z" />
    </G>;
  }
  if (d.type === 'bush') {
    const scale = 0.66 + d.size * 0.16;
    const flip = Math.floor(d.x / TILE) % 2 === 0;
    const x = d.x + (flip ? 48 * scale : 0);
    return <G transform={`translate(${x} ${d.y}) scale(${flip ? -scale : scale} ${scale})`}>
      <Path fill={night ? '#57503b' : '#80512c'} d="M13 0l6-4 2-9-2-6-8-9 3-1 8 8 2-12 4 1-1 13 9-7 2 3-11 11 1 8 6 4Z" />
      <Path fill={night ? '#807454' : '#d2a05d'} d="M18-1l4-5 2-15 2-2-1 18 2 4Z" />
      <Path fill={night ? '#28533f' : '#39864b'} d="M5-21l-3-5 1-7 5-4 4-1 1-5 6-5 7-1 7 3 2 4 6 1 5 5 1 5-3 6-6 3-6-1-5 3-7-2-6 2-4-2Z" />
      <Path fill={night ? '#457452' : '#67ad43'} d="M5-29l2-5 6-3 2-5 5-4 7-1 6 4 1 4 7 1 3 4-1 4-6 2-4-2-5 3-6-3-5 4-6-2Z" />
      <Path fill={night ? '#60945a' : '#9ccb55'} d="M9-33l6-3 2-5 5-4 6 1 3 3-2 3-6 1-3 4-5-2-4 3ZM31-38l5-1 5 3-2 3-6-1Z" />
      <Path fill={night ? '#81a86e' : '#d3e873'} d="M18-42l5-2 4 1-3 2-4 1ZM9-33l4-2 3 1-4 2Z" />
      <Path fill={night ? '#d399a5' : '#ffd1d9'} d="M12-30h2v2h2v2h-2v2h-2v-2h-2v-2h2ZM31-33h2v2h2v2h-2v2h-2v-2h-2v-2h2Z" />
      <Path fill={night ? '#e0ba68' : '#ffe79a'} d="M12-28h2v2h-2ZM31-31h2v2h-2Z" />
    </G>;
  }
  const width = d.size === 1 ? 80 : 112;
  const height = d.size === 1 ? 26 : 36;
  return <G transform={`translate(${d.x} ${d.y}) scale(${width / 100} ${height / 36})`}>
    <Path fill={night ? '#315646' : '#79b84c'} d="M0 0C12-6 23-18 34-25c8-5 12-5 19-3 6 2 9 8 14 9 10 2 17 10 33 19Z" />
    <Path fill={night ? '#456949' : '#bbd96b'} d="M2-1c12-7 22-18 33-24 7-4 12-5 18-2-8-1-14 6-19 12C27-7 15-3 2-1Z" />
    <Path fill={night ? '#294a3e' : '#5a9b52'} d="M38 0c14-3 21-10 29-11 12-1 17 5 33 11Z" />
    <Path fill={night ? '#d5b969' : '#ffe88a'} d="M22-8h2v2h-2ZM39-16h2v2h-2ZM62-6h2v2h-2ZM74-5h2v2h-2Z" />
  </G>;
});

const caches = new WeakMap<Game, Map<number, { version: number; layers: TileLayer[] }>>();

function sectionLayers(game: Game, section: number): TileLayer[] {
  let cache = caches.get(game);
  if (!cache) { cache = new Map(); caches.set(game, cache); }
  const version = game.secVersion[section] ?? 0;
  const cached = cache.get(section);
  if (cached?.version === version) return cached.layers;
  const layers = compileSection(game.tiles, section, game.hidden);
  cache.set(section, { version, layers });
  return layers;
}

function currentHero(game: Game) {
  const p = game.player;
  if (!p.visible) return null;
  if (game.status === 'dying') return { sprite: heroSprite(false, 'die', 0), flip: false };
  if (p.inv > 0 && game.frame % 4 < 2 && !game.freeze) return null;
  let big = game.session.size > 0;
  let pal = Number(game.session.size === 2);
  if (game.freeze && game.morph) {
    const alt = Math.floor(game.frame / 4) % 2 === 0;
    if (game.morph === 'fire') pal = Number(alt);
    else big = alt;
  }
  if (p.star > 0) pal = Math.floor(game.frame / (p.star < 120 ? 6 : 2)) % 4;
  let frame: HeroFrame = 'stand';
  if (p.crouch && big) frame = 'crouch';
  else if (game.status === 'flag' || !p.onGround) frame = 'jump';
  else if (p.skid) frame = 'skid';
  else if (Math.abs(p.vx) > 0.05) {
    const cycle = Math.abs(p.vx) > WALK_MAX ? RUN_FRAMES : WALK_FRAMES;
    frame = cycle[Math.floor(p.walkPhase / 2) % cycle.length];
  }
  return { sprite: heroSprite(big, frame, pal), flip: p.dir < 0 };
}

function entityNode(game: Game, e: Ent) {
  const f = game.frame;
  const node = (sprite: Sprite, { x = e.x, y = e.y + e.h - sprite.h, flip = false, vFlip = e.flipped }: {
    x?: number; y?: number; flip?: boolean; vFlip?: boolean;
  } = {}) => <SpriteNode key={e.id} sprite={sprite} x={x} y={y} flip={flip} vFlip={vFlip} />;
  switch (e.kind) {
    case 'walker':
      return node(e.squash === undefined ? SPRITES.walker : SPRITES.walkerFlat,
        { flip: e.squash === undefined && Math.floor(f / 10) % 2 === 0 });
    case 'turtle': {
      const sprite = (e.red ? SPRITES.redTurtle : SPRITES.turtle)[Math.floor(f / 12) % 2];
      const flip = e.vx > 0;
      return <G key={e.id}>
        <SpriteNode sprite={sprite} x={e.x} y={e.y + e.h - sprite.h} flip={flip} vFlip={e.flipped} />
        {e.winged && !e.flipped && <SpriteNode sprite={SPRITES.wings[Math.floor(f / 8) % 2]} x={e.x + (flip ? 0 : 8)} y={e.y + 4} flip={flip} />}
      </G>;
    }
    case 'shell':
      return node(e.red ? SPRITES.redShell : SPRITES.shell, { x: e.x + Number((e.revive ?? 0) > 360 && Math.floor(f / 4) % 2 !== 0) });
    case 'piranha': return node(SPRITES.piranha[Math.floor(f / 12) % 2]);
    case 'mushroom': case 'oneup': return node(SPRITES[e.kind]);
    case 'flower': return node(SPRITES.flower[Math.floor(f / 4) % 4]);
    case 'star': return node(SPRITES.star[Math.floor(f / 3) % 4]);
    case 'fireball': {
      const r = Math.floor(f / 4) % 4;
      return node(SPRITES.fireball, { flip: r % 2 === 1, vFlip: r >= 2 });
    }
    case 'firebar': return <G key={e.id}>
      {Array.from({ length: e.len ?? 6 }, (_, i) => <SpriteNode key={i} sprite={SPRITES.fireball}
        x={e.startX + Math.cos(e.angle ?? 0) * i * 8 - 4} y={e.startY + Math.sin(e.angle ?? 0) * i * 8 - 4}
        flip={Math.floor(f / 4) % 2 === 0} />)}
    </G>;
    case 'podoboo': return node(SPRITES.podoboo, { y: e.y, vFlip: e.vy > 0 });
    case 'bullet': return node(SPRITES.bullet, { y: e.y, flip: e.vx > 0 });
    case 'boss': return node(e.hurt && f % 4 < 2 ? SPRITES.bossHurt : SPRITES.boss,
      { y: e.y, flip: game.player.x > e.x + 16 });
    case 'bossfire': return node(SPRITES.bossFire, { y: e.y - 1, flip: e.vx > 0 });
    case 'lift': return <G key={e.id}>
      <Rect x={e.x} y={e.y} width={e.w} height={e.h} fill="#fca044" stroke="#7c3c00" />
      {[0, 1, 2, 3, 4, 5].map(i => <Circle key={i} cx={e.x + 4 + i * 8} cy={e.y + 4} r={2} fill="#7c3c00" />)}
    </G>;
    default: return null;
  }
}

export function GameView({ game, scale, viewW }: { game: Game; scale: number; viewW: number }) {
  const { level, player: p, flagY } = game;
  const { theme, flagCol } = level;
  const cam = Math.round(game.camX);
  const palette = THEME_PALETTES[theme];
  const qColor = QBLOCK_COLORS[Math.floor(game.frame / 8) % QBLOCK_COLORS.length];
  const outdoors = theme === 'overworld' || theme === 'athletic';
  const bg = outdoors && !level.night ? '#5c94fc' : '#000';
  const first = Math.max(0, Math.floor(cam / 256));
  const last = Math.min(game.secVersion.length - 1, Math.floor((cam + viewW) / 256));
  const sections = [];
  for (let i = first; i <= last; i++) {
    sections.push(<SectionNode key={i} layers={sectionLayers(game, i)} palette={palette} qColor={qColor} />);
  }
  const behind: ReactNode[] = [], front: ReactNode[] = [];
  for (const e of game.ents) {
    if (e.x + 200 < cam || e.x - 200 > cam + viewW) continue;
    const dest = e.kind === 'piranha' || e.emerge ? behind : front;
    dest.push(entityNode(game, e));
  }
  const decos = level.decos.filter(d => d.x + 120 > cam && d.x - 20 < cam + viewW);
  const hero = currentHero(game);

  return <Svg width={viewW * scale} height={VIEW_H * scale} viewBox={`0 0 ${viewW} ${VIEW_H}`}>
    <Rect width={viewW} height={VIEW_H} fill={bg} />
    <G transform={`translate(${-cam} 0)`}>
      {decos.map((d, i) => <DecoNode key={d.type + ':' + d.x + ':' + i} d={d} theme={theme} night={level.night} />)}
      {behind}
      {sections}
      {game.bumps.map(b => {
        const sprite = tileSprite(b.ch, theme, qColor);
        return sprite && <SpriteNode key={b.c + ',' + b.r} sprite={sprite} x={b.c * TILE} y={b.r * TILE + game.bumpOffset(b.t)} />;
      })}
      {flagCol !== null && <>
        <Rect x={flagCol * TILE + 7} y={2 * TILE + 8} width={2} height={10 * TILE - 8} fill="#80d010" />
        <Circle cx={flagCol * TILE + 8} cy={2 * TILE + 4} r={4} fill="#00a800" stroke="#000" />
        <SpriteNode sprite={SPRITES.flag} x={flagCol * TILE - 8} y={flagY} />
      </>}
      {front}
      {hero && <SpriteNode sprite={hero.sprite} x={p.x - 2} y={p.y + p.h - hero.sprite.h} flip={hero.flip} />}
      {game.effects.map((fx, i) => {
        if (fx.kind === 'score') return <SvgText key={i} x={fx.x} y={fx.y} fill="#fcfcfc" fontSize={8} fontWeight="bold" stroke="#000" strokeWidth={0.3}>{fx.text}</SvgText>;
        if (fx.kind === 'coin') return <SpriteNode key={i} sprite={SPRITES.coin[Math.floor(fx.t / 3) % 4]} x={fx.x} y={fx.y} />;
        return <SpriteNode key={i} sprite={debrisSprite(palette)} x={fx.x} y={fx.y} flip={Math.floor(fx.t / 4) % 2 === 0} />;
      })}
    </G>
  </Svg>;
}
