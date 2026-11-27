import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Session } from '../game/engine';

export const MONO = Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' });

const pad = (n: number, w: number) => String(Math.max(0, Math.floor(n))).padStart(w, '0');

export function Hud({ session, time, width, left, fontSize }: { session: Session; time: number; width: number; left: number; fontSize: number }) {
  const cells: [string, string][] = [
    ['SCORE', pad(session.score, 6)],
    ['COINS', 'x' + pad(session.coins, 2)],
    ['WORLD', `${session.world}-${session.stage}`],
    ['TIME', pad(time, 3)],
    ['LIVES', 'x' + Math.max(0, session.lives)],
  ];
  return (
    <View pointerEvents="none" style={[styles.row, { width, left }]}>
      {cells.map(([k, v]) => (
        <View key={k} style={styles.cell}>
          <Text style={[styles.t, { fontSize }]}>{k}</Text>
          <Text style={[styles.t, { fontSize }]}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', top: 4, flexDirection: 'row', justifyContent: 'space-around' },
  cell: { alignItems: 'center' },
  t: {
    color: '#fff', fontFamily: MONO, fontWeight: 'bold',
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1,
  },
});
