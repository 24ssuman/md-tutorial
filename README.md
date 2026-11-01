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

## 📖 Course Website

View the interactive course on [GitHub Pages](https://24ssuman.github.io/md-tutorial/interactive/01-intro.html). The pages load KaTeX, highlight.js and Plotly from public CDNs.

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
| **8** | [Multi-Particle LJ Fluid Simulation](interactive/08-lj-fluid.html) | 3D multi-particle systems, energy minimization, NVT ensembles, and radial distribution functions (RDF), and a recreation of Rahman's 1964 liquid-argon simulation (NVE, velocity autocorrelation, diffusion). |

### 💧 Water Track

| Module | Title | Key Learning Objectives |
|:---:|---|---|
| **9** | [Building a Water Model: Bonded Terms and SPC](interactive/09-water-model.html) | Bond and angle terms, partial charges plus Lennard-Jones, rigid SPC/SPC/E and flexible SPC/Fw water, constraints, and running water with ASE. |
| **10** | [A Survey of Water Models](interactive/10-water-models.html) | TIP3P/TIP4P/TIP5P and their descendants, flexible, polarizable and quantum models, where the parameters come from, and how the models compare with experiment. |
| **11** | [MB-pol: Water from Many-Body Quantum Chemistry](interactive/11-mb-pol.html) | The many-body expansion, the MB-pol potential energy function, and its performance from clusters to the liquid, with classical and quantum nuclei. |
| **12** | [Measuring Liquid Water: Simulation vs Experiment](interactive/12-water-properties.html) | Heat of vaporization, structure, diffusion, dielectric constant and pressure from an ASE simulation of liquid water, compared with experiment. |

### 🔬 Supplements

* [**Supplement: Choosing Good Collective Variables**](interactive/s1-choosing-cvs.html) — How to choose CVs that resolve complex free-energy landscapes.
* [**Supplement: WHAM Walkthrough**](interactive/s2-wham.html) — Step-by-step derivation and hands-on exploration of the Weighted Histogram Analysis Method.
* [**Supplement: Particle Mesh Ewald in Detail**](interactive/s3-pme.html) — Charge spreading, the FFT solve, interpolation back to the atoms, and the settings that control PME accuracy, with a live 2D PME lab.

---

## 📖 Recommended Reference Book

For a deeper theoretical and statistical mechanics foundation underlying virtually every topic in this tutorial, we highly recommend the companion text:

> **Tuckerman, M. E.** — *Statistical Mechanics: Theory and Molecular Simulation*. Oxford University Press, 2010.

---

## 🤝 Attribution, License & Contact

This tutorial was created by **Suman Saha**.

This project is licensed under the [MIT License](LICENSE).

If you find a bug, error, or have suggestions for improvements, please report it to [24.sumansaha@gmail.com](mailto:24.sumansaha@gmail.com).
