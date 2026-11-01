# Interactive course site

Static web pages for the whole tutorial; no build step. Serve this folder with any static web server (see the repository README).

- `index.html` — course home with the module list and progress.
- `01-intro.html` … `08-lj-fluid.html` — the eight core modules (Module 8 ends with a recreation of Rahman's 1964 argon simulation).
- `09-water-model.html` … `12-water-properties.html` — the water modules: bonded terms and the SPC family, the water-model zoo, MB-pol, and computing water properties against experiment.
- `s1-choosing-cvs.html`, `s2-wham.html` — the two supplements.
- `assets/css/style.css` — design tokens, layout and component styles (light and dark).
- `assets/js/physics.js` — JavaScript ports of the potentials, integrators and WHAM solver, plus array helpers.
- `assets/js/core.js` — page shell (navigation, presentation mode, quizzes, tabs), Plotly wrapper and the `MD.lab` interactive-panel framework.
- `assets/js/water.js` — browser water engine (rigid SPC/SPC-E and flexible SPC/Fw, Ewald sum, SHAKE/RATTLE, thermostat, RDF, hydrogen bonds), used by Modules 9 and 12.
- `assets/code/` — the Python (ASE) scripts behind the printed code cells of Modules 8, 9 and 12, with their own README.
- `assets/favicon.svg` — site icon.

KaTeX, highlight.js and Plotly are loaded from public CDNs.
