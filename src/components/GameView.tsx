import Svg, { Circle, Ellipse, G, Path, Rect, Text } from 'react-native-svg';
import type { Game } from '../game/engine';
import { TILE, VIEW_H } from '../game/levels';
import { entitySprite, heroSprite, pixelLayers, type HeroFrame } from '../game/sprites';
import { themes } from '../game/tiles';

export function GameView({ game, scale, viewW }: { game: Game; scale: number; viewW: number }) {
  const { level, player: p, camX } = game;
  const theme = themes[level.theme];
  const from = Math.max(0, Math.floor(camX / TILE));
  const to = Math.min(level.width, Math.ceil((camX + viewW) / TILE));
  const tiles = game.tiles.flatMap((row, r) => row.slice(from, to).map((tile, offset) => {
    const c = from + offset;
    const x = c * TILE;
    const y = r * TILE;
    if (tile === ' ') return null;
    if (tile === 'o') return <Ellipse key={`${c}:${r}`} cx={x + 8} cy={y + 8} rx={4} ry={6} fill="#ffd66b" stroke="#a97142" strokeWidth={1.5} />;
    if (tile === 'A') return <G key={`${c}:${r}`}><Path d={`M${x + 4} ${y + 15}l9 -13`} stroke="#d4a373" strokeWidth={3} /><Rect x={x + 6} y={y + 2} width={9} height={6} fill="#d7e6e6" /></G>;
    if (tile === 'L') return <G key={`${c}:${r}`}><Rect x={x} y={y} width={16} height={16} fill="#bb4952" /><Path d={`M${x} ${y + 3}l4 -2 4 2 4 -2 4 2`} stroke="#ffc270" strokeWidth={3} /></G>;
    const block = 'MNS?'.includes(tile);
    const pipe = '[]{}'.includes(tile);
    const fill = pipe ? '#41866d' : block ? '#e5a959' : tile === 'U' ? '#896678' : theme.ground;
    return <G key={`${c}:${r}`}>
      <Rect x={x} y={y} width={16} height={16} fill={fill} />
      <Path d={`M${x} ${y + 15.5}h16M${x + 15.5} ${y}v16`} stroke={theme.seam} />
      {tile === 'X' && game.tile(c, r - 1) !== 'X'
        ? <Rect x={x} y={y} width={16} height={3} fill={theme.trim} />
        : tile === 'X' || tile === 'B' || tile === '='
          ? <Path d={`M${x} ${y + 8}h16m-6 -8v8m-5 0v8`} stroke={theme.seam} />
          : null}
      {block && <Text x={x + 8} y={y + 12} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#58374b">?</Text>}
      {pipe && <Rect x={x + (tile === '[' || tile === '{' ? 4 : 0)} y={y + 1} width={4} height={14} fill="#83b974" />}
    </G>;
  }));

  // This frame selection uses the current engine's player fields until the original engine is restored.
  let frame: HeroFrame = 'stand';
  if (game.status === 'dying') frame = 'die';
  else if (p.crouch) frame = 'crouch';
  else if (!p.grounded || game.status === 'flag') frame = 'jump';
  else if (p.skid) frame = 'skid';
  else if (Math.abs(p.vx) > 0.05) frame = (['walk1', 'walk2', 'walk3'] as const)[Math.floor(p.walkPhase) % 3];
  const pal = p.star > 0 ? Math.floor(game.frame / (p.star < 120 ? 6 : 2)) % 4 : Number(game.session.size === 2);
  const hero = heroSprite(game.session.size > 0, frame, pal);
  const heroLayers = p.dir < 0 ? hero.flipped : hero.layers;
  const outdoor = level.theme === 'overworld' || level.theme === 'athletic';
  const landscape = outdoor ? Array.from({ length: 8 }, (_, i) => {
    const x = ((i * 91 - camX * 0.22) % 728 + 728) % 728 - 110;
    const y = 41 + i % 3 * 21;
    return <G key={i}>
      <Path d={`M${x - 35} 208l63 -63 65 63Z`} fill={level.night ? '#29395a' : '#69a2ad'} />
      <Ellipse cx={x + 23} cy={y} rx={22} ry={6} fill={level.night ? '#9caabe' : '#e0e9dc'} opacity={0.7} />
      <Ellipse cx={x + 17} cy={y - 4} rx={11} ry={7} fill={level.night ? '#9caabe' : '#e0e9dc'} opacity={0.7} />
    </G>;
  }) : null;

  return <Svg width={viewW * scale} height={VIEW_H * scale} viewBox={`0 0 ${viewW} ${VIEW_H}`}>
    <Rect width={viewW} height={VIEW_H} fill={outdoor ? (level.night ? '#000000' : '#5c94fc') : '#000000'} />
    {landscape}
    <G x={-camX}>
      {tiles}
      {level.flagCol !== null && <G x={level.flagCol * TILE + 7}>
        <Rect x={0} y={52} width={2} height={156} fill="#f4e3b8" />
        <Circle cx={1} cy={51} r={4} fill="#f4d083" />
        <Path d="M2 58h22l-7 7 7 7H2Z" fill="#b95563" />
        <Path d="M79 208v-32h7v-8h7v8h7v-8h7v8h7v32Z" fill="#5e5169" />
        <Path d="M91 208v-16a6 6 0 0 1 12 0v16Z" fill="#2a283d" />
      </G>}
      {game.ents.filter(e => e.x + e.w >= camX && e.x <= camX + viewW).map((e, i) => {
        const art = entitySprite(e.kind);
        if (art) {
          const flip = e.vx > 0 && e.kind !== 'shell';
          return <G key={i} transform={`translate(${e.x + (flip ? e.w : 0)} ${e.y}) scale(${e.w / art.rows[0].length * (flip ? -1 : 1)} ${e.h / art.rows.length})`}>
            {pixelLayers(art.rows, art.colors).map((layer, index) => <Path key={index} {...layer} />)}
          </G>;
        }
        if (e.kind === 'lift') return <Rect key={i} x={e.x} y={e.y} width={e.w} height={e.h} fill="#f3c580" />;
        if (e.kind === 'star') return <Path key={i} d={`M${e.x + 7} ${e.y}l2 5 5 1-4 3 1 5-4-2-5 2 1-5-3-3 5-1Z`} fill="#fff3a6" />;
        if (e.kind === 'mushroom' || e.kind === 'flower' || e.kind === 'oneup') {
          return <G key={i} x={e.x} y={e.y}><Rect x={4} y={6} width={6} height={8} fill="#fff0ad" /><Ellipse cx={7} cy={5} rx={7} ry={5} fill={e.kind === 'oneup' ? '#5ebe80' : '#e76e60'} /><Circle cx={7} cy={4} r={2.5} fill="#fff4bf" /></G>;
        }
        return <Ellipse key={i} cx={e.x + e.w / 2} cy={e.y + e.h / 2} rx={e.w / 2} ry={e.h / 2} fill={e.kind === 'bullet' ? '#354057' : '#f89e5e'} stroke="#714154" />;
      })}
      {(!p.inv || p.inv % 8 < 4) && <G transform={`translate(${p.x - 2} ${p.y + p.h - hero.h})`}>
        {heroLayers.map((layer, index) => <Path key={index} {...layer} />)}
      </G>}
      {game.points.map((point, i) => <Text key={i} x={point.x} y={point.y - point.age * 0.5} fill="#fff4bc" stroke="#302b42" strokeWidth={0.2} fontSize={8}>{point.value}</Text>)}
    </G>
  </Svg>;
}
