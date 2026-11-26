import { Platform } from 'react-native';
import { Input } from './game/engine';

export type Btn = keyof Input;
const BTNS: Btn[] = ['left', 'right', 'up', 'down', 'a', 'b'];

export function emptyInput(): Input {
  return { left: false, right: false, up: false, down: false, a: false, b: false };
}

/** Shared input state: touch/pointer contacts and keyboard are merged on read. */
class InputState {
  touch: Input = emptyInput();
  keys: Input = emptyInput();
  pausePressed = false;

  read(): Input {
    const o = emptyInput();
    for (const b of BTNS) o[b] = this.touch[b] || this.keys[b];
    return o;
  }

  setTouch(next: Input) {
    this.touch = next;
  }

  reset() {
    this.touch = emptyInput();
    this.keys = emptyInput();
  }
}

export const input = new InputState();

const KEYMAP: Record<string, Btn> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'a', Space: 'a', KeyK: 'a',
  KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyJ: 'b',
};

/** Installs keyboard listeners and touch-friendly CSS on web. Returns cleanup. */
export function installWebInput(onPause: () => void): () => void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => {};
  const down = (ev: KeyboardEvent) => {
    if (ev.code === 'KeyP' || ev.code === 'Escape') {
      if (!ev.repeat) onPause();
      ev.preventDefault();
      return;
    }
    const b = KEYMAP[ev.code];
    if (b) {
      input.keys[b] = true;
      ev.preventDefault();
    }
  };
  const up = (ev: KeyboardEvent) => {
    const b = KEYMAP[ev.code];
    if (b) input.keys[b] = false;
  };
  const blur = () => input.reset();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);

  const style = document.createElement('style');
  style.textContent = 'html,body,#root{height:100%;margin:0;overflow:hidden;background:#000;' +
    'touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;' +
    'overscroll-behavior:none;-webkit-tap-highlight-color:transparent;}';
  document.head.appendChild(style);

  const noMenu = (e: Event) => e.preventDefault();
  window.addEventListener('contextmenu', noMenu);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    window.removeEventListener('contextmenu', noMenu);
    style.remove();
  };
}
