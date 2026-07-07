# Pizza Bros. 🍕

A 2D Super Mario-style browser platformer starring a hero with a pizza-slice head. No build step, no dependencies — open `index.html` in any browser and play.

## Play

Just double-click `index.html` (works over `file://`), or serve the folder with any static server.

**Controls:** Arrows/WASD move · Z/Space/Up jump (hold for higher) · Shift/X run · P pause · M mute · R restart level · Enter start/confirm

## Game

- Two levels: *Pepperoni Plains* and *Four Cheese Fortress*
- Stomp Mushroom Grunts, kick Shellcrab shells, collect pepperoni coins
- Question blocks hide coins and a grow power-up (an extra pizza slice)
- Reach the flagpole before the timer runs out — grab it high for bonus points

## Tech

Vanilla JavaScript + Canvas. All sprites are procedural pixel art (string-array pixel maps baked to offscreen canvases at load). Fixed-timestep loop, AABB tile collision, coyote time and jump buffering.

```
index.html
css/style.css
js/constants.js   tile/physics/palette constants
js/input.js       keyboard state
js/audio.js       sfx/music loader with ogg→wav→mp3 fallback
js/sprites.js     procedural pixel art
js/level.js       ASCII level maps + parser
js/entities.js    player/enemy/item physics
js/game.js        state machine, camera, HUD, rendering
js/main.js        boot
assets/sounds/    CC0 sound effects and music
```

## Sounds

All audio is CC0 (public domain) from OpenGameArt — see [ATTRIBUTION.md](ATTRIBUTION.md) for creators and sources.
