# Molecular Dynamics Tutorial for Beginners

Welcome! This is a beginner-friendly course that teaches Molecular Dynamics (MD) from first principles using interactive Jupyter notebooks.

## About This Course

- **Audience:** beginners starting MD with no prior experience.
- **Style:** concept-first explanations followed by runnable notebook examples.
- **Tooling:** Python, NumPy, Matplotlib, SciPy, and ASE-based demonstrations.
- **Goal:** build intuition first, then introduce practical simulation and enhanced-sampling workflows.

## Recommended Reference

For a deeper theoretical understanding, a highly recommended companion text is:

> **Tuckerman, M. E.** — *Statistical Mechanics: Theory and Molecular Simulation*. Oxford University Press, 2010.

This book covers the statistical mechanics foundations underlying virtually every topic in this tutorial, from Newtonian dynamics to free-energy methods.

## Before You Start

You need Python installed on your computer. If you do not have Python, download it from [python.org](https://www.python.org/downloads/).

### Step 1 – Get the notebooks

Clone the repository or download it as a ZIP file:

```bash
git clone https://github.com/24ssuman/md-tutorial.git
cd md-tutorial
```

### Step 2 – Set up a Python environment (recommended)

```bash
python -m venv venv
source venv/bin/activate      # macOS / Linux
# or: venv\Scripts\activate   # Windows
```

### Step 3 – Install the required packages

```bash
pip install -e ".[full]"
pip install jupyterlab
```

### Step 4 – Launch JupyterLab

```bash
jupyter lab
```

JupyterLab will open in your browser. Use the file browser on the left to navigate to the `notebooks/` folder and open the first notebook.

### How to run a notebook

Each notebook contains text cells (explanations) and code cells (Python). Click inside a code cell and press **Shift + Enter** to run it. Work through the notebooks in order starting from Module 1.

## Course Modules

### Core Track

| Module | Title | What You Learn |
|--------|-------|---------------|
| 1 | Introduction to Molecular Dynamics | What MD is, why we simulate, essential concepts |
| 2 | Physics of Molecular Dynamics | Newton's laws, force fields, Velocity Verlet, PBC |
| 3 | Non-Bonded Interactions and Electrostatics | Lennard-Jones, Coulomb forces, Ewald summation, PME |
| 4 | Simulating One-Dimensional Systems | Harmonic oscillator, Langevin thermostat, double-well |
| 5 | The Sampling Challenge | Rare events, collective variables, free energy, PMF |
| 6 | Umbrella Sampling and PMF Reconstruction | Harmonic bias, multi-window sampling, WHAM |
| 7 | Metadynamics | Gaussian hill deposition, bias potential, free-energy reconstruction |
| 8 | Multi-Particle LJ Simulation with ASE | ASE library, NVT simulation, radial distribution function |

### Supplements

| File | Title | Purpose |
|------|-------|---------|
| `5.5_choosing_CVs` | Choosing Good Collective Variables | How to pick CVs that resolve barriers in multi-dimensional systems |
| `6.1_WHAM_detailed` | WHAM Walkthrough | Step-by-step derivation and interactive exploration of WHAM |

## Notes

- These notebooks are designed to be **downloaded and run on your own computer**.
- Some simulations will take noticeable time to complete. This is expected and part of the learning experience.
- If a cell is still running, a `[*]` symbol appears to its left. Wait until it changes to a number before running the next cell.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: No module named 'md_tutorial'` | Run `pip install -e .` from the repository root. |
| `No module named 'ase'` | Run `pip install ase`. |
| Notebooks are slow | Some modules run longer simulations; this is normal for MD. Reduce `n_steps` if needed. |
| Wrong working directory | Start JupyterLab from the repository root (`md-tutorial/`), not from inside `notebooks/`. |

## Attribution & License

This tutorial was created by **Suman Saha**.

This project is licensed under the [MIT License](https://github.com/24ssuman/md-tutorial/blob/main/LICENSE).

If you find a bug or error, please report it to [24.sumansaha@gmail.com](mailto:24.sumansaha@gmail.com).
