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
//     * floating coins never sit higher than row 4                       -> reachable at apex.
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
  function flag(rows, col) { for (let r = 2; r < GROUND_TOP; r++) put(rows, r, col, 'F'); }

  function toStrings(rows) { return rows.map(function (r) { return r.join(''); }); }

  // ------------------------------------------------------------------
  // LEVEL 1 -- "Pepperoni Plains"  (gentle: teaches jumping & coins)
  // ------------------------------------------------------------------
  function buildLevel1() {
    const W = 200;
    const rows = makeGrid(W);
    ground(rows, [[40, 42], [96, 98], [150, 152]]);

    // Early reward: a coin trail then an early power-up.
    coinLine(rows, 8, 8, 8);
    block(rows, 14, 'P');            // power-up early
    coinLine(rows, 8, 22, 4);

    // Coin/question cluster.
    block(rows, 28, '?'); block(rows, 30, 'B'); block(rows, 32, '?');
    coinLine(rows, 7, 28, 5);

    // First pipe with a coin arc over it.
    pipe(rows, 50); coinArc(rows, 50, 5);
    // Pit with coins strung across the gap.
    coinArc(rows, 41, 5);

    // Mid-section: bricks, coins, a couple of pipes.
    block(rows, 62, '?'); block(rows, 64, '?'); block(rows, 66, '?');
    coinLine(rows, 7, 61, 7);
    pipe(rows, 78); coinArc(rows, 78, 5);

    coinLine(rows, 8, 86, 10);
    block(rows, 90, '?');
    coinArc(rows, 97, 5);            // over the second pit

    // Later stretch: pipe, block cluster, denser coins.
    pipe(rows, 116); coinArc(rows, 116, 5);
    block(rows, 128, '?'); block(rows, 130, 'B'); block(rows, 132, '?');
    coinLine(rows, 7, 127, 7);
    coinArc(rows, 151, 5);           // over the third pit
    coinLine(rows, 8, 160, 12);
    block(rows, 170, '?'); block(rows, 172, '?');
    coinLine(rows, 7, 178, 8);

    // Enemies -- spread out, escalating toward the end.
    [18, 34, 58, 70, 88, 104, 120, 138, 158, 176].forEach(function (c) { enemy(rows, c, 'g'); });
    [72, 122, 168].forEach(function (c) { enemy(rows, c, 'k'); });

    flag(rows, 192);
    return toStrings(rows);
  }

  // ------------------------------------------------------------------
  // LEVEL 2 -- "Four Cheese Fortress"  (harder: more pits & enemies,
  // still fully clearable -- same height/width caps apply)
  // ------------------------------------------------------------------
  function buildLevel2() {
    const W = 215;
    const rows = makeGrid(W);
    ground(rows, [[36, 38], [70, 72], [104, 106], [150, 152], [186, 188]]);

    coinLine(rows, 8, 8, 6);
    block(rows, 16, 'P');            // power-up early
    coinArc(rows, 37, 5);            // over first pit

    block(rows, 46, '?'); block(rows, 48, 'B'); block(rows, 50, '?');
    coinLine(rows, 7, 45, 7);
    pipe(rows, 60); coinArc(rows, 60, 5);
    coinArc(rows, 71, 5);            // over second pit

    coinLine(rows, 8, 78, 10);
    block(rows, 84, '?'); block(rows, 86, '?');
    pipe(rows, 96); coinArc(rows, 96, 5);
    coinArc(rows, 105, 5);           // over third pit

    block(rows, 114, '?'); block(rows, 116, 'B'); block(rows, 118, '?');
    coinLine(rows, 7, 113, 7);
    pipe(rows, 128); coinArc(rows, 128, 5);
    coinLine(rows, 8, 136, 12);

    pipe(rows, 148); coinArc(rows, 151, 5);   // pipe just before pit
    block(rows, 162, '?'); block(rows, 164, '?'); block(rows, 166, '?');
    coinLine(rows, 7, 161, 7);
    pipe(rows, 176); coinArc(rows, 176, 5);
    coinArc(rows, 187, 5);           // over final pit
    coinLine(rows, 8, 194, 10);

    // Enemies -- denser than level 1.
    [12, 28, 44, 56, 66, 82, 92, 112, 124, 140, 158, 172, 190, 200].forEach(function (c) { enemy(rows, c, 'g'); });
    [50, 88, 120, 164, 196].forEach(function (c) { enemy(rows, c, 'k'); });

    flag(rows, 208);
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
