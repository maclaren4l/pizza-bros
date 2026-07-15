// Pizza Bros. -- on-screen touch controls. Feeds the same PB.input.held /
// PB.input.pressed state that keyboard input drives (see input.js), so
// game.js and entities.js need no touch-specific branching.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  function isTouchCapable() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  function init() {
    if (!isTouchCapable()) return;
    document.documentElement.classList.add('touch-device');

    const held = PB.input.held;
    const pressed = PB.input.pressed;

    // On touch, the player runs by default; WALK (bound below) is what
    // suppresses it. input.js's `blur` handler zeroes every held flag when
    // the tab loses focus (e.g. phone screen lock / app switch), so restore
    // the always-run default on refocus too.
    held.run = true;
    window.addEventListener('focus', function () { held.run = true; });

    // A button that acts like a held key: down while any touch is on it,
    // rising edge sets the one-frame `pressed` flag like a real keydown.
    function bindHold(id, action) {
      const el = document.getElementById(id);
      if (!el) return;
      const activeTouches = new Set();

      function start(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) activeTouches.add(e.changedTouches[i].identifier);
        if (!held[action]) pressed[action] = true;
        held[action] = true;
        el.classList.add('tc-active');
      }
      function end(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) activeTouches.delete(e.changedTouches[i].identifier);
        if (activeTouches.size === 0) {
          held[action] = false;
          el.classList.remove('tc-active');
        }
      }
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
    }

    // The inverse of bindHold: `action` is true by default (on touch, the
    // player always runs) and this button suppresses it while held, so
    // holding WALK is what lets the player move at the slower walk speed.
    function bindInvertedHold(id, action) {
      const el = document.getElementById(id);
      if (!el) return;
      const activeTouches = new Set();

      function start(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) activeTouches.add(e.changedTouches[i].identifier);
        held[action] = false;
        el.classList.add('tc-active');
      }
      function end(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) activeTouches.delete(e.changedTouches[i].identifier);
        if (activeTouches.size === 0) {
          held[action] = true;
          el.classList.remove('tc-active');
        }
      }
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
    }

    // A button that just fires the one-frame `pressed` flag on tap (pause,
    // mute, restart -- game.js only ever checks these via `pressed`).
    function bindTap(id, action) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', function (e) {
        e.preventDefault();
        pressed[action] = true;
        el.classList.add('tc-active');
      }, { passive: false });
      const clear = function (e) { e.preventDefault(); el.classList.remove('tc-active'); };
      el.addEventListener('touchend', clear, { passive: false });
      el.addEventListener('touchcancel', clear, { passive: false });
    }

    bindHold('tc-left', 'left');
    bindHold('tc-right', 'right');
    bindInvertedHold('tc-walk', 'run');
    bindHold('tc-jump', 'jump');

    // The jump button doubles as "confirm" so the same button starts the
    // game / retries from the title, game-over, and win screens -- jump has
    // no effect there, so this can't double-fire during play.
    const jumpEl = document.getElementById('tc-jump');
    if (jumpEl) {
      jumpEl.addEventListener('touchstart', function () { pressed.confirm = true; }, { passive: false });
    }

    bindTap('tc-pause', 'pause');
    bindTap('tc-restart', 'restart');
    bindTap('tc-mute', 'mute');

    // Mirrors main.js's first-keydown audio unlock: playing music from
    // inside a rAF callback (where game.js normally calls it) can miss the
    // "trusted user gesture" window autoplay policies require, so also try
    // from directly within the first touch event handler.
    let audioKicked = false;
    window.addEventListener('touchstart', function () {
      if (audioKicked) return;
      audioKicked = true;
      if (PB.game.state === PB.STATE.PLAYING) PB.audio.playMusic();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.PB);
