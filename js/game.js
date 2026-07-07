// Pizza Bros. -- game state machine, camera, HUD, and the per-frame glue
// between input, entities, and rendering.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  const TILE = PB.TILE;
  const STEP = PB.STEP;
  const E = PB.entities;

  const STATE = {
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    LEVEL_CLEAR: 'LEVEL_CLEAR',
    GAME_OVER: 'GAME_OVER',
    WIN: 'WIN',
  };
  PB.STATE = STATE;

  function cloneTiles(tiles) {
    return tiles.map(function (row) { return row.slice(); });
  }

  function makeDecorations(level) {
    const hills = [];
    const bushes = [];
    const clouds = [];
    const worldW = level.width * TILE;
    for (let x = 40; x < worldW; x += 260) hills.push({ x: x, y: 118 });
    for (let x = 140; x < worldW; x += 190) bushes.push({ x: x, y: 150 });
    for (let x = 60; x < worldW; x += 210) clouds.push({ x: x, y: 24 + ((x / 210) % 3) * 18 });
    return { hills: hills, bushes: bushes, clouds: clouds };
  }

  function Game() {
    this.canvas = null;
    this.ctx = null;
    this.state = STATE.TITLE;
    this.levelIndex = 0;
    this.level = null;
    this.decor = null;
    this.player = null;
    this.enemies = [];
    this.coins = [];
    this.risingCoins = [];
    this.powerups = [];
    this.particles = [];
    this.blockBumps = new Map();
    this.camera = { x: 0 };
    this.score = 0;
    this.coinCount = 0;
    this.lives = PB.STARTING_LIVES;
    this.timer = PB.TIMER_START;
    this.deathTimer = 0;
    this.clearPhase = null; // 'sliding' | 'walking'
    this.clearTimer = 0;
    this.flagY = 0;
    this.musicKicked = false;
    this.frameTime = 0;
    this.lastTs = null;
  }

  Game.prototype.init = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  };

  Game.prototype.startGame = function () {
    this.score = 0;
    this.coinCount = 0;
    this.lives = PB.STARTING_LIVES;
    this.levelIndex = 0;
    this.loadLevel(this.levelIndex);
    this.state = STATE.PLAYING;
  };

  Game.prototype.loadLevel = function (index) {
    const src = PB.levels[index];
    this.level = {
      name: src.name,
      width: src.width,
      height: src.height,
      tiles: cloneTiles(src.tiles),
      flag: src.flag,
    };
    this.decor = makeDecorations(this.level);
    this.player = E.createPlayer(src.playerStart.col * TILE, src.playerStart.row * TILE);
    this.enemies = src.spawns.map(function (s) {
      return s.type === 'grunt' ? E.createGrunt(s.col, s.row) : E.createShellcrab(s.col, s.row);
    });
    this.coins = src.coins.map(function (c) { return E.createCoin(c.col, c.row); });
    this.risingCoins = [];
    this.powerups = [];
    this.particles = [];
    this.blockBumps.clear();
    this.camera.x = 0;
    this.timer = PB.TIMER_START;
    this.deathTimer = 0;
    this.clearPhase = null;
    this.flagY = this.level.flag ? this.level.flag.row * TILE : 0;
  };

  Game.prototype.reloadCurrentLevel = function () {
    this.loadLevel(this.levelIndex);
    this.state = STATE.PLAYING;
  };

  Game.prototype.addScore = function (n) { this.score += n; };

  Game.prototype.popup = function (text, x, y) {
    this.particles.push(E.createParticle('score', x, y, { text: text, vy: -60, life: 0.7 }));
  };

  // ------------------------------------------------------------------
  // Main per-frame entry point (called from main.js's requestAnimationFrame
  // loop). Owns the fixed-timestep accumulator.
  // ------------------------------------------------------------------
  Game.prototype.frame = function (ts) {
    if (this.lastTs === null) this.lastTs = ts;
    let delta = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    if (delta > PB.MAX_FRAME_TIME) delta = PB.MAX_FRAME_TIME;
    this.frameTime += delta;

    // Global toggles work in (almost) any state.
    if (PB.input.pressed.mute) PB.audio.toggleMute();

    while (this.frameTime >= STEP) {
      this.update(STEP);
      this.frameTime -= STEP;
      PB.input.endFrame();
    }
    this.render();
  };

  Game.prototype.update = function (dt) {
    switch (this.state) {
      case STATE.TITLE:
        if (PB.input.pressed.confirm) {
          PB.audio.playMusic();
          this.startGame();
        }
        break;
      case STATE.PLAYING:
        this.updatePlaying(dt);
        break;
      case STATE.PAUSED:
        if (PB.input.pressed.pause) this.state = STATE.PLAYING;
        break;
      case STATE.LEVEL_CLEAR:
        this.updateLevelClear(dt);
        break;
      case STATE.GAME_OVER:
        if (PB.input.pressed.confirm) {
          PB.audio.playMusic();
          this.startGame();
        }
        break;
      case STATE.WIN:
        if (PB.input.pressed.confirm) {
          this.state = STATE.TITLE;
        }
        break;
    }
  };

  Game.prototype.updatePlaying = function (dt) {
    if (PB.input.pressed.pause) { this.state = STATE.PAUSED; return; }
    if (PB.input.pressed.restart) { this.reloadCurrentLevel(); return; }

    const p = this.player;

    if (p.dead) {
      this.deathTimer -= dt;
      p.vy += PB.PHYSICS.GRAVITY * dt;
      p.y += p.vy * dt;
      if (this.deathTimer <= 0) {
        this.lives -= 1;
        if (this.lives <= 0) {
          this.state = STATE.GAME_OVER;
          PB.audio.stopMusic();
        } else {
          this.reloadCurrentLevel();
        }
      }
      return;
    }

    // Timer runs out -> instant death.
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0;
      this.killPlayer();
      return;
    }

    const res = E.updatePlayer(p, this.level, dt, PB.input);
    if (res.didJump) PB.audio.play('jump');

    if (res.hitBlockAbove) this.handleBlockHit(res.hitBlockAbove);

    if (p.dead) { this.killPlayer(); return; }

    // Enemies.
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (en.dead) continue;
      if (en.type === 'grunt') E.updateGrunt(en, this.level, dt);
      else E.updateShellcrab(en, this.level, dt);
    }

    // Items.
    for (let i = 0; i < this.coins.length; i++) E.updateCoin(this.coins[i], dt);
    for (let i = 0; i < this.risingCoins.length; i++) E.updateRisingCoin(this.risingCoins[i], dt);
    for (let i = 0; i < this.powerups.length; i++) E.updatePowerup(this.powerups[i], this.level, dt);
    for (let i = 0; i < this.particles.length; i++) E.updateParticle(this.particles[i], dt);

    // Block bump animation timers.
    this.blockBumps.forEach(function (v, k, map) {
      const nv = v - dt;
      if (nv <= 0) map.delete(k); else map.set(k, nv);
    });

    this.handleEntityCollisions();
    this.pruneDead();

    // Camera follows the player, clamped to level bounds.
    const worldW = this.level.width * TILE;
    let camX = p.x - PB.LOGICAL_WIDTH / 2;
    camX = Math.max(0, Math.min(camX, Math.max(0, worldW - PB.LOGICAL_WIDTH)));
    this.camera.x = camX;

    // Flagpole contact ends the level.
    if (this.level.flag && !p.finished) {
      const flagWorldX = this.level.flag.col * TILE;
      if (p.x + p.w >= flagWorldX && p.x <= flagWorldX + TILE) {
        this.beginLevelClear();
      }
    }
  };

  Game.prototype.killPlayer = function () {
    const p = this.player;
    if (p.finished) return;
    p.dead = true;
    p.vy = -260;
    p.vx = 0;
    this.deathTimer = 1.6;
    PB.audio.play('die');
    PB.audio.stopMusic();
  };

  Game.prototype.handleBlockHit = function (hit) {
    const key = hit.col + ',' + hit.row;
    if (hit.type === 'question_coin') {
      E.setTile(this.level, hit.col, hit.row, 'used');
      this.risingCoins.push(E.createRisingCoin(hit.col * TILE, hit.row * TILE));
      this.coinCount++;
      if (this.coinCount % 100 === 0) this.lives++;
      this.addScore(200);
      this.popup('+200', hit.col * TILE, hit.row * TILE);
      PB.audio.play('coin');
      this.blockBumps.set(key, 0.15);
    } else if (hit.type === 'question_power') {
      E.setTile(this.level, hit.col, hit.row, 'used');
      this.powerups.push(E.createPowerup(hit.col, hit.row));
      PB.audio.play('coin');
      this.blockBumps.set(key, 0.15);
    } else if (hit.type === 'brick') {
      if (this.player.big) {
        E.setTile(this.level, hit.col, hit.row, null);
        for (let i = 0; i < 4; i++) {
          this.particles.push(E.createParticle('debris', hit.col * TILE + 8, hit.row * TILE + 8, {
            vx: (i < 2 ? -1 : 1) * (40 + i * 10), vy: -160 + i * 10, life: 0.6,
          }));
        }
        this.addScore(50);
        PB.audio.play('stomp');
      } else {
        this.blockBumps.set(key, 0.15);
        PB.audio.play('stomp');
      }
    } else {
      this.blockBumps.set(key, 0.1);
    }
  };

  Game.prototype.handleEntityCollisions = function () {
    const p = this.player;
    if (p.dead || p.finished) return;

    // Player vs enemies.
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (en.dead) continue;
      if (en.state === 'squashed') continue;
      if (!E.rectsOverlap(p, en)) continue;

      // SMB-style generous rule: airborne and moving downward = stomp,
      // regardless of how deep the first overlap is (a penetration-depth
      // check punishes diagonal falls and enemies walking into a faller).
      const stomp = !p.onGround && p.vy > 0;

      if (en.type === 'grunt') {
        if (stomp) {
          E.squashGrunt(en);
          E.bouncePlayer(p);
          this.addScore(100);
          this.popup('+100', en.x, en.y);
          PB.audio.play('stomp');
        } else {
          this.hurtOrKillPlayer();
        }
      } else { // shellcrab
        if (en.state === 'walk') {
          if (stomp) {
            E.stompShellcrab(en);
            E.bouncePlayer(p);
            this.addScore(100);
            this.popup('+100', en.x, en.y);
            PB.audio.play('stomp');
          } else {
            this.hurtOrKillPlayer();
          }
        } else if (en.state === 'shell_idle') {
          if (stomp) {
            E.bouncePlayer(p);
          } else {
            const dir = p.x < en.x ? 1 : -1;
            E.kickShell(en, dir);
          }
        } else if (en.state === 'shell_sliding') {
          if (stomp) {
            E.stopShell(en);
            this.addScore(100);
            E.bouncePlayer(p);
          } else {
            this.hurtOrKillPlayer();
          }
        }
      }
    }

    // Sliding shells kill other enemies they touch.
    for (let i = 0; i < this.enemies.length; i++) {
      const shell = this.enemies[i];
      if (shell.dead || shell.type !== 'shellcrab' || shell.state !== 'shell_sliding') continue;
      for (let j = 0; j < this.enemies.length; j++) {
        if (i === j) continue;
        const other = this.enemies[j];
        if (other.dead || other.state === 'squashed') continue;
        if (other.type === 'shellcrab' && other.state === 'shell_sliding') continue;
        if (E.rectsOverlap(shell, other)) {
          other.dead = true;
          this.addScore(200);
          this.popup('+200', other.x, other.y);
          PB.audio.play('stomp');
        }
      }
    }

    // Player vs floating coins.
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.dead) continue;
      if (E.rectsOverlap(p, c)) {
        c.dead = true;
        this.coinCount++;
        if (this.coinCount % 100 === 0) this.lives++;
        this.addScore(200);
        PB.audio.play('coin');
      }
    }

    // Player vs power-ups.
    for (let i = 0; i < this.powerups.length; i++) {
      const item = this.powerups[i];
      if (item.dead || item.emerging) continue;
      if (E.rectsOverlap(p, item)) {
        item.dead = true;
        if (!p.big) {
          E.growPlayer(p);
          this.popup('GROW!', item.x, item.y);
        } else {
          this.addScore(1000);
          this.popup('+1000', item.x, item.y);
        }
        PB.audio.play('powerup');
      }
    }
  };

  Game.prototype.hurtOrKillPlayer = function () {
    const died = E.hurtPlayer(this.player);
    if (died) {
      this.killPlayer();
    } else {
      PB.audio.play('hurt');
    }
  };

  Game.prototype.pruneDead = function () {
    this.enemies = this.enemies.filter(function (e) { return !e.dead; });
    this.coins = this.coins.filter(function (c) { return !c.dead; });
    this.risingCoins = this.risingCoins.filter(function (c) { return !c.dead; });
    this.powerups = this.powerups.filter(function (i) { return !i.dead; });
    this.particles = this.particles.filter(function (p) { return !p.dead; });
  };

  Game.prototype.beginLevelClear = function () {
    const p = this.player;
    const flag = this.level.flag;
    p.finished = true;
    p.inPole = true;
    p.vx = 0;
    p.vy = 0;
    p.x = flag.col * TILE;

    const poleBottomRow = this.level.height - 2;
    const poleTopRow = flag.row;
    const playerRow = p.y / TILE;
    const heightFactor = Math.max(0, Math.min(1, (poleBottomRow - playerRow) / (poleBottomRow - poleTopRow)));
    const bonus = Math.round(heightFactor * 8) * 100;
    this.addScore(bonus);
    this.popup('+' + bonus, p.x, p.y);

    p.state = 'idle';
    this.state = STATE.LEVEL_CLEAR;
    this.clearPhase = 'sliding';
    PB.audio.stopMusic();
    PB.audio.play('win');
  };

  Game.prototype.updateLevelClear = function (dt) {
    const p = this.player;
    const groundY = (this.level.height - 2) * TILE;

    if (this.clearPhase === 'sliding') {
      p.y += 110 * dt;
      this.flagY += 110 * dt;
      if (p.y >= groundY - p.h) {
        p.y = groundY - p.h;
        this.clearPhase = 'walking';
        p.vx = PB.PHYSICS.WALK_SPEED;
        p.state = 'walk';
      }
      const flagBottom = groundY;
      if (this.flagY > flagBottom) this.flagY = flagBottom;
    } else if (this.clearPhase === 'walking') {
      p.x += p.vx * dt;
      p.animTimer += dt;
      if (p.animTimer > 0.12) { p.animTimer = 0; p.animFrame = 1 - p.animFrame; }
      if (p.x - (this.level.flag.col * TILE) > TILE * 6) {
        this.advanceLevel();
      }
    }

    const worldW = this.level.width * TILE;
    let camX = p.x - PB.LOGICAL_WIDTH / 2;
    camX = Math.max(0, Math.min(camX, Math.max(0, worldW - PB.LOGICAL_WIDTH)));
    this.camera.x = camX;
  };

  Game.prototype.advanceLevel = function () {
    if (this.levelIndex + 1 < PB.levels.length) {
      this.levelIndex++;
      this.loadLevel(this.levelIndex);
      this.state = STATE.PLAYING;
      PB.audio.playMusic();
    } else {
      this.state = STATE.WIN;
      PB.audio.play('win');
    }
  };

  // ==================================================================
  // RENDERING
  // ==================================================================
  Game.prototype.render = function () {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(PB.SCALE, PB.SCALE);

    if (this.state === STATE.TITLE) {
      this.renderTitle();
    } else {
      this.renderWorld();
      if (this.state === STATE.PAUSED) this.renderPauseOverlay();
      if (this.state === STATE.GAME_OVER) this.renderGameOver();
      if (this.state === STATE.WIN) this.renderWin();
    }

    ctx.restore();
  };

  Game.prototype.renderWorld = function () {
    const ctx = this.ctx;
    const cam = this.camera.x;
    const sheets = PB.sprites.sheets;

    // Sky.
    ctx.fillStyle = PB.COLORS.sky;
    ctx.fillRect(0, 0, PB.LOGICAL_WIDTH, PB.LOGICAL_HEIGHT);

    // Parallax background.
    this.drawParallax(this.decor.clouds, sheets.cloud, cam, 0.25, 48, 24);
    this.drawParallax(this.decor.hills, sheets.hill, cam, 0.5, 80, 40);
    this.drawParallax(this.decor.bushes, sheets.bush, cam, 0.5, 48, 20);

    // Tiles.
    const colStart = Math.max(0, Math.floor(cam / TILE) - 1);
    const colEnd = Math.min(this.level.width - 1, Math.ceil((cam + PB.LOGICAL_WIDTH) / TILE) + 1);
    for (let row = 0; row < this.level.height; row++) {
      for (let col = colStart; col <= colEnd; col++) {
        const t = this.level.tiles[row][col];
        if (!t) continue;
        const sx = col * TILE - cam;
        let sy = row * TILE;
        const bump = this.blockBumps.get(col + ',' + row);
        if (bump) sy -= Math.sin(Math.min(1, bump / 0.15) * Math.PI) * 4;
        this.drawTile(t, sx, sy, col, row);
      }
    }

    // Flagpole cloth (drawn above the pole tiles at its current slide height).
    if (this.level.flag) {
      const fx = this.level.flag.col * TILE - cam;
      PB.sprites.draw(ctx, sheets.flagCloth, fx - 6, this.flagY, TILE, 8, 1);
    }

    // Coins (sprites are 16x8, draw at natural aspect, vertically centered
    // in their 16x16 cell).
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      const frame = Math.floor(c.animTimer * 8) % 4;
      PB.sprites.draw(ctx, sheets.coin[frame], c.x - cam, c.y + 4, TILE, 8, 1);
    }
    for (let i = 0; i < this.risingCoins.length; i++) {
      const c = this.risingCoins[i];
      PB.sprites.draw(ctx, sheets.coin[0], c.x - cam, c.y + 4, TILE, 8, 1);
    }

    // Power-ups.
    for (let i = 0; i < this.powerups.length; i++) {
      const item = this.powerups[i];
      PB.sprites.draw(ctx, sheets.powerup, item.x - cam, item.y, TILE, TILE, 1);
    }

    // Enemies.
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      const sx = en.x - cam;
      if (en.type === 'grunt') {
        const img = en.state === 'squashed' ? sheets.grunt.squashed : sheets.grunt.walk[en.animFrame];
        PB.sprites.draw(ctx, img, sx, en.y, TILE, TILE, en.vx < 0 ? -1 : 1);
      } else {
        let img;
        if (en.state === 'walk') img = sheets.shellcrab.walk[en.animFrame];
        else img = sheets.shellcrab.shell;
        PB.sprites.draw(ctx, img, sx, en.y, TILE, TILE, en.vx < 0 ? -1 : 1);
      }
    }

    // Player.
    this.drawPlayer(cam);

    // Particles.
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, 1 - p.age / p.life);
      if (p.kind === 'score') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff8c0';
        ctx.fillText(p.text, p.x - cam + 8, p.y);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'debris') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = PB.COLORS.brick;
        ctx.fillRect(p.x - cam, p.y, 3, 3);
        ctx.globalAlpha = 1;
      }
    }

    this.renderHud();
  };

  Game.prototype.drawParallax = function (list, sprite, cam, factor, w, h) {
    const ctx = this.ctx;
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      const sx = d.x - cam * factor;
      if (sx < -w || sx > PB.LOGICAL_WIDTH + w) continue;
      ctx.drawImage(sprite, sx, d.y, w, h);
    }
  };

  Game.prototype.drawTile = function (t, sx, sy, col, row) {
    const ctx = this.ctx;
    const sheets = PB.sprites.sheets;
    switch (t) {
      case 'ground': ctx.drawImage(sheets.ground, sx, sy, TILE, TILE); break;
      case 'brick': ctx.drawImage(sheets.brick, sx, sy, TILE, TILE); break;
      case 'used': ctx.drawImage(sheets.usedBlock, sx, sy, TILE, TILE); break;
      case 'pipeTop': ctx.drawImage(sheets.pipeTop, sx, sy, TILE, TILE); break;
      case 'pipeBody': ctx.drawImage(sheets.pipeBody, sx, sy, TILE, TILE); break;
      case 'flagpole': ctx.drawImage(sheets.flagPole, sx, sy, TILE, TILE); break;
      case 'question_coin':
      case 'question_power': {
        const frame = Math.floor(this.frameTime * 4) % 2;
        ctx.drawImage(sheets.questionBlock[frame], sx, sy, TILE, TILE);
        break;
      }
      default: break;
    }
  };

  Game.prototype.drawPlayer = function (cam) {
    const p = this.player;
    if (p.hurtInvincible && Math.floor(this.frameTime * 20) % 2 === 0) return; // flicker
    const sheets = PB.sprites.sheets;
    const size = p.big ? sheets.player.big : sheets.player.small;
    const h = p.big ? TILE * 1.5 : TILE;
    let img;
    if (!p.onGround && !p.finished) img = size.jump;
    else if (p.state === 'skid') img = size.skid;
    else if (p.state === 'walk') img = size.walk[p.animFrame];
    else img = size.idle;
    PB.sprites.draw(this.ctx, img, p.x - cam, p.y, TILE, h, p.facing);
  };

  Game.prototype.renderHud = function () {
    const ctx = this.ctx;
    ctx.textAlign = 'left';
    ctx.font = '8px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('SCORE ' + String(this.score).padStart(6, '0'), 4, 10);
    ctx.fillText('COINS x' + this.coinCount, 120, 10);
    ctx.fillText('LIVES ' + this.lives, 200, 10);
    ctx.fillText('TIME ' + Math.ceil(this.timer), 250, 10);
    ctx.textAlign = 'right';
    ctx.fillText(this.level ? this.level.name : '', PB.LOGICAL_WIDTH - 4, 20);
    ctx.textAlign = 'left';
  };

  Game.prototype.renderTitle = function () {
    const ctx = this.ctx;
    ctx.fillStyle = PB.COLORS.night;
    ctx.fillRect(0, 0, PB.LOGICAL_WIDTH, PB.LOGICAL_HEIGHT);
    ctx.fillStyle = PB.COLORS.sky;
    ctx.fillRect(0, PB.LOGICAL_HEIGHT - 40, PB.LOGICAL_WIDTH, 40);
    ctx.drawImage(PB.sprites.sheets.ground, 0, PB.LOGICAL_HEIGHT - 24, PB.LOGICAL_WIDTH, 24);

    ctx.textAlign = 'center';
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#8e1a1a';
    ctx.fillText('PIZZA BROS.', PB.LOGICAL_WIDTH / 2 + 2, 56);
    ctx.fillStyle = '#ffcf40';
    ctx.fillText('PIZZA BROS.', PB.LOGICAL_WIDTH / 2, 54);

    const heroImg = PB.sprites.sheets.player.big.idle;
    const heroW = heroImg.width * 2;
    const heroH = heroImg.height * 2;
    PB.sprites.draw(ctx, heroImg, PB.LOGICAL_WIDTH / 2 - heroW / 2, 118 - heroH, heroW, heroH, 1);

    if (Math.floor(this.frameTime * 2) % 2 === 0) {
      ctx.font = '12px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PRESS ENTER', PB.LOGICAL_WIDTH / 2, 150);
    }
    ctx.font = '8px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('arrows/wasd move  z/space jump  shift run', PB.LOGICAL_WIDTH / 2, 168);
    ctx.textAlign = 'left';
  };

  Game.prototype.renderPauseOverlay = function () {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, PB.LOGICAL_WIDTH, PB.LOGICAL_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('PAUSED', PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2);
    ctx.font = '8px monospace';
    ctx.fillText('press P to resume', PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2 + 14);
    ctx.textAlign = 'left';
  };

  Game.prototype.renderGameOver = function () {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, PB.LOGICAL_WIDTH, PB.LOGICAL_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e04040';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('GAME OVER', PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2 - 6);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('score ' + this.score, PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2 + 12);
    ctx.font = '8px monospace';
    ctx.fillText('press enter to try again', PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2 + 28);
    ctx.textAlign = 'left';
  };

  Game.prototype.renderWin = function () {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, PB.LOGICAL_WIDTH, PB.LOGICAL_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('YOU SAVED THE PIZZERIA!', PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2 - 6);
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('final score ' + this.score, PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2 + 12);
    ctx.font = '8px monospace';
    ctx.fillText('press enter for title', PB.LOGICAL_WIDTH / 2, PB.LOGICAL_HEIGHT / 2 + 28);
    ctx.textAlign = 'left';
  };

  PB.game = new Game();
})(window.PB);
