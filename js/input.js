// Pizza Bros. -- keyboard input state.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  const KEYMAP = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['KeyZ', 'Space', 'ArrowUp', 'KeyW'],
    run: ['KeyX', 'ShiftLeft', 'ShiftRight'],
    pause: ['KeyP'],
    mute: ['KeyM'],
    restart: ['KeyR'],
    confirm: ['Enter'],
  };

  // current held state per action
  const held = {};
  // true for exactly one frame the tick the key went down
  const pressed = {};
  // codes that are down right now, so we can dedupe keydown auto-repeat
  const rawDown = Object.create(null);

  for (const action in KEYMAP) { held[action] = false; pressed[action] = false; }

  function actionsForCode(code) {
    const out = [];
    for (const action in KEYMAP) {
      if (KEYMAP[action].indexOf(code) !== -1) out.push(action);
    }
    return out;
  }

  window.addEventListener('keydown', function (e) {
    const actions = actionsForCode(e.code);
    if (actions.length) e.preventDefault();
    if (rawDown[e.code]) return; // ignore OS auto-repeat
    rawDown[e.code] = true;
    for (const a of actions) {
      if (!held[a]) pressed[a] = true;
      held[a] = true;
    }
  }, { passive: false });

  window.addEventListener('keyup', function (e) {
    rawDown[e.code] = false;
    const actions = actionsForCode(e.code);
    for (const a of actions) {
      // only release if no other mapped key for this action is still down
      const stillDown = KEYMAP[a].some(function (code) { return code !== e.code && rawDown[code]; });
      if (!stillDown) held[a] = false;
    }
  });

  // Call once per game tick after processing input, to clear one-frame "pressed" flags.
  function endFrame() {
    for (const a in pressed) pressed[a] = false;
  }

  window.addEventListener('blur', function () {
    for (const a in held) held[a] = false;
    for (const code in rawDown) rawDown[code] = false;
  });

  PB.input = {
    held: held,
    pressed: pressed,
    endFrame: endFrame,
  };
})(window.PB);
