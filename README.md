# Molecular Dynamics Tutorial for Beginners

[![Jupyter Notebook](https://img.shields.io/badge/Jupyter-Notebook-orange.svg?style=flat&logo=jupyter)](https://jupyter.org)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg?style=flat&logo=python)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](https://opensource.org/licenses/MIT)

Welcome! This is a beginner-friendly, concept-first course that teaches the fundamentals of **Molecular Dynamics (MD)** and enhanced sampling from first principles using interactive Jupyter notebooks.

**📖 Course Website:** [https://24ssuman.github.io/md-tutorial/intro.html](https://24ssuman.github.io/md-tutorial/intro.html)

---

## 🎯 About This Course

* **Audience:** Beginners starting in molecular simulation with no prior experience.
* **Style:** Concept-first mathematical and physical explanations followed immediately by clean, runnable Python/NumPy implementations.
* **Tooling:** Pure Python, NumPy, Matplotlib, SciPy, and the Atomic Simulation Environment (ASE) for the 3D fluid capstone.
* **Goal:** Build a solid mathematical and physical intuition first, then introduce practical simulation workflows and modern enhanced-sampling methods.

---

## 🚀 Quickstart: Run the Notebooks Locally

These tutorials are designed to be **downloaded and run on your own computer** to give you hands-on experience running and modifying simulations.

### Step 1: Clone the repository
Open a terminal and run:
```bash
git clone https://github.com/24ssuman/md-tutorial.git
cd md-tutorial
```

### Step 2: Set up a Python environment
It is highly recommended to use a virtual environment:
```bash
python -m venv venv
source venv/bin/activate      # On macOS/Linux
# or: venv\Scripts\activate   # On Windows
```

### Step 3: Install the required packages
Install the helper package in editable mode with all dependencies (including ASE) along with JupyterLab:
```bash
pip install -e ".[full]"
pip install jupyterlab
```

### Step 4: Launch JupyterLab
```bash
jupyter lab
```
JupyterLab will open in your browser. Navigate to the `notebooks/` directory in the sidebar and open `1_intro_to_MD.ipynb` to begin!

---

## 📚 Course Modules

### 🛠️ Core Track

| Module | Title | Key Learning Objectives |
|:---:|---|---|
| **1** | [Introduction to Molecular Dynamics](notebooks/1_intro_to_MD.ipynb) | What MD is, why we simulate, phase space, ensembles (NVE/NVT/NPT), and thermostats. |
| **2** | [Physics of Molecular Dynamics](notebooks/2_physics_of_MD.ipynb) | Newton's laws, force fields, numerical integration (Euler vs. Velocity Verlet), time steps, and PBCs. |
| **3** | [Non-Bonded Interactions and Electrostatics](notebooks/3_non_bonded_interactions.ipynb) | Lennard-Jones potential, cutoffs, Coulomb forces, and long-range electrostatic methods (Ewald/PME). |
| **4** | [Simulating One-Dimensional Systems](notebooks/4_1D_simulations.ipynb) | 1D harmonic oscillator, double-well potentials, Langevin thermostat, and Boltzmann distribution. |
| **5** | [The Sampling Challenge](notebooks/5_sampling_challenge.ipynb) | Rare events, ergodicity, collective variables (CVs), free energy, and Potential of Mean Force (PMF). |
| **6** | [Umbrella Sampling & PMF Reconstruction](notebooks/6_umbrella_sampling.ipynb) | Harmonic bias windows, multi-window sampling, overlap assessment, and WHAM-based reconstruction. |
| **7** | [Metadynamics](notebooks/7_meta_dynamics.ipynb) | Adaptive bias, Gaussian hill deposition, well-tempered metadynamics, and reconstructing free energy profiles. |
| **8** | [Multi-Particle LJ Fluid Simulation](notebooks/8_ase_LJ_fluid_simulation.ipynb) | 3D multi-particle systems using ASE, energy minimization, NVT ensembles, and radial distribution functions (RDF). |

### 🔬 Supplements

* [**Supplement: Choosing Good Collective Variables**](notebooks/5.5_choosing_CVs.ipynb) — Theoretical details and visual demonstrations of how to choose CVs that resolve complex free-energy landscapes.
* [**Supplement: WHAM Walkthrough**](notebooks/6.1_WHAM_detailed.ipynb) — Step-by-step derivation and detailed interactive implementation of the Weighted Histogram Analysis Method.

---

## 📖 Recommended Reference Book

For a deeper theoretical and statistical mechanics foundation underlying virtually every topic in this tutorial, we highly recommend the companion text:

> **Tuckerman, M. E.** — *Statistical Mechanics: Theory and Molecular Simulation*. Oxford University Press, 2010.

---

## 🤝 Attribution, License & Contact

This tutorial was created by **Suman Saha**.

This project is licensed under the [MIT License](LICENSE).

If you find a bug, error, or have suggestions for improvements, please report it to [24.sumansaha@gmail.com](mailto:24.sumansaha@gmail.com).
