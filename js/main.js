// Pizza Bros. -- boot sequence.
(function (PB) {
  'use strict';

  function boot() {
    const canvas = document.getElementById('game');
    canvas.width = PB.CANVAS_WIDTH;
    canvas.height = PB.CANVAS_HEIGHT;

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
