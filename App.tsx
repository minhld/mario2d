import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Controls, computeLayout } from './src/components/Controls';
import { GameView } from './src/components/GameView';
import { Hud, MONO } from './src/components/Hud';
import { Game, Session } from './src/game/engine';
import { generateLevel, STAGES, WORLDS } from './src/game/levels';
import { heroSprite } from './src/game/sprites';
import { input, installWebInput } from './src/input';
import Svg, { Path } from 'react-native-svg';

type Screen = 'title' | 'intro' | 'play' | 'over' | 'win';
const STEP = 1000 / 60;

function newSession(world: number): Session {
  return { world, stage: 1, lives: 3, score: 0, coins: 0, size: 0, checkpoint: false };
}

function HeroIcon({ size }: { size: number }) {
  const s = heroSprite(false, 'stand', 0);
  return (
    <Svg width={s.w * size} height={s.h * size} viewBox={`0 0 ${s.w} ${s.h}`}>
      {s.layers.map((l, i) => <Path key={i} d={l.d} fill={l.fill} />)}
    </Svg>
  );
}

export default function App() {
  const { width: W, height: H } = useWindowDimensions();
  const layout = useMemo(() => computeLayout(W, H), [W, H]);
  const [screen, setScreen] = useState<Screen>('title');
  const [paused, setPaused] = useState(false);
  const [round, setRound] = useState(1);
  const [, setTick] = useState(0);
  const session = useRef<Session>(newSession(1));
  const game = useRef<Game | null>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const togglePause = useCallback(() => {
    if (screenRef.current === 'play') setPaused((p) => !p);
  }, []);

  useEffect(() => installWebInput(togglePause), [togglePause]);

  const startStage = useCallback(() => {
    const s = session.current;
    game.current = new Game(generateLevel(s.world, s.stage), s, layout.viewW);
    setScreen('intro');
  }, [layout.viewW]);

  useEffect(() => {
    game.current?.setViewW(layout.viewW);
  }, [layout.viewW]);

  // intro -> play after a short pause
  useEffect(() => {
    if (screen !== 'intro') return;
    const t = setTimeout(() => setScreen('play'), 2200);
    return () => clearTimeout(t);
  }, [screen]);

  const onResult = useCallback((r: 'dead' | 'clear') => {
    const s = session.current;
    if (r === 'dead') {
      s.lives--;
      s.size = 0;
      if (s.lives < 0) { setScreen('over'); return; }
    } else {
      s.checkpoint = false;
      s.stage++;
      if (s.stage > STAGES) { s.stage = 1; s.world++; }
      if (s.world > WORLDS) { setScreen('win'); return; }
    }
    startStage();
  }, [startStage]);

  // fixed-timestep game loop
  useEffect(() => {
    if (screen !== 'play') return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      acc += Math.min(now - last, 100);
      last = now;
      const g = game.current;
      if (!g || pausedRef.current) { acc = 0; return; }
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        g.step(input.read());
        acc -= STEP;
        steps++;
        if (g.result) {
          cancelAnimationFrame(raf);
          onResult(g.result);
          return;
        }
      }
      if (steps) setTick((t) => (t + 1) & 0xffff);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen, onResult]);

  const begin = (world: number) => {
    session.current = newSession(world);
    setPaused(false);
    startStage();
  };

  const s = session.current;
  const g = game.current;
  const hudFont = Math.max(10, Math.min(18, layout.gameW / 34));

  if (screen === 'title') {
    return (
      <View style={styles.center}>
        <StatusBar hidden />
        <Text style={[styles.title, { fontSize: Math.min(56, W / 9) }]}>SUPER PLUMBER</Text>
        <Text style={styles.sub}>2D PLATFORMER • 10 ROUNDS × 4 STAGES</Text>
        <HeroIcon size={4} />
        <Pressable style={styles.bigBtn} onPress={() => begin(round)}>
          <Text style={styles.bigBtnText}>START</Text>
        </Pressable>
        <Text style={styles.sub}>SELECT ROUND</Text>
        <View style={styles.rounds}>
          {Array.from({ length: WORLDS }, (_, i) => i + 1).map((n) => (
            <Pressable key={n} onPress={() => setRound(n)} style={[styles.roundBtn, round === n && styles.roundOn]}>
              <Text style={styles.roundText}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.help}>Keyboard: ←→↑↓ / WASD · Z/Space = Jump · X/Shift = Run/Fire · P = Pause</Text>
      </View>
    );
  }

  if (screen === 'over' || screen === 'win') {
    return (
      <View style={styles.center}>
        <StatusBar hidden />
        <Text style={[styles.title, { fontSize: Math.min(48, W / 10) }]}>{screen === 'over' ? 'GAME OVER' : 'THANK YOU!'}</Text>
        <Text style={styles.sub}>{screen === 'win' ? 'YOU CLEARED ALL 10 ROUNDS!' : `WORLD ${s.world}-${s.stage}`}</Text>
        <Text style={styles.sub}>SCORE {String(s.score).padStart(6, '0')}</Text>
        {screen === 'over' && (
          <Pressable style={styles.bigBtn} onPress={() => begin(s.world)}>
            <Text style={styles.bigBtnText}>CONTINUE (ROUND {s.world})</Text>
          </Pressable>
        )}
        <Pressable style={styles.bigBtn} onPress={() => setScreen('title')}>
          <Text style={styles.bigBtnText}>TITLE</Text>
        </Pressable>
      </View>
    );
  }

  if (screen === 'intro' || !g) {
    return (
      <View style={styles.center}>
        <StatusBar hidden />
        <Text style={[styles.title, { fontSize: Math.min(40, W / 12) }]}>WORLD {s.world}-{s.stage}</Text>
        <View style={styles.livesRow}>
          <HeroIcon size={3} />
          <Text style={styles.livesText}> × {s.lives}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={{ position: 'absolute', left: layout.gameX, top: layout.gameY }}>
        <GameView game={g} scale={layout.scale} viewW={layout.viewW} />
      </View>
      <Hud session={s} time={g.time} width={layout.gameW} left={layout.gameX} fontSize={hudFont} />
      <Controls layout={layout} onPause={togglePause} />
      {paused && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.title}>PAUSED</Text>
          <Pressable style={styles.bigBtn} onPress={() => setPaused(false)}>
            <Text style={styles.bigBtnText}>RESUME</Text>
          </Pressable>
          <Pressable style={styles.bigBtn} onPress={() => { setPaused(false); setScreen('title'); }}>
            <Text style={styles.bigBtnText}>QUIT</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 14 },
  title: { color: '#fca044', fontFamily: MONO, fontWeight: 'bold', fontSize: 40, textAlign: 'center' },
  sub: { color: '#fff', fontFamily: MONO, fontSize: 14, textAlign: 'center' },
  help: { color: '#aaa', fontFamily: MONO, fontSize: 11, textAlign: 'center', marginTop: 8 },
  bigBtn: { backgroundColor: '#c84c0c', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8, borderWidth: 2, borderColor: '#fcbcb0' },
  bigBtnText: { color: '#fff', fontFamily: MONO, fontWeight: 'bold', fontSize: 18 },
  rounds: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 420 },
  roundBtn: { width: 44, height: 44, borderRadius: 6, borderWidth: 2, borderColor: '#888', alignItems: 'center', justifyContent: 'center' },
  roundOn: { borderColor: '#fca044', backgroundColor: '#5c2800' },
  roundText: { color: '#fff', fontFamily: MONO, fontWeight: 'bold', fontSize: 16 },
  livesRow: { flexDirection: 'row', alignItems: 'center' },
  livesText: { color: '#fff', fontFamily: MONO, fontSize: 24, fontWeight: 'bold' },
  pauseOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 14 },
});
