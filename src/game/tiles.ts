import type { Theme } from './levels';

export const themes: Record<Theme, { sky: string; ground: string; trim: string; seam: string }> = {
  overworld: { sky: '#77b9ce', ground: '#795267', trim: '#92aa63', seam: '#4e3e54' },
  underground: { sky: '#20263f', ground: '#465477', trim: '#83a0b0', seam: '#29334d' },
  athletic: { sky: '#a2c8dc', ground: '#78617f', trim: '#d8bb71', seam: '#514568' },
  castle: { sky: '#2a263a', ground: '#6f596b', trim: '#c2856e', seam: '#413344' },
};
