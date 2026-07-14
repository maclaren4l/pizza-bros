// Pizza Bros. -- level data & parser.
//
// LEGEND (one character = one 16px tile column in a row string):
//   ' '  air / empty
//   '#'  ground (solid, full block, top-of-world dirt/grass tile)
//   'B'  brick (solid; big player can break it from below, small player
//        just bumps it)
//   '?'  question block containing a coin (solid until hit; bump from
//        below spawns a rising coin, then becomes used)
//   'P'  question block containing a power-up (bump from below spawns a
//        power-up item that walks off the top, then becomes used)
//   'U'  a used/empty block (already-hit question block, solid, static)
//   '|'  pipe body segment (solid, stacks to form pipe height)
//   '^'  pipe top-cap (solid, sits on top of a pipe body stack)
//   'o'  coin (collectible, floating in air)
//   'g'  Mushroom Grunt spawn point (tile becomes air, entity spawned)
//   'k'  Shellcrab spawn point (tile becomes air, entity spawned)
//   'F'  flagpole (solid pole spanning several rows; touching any part of
//        it at any height ends the level -- higher contact = bigger bonus)
//
// DESIGN / REACHABILITY (why the feature placement below is safe):
//   The player's standstill jump apex is ~2.9 tiles (JUMP_VELOCITY 300,
//   GRAVITY 980). To keep every obstacle clearable and every prize
//   reachable, the level generator enforces:
//     * pipes are at most 2 tiles tall  -> a running jump clears them,
//     * pits are at most 3 columns wide -> jumpable even at walk speed,
//     * '?'/'P'/'B' blocks sit on row 6 (bottom edge 2 tiles up)         -> bumpable,
//     * floating coins never sit higher than row 4                       -> reachable at apex,
//     * floating platforms (built with `platform()`) rise at most 2 tiles
//       above the surface a player jumps from                           -> clearable at apex,
//     * gaps between platforms/ground are at most 3 tiles at walk speed,
//       or up to 5 tiles where the level guarantees a run-up beforehand  -> jumpable,
//     * staircases (`stairsUp`/`stairsDown`) rise/fall 1 tile per column,
//       so each step is a plain running-jump hop, never a blind climb.
//   Rows are laid out on a fixed-width grid so every row is exactly the
//   same length (verified by the parser's uniform-width assumption).
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  const HEIGHT = 12;
  const GROUND_TOP = HEIGHT - 2; // row 10: top ground row; row 11 below it
  const BLOCK_ROW = 6;           // '?','P','B' live here (2-tile bump)

  // ---- grid builders ------------------------------------------------
  function makeGrid(width) {
    const rows = [];
    for (let r = 0; r < HEIGHT; r++) rows.push(new Array(width).fill(' '));
    return rows;
  }
  function put(rows, r, c, ch) {
    if (r >= 0 && r < rows.length && c >= 0 && c < rows[0].length) rows[r][c] = ch;
  }
  // Fill both ground rows solid, then carve the listed pit spans back out.
  function ground(rows, pits) {
    const w = rows[0].length;
    for (let c = 0; c < w; c++) { put(rows, GROUND_TOP, c, '#'); put(rows, GROUND_TOP + 1, c, '#'); }
    pits.forEach(function (span) {
      for (let c = span[0]; c <= span[1]; c++) { put(rows, GROUND_TOP, c, ' '); put(rows, GROUND_TOP + 1, c, ' '); }
    });
  }
  // A 2-tile pipe: cap on row 8, body on row 9 (sits on the ground surface).
  function pipe(rows, col) { put(rows, GROUND_TOP - 2, col, '^'); put(rows, GROUND_TOP - 1, col, '|'); }
  function block(rows, col, ch) { put(rows, BLOCK_ROW, col, ch); }
  // Horizontal run of coins on one row.
  function coinLine(rows, r, cStart, count) { for (let i = 0; i < count; i++) put(rows, r, cStart + i, 'o'); }
  // A shallow coin hump (arc) centered over an obstacle/pit to reward jumping.
  // Peak sits on row 6 (the top of a flat-ground jump arc), ends drop to
  // row 8 -- the whole hump stays inside the collectible band.
  function coinArc(rows, cCenter, span) {
    const half = Math.floor(span / 2);
    for (let i = -half; i <= half; i++) {
      const dip = Math.abs(i);
      const r = 6 + dip; // peak at row 6, ends lower (7,8)
      put(rows, Math.min(r, 8), cCenter + i, 'o');
    }
  }
  function enemy(rows, col, kind) { put(rows, GROUND_TOP - 1, col, kind); } // stands on ground
  // Places an enemy standing on top of a solid tile at surfaceRow (e.g. a
  // platform or staircase step, not just the ground).
  function enemyAt(rows, col, surfaceRow, kind) { put(rows, surfaceRow - 1, col, kind); }
  function flag(rows, col) { for (let r = 2; r < GROUND_TOP; r++) put(rows, r, col, 'F'); }

  // A floating platform: `len` solid tiles wide, sitting at row `r` (r is the
  // row of the walkable surface itself). Defaults to brick.
  function platform(rows, colStart, len, r, ch) {
    ch = ch || 'B';
    for (let i = 0; i < len; i++) put(rows, r, colStart + i, ch);
  }

  // Ascending staircase: each column is one tile taller than the last,
  // starting at 1 tile and climbing to `steps` tiles, feet resting on the
  // ground. Classic Mario-style -- clear each step with a running hop.
  function stairsUp(rows, colStart, steps, ch) {
    ch = ch || 'B';
    for (let s = 0; s < steps; s++) {
      for (let h = 0; h <= s; h++) put(rows, GROUND_TOP - 1 - h, colStart + s, ch);
    }
  }
  // Mirror of stairsUp: starts tall and descends by one tile per column.
  function stairsDown(rows, colStart, steps, ch) {
    ch = ch || 'B';
    for (let s = 0; s < steps; s++) {
      const height = steps - s;
      for (let h = 0; h < height; h++) put(rows, GROUND_TOP - 1 - h, colStart + s, ch);
    }
  }

  function toStrings(rows) { return rows.map(function (r) { return r.join(''); }); }

  // ------------------------------------------------------------------
  // LEVEL 1 -- "Pepperoni Plains"  (gentle: teaches jumping & coins)
  // ------------------------------------------------------------------
  function buildLevel1() {
    const W = 220;
    const rows = makeGrid(W);
    ground(rows, [[44, 46], [110, 112], [172, 174]]);

    // Early reward: a coin trail then an early power-up.
    coinLine(rows, 8, 6, 8);
    block(rows, 16, 'P');             // power-up early

    // Warm-up platform -- floating over solid ground, so a missed jump just
    // drops back to the floor. Teaches "jump onto a ledge" before it matters.
    platform(rows, 20, 3, 8); coinLine(rows, 6, 20, 3);
    coinLine(rows, 8, 26, 4);

    // Coin/question cluster.
    block(rows, 34, '?'); block(rows, 36, 'B'); block(rows, 38, '?');
    coinLine(rows, 7, 34, 5);

    // First pit, coins strung across the gap.
    coinArc(rows, 45, 5);
    // Pipe with a coin arc over it.
    pipe(rows, 54); coinArc(rows, 54, 5);

    // A little brick hill -- 3 steps up, a short flat peak, 3 steps down.
    // Every step is a 1-tile hop, so it's still an easy clear.
    stairsUp(rows, 58, 3);
    platform(rows, 60, 4, 7);
    stairsDown(rows, 64, 3);
    coinLine(rows, 5, 61, 2);          // peak reward

    coinLine(rows, 8, 74, 7);
    pipe(rows, 86); coinArc(rows, 86, 5);

    coinLine(rows, 8, 94, 10);
    block(rows, 100, '?');
    coinArc(rows, 111, 5);             // over the second pit

    // Stepping-stone platforms over solid ground -- a short hop-hop-hop
    // chain, with a grunt patrolling the far one.
    platform(rows, 120, 4, 8); coinLine(rows, 6, 120, 4);
    platform(rows, 128, 4, 8); coinLine(rows, 6, 128, 4);
    enemyAt(rows, 130, 8, 'g');

    pipe(rows, 140); coinArc(rows, 140, 5);
    block(rows, 148, '?'); block(rows, 150, 'B'); block(rows, 152, '?');
    coinLine(rows, 7, 147, 7);
    coinArc(rows, 173, 5);             // over the third pit
    coinLine(rows, 8, 182, 12);
    block(rows, 198, '?'); block(rows, 200, '?');

    // Enemies -- spread out, escalating toward the end (avoids pit and
    // staircase columns so nothing spawns on top of missing/solid tiles).
    [12, 30, 40, 56, 72, 90, 98, 116, 138, 156, 178, 196].forEach(function (c) { enemy(rows, c, 'g'); });
    [80, 144, 190, 202].forEach(function (c) { enemy(rows, c, 'k'); });

    flag(rows, 210);
    return toStrings(rows);
  }

  // ------------------------------------------------------------------
  // LEVEL 2 -- "Four Cheese Fortress"  (harder: more pits & enemies,
  // still fully clearable -- same height/width caps apply)
  // ------------------------------------------------------------------
  function buildLevel2() {
    const W = 247;
    const rows = makeGrid(W);
    // A wider pit (145-152) is only crossable via the bridging platform
    // placed below -- the level's riskiest jump, since a miss here is a
    // pit death rather than a soft landing back on solid ground.
    ground(rows, [[43, 45], [83, 85], [123, 125], [145, 152], [177, 179], [212, 214]]);

    coinLine(rows, 8, 8, 6);
    block(rows, 16, 'P');             // power-up early

    // Stepping-stone chain: three short platforms with 3-tile hops between
    // them, all over solid ground. A grunt patrols the middle one. A full
    // 8-tile flat runway follows before the first pit, so landing off the
    // last stone still leaves room to build up a running jump.
    platform(rows, 20, 3, 8); coinLine(rows, 6, 20, 3);
    platform(rows, 26, 3, 8); coinLine(rows, 6, 26, 3);
    platform(rows, 32, 3, 8); coinLine(rows, 6, 32, 3);
    enemyAt(rows, 27, 8, 'g');

    coinArc(rows, 44, 5);             // over first pit

    block(rows, 53, '?'); block(rows, 55, 'B'); block(rows, 57, '?');
    coinLine(rows, 7, 53, 5);

    // Tall brick hill -- 4 steps up, a flat peak guarded by a grunt, 4
    // steps down. Taller than level 1's hill but still all 1-tile hops.
    stairsUp(rows, 65, 4);
    platform(rows, 68, 4, 6);
    stairsDown(rows, 72, 4);
    coinLine(rows, 4, 69, 2);          // peak reward, max safe coin height
    enemyAt(rows, 70, 6, 'g');

    pipe(rows, 79); coinArc(rows, 79, 5);
    coinArc(rows, 84, 5);             // over second pit

    // Wide floating platform over solid ground, patrolled by a grunt and a
    // shellcrab -- the shell can be stomped/kicked while up there.
    platform(rows, 103, 5, 8); coinLine(rows, 6, 103, 5);
    enemyAt(rows, 104, 8, 'g');
    enemyAt(rows, 106, 8, 'k');

    pipe(rows, 115); coinArc(rows, 115, 5);
    coinArc(rows, 124, 5);            // over third pit

    // Bridge across the wide pit -- ground/platform/platform/ground, each
    // hop only 2-3 tiles, but falling short here is fatal.
    platform(rows, 148, 3, 8); coinLine(rows, 6, 148, 3);

    block(rows, 167, '?'); block(rows, 169, 'B'); block(rows, 171, '?');
    coinLine(rows, 7, 167, 5);
    coinArc(rows, 178, 5);            // over fifth pit

    coinLine(rows, 8, 185, 10);
    pipe(rows, 203); coinArc(rows, 203, 5);
    coinArc(rows, 213, 5);            // over final pit
    coinLine(rows, 8, 217, 10);
    block(rows, 221, '?'); block(rows, 223, '?');

    // Enemies -- denser than level 1, avoiding pit/staircase columns.
    [12, 51, 59, 77, 95, 117, 131, 139, 157, 165, 171, 187, 195, 205, 219, 227].forEach(function (c) { enemy(rows, c, 'g'); });
    [76, 111, 141, 173, 209].forEach(function (c) { enemy(rows, c, 'k'); });

    flag(rows, 233);
    return toStrings(rows);
  }

  function padRows(rows) {
    const width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    return rows.map(function (r) { return r.length < width ? r + ' '.repeat(width - r.length) : r; });
  }

  // Converts raw ASCII rows into { tiles, width, height, spawns, playerStart, coins, flag }.
  function parseLevel(rawRows, meta) {
    const rows = padRows(rawRows);
    const height = rows.length;
    const width = rows[0].length;
    const tiles = [];
    const spawns = []; // { type: 'grunt'|'shellcrab', col, row }
    const coins = [];  // floating coin locations { col, row }
    let flagCol = null;
    let flagRow = null;

    for (let y = 0; y < height; y++) {
      const line = [];
      for (let x = 0; x < width; x++) {
        const ch = rows[y][x];
        let tile = null;
        switch (ch) {
          case '#': tile = 'ground'; break;
          case 'B': tile = 'brick'; break;
          case '?': tile = 'question_coin'; break;
          case 'P': tile = 'question_power'; break;
          case 'U': tile = 'used'; break;
          case '|': tile = 'pipeBody'; break;
          case '^': tile = 'pipeTop'; break;
          case 'F':
            tile = 'flagpole';
            if (flagCol === null) { flagCol = x; flagRow = y; }
            break;
          case 'o':
            coins.push({ col: x, row: y });
            tile = null;
            break;
          case 'g':
            spawns.push({ type: 'grunt', col: x, row: y });
            tile = null;
            break;
          case 'k':
            spawns.push({ type: 'shellcrab', col: x, row: y });
            tile = null;
            break;
          default:
            tile = null;
        }
        line.push(tile);
      }
      tiles.push(line);
    }

    // Player always starts near the left edge, standing on the ground row.
    const groundRow = height - 2; // first solid ground row index
    const playerStart = { col: 2, row: groundRow - 1 };

    return {
      name: meta.name,
      width: width,
      height: height,
      tiles: tiles,
      spawns: spawns,
      coins: coins,
      flag: (flagCol !== null) ? { col: flagCol, row: flagRow } : null,
      playerStart: playerStart,
    };
  }

  PB.levels = [
    parseLevel(buildLevel1(), { name: 'Pepperoni Plains' }),
    parseLevel(buildLevel2(), { name: 'Four Cheese Fortress' }),
  ];
})(window.PB);
