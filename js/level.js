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
// Rows are read top-to-bottom; the last two rows are the ground line (2
// tiles thick). All rows in a level share the same length. Levels are
// generated from a small set of hand-picked feature lists (pit spans,
// brick/question clusters, pipes, coin trails, enemy placements) so every
// row lines up perfectly -- see gen at the bottom for how features map to
// characters. Both levels escalate in difficulty left-to-right: an early
// power-up, then wider pits, more pipes, and denser enemy clusters,
// finishing at a flagpole.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  // ------------------------------------------------------------------
  // LEVEL 1 -- "Pepperoni Plains"
  // ------------------------------------------------------------------
  const level1Rows = [
  '                                                                                                                                                                                                        ',
  '                                                                                                                                                                                                        ',
  '                                                                                                                                                                                                F       ',
  '                                                                                                                                                                                                F       ',
  '        oooooo        ?                                                   ?                                     ?                                       ?                                       F       ',
  '                                                    P                   BBB                                                                                                                     F       ',
  '                    BBB                                                                             ?         BBBB                                    BBB                                       F       ',
  '                             ooo                                                     ^          ooo                                                                                 ^           F       ',
  '                                        ^                                            |                                  ^                        ^                                  |           F       ',
  '               g        g               |       g g              k            g g    |      k            g              |            g g k       |                   g  k g         |           F       ',
  '############################  ##############################   ################################  #################################   ###########################  ######################################',
  '############################  ##############################   ################################  #################################   ###########################  ######################################',
  ];

  // ------------------------------------------------------------------
  // LEVEL 2 -- "Four Cheese Fortress"  (harder: more pits, more enemies)
  // ------------------------------------------------------------------
  const level2Rows = [
  '                                                                                                                                                                                                                       ',
  '                                                                                                                                                                                                                       ',
  '                                                                                                                                                                                                               F       ',
  '                                                                                                                                                                                                               F       ',
  '      ooooo      P                           ?            ?                                           ?                                                 ?                             ?                        F       ',
  '                                                       BBBB                                                                  ?                        BBBB                                                     F       ',
  '               BBB                                                              ?                   BBB                                      oooo                                   BBB                        F       ',
  '                                         ooo                     ^                                            ^     ooo                                            ^                                           F       ',
  '                              ^                                  |                   ^                        |                        ^                           |                               ^           F       ',
  '            g g          k    |                 g g g         k k|            g      |          g k           |         g g k          |         g g          k g g|              g k g g          |           F       ',
  '##################  ####################   ###########################  ##################   ######################  #######################    ##########################   ###############  #########################',
  '##################  ####################   ###########################  ##################   ######################  #######################    ##########################   ###############  #########################',
  ];

  function padRows(rows) {
    const width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    return rows.map(function (r) { return r.length < width ? r + ' '.repeat(width - r.length) : r; });
  }

  // Converts raw ASCII rows into { tiles, width, height, spawns, playerStart, pipes }.
  // `tiles` is a 2D array [row][col] of tile type strings: 'ground','brick',
  // 'question_coin','question_power','used','pipeTop','pipeBody','flagpole', or null (air).
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
    parseLevel(level1Rows, { name: 'Pepperoni Plains' }),
    parseLevel(level2Rows, { name: 'Four Cheese Fortress' }),
  ];
})(window.PB);
