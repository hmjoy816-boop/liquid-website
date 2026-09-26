# SpaceX Liquid Particle Experience

A SpaceX-inspired interactive landing page built with HTML, CSS, JavaScript and Three.js.

## Features

- Full-screen WebGL particle field
- Particle-built rocket form
- Mouse-controlled liquid/magnetic particle distortion
- Additive glowing particles
- Blue / white / warm-gold particle accents
- Interactive cursor glow
- Smooth scrolling sections
- Responsive mobile layout
- No build tools required

## Run locally

Open `index.html` in a modern browser.

For the smoothest experience, use a local server such as VS Code Live Server.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload:
   - `index.html`
   - `style.css`
   - `script.js`
3. Go to **Settings → Pages**.
4. Select the `main` branch and `/root`.
5. Save.
6. GitHub will publish the site.

The project loads Three.js from jsDelivr, so an internet connection is required for the particle engine.

## Customize

Most visual changes can be made in `style.css`.

Particle behavior is controlled in `script.js`, especially:

- `PARTICLE_COUNT`
- `rocketPoint()`
- `uMouse`
- `uMousePower`
- the vertex shader mouse-force section

This is a visual concept inspired by modern space-tech interfaces; it is not an official SpaceX website.
