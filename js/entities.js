// Pizza Bros. -- entities & physics.
// Player, enemies, items and particles all live here. Tile collision is
// AABB-vs-grid, resolved X then Y. game.js owns the mutable per-level
// runtime state (block bump animations, active entity lists) and calls
// into the update/collision helpers exported here.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  const TILE = PB.TILE;
  const PHY = PB.PHYSICS;

  const SOLID_TYPES = {
    ground: true, brick: true, question_coin: true, question_power: true,
    used: true, pipeBody: true, pipeTop: true,
  };

  function isSolid(type) { return !!type && !!SOLID_TYPES[type]; }

  function getTile(level, col, row) {
    if (col < 0) return 'ground';           // invisible wall at level start
    if (row < 0) return null;                // open air above the level
    if (row >= level.height) return null;    // below ground -> pit
    if (col >= level.width) return null;     // past the right edge
    return level.tiles[row][col];
  }

  function setTile(level, col, row, type) {
    if (row < 0 || row >= level.height || col < 0 || col >= level.width) return;
    level.tiles[row][col] = type;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // Moves `e` (needs x,y,w,h,vx,vy) along X then Y against the level grid.
  // Returns collision info used by the player for block-bumping and by
  // enemies for turning around at walls/ledges.
  function moveAndCollide(e, level, dt, opts) {
    opts = opts || {};
    const result = { hitWallDir: 0, hitBlockAbove: null, onGround: false, hitCeiling: false };

    // ---- X axis ----
    e.x += e.vx * dt;
    if (e.vx !== 0) {
      const dir = e.vx > 0 ? 1 : -1;
      const top = e.y + 1;
      const bottom = e.y + e.h - 2;
      const topRow = Math.floor(top / TILE);
      const bottomRow = Math.floor(bottom / TILE);
      const col = dir > 0 ? Math.floor((e.x + e.w) / TILE) : Math.floor(e.x / TILE);
      for (let row = topRow; row <= bottomRow; row++) {
        const t = getTile(level, col, row);
        if (isSolid(t)) {
          if (dir > 0) e.x = col * TILE - e.w;
          else e.x = (col + 1) * TILE;
          e.vx = 0;
          result.hitWallDir = dir;
          break;
        }
      }
    }

    // ---- Y axis ----
    e.y += e.vy * dt;
    if (e.vy !== 0) {
      const dir = e.vy > 0 ? 1 : -1;
      const left = e.x + 1;
      const right = e.x + e.w - 2;
      const leftCol = Math.floor(left / TILE);
      const rightCol = Math.floor(right / TILE);
      const row = dir > 0 ? Math.floor((e.y + e.h) / TILE) : Math.floor(e.y / TILE);
      for (let col = leftCol; col <= rightCol; col++) {
        const t = getTile(level, col, row);
        if (isSolid(t)) {
          if (dir > 0) {
            e.y = row * TILE - e.h;
            e.vy = 0;
            result.onGround = true;
          } else {
            e.y = (row + 1) * TILE;
            e.vy = 0;
            result.hitCeiling = true;
            if (opts.canBump) result.hitBlockAbove = { col: col, row: row, type: t };
          }
          break;
        }
      }
    }
    return result;
  }

  // Ledge check for patrolling enemies: is there solid ground just ahead
  // in the direction of travel, one tile below the enemy's feet?
  function groundAheadOf(e, level, dir) {
    const aheadX = dir > 0 ? e.x + e.w + 1 : e.x - 1;
    const col = Math.floor(aheadX / TILE);
    const row = Math.floor((e.y + e.h + 2) / TILE);
    return isSolid(getTile(level, col, row));
  }

  // =====================================================================
  // PARTICLES (score popups, coin sparkle, brick debris)
  // =====================================================================
  function createParticle(kind, x, y, opts) {
    opts = opts || {};
    return {
      kind: kind, // 'score', 'coin', 'debris'
      x: x, y: y,
      vx: opts.vx || 0,
      vy: opts.vy != null ? opts.vy : -80,
      life: opts.life != null ? opts.life : 0.6,
      age: 0,
      text: opts.text || '',
      dead: false,
    };
  }

  function updateParticle(p, dt) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt; // light gravity so debris arcs, popups drift up then settle
    if (p.age >= p.life) p.dead = true;
  }

  // =====================================================================
  // COIN (floating collectible)
  // =====================================================================
  function createCoin(col, row) {
    return {
      type: 'coin', x: col * TILE, y: row * TILE, w: TILE, h: TILE,
      animTimer: Math.random() * 1, dead: false,
    };
  }

  function updateCoin(c, dt) {
    c.animTimer += dt;
  }

  // Rising coin spawned when a question block is bumped from below.
  function createRisingCoin(x, y) {
    return { type: 'risingCoin', x: x, y: y, w: TILE, h: TILE, vy: -160, life: 0.5, age: 0, dead: false };
  }
  function updateRisingCoin(c, dt) {
    c.age += dt;
    c.y += c.vy * dt;
    if (c.age >= c.life) c.dead = true;
  }

  // =====================================================================
  // POWER-UP ITEM (glowing extra pizza slice) -- emerges & walks
  // =====================================================================
  function createPowerup(col, row) {
    return {
      type: 'powerup', x: col * TILE, y: row * TILE - TILE, w: TILE, h: TILE,
      vx: PHY.ENEMY_WALK_SPEED, vy: 0,
      emerging: true, emergeTarget: row * TILE - TILE, emergeFrom: row * TILE,
      dead: false,
    };
  }

  function updatePowerup(item, level, dt) {
    if (item.emerging) {
      item.y -= 40 * dt;
      if (item.y <= item.emergeTarget) { item.y = item.emergeTarget; item.emerging = false; }
      return;
    }
    item.vy += PHY.GRAVITY * dt;
    if (item.vy > PHY.MAX_FALL_SPEED) item.vy = PHY.MAX_FALL_SPEED;
    const res = moveAndCollide(item, level, dt);
    if (res.hitWallDir !== 0) item.vx = -item.vx;
    if (res.onGround && !groundAheadOf(item, level, item.vx > 0 ? 1 : -1)) {
      item.vx = -item.vx;
    }
  }

  // =====================================================================
  // PLAYER
  // =====================================================================
  function createPlayer(x, y) {
    return {
      x: x, y: y, w: TILE, h: TILE,
      vx: 0, vy: 0,
      facing: 1,
      big: false,
      onGround: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      jumpHeld: false,
      invincibleTimer: 0,
      hurtInvincible: false,
      state: 'idle', // idle, walk, jump, skid
      animTimer: 0,
      animFrame: 0,
      dead: false,
      inPole: false,
      poleSlideY: 0,
      finished: false,
    };
  }

  function setBig(p, big) {
    const oldH = p.h;
    const newH = big ? TILE * 1.5 : TILE;
    p.y += (oldH - newH); // keep feet planted when height changes
    p.h = newH;
    p.big = big;
  }

  function updatePlayer(p, level, dt, input) {
    if (p.dead || p.finished) return {};

    const left = input.held.left;
    const right = input.held.right;
    const running = input.held.run;
    const jumpHeld = input.held.jump;
    const jumpPressed = input.pressed.jump;

    const maxSpeed = running ? PHY.RUN_SPEED : PHY.WALK_SPEED;
    const accel = p.onGround ? PHY.ACCEL_GROUND : PHY.ACCEL_AIR;

    let moveDir = 0;
    if (left && !right) moveDir = -1;
    else if (right && !left) moveDir = 1;

    if (moveDir !== 0) {
      p.facing = moveDir;
      const target = moveDir * maxSpeed;
      // Skid: on ground, moving opposite to input direction.
      if (p.onGround && p.vx !== 0 && Math.sign(p.vx) !== moveDir) {
        p.vx += moveDir * PHY.SKID_DECEL * dt;
        if (Math.sign(p.vx) === moveDir) p.vx = 0;
      } else {
        if (p.vx < target) p.vx = Math.min(target, p.vx + accel * dt);
        else if (p.vx > target) p.vx = Math.max(target, p.vx - accel * dt);
      }
    } else if (p.onGround) {
      if (p.vx > 0) p.vx = Math.max(0, p.vx - PHY.FRICTION * dt);
      else if (p.vx < 0) p.vx = Math.min(0, p.vx + PHY.FRICTION * dt);
    }

    // Jump buffering + coyote time.
    if (jumpPressed) p.jumpBufferTimer = PHY.JUMP_BUFFER_FRAMES / 60;
    else p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);

    if (p.onGround) p.coyoteTimer = PHY.COYOTE_FRAMES / 60;
    else p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);

    let didJump = false;
    if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
      p.vy = PHY.JUMP_VELOCITY;
      p.jumpBufferTimer = 0;
      p.coyoteTimer = 0;
      p.onGround = false;
      didJump = true;
    }

    // Variable jump height: cut upward velocity if the button is released early.
    if (!jumpHeld && p.vy < PHY.JUMP_CUT_VELOCITY) {
      p.vy = PHY.JUMP_CUT_VELOCITY;
    }

    // Gravity.
    p.vy += PHY.GRAVITY * dt;
    if (p.vy > PHY.MAX_FALL_SPEED) p.vy = PHY.MAX_FALL_SPEED;

    const res = moveAndCollide(p, level, dt, { canBump: true });
    p.onGround = res.onGround;

    // Clamp left world edge.
    if (p.x < 0) p.x = 0;

    // Fell into a pit -> instant death.
    if (p.y > level.height * TILE + TILE * 2) {
      p.dead = true;
    }

    // Invincibility flicker timer (after taking a hit while big).
    if (p.invincibleTimer > 0) {
      p.invincibleTimer -= dt;
      if (p.invincibleTimer <= 0) { p.invincibleTimer = 0; p.hurtInvincible = false; }
    }

    // Animation state.
    if (!p.onGround) {
      p.state = 'jump';
    } else if (p.vx !== 0 && Math.sign(p.vx) !== moveDir && moveDir !== 0) {
      p.state = 'skid';
    } else if (Math.abs(p.vx) > 4) {
      p.state = 'walk';
      p.animTimer += dt * (Math.abs(p.vx) / PHY.WALK_SPEED);
      if (p.animTimer > 0.12) { p.animTimer = 0; p.animFrame = 1 - p.animFrame; }
    } else {
      p.state = 'idle';
    }

    return { didJump: didJump, hitBlockAbove: res.hitBlockAbove };
  }

  function hurtPlayer(p) {
    if (p.hurtInvincible) return false;
    if (p.big) {
      setBig(p, false);
      p.hurtInvincible = true;
      p.invincibleTimer = PHY.INVINCIBLE_TIME;
      return false; // shrunk, not dead
    }
    p.dead = true;
    return true; // died
  }

  function growPlayer(p) {
    if (!p.big) setBig(p, true);
  }

  function bouncePlayer(p, en) {
    p.vy = PHY.STOMP_BOUNCE;
    p.onGround = false;
    if (en) en.bounceCooldown = PHY.STOMP_COOLDOWN;
  }

  // =====================================================================
  // MUSHROOM GRUNT
  // =====================================================================
  function createGrunt(col, row) {
    return {
      type: 'grunt', x: col * TILE, y: row * TILE, w: TILE, h: TILE,
      vx: -PHY.ENEMY_WALK_SPEED, vy: 0,
      state: 'walk', animTimer: 0, animFrame: 0,
      squashTimer: 0, bounceCooldown: 0, dead: false,
    };
  }

  function updateGrunt(e, level, dt) {
    if (e.state === 'squashed') {
      e.squashTimer -= dt;
      if (e.squashTimer <= 0) e.dead = true;
      return;
    }
    e.vy += PHY.GRAVITY * dt;
    if (e.vy > PHY.MAX_FALL_SPEED) e.vy = PHY.MAX_FALL_SPEED;
    const res = moveAndCollide(e, level, dt);
    if (res.hitWallDir !== 0) e.vx = -e.vx;
    const dir = e.vx > 0 ? 1 : -1;
    if (res.onGround && !groundAheadOf(e, level, dir)) e.vx = -e.vx;

    e.animTimer += dt;
    if (e.animTimer > 0.25) { e.animTimer = 0; e.animFrame = 1 - e.animFrame; }
  }

  function squashGrunt(e) {
    e.state = 'squashed';
    e.squashTimer = 0.5;
    e.vx = 0;
  }

  // =====================================================================
  // SHELLCRAB
  // =====================================================================
  function createShellcrab(col, row) {
    return {
      type: 'shellcrab', x: col * TILE, y: row * TILE, w: TILE, h: TILE,
      vx: -PHY.ENEMY_WALK_SPEED, vy: 0,
      state: 'walk', animTimer: 0, animFrame: 0, bounceCooldown: 0, dead: false,
    };
  }

  function updateShellcrab(e, level, dt) {
    e.vy += PHY.GRAVITY * dt;
    if (e.vy > PHY.MAX_FALL_SPEED) e.vy = PHY.MAX_FALL_SPEED;

    if (e.state === 'shell_idle') {
      const res = moveAndCollide(e, level, dt);
      return;
    }

    const res = moveAndCollide(e, level, dt);
    if (res.hitWallDir !== 0) e.vx = -e.vx;

    if (e.state === 'walk') {
      const dir = e.vx > 0 ? 1 : -1;
      if (res.onGround && !groundAheadOf(e, level, dir)) e.vx = -e.vx;
      e.animTimer += dt;
      if (e.animTimer > 0.25) { e.animTimer = 0; e.animFrame = 1 - e.animFrame; }
    } else if (e.state === 'shell_sliding') {
      // Sliding shells keep going until they hit a wall (handled above) or are stopped.
    }
  }

  // Stomping a walking shellcrab retracts it into a stationary shell.
  function stompShellcrab(e) {
    e.state = 'shell_idle';
    e.vx = 0;
  }

  // Kicking a stationary shell sends it sliding in the given direction.
  function kickShell(e, dir) {
    e.state = 'shell_sliding';
    e.vx = PHY.SHELL_SPEED * dir;
  }

  // Stomping a sliding shell stops it dead back to idle.
  function stopShell(e) {
    e.state = 'shell_idle';
    e.vx = 0;
  }

  PB.entities = {
    TILE: TILE,
    isSolid: isSolid,
    getTile: getTile,
    setTile: setTile,
    rectsOverlap: rectsOverlap,
    moveAndCollide: moveAndCollide,
    groundAheadOf: groundAheadOf,

    createParticle: createParticle,
    updateParticle: updateParticle,

    createCoin: createCoin,
    updateCoin: updateCoin,
    createRisingCoin: createRisingCoin,
    updateRisingCoin: updateRisingCoin,

    createPowerup: createPowerup,
    updatePowerup: updatePowerup,

    createPlayer: createPlayer,
    updatePlayer: updatePlayer,
    hurtPlayer: hurtPlayer,
    growPlayer: growPlayer,
    setBig: setBig,
    bouncePlayer: bouncePlayer,

    createGrunt: createGrunt,
    updateGrunt: updateGrunt,
    squashGrunt: squashGrunt,

    createShellcrab: createShellcrab,
    updateShellcrab: updateShellcrab,
    stompShellcrab: stompShellcrab,
    kickShell: kickShell,
    stopShell: stopShell,
  };
})(window.PB);
