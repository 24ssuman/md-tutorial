# Interactive course site

Static web pages for the whole tutorial; no build step. Serve this folder with any static web server (see the repository README).

- `index.html` — course home with the module list and progress.
- `01-intro.html` … `08-lj-fluid.html` — the eight core modules.
- `s1-choosing-cvs.html`, `s2-wham.html` — the two supplements.
- `assets/css/style.css` — design tokens, layout and component styles (light and dark).
- `assets/js/physics.js` — JavaScript ports of the potentials, integrators and WHAM solver, plus array helpers.
- `assets/js/core.js` — page shell (navigation, presentation mode, quizzes, tabs), Plotly wrapper and the `MD.lab` interactive-panel framework.
- `assets/favicon.svg` — site icon.

KaTeX, highlight.js and Plotly are loaded from public CDNs.
