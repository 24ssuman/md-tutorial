# Molecular Dynamics Tutorial for Beginners

Welcome! This is a beginner-friendly course that teaches Molecular Dynamics (MD) from first principles using interactive Jupyter notebooks.

## About This Course

- **Audience:** beginners starting MD with no prior experience.
- **Style:** concept-first explanations followed by runnable notebook examples.
- **Tooling:** Python, NumPy, Matplotlib, SciPy, and ASE-based demonstrations.
- **Goal:** build intuition first, then introduce practical simulation and enhanced-sampling workflows.

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
pip install -e .
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

1. Introduction to MD
2. Physics of MD
3. Non-bonded interactions
4. 1D simulations
5. Sampling challenge and CVs
6. Umbrella sampling and WHAM
7. Metadynamics
8. ASE LJ fluid simulation

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

## Attribution

This tutorial was created by **Suman Saha** (with the help of **GPT-5.3-codex**).

If you find a bug or error, please report it to [24.sumansaha@gmail.com](mailto:24.sumansaha@gmail.com).
