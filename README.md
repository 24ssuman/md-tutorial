# Molecular Dynamics Tutorial for Beginners

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](https://opensource.org/licenses/MIT)

A beginner-friendly, concept-first course that teaches the fundamentals of **Molecular Dynamics (MD)** and enhanced sampling from first principles. Everything runs live in your browser — read, drag the sliders, and play along. Nothing to install.

---

## 🎯 About This Course

* **Audience:** Beginners starting in molecular simulation with no prior experience.
* **Style:** Concept-first mathematical and physical explanations, the Python code behind every step, and a live, slider-driven simulation for every figure.
* **Goal:** Build a solid mathematical and physical intuition first, then introduce practical simulation workflows and modern enhanced-sampling methods.
* **Extras:** Presentation mode (press <kbd>P</kbd> on any module), dark mode, short quizzes and exercises, and progress tracking saved in your browser.

---

## 🚀 Viewing the Course

The whole course lives in [`interactive/`](interactive/) as static web pages. Serve the folder with any static web server and open the printed address:

```bash
python3 -m http.server 8000 --directory interactive
```

Then visit `http://localhost:8000`. The pages load KaTeX, highlight.js and Plotly from public CDNs, so an internet connection is needed.

---

## 📚 Course Modules

### 🛠️ Core Track

| Module | Title | Key Learning Objectives |
|:---:|---|---|
| **1** | [Introduction to Molecular Dynamics](interactive/01-intro.html) | What MD is, why we simulate, phase space, ensembles (NVE/NVT/NPT), and thermostats. |
| **2** | [Physics of Molecular Dynamics](interactive/02-physics.html) | Newton's laws, force fields, numerical integration (Euler vs. Velocity Verlet), time steps, and PBCs. |
| **3** | [Non-Bonded Interactions and Electrostatics](interactive/03-nonbonded.html) | Lennard-Jones potential, cutoffs, Coulomb forces, and long-range electrostatic methods (Ewald/PME). |
| **4** | [Simulating One-Dimensional Systems](interactive/04-1d-simulations.html) | 1D harmonic oscillator, double-well potentials, Langevin thermostat, and Boltzmann distribution. |
| **5** | [The Sampling Challenge](interactive/05-sampling.html) | Rare events, ergodicity, collective variables (CVs), free energy, and Potential of Mean Force (PMF). |
| **6** | [Umbrella Sampling & PMF Reconstruction](interactive/06-umbrella.html) | Harmonic bias windows, multi-window sampling, overlap assessment, and WHAM-based reconstruction. |
| **7** | [Metadynamics](interactive/07-metadynamics.html) | Adaptive bias, Gaussian hill deposition, well-tempered metadynamics, and reconstructing free energy profiles. |
| **8** | [Multi-Particle LJ Fluid Simulation](interactive/08-lj-fluid.html) | 3D multi-particle systems, energy minimization, NVT ensembles, and radial distribution functions (RDF). |

### 🔬 Supplements

* [**Supplement: Choosing Good Collective Variables**](interactive/s1-choosing-cvs.html) — How to choose CVs that resolve complex free-energy landscapes.
* [**Supplement: WHAM Walkthrough**](interactive/s2-wham.html) — Step-by-step derivation and hands-on exploration of the Weighted Histogram Analysis Method.

---

## 📖 Recommended Reference Book

For a deeper theoretical and statistical mechanics foundation underlying virtually every topic in this tutorial, we highly recommend the companion text:

> **Tuckerman, M. E.** — *Statistical Mechanics: Theory and Molecular Simulation*. Oxford University Press, 2010.

---

## 🤝 Attribution, License & Contact

This tutorial was created by **Suman Saha**.

This project is licensed under the [MIT License](LICENSE).

If you find a bug, error, or have suggestions for improvements, please report it to [24.sumansaha@gmail.com](mailto:24.sumansaha@gmail.com).
