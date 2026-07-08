// Pizza Bros. -- procedural pixel-art sprite definitions.
// Every sprite is authored as an array of equal-length strings (one char
// = one logical pixel). CHAR_MAP resolves each character to a color from
// PB.COLORS. build() rasterizes a frame once to an offscreen canvas at
// load time; everything else just drawImage()s the cached canvas with
// imageSmoothingEnabled = false for crisp scaling.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  const C = PB.COLORS;

  // Shared character -> color lookup used by every sprite definition below.
  const CHAR_MAP = {
    '.': null, // transparent
    'K': C.outline,
    'C': C.crust,
    'D': C.crustDark,
    'E': C.cheese,
    'F': C.cheeseDark,
    'P': C.pepperoni,
    'Q': C.pepperoniDark,
    'R': C.shirt,
    'r': C.shirtDark,
    'O': C.overalls,
    'o': C.overallsDark,
    'G': C.glove,
    'g': C.gloveShade,
    'H': C.shoe,
    'h': C.shoeDark,
    'B': C.eyeBlack,
    'W': C.eyeWhite,
    'T': C.mushroomTan,
    'M': C.mushroomRed,
    'm': C.mushroomRedDark,
    'Z': C.shellcrabGreen,
    'z': C.shellcrabGreenDark,
    'L': C.shellcrabShell,
    'N': C.ground,
    'n': C.groundDark,
    'U': C.groundTop,
    'A': C.brick,
    'a': C.brickDark,
    'l': C.brickLine,
    'k': C.block,
    'j': C.blockDark,
    'p': C.blockPulse,
    'u': C.usedBlock,
    'V': C.pipeGreen,
    'v': C.pipeGreenDark,
    'x': C.pipeGreenLight,
    'c': C.coinGold,
    'd': C.coinGoldDark,
    'f': C.flagGreen,
    'y': C.flagCloth,
  };

  function rowsToCanvas(rows) {
    const h = rows.length;
    const w = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const color = CHAR_MAP[row[x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }

  // Grows a 16-row sprite into a taller "big" variant by duplicating an
  // interior torso row `extra` times right after `afterRow`. This keeps
  // the head and feet art identical while stretching the body -- used to
  // build the powered-up variants from the small-player frames.
  function growTall(rows, afterRow, extra) {
    const out = rows.slice(0, afterRow + 1);
    for (let i = 0; i < extra; i++) out.push(rows[afterRow]);
    out.push.apply(out, rows.slice(afterRow + 1));
    return out;
  }

  // ---------------------------------------------------------------
  // PLAYER -- pizza-slice head, Mario-style overalls body.
  // 16 wide x 16 tall. Head = rows 0-7 (shared by every frame): a
  // triangular slice, crust band on top, tapering point-down to the
  // body, with pepperoni + eyes on the cheese. Torso = 8-11, legs = 12-15.
  // ---------------------------------------------------------------
  const HEAD = [
    '.KKKKKKKKKKKKKK.',
    'KCCCCCCCCCCCCCCK',
    'KCCDCCDCCDCCDCCK',
    '.KEEEEEEEEEEEEK.',
    '..KEPEBEEBEPEK..',
    '...KEEEEEEEEK...',
    '....KEPEEPEK....',
    '.....KEEEEK.....',
  ];

  const playerIdle = HEAD.concat([
    '..KRRRRRRRRRRK..',
    '.GKRRRRRRRRRRKG.',
    '.GKOOoOOOOoOOKG.',
    '..KOOOOOOOOOOK..',
    '..KOOK..KOOK....',
    '...OOK..KOO.....',
    '..HHHK..KHHH....',
    '.HHHHK..KHHHH...',
  ]);

  const playerWalk1 = HEAD.concat([
    '..KRRRRRRRRRRK..',
    'GGKRRRRRRRRRRK..',
    '.GKOOoOOOOoOOK..',
    '..KOOOOOOOOOOK..',
    '.KOOK....KOOK...',
    '.HHHK....KOOK...',
    '.HHHK....KHHHK..',
    '......KKKKHHHK..',
  ]);

  const playerWalk2 = HEAD.concat([
    '..KRRRRRRRRRRK..',
    '..KRRRRRRRRRRKGG',
    '..KOOoOOOOoOOKG.',
    '..KOOOOOOOOOOK..',
    '...KOOK....KOOK.',
    '...KOOK....KHHHK',
    '..KHHHK....KHHHK',
    '..KHHHK.........',
  ]);

  const playerJump = HEAD.concat([
    '.GKRRRRRRRRRRK..',
    '..KRRRRRRRRRRKG.',
    '..KOOoOOOOoOOKG.',
    '..KOOOOOOOOOOK..',
    '..KOOK....KOOK..',
    '..HHHK....KHHH..',
    '..HHHK....KHHH..',
    '................',
  ]);

  const playerSkid = HEAD.concat([
    '..KRRRRRRRRRRK..',
    'GGKRRRRRRRRRRKGG',
    '.KOOoOOOOOoOOK..',
    '.KOOOOOOOOOOOK..',
    'KOOOK......KOOOK',
    'HHHHK......KHHHH',
    '.HHHK......KHHH.',
    '................',
  ]);

  // Big variants: stretch the torso by splicing extra overalls rows in.
  const bigIdle = growTall(playerIdle, 10, 4);
  const bigWalk1 = growTall(playerWalk1, 10, 4);
  const bigWalk2 = growTall(playerWalk2, 10, 4);
  const bigJump = growTall(playerJump, 10, 4);
  const bigSkid = growTall(playerSkid, 9, 4);

  // ---------------------------------------------------------------
  // MUSHROOM GRUNT (goomba-like) -- 16x16.
  // ---------------------------------------------------------------
  const gruntWalk1 = [
    '.....KKKKKK.....',
    '...KKMMMMMMKK...',
    '..KMMMMMMMMMMK..',
    '.KMMMMMMMMMMMMK.',
    'KMMMmMMMMMMmMMMK',
    'KMMmmMMMMMMmmMMK',
    'KMMMMMMMMMMMMMMK',
    '.KTTWKKKKWTTK...',
    '.KTWBKKKKBWTK...',
    '..KTTKKKKTTK....',
    '..KTTTTTTTTK....',
    '..KTTTTTTTTK....',
    '...KTTTTTTK.....',
    '...KK....KK.....',
    '..KKK....KKK....',
    '................',
  ];

  const gruntWalk2 = [
    '.....KKKKKK.....',
    '...KKMMMMMMKK...',
    '..KMMMMMMMMMMK..',
    '.KMMMMMMMMMMMMK.',
    'KMMMmMMMMMMmMMMK',
    'KMMmmMMMMMMmmMMK',
    'KMMMMMMMMMMMMMMK',
    '.KTTWKKKKWTTK...',
    '.KTWBKKKKBWTK...',
    '..KTTKKKKTTK....',
    '..KTTTTTTTTK....',
    '..KTTTTTTTTK....',
    '..KKTTTTTTKK....',
    '.KKK......KKK...',
    '................',
    '................',
  ];

  const gruntSquashed = [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....KKKKKK.....',
    '...KKMMMMMMKK...',
    '..KMMMMMMMMMMK..',
    '.KMMMmMMMMmMMMK.',
    'KMMMMMMMMMMMMMMK',
    'KTTWKKKKKKKWTTKK',
    '.KKKKKKKKKKKKK..',
    '................',
    '................',
    '................',
  ];

  // ---------------------------------------------------------------
  // SHELLCRAB (koopa-like) -- 16x16.
  // ---------------------------------------------------------------
  const shellcrabWalk1 = [
    '.....KKKKK......',
    '...KKWWWWWKK....',
    '..KWWWBWWBWWK...',
    '..KWWWWWWWWWK...',
    '...KKWWWWWKK....',
    '....K..K..K.....',
    '..KLLLLLLLLLK...',
    '.KLLzzLLLzzLLK..',
    'KLLLLLLLLLLLLLK.',
    'KLLzzLLLLLzzLLK.',
    '.KLLLLLLLLLLLK..',
    '..KZZZKKKZZZK...',
    '..KZZZK..KZZK...',
    '..KKKK....KKK...',
    '..HHK......KHH..',
    '................',
  ];

  const shellcrabWalk2 = [
    '.....KKKKK......',
    '...KKWWWWWKK....',
    '..KWWWBWWBWWK...',
    '..KWWWWWWWWWK...',
    '...KKWWWWWKK....',
    '....K..K..K.....',
    '..KLLLLLLLLLK...',
    '.KLLzzLLLzzLLK..',
    'KLLLLLLLLLLLLLK.',
    'KLLzzLLLLLzzLLK.',
    '.KLLLLLLLLLLLK..',
    '...KZZZKKZZZK...',
    '...KZZK....ZK...',
    '...KK........K..',
    '................',
    '................',
  ];

  const shellcrabShell = [
    '................',
    '................',
    '................',
    '.....KKKKKK.....',
    '...KKLLLLLLKK...',
    '..KLLzzLLzzLLK..',
    '.KLLLLLLLLLLLLK.',
    '.KLLLLLLLLLLLLK.',
    '.KLLzzLLLLzzLLK.',
    '..KLLLLLLLLLLK..',
    '...KKLLLLLLKK...',
    '.....KKKKKK.....',
    '................',
    '................',
    '................',
    '................',
  ];

  // ---------------------------------------------------------------
  // ITEMS
  // ---------------------------------------------------------------
  // Pepperoni "coin" -- spinning 4-frame loop (wide -> thin -> wide -> thin).
  const coin1 = [
    '................',
    '.....dddddd.....',
    '....dPPPPPPd....',
    '...dPPQPPQPPd...',
    '...dPPPPPPPPd...',
    '...dPPQPPQPPd...',
    '....dPPPPPPd....',
    '.....dddddd.....',
  ];
  const coin2 = [
    '................',
    '......dddd......',
    '.....dPPPPd.....',
    '.....dPQPQd.....',
    '.....dPPPPd.....',
    '.....dPQPQd.....',
    '.....dPPPPd.....',
    '......dddd......',
  ];
  const coin3 = [
    '................',
    '.......dd.......',
    '......dPPd......',
    '......dQPd......',
    '......dPPd......',
    '......dQPd......',
    '......dPPd......',
    '.......dd.......',
  ];
  const coin4 = coin2.slice();

  const powerupItem = [
    '.KKKKKKKKKKKKKK.',
    'KCCCCCCCCCCCCCCK',
    'KCCDCCDCCDCCDCCK',
    '.KEEEEEEEEEEEEK.',
    '..KEPPEEEEPPEK..',
    '...KEEEEEEEEK...',
    '....KEPEEPEK....',
    '.....KEEEEK.....',
    '......KEEK......',
    '.......KK.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];

  const questionBlock1 = [
    'jjjjjjjjjjjjjjjj',
    'jkkkkkkkkkkkkkkj',
    'jkkKKkkkkKKkkkkj',
    'jkkKkkkkkkKkkkkj',
    'jkkkkkkKKkkkkkkj',
    'jkkkkkKkkkkkkkkj',
    'jkkkkkKkkkkkkkkj',
    'jkkkkkkkkkkkkkkj',
    'jkkkkkKkkkkkkkkj',
    'jkkkkkkkkkkkkkkj',
    'jjjjjjjjjjjjjjjj',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];
  const questionBlock2 = [
    'jjjjjjjjjjjjjjjj',
    'jppppppppppppppj',
    'jppKKppppKKppppj',
    'jppKppppppKppppj',
    'jppppppKKppppppj',
    'jppppppKpppppppj',
    'jppppppKpppppppj',
    'jppppppppppppppj',
    'jppppppKpppppppj',
    'jppppppppppppppj',
    'jjjjjjjjjjjjjjjj',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];
  const usedBlockRows = [
    'jjjjjjjjjjjjjjjj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'juuuuuuuuuuuuuuj',
    'jjjjjjjjjjjjjjjj',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];

  const brickRows = [
    'aaaaaaaaaaaaaaaa',
    'aAAAAlAAAAAlAAAa',
    'aAAAAlAAAAAlAAAa',
    'aAAAAAAAAAAAAAAa',
    'alAAAAAlAAAAAlAa',
    'alAAAAAlAAAAAlAa',
    'aAAAAAAAAAAAAAAa',
    'aAAAAlAAAAAlAAAa',
    'aAAAAlAAAAAlAAAa',
    'aAAAAAAAAAAAAAAa',
    'aaaaaaaaaaaaaaaa',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];

  const groundRows = [
    'UUUUUUUUUUUUUUUU',
    'UUUUUUUUUUUUUUUU',
    'NNNNNNNNNNNNNNNN',
    'NnNNNNnNNNNNnNNN',
    'NNNNnNNNNNnNNNNN',
    'NNNNNNNNNNNNNNNN',
    'NnNNNNnNNNNNnNNN',
    'NNNNNNNNNNNNNNNN',
    'NNNNnNNNNNnNNNNN',
    'NNNNNNNNNNNNNNNN',
    'NnNNNNnNNNNNnNNN',
    'NNNNNNNNNNNNNNNN',
    'NNNNnNNNNNnNNNNN',
    'NNNNNNNNNNNNNNNN',
    'NnNNNNnNNNNNnNNN',
    'NNNNNNNNNNNNNNNN',
  ];

  const pipeTopRows = [
    'vVVVVVVVVVVVVVv.',
    'vVxVVVVVVVVVxVv.',
    'vVxVVVVVVVVVxVv.',
    'vVVVVVVVVVVVVVv.',
    '.vVVVVVVVVVVVv..',
    '.vVxVVVVVVVxVv..',
    '.vVxVVVVVVVxVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
  ];

  const pipeBodyRows = [
    '.vVVVVVVVVVVVv..',
    '.vVxVVVVVVVxVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVxVVVVVVVxVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVxVVVVVVVxVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVxVVVVVVVxVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
    '.vVxVVVVVVVxVv..',
    '.vVVVVVVVVVVVv..',
    '.vVVVVVVVVVVVv..',
  ];

  const flagpolePoleRows = [
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
    '.......f........',
  ];

  const flagClothRows = [
    '.......yyyyyyyy.',
    '.......yyyyyyy..',
    '.......yyyyyy...',
    '.......yyyyy....',
    '.......yyyy.....',
    '.......yyy......',
    '.......yy.......',
    '.......y........',
  ];

  // ---------------------------------------------------------------
  // Backgrounds -- drawn procedurally (not string arrays) since they are
  // soft rounded shapes better expressed as arcs than pixel grids.
  // ---------------------------------------------------------------
  function buildCloud() {
    const w = 48, h = 24;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = C.cloudWhite;
    ctx.beginPath();
    ctx.arc(14, 16, 10, 0, Math.PI * 2);
    ctx.arc(24, 10, 12, 0, Math.PI * 2);
    ctx.arc(34, 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(6, 16, 36, 6);
    return canvas;
  }

  function buildHill() {
    const w = 80, h = 40;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = C.hillGreen;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w / 2, 4);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.hillGreenDark;
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w * 0.62, 20);
    ctx.lineTo(w * 0.44, 20);
    ctx.closePath();
    ctx.fill();
    return canvas;
  }

  function buildBush() {
    const w = 48, h = 20;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = C.hillGreen;
    ctx.beginPath();
    ctx.arc(12, 14, 9, 0, Math.PI * 2);
    ctx.arc(24, 10, 11, 0, Math.PI * 2);
    ctx.arc(36, 14, 9, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  // ---------------------------------------------------------------
  // Build everything once at load and expose via PB.sprites.
  // ---------------------------------------------------------------
  function build() {
    const sheets = {
      player: {
        small: {
          idle: rowsToCanvas(playerIdle),
          walk: [rowsToCanvas(playerWalk1), rowsToCanvas(playerWalk2)],
          jump: rowsToCanvas(playerJump),
          skid: rowsToCanvas(playerSkid),
        },
        big: {
          idle: rowsToCanvas(bigIdle),
          walk: [rowsToCanvas(bigWalk1), rowsToCanvas(bigWalk2)],
          jump: rowsToCanvas(bigJump),
          skid: rowsToCanvas(bigSkid),
        },
      },
      grunt: {
        walk: [rowsToCanvas(gruntWalk1), rowsToCanvas(gruntWalk2)],
        squashed: rowsToCanvas(gruntSquashed),
      },
      shellcrab: {
        walk: [rowsToCanvas(shellcrabWalk1), rowsToCanvas(shellcrabWalk2)],
        shell: rowsToCanvas(shellcrabShell),
      },
      coin: [rowsToCanvas(coin1), rowsToCanvas(coin2), rowsToCanvas(coin3), rowsToCanvas(coin4)],
      powerup: rowsToCanvas(powerupItem),
      questionBlock: [rowsToCanvas(questionBlock1), rowsToCanvas(questionBlock2)],
      usedBlock: rowsToCanvas(usedBlockRows),
      brick: rowsToCanvas(brickRows),
      ground: rowsToCanvas(groundRows),
      pipeTop: rowsToCanvas(pipeTopRows),
      pipeBody: rowsToCanvas(pipeBodyRows),
      flagPole: rowsToCanvas(flagpolePoleRows),
      flagCloth: rowsToCanvas(flagClothRows),
      cloud: buildCloud(),
      hill: buildHill(),
      bush: buildBush(),
    };
    return sheets;
  }

  // Draws a cached sprite canvas at (x, y) logical pixels, at `w` x `h`
  // logical size, flipping horizontally when facing = -1.
  function draw(ctx, canvas, x, y, w, h, facing) {
    if (!canvas) return;
    // Snap to the device-pixel grid (multiples of 1/SCALE). This keeps every
    // sprite crisp under nearest-neighbor scaling while allowing sub-logical-
    // pixel positioning, so motion reads smoothly instead of stepping a whole
    // logical pixel at a time.
    x = PB.snapPx(x);
    y = PB.snapPx(y);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (facing === -1) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(canvas, 0, 0, w, h);
    } else {
      ctx.drawImage(canvas, x, y, w, h);
    }
    ctx.restore();
  }

  PB.sprites = {
    build: build,
    draw: draw,
    sheets: null, // populated by build() in main.js
  };
})(window.PB);
