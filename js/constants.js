// Pizza Bros. -- global constants & shared namespace.
// Every other file attaches to window.PB instead of using ES modules,
// so this must be the very first script tag loaded.
window.PB = window.PB || {};

(function (PB) {
  'use strict';

  // ---- Rendering ----------------------------------------------------
  // Internal logical resolution is 320x180 "pixels" (i.e. a 20 x 11.25
  // tile viewport at 16px tiles). The canvas is rendered at 3x that size
  // and everything is drawn with imageSmoothingEnabled = false so the
  // scale-up stays crisp/pixelated.
  const TILE = 16;
  const SCALE = 3;
  const LOGICAL_WIDTH = 320;
  const LOGICAL_HEIGHT = 180;
  const CANVAS_WIDTH = LOGICAL_WIDTH * SCALE;   // 960
  const CANVAS_HEIGHT = LOGICAL_HEIGHT * SCALE; // 540

  // ---- Timing ---------------------------------------------------------
  const STEP = 1 / 60;          // fixed physics timestep (seconds)
  const MAX_FRAME_TIME = 0.25;  // clamp huge deltas (tab switch, etc.)

  // ---- Physics (all values are in logical px / px-per-second) --------
  const PHYSICS = {
    GRAVITY: 980,                // px/s^2 downward acceleration
    MAX_FALL_SPEED: 340,         // terminal velocity
    WALK_SPEED: 78,              // max ground speed while walking
    RUN_SPEED: 145,              // max ground speed while holding run
    ACCEL_GROUND: 480,           // px/s^2 speeding up on ground
    ACCEL_AIR: 420,              // px/s^2 steering while airborne
    FRICTION: 520,               // px/s^2 slow-down with no input
    SKID_DECEL: 760,             // px/s^2 slow-down reversing direction (skid)
    JUMP_VELOCITY: -300,         // initial upward velocity on jump
    JUMP_CUT_VELOCITY: -110,     // velocity clamp when jump released early
    COYOTE_FRAMES: 5,            // frames after leaving ground jump still works
    JUMP_BUFFER_FRAMES: 5,       // frames a jump press is remembered before landing
    STOMP_BOUNCE: -230,          // bounce velocity after stomping an enemy
    SHELL_SPEED: 190,            // sliding shell horizontal speed
    ENEMY_WALK_SPEED: 32,        // default grunt/shellcrab walking speed
    INVINCIBLE_TIME: 1.5,        // seconds of flicker invincibility after a hit
  };

  // ---- Gameplay ---------------------------------------------------
  const TIMER_START = 300;       // level timer counts down from this (seconds, ticks ~2/sec like classic Mario feel but we use real seconds)
  const STARTING_LIVES = 3;

  // ---- Palette --------------------------------------------------------
  // Shared named colors used across sprites.js and level rendering.
  const COLORS = {
    sky: '#5c94fc',
    night: '#0a0a12',
    outline: '#1a1008',
    crust: '#e0a458',
    crustDark: '#c07830',
    cheese: '#ffd24a',
    cheeseDark: '#f0b020',
    pepperoni: '#c62828',
    pepperoniDark: '#8e1a1a',
    skin: '#ffcf9c',
    shirt: '#d02c2c',
    shirtDark: '#a01c1c',
    overalls: '#2c5cd0',
    overallsDark: '#1c3ca0',
    glove: '#ffffff',
    gloveShade: '#d8d8d8',
    shoe: '#5c3418',
    shoeDark: '#3c2008',
    hair: '#3a2010',
    eyeWhite: '#ffffff',
    eyeBlack: '#101010',
    ground: '#c86428',
    groundDark: '#8c4418',
    groundTop: '#5cba3c',
    brick: '#b2571f',
    brickDark: '#7a3a12',
    brickLine: '#e8a066',
    block: '#e8a83c',
    blockDark: '#a86c1c',
    blockPulse: '#fff2b0',
    usedBlock: '#a86c3c',
    pipeGreen: '#3ca23c',
    pipeGreenDark: '#1c701c',
    pipeGreenLight: '#6cd06c',
    coinGold: '#ffd700',
    coinGoldDark: '#c8960c',
    flagGreen: '#d0d0d0',
    flagCloth: '#ffffff',
    mushroomTan: '#e8c090',
    mushroomRed: '#c62828',
    mushroomRedDark: '#8e1a1a',
    shellcrabGreen: '#3ca23c',
    shellcrabGreenDark: '#1c701c',
    shellcrabShell: '#2c9c5c',
    cloudWhite: '#ffffff',
    hillGreen: '#3ca23c',
    hillGreenDark: '#2c8c2c',
    transparent: 'transparent',
  };

  PB.TILE = TILE;
  PB.SCALE = SCALE;
  PB.LOGICAL_WIDTH = LOGICAL_WIDTH;
  PB.LOGICAL_HEIGHT = LOGICAL_HEIGHT;
  PB.CANVAS_WIDTH = CANVAS_WIDTH;
  PB.CANVAS_HEIGHT = CANVAS_HEIGHT;
  PB.STEP = STEP;
  PB.MAX_FRAME_TIME = MAX_FRAME_TIME;
  PB.PHYSICS = PHYSICS;
  PB.TIMER_START = TIMER_START;
  PB.STARTING_LIVES = STARTING_LIVES;
  PB.COLORS = COLORS;
})(window.PB);
