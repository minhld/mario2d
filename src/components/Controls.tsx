import React, { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { Input } from '../game/engine';
import { emptyInput, input } from '../input';

export interface Layout {
  W: number;
  H: number;
  landscape: boolean;
  viewW: number; // logical game width (game height is always 240)
  scale: number;
  gameX: number;
  gameY: number;
  gameW: number;
  gameH: number;
  btn: number; // A/B diameter
  dpad: { x: number; y: number; r: number };
  a: { x: number; y: number };
  b: { x: number; y: number };
  pause: { x: number; y: number; w: number; h: number };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function computeLayout(W: number, H: number): Layout {
  const landscape = W >= H * 1.05;
  const btn = clamp(Math.min(W, H) * 0.17, 56, 104);
  const R = btn * 1.15;
  const m = btn * 0.35;
  let viewW: number, scale: number, gameX: number, gameY: number;
  let padY: number, abY: number;
  if (landscape) {
    scale = H / 240;
    viewW = Math.round(clamp(W / scale, 256, 427));
    gameX = Math.round((W - viewW * scale) / 2);
    gameY = 0;
    padY = H - m - R;
    abY = H - m - btn * 0.9;
  } else {
    viewW = 256;
    scale = W / 256;
    if (240 * scale > H * 0.6) {
      scale = (H * 0.6) / 240;
    }
    gameX = Math.round((W - viewW * scale) / 2);
    gameY = 0;
    const top = 240 * scale;
    padY = top + (H - top) / 2;
    abY = padY;
  }
  const dpad = { x: m + R, y: padY, r: R };
  const a = { x: W - m - btn / 2, y: abY - btn * 0.35 };
  const b = { x: W - m - btn * 1.75, y: abY + btn * 0.35 };
  const pause = { x: W - 56, y: landscape ? 36 : 240 * scale + 8, w: 48, h: 36 };
  return { W, H, landscape, viewW, scale, gameX, gameY, gameW: viewW * scale, gameH: 240 * scale, btn, dpad, a, b, pause };
}

type Hit = { inp: Input; pause: boolean };

function hitTest(L: Layout, pts: { x: number; y: number }[]): Hit {
  const o = emptyInput();
  let pause = false;
  for (const { x, y } of pts) {
    const p = L.pause;
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) { pause = true; continue; }
    const dx = x - L.dpad.x, dy = y - L.dpad.y;
    const d = Math.hypot(dx, dy);
    if (d < L.dpad.r * 1.6) {
      if (d < L.dpad.r * 0.2) continue;
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (Math.abs(ang) < 67.5) o.right = true;
      if (Math.abs(ang) > 112.5) o.left = true;
      if (ang > 22.5 && ang < 157.5) o.down = true;
      if (ang < -22.5 && ang > -157.5) o.up = true;
      continue;
    }
    const r = L.btn * 0.72;
    const da = Math.hypot(x - L.a.x, y - L.a.y);
    const db = Math.hypot(x - L.b.x, y - L.b.y);
    if (da < r) o.a = true;
    if (db < r) o.b = true;
    // a press between both buttons presses both (run + jump with one thumb)
    if (da >= r && db >= r && da < r * 1.6 && db < r * 1.6 && x > W2(L)) { o.a = true; o.b = true; }
  }
  return { inp: o, pause };
}

const W2 = (L: Layout) => L.W / 2;

export function Controls({ layout, onPause }: { layout: Layout; onPause: () => void }) {
  const [pressed, setPressed] = useState<Input>(emptyInput());
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const pauseRef = useRef(onPause);
  pauseRef.current = onPause;
  const wasPause = useRef(false);

  const apply = (pts: { x: number; y: number }[]) => {
    const h = hitTest(layoutRef.current, pts);
    input.setTouch(h.inp);
    if (h.pause && !wasPause.current) pauseRef.current();
    wasPause.current = h.pause;
    setPressed((prev) => {
      for (const k of Object.keys(prev) as (keyof Input)[]) if (prev[k] !== h.inp[k]) return h.inp;
      return prev;
    });
  };

  // Web: pointer events (mouse + multi-touch), tracked per pointerId.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const pts = new Map<number, { x: number; y: number }>();
    const upd = () => apply([...pts.values()]);
    const down = (e: PointerEvent) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); upd(); };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      upd();
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); upd(); };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      input.setTouch(emptyInput());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => input.setTouch(emptyInput()), []);

  const onTouch = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    apply(Array.from(t).map((p) => ({ x: p.pageX, y: p.pageY })));
  };
  const onTouchEnd = (e: GestureResponderEvent) => {
    const ended = new Set(Array.from(e.nativeEvent.changedTouches).map((p) => p.identifier));
    const t = Array.from(e.nativeEvent.touches).filter((p) => !ended.has(p.identifier));
    apply(t.map((p) => ({ x: p.pageX, y: p.pageY })));
  };
  const native = Platform.OS !== 'web';

  const { dpad, btn } = layout;
  const R = dpad.r;
  const arm = R * 0.62;
  const armStyle = (on: boolean) => [styles.arm, on && styles.on];
  return (
    <View
      style={StyleSheet.absoluteFill}
      onTouchStart={native ? onTouch : undefined}
      onTouchMove={native ? onTouch : undefined}
      onTouchEnd={native ? onTouchEnd : undefined}
      onTouchCancel={native ? onTouchEnd : undefined}
    >
      <View pointerEvents="none" style={[styles.pad, { left: dpad.x - R, top: dpad.y - R, width: R * 2, height: R * 2, borderRadius: R }]}>
        <View style={[armStyle(pressed.up), { left: R - arm / 2, top: R * 0.12, width: arm, height: arm }]}><Text style={styles.arrow}>▲</Text></View>
        <View style={[armStyle(pressed.down), { left: R - arm / 2, top: R * 1.88 - arm, width: arm, height: arm }]}><Text style={styles.arrow}>▼</Text></View>
        <View style={[armStyle(pressed.left), { left: R * 0.12, top: R - arm / 2, width: arm, height: arm }]}><Text style={styles.arrow}>◀</Text></View>
        <View style={[armStyle(pressed.right), { left: R * 1.88 - arm, top: R - arm / 2, width: arm, height: arm }]}><Text style={styles.arrow}>▶</Text></View>
      </View>
      {(['b', 'a'] as const).map((k) => {
        const c = layout[k];
        return (
          <View
            key={k}
            pointerEvents="none"
            style={[styles.btn, pressed[k] && styles.btnOn, { left: c.x - btn / 2, top: c.y - btn / 2, width: btn, height: btn, borderRadius: btn / 2 }]}
          >
            <Text style={[styles.btnText, { fontSize: btn * 0.32 }]}>{k === 'a' ? 'A' : 'B'}</Text>
            <Text style={[styles.btnSub, { fontSize: Math.max(9, btn * 0.13) }]}>{k === 'a' ? 'JUMP' : 'RUN/FIRE'}</Text>
          </View>
        );
      })}
      <View pointerEvents="none" style={[styles.pause, { left: layout.pause.x, top: layout.pause.y, width: layout.pause.w, height: layout.pause.h }]}>
        <Text style={styles.pauseText}>Ⅱ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  arm: { position: 'absolute', borderRadius: 10, backgroundColor: 'rgba(40,40,40,0.55)', alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: 'rgba(252,160,68,0.85)' },
  arrow: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  btn: { position: 'absolute', backgroundColor: 'rgba(200,30,30,0.6)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  btnOn: { backgroundColor: 'rgba(255,90,60,0.95)', transform: [{ scale: 0.94 }] },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnSub: { color: '#fff', opacity: 0.85, fontWeight: '600' },
  pause: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  pauseText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
