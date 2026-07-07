// Pizza Bros. -- audio manager.
// Tries assets/sounds/<name>.{ogg,wav,mp3} in order; first one that fires
// canplaythrough wins. Anything that fails all three becomes a silent
// no-op so missing assets never crash or spam the console.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  const NAMES = ['jump', 'coin', 'stomp', 'powerup', 'hurt', 'die', 'win', 'theme'];
  const EXTENSIONS = ['ogg', 'wav', 'mp3'];
  const BASE_PATH = 'assets/sounds/';

  const buffers = {};   // name -> HTMLAudioElement (the loaded, ready-to-clone source) or null
  let muted = false;
  let musicEl = null;
  let musicStarted = false;

  function loadSound(name) {
    return new Promise(function (resolve) {
      let i = 0;
      let settled = false;
      function tryNext() {
        if (settled) return;
        if (i >= EXTENSIONS.length) {
          settled = true;
          resolve(null);
          return;
        }
        const ext = EXTENSIONS[i++];
        let audio;
        try {
          audio = new Audio();
        } catch (err) {
          settled = true;
          resolve(null);
          return;
        }
        const url = BASE_PATH + name + '.' + ext;
        const onOk = function () {
          cleanup();
          settled = true;
          resolve(audio);
        };
        const onErr = function () {
          cleanup();
          tryNext();
        };
        function cleanup() {
          audio.removeEventListener('canplaythrough', onOk);
          audio.removeEventListener('error', onErr);
        }
        audio.addEventListener('canplaythrough', onOk, { once: true });
        audio.addEventListener('error', onErr, { once: true });
        try {
          audio.src = url;
          audio.load();
        } catch (err) {
          onErr();
        }
      }
      tryNext();
    });
  }

  function init() {
    NAMES.forEach(function (name) {
      buffers[name] = null;
      loadSound(name).then(function (audio) {
        buffers[name] = audio;
        if (name === 'theme' && audio) {
          audio.loop = true;
          audio.volume = 0.4;
        }
      }).catch(function () {
        buffers[name] = null;
      });
    });
  }

  function play(name) {
    if (muted) return;
    const src = buffers[name];
    if (!src) return; // silent no-op for missing/failed sounds
    try {
      const node = src.cloneNode(true);
      node.volume = name === 'theme' ? 0.4 : 0.8;
      const p = node.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (err) {
      // ignore playback errors (e.g. autoplay policy)
    }
  }

  function playMusic() {
    const src = buffers.theme;
    if (!src) return;
    if (!musicEl) {
      musicEl = src; // use the loaded element directly so .loop persists
      musicEl.loop = true;
      musicEl.volume = 0.4;
    }
    if (muted) return;
    musicStarted = true;
    try {
      const p = musicEl.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (err) { /* ignore */ }
  }

  function stopMusic() {
    if (musicEl) {
      try { musicEl.pause(); } catch (err) { /* ignore */ }
    }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      stopMusic();
    } else if (musicStarted) {
      playMusic();
    }
    return muted;
  }

  function isMuted() { return muted; }

  PB.audio = {
    init: init,
    play: play,
    playMusic: playMusic,
    stopMusic: stopMusic,
    toggleMute: toggleMute,
    isMuted: isMuted,
  };
})(window.PB);
