// Pizza Bros. -- boot sequence.
(function (PB) {
  'use strict';

  // Size the canvas's ON-SCREEN box to a whole-number multiple of its backing
  // store in *physical device pixels*. If the browser instead scales the canvas
  // by a fractional factor (which `max-width:100%` does), it resamples the
  // whole image every frame as the world scrolls, and the crisp internal pixels
  // shimmer/jitter at the physical grid -- worst on Retina (devicePixelRatio 2).
  // Setting CSS size = backing * z / dpr makes physical size = backing * z
  // exactly (the dpr cancels), so every logical pixel is a clean integer block
  // and scrolling stays rock-steady at any window size or DPR.
  function fitCanvas(canvas) {
    const stage = document.getElementById('stage');
    const dpr = window.devicePixelRatio || 1;
    const availW = stage.clientWidth * dpr;
    const availH = stage.clientHeight * dpr;
    let z = Math.floor(Math.min(availW / PB.CANVAS_WIDTH, availH / PB.CANVAS_HEIGHT));
    if (z < 1) z = 1; // never scale below 1x device-pixel (clip rather than blur)
    canvas.style.width = (PB.CANVAS_WIDTH * z / dpr) + 'px';
    canvas.style.height = (PB.CANVAS_HEIGHT * z / dpr) + 'px';
  }

  function boot() {
    const canvas = document.getElementById('game');
    canvas.width = PB.CANVAS_WIDTH;
    canvas.height = PB.CANVAS_HEIGHT;
    fitCanvas(canvas);
    window.addEventListener('resize', function () { fitCanvas(canvas); });

    PB.sprites.sheets = PB.sprites.build();
    PB.audio.init();
    PB.game.init(canvas);

    // Kick off music on the very first user keypress (autoplay policy).
    let musicStarted = false;
    window.addEventListener('keydown', function () {
      if (!musicStarted) {
        musicStarted = true;
        if (PB.game.state === PB.STATE.PLAYING) PB.audio.playMusic();
      }
    });

    requestAnimationFrame(function loop(ts) {
      PB.game.frame(ts);
      requestAnimationFrame(loop);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.PB);
