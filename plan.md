# Plan: Improve the Molecular Dynamics Tutorial Experience

## Goal

Update the tutorial so beginner users can understand molecular dynamics from the beginning, download the notebooks, and run them locally. The notebooks should stay clear and focused on the important learning material. Repeated code should be moved into reusable local modules when it distracts from the lesson.

## 1. Make the Course Local-First

- Update `intro.md` so users understand that the tutorials are meant to be downloaded and run locally.
- Remove Binder, Thebe, Colab, and other online execution wording from the user-facing instructions.
- Replace the current launch-button workflow with a local workflow:
  - download or clone the repository,
  - create a Python environment,
  - install dependencies,
  - start JupyterLab,
  - open notebooks from the repository root,
  - run notebooks in order.
- Explain that simulations may take time and that users should expect some cells to run longer on local machines.
- Remove any suggestion that users should use a special "fast mode" to complete heavy notebooks.

## 2. Remove Fast-Mode Execution Paths

- Remove `FAST_MODE` variables and conditional short-run paths from notebooks.
- Replace fast/slow toggles with one clear local-run parameter set per notebook.
- Use realistic but beginner-manageable parameters that run locally without hiding the actual workflow.
- Keep scientific uses of the word "fast" only when they describe the physics or algorithms, for example fast decay of a potential.
- Remove wording such as:
  - "set to False for higher-statistics runs",
  - "fast-mode settings",
  - "quick run",
  - online-runtime shortcuts.

## 3. Update Jupyter Book Configuration

- Update `_config.yml` to remove browser execution affordances:
  - Binder launch buttons,
  - Thebe execution,
  - any online interactive execution language.
- Keep the Jupyter Book as a readable website and documentation source.
- Keep repository and issue buttons if useful for users to report problems.

## 4. Add Beginner Setup Instructions

- Add a clear setup section in `intro.md`, or create a dedicated setup page if the content becomes long.
- Include step-by-step beginner instructions:
  - install Python,
  - open a terminal,
  - clone or download the repository,
  - create and activate a virtual environment,
  - install dependencies,
  - launch JupyterLab,
  - open the first notebook.
- Add a short explanation of what a notebook is and how to run cells.
- Add troubleshooting notes for common beginner issues:
  - missing packages,
  - wrong working directory,
  - helper module import errors,
  - ASE installation issues,
  - long-running cells.

## 5. Separate Book Dependencies From Notebook Dependencies

- Keep `requirements-book.txt` for building and deploying the Jupyter Book.
- Add a separate local runtime dependency file, for example `requirements.txt`, for users running the notebooks.
- Include the packages needed by the notebooks:
  - `numpy`,
  - `matplotlib`,
  - `scipy`,
  - `jupyterlab`,
  - `ipywidgets`,
  - `ase`.
- Decide whether to add a minimal `pyproject.toml` so helper modules can be installed cleanly with `pip install -e .`.

## 6. Move Repeated Code Into Helper Modules

- Create a small local package, likely named `md_tutorial/`.
- Move repeated code into reusable modules where it improves notebook clarity.
- Proposed module structure:
  - `md_tutorial/potentials.py` for harmonic, double-well, and umbrella potentials and forces.
  - `md_tutorial/integrators.py` for Velocity Verlet and Langevin integrators.
  - `md_tutorial/wham.py` for shared WHAM functionality.
  - `md_tutorial/plotting.py` only if plotting repetition becomes substantial.
- Replace repeated notebook definitions with imports when the function is not the main concept being taught.
- Keep code inside notebooks when the purpose is to teach that algorithm directly.

## 7. Known Repeated Code To Consolidate

- `potential_sh` and `force_sh` appear in Modules 4 and 5.
- `potential_dw` and `force_dw` appear in Modules 4, 5, 6, and 7.
- `Velocity_verlet_langevin` appears in Modules 4 and 5.
- `run_wham` appears in Module 6 and the WHAM supplement.
- `velocity_verlet_step` appears in Modules 2 and 4, but Module 2 should likely keep its own version because it teaches the method from first principles.

## 8. Keep Notebooks Focused On Learning

- Add a consistent opening block to every notebook:
  - what the user will learn,
  - prerequisites,
  - what the user will run,
  - expected runtime,
  - what results to look for.
- Keep setup cells short.
- Keep important parameters visible and explain why they are chosen.
- Keep important simulation loops visible when they are part of the lesson.
- Move boilerplate functions and repeated utilities out of notebooks.
- Add short explanations before code cells so beginners know what the next cell does.
- Avoid long code blocks when the code is not the point of the lesson.

## 9. Reduce Repetition In Explanations

- Explain each major concept deeply the first time it appears.
- Later notebooks should briefly reference the earlier module instead of repeating the same full explanation.
- Concepts to standardize:
  - molecular dynamics basics,
  - potential energy and force,
  - harmonic oscillator,
  - double-well potential,
  - Langevin dynamics,
  - collective variables,
  - PMF,
  - umbrella sampling,
  - WHAM,
  - metadynamics.

## 10. Module-by-Module Plan

### Module 1: Introduction To MD

- Keep this as the true beginner entry point.
- Add clearer explanation of atoms, forces, energy, time step, trajectory, and why MD is approximate.
- Explain how the course notebooks should be used locally.
- Keep Python refresher material concise and beginner-friendly.

### Module 2: Physics Of MD

- Keep the Velocity Verlet implementation visible because this module teaches numerical integration.
- Connect equations to code more explicitly.
- Add a short explanation of units, time step size, and stability.

### Module 3: Non-Bonded Interactions

- Keep Lennard-Jones, Coulomb, Ewald, and PME explanations.
- Remove unnecessary repeated setup.
- Keep plots and examples focused on intuition.

### Module 4: 1D Simulations

- Teach harmonic and double-well systems clearly.
- Keep the first implementation of simple potentials and integrators visible if they are part of the lesson.
- Avoid redefining code that will be imported in later modules.

### Module 5: Sampling Challenge

- Import repeated harmonic, double-well, and Langevin helpers from local modules.
- Focus the notebook on rare events, sampling limitations, free energy, and PMFs.
- Avoid re-teaching all setup code from Module 4.

### Module 5.5: Choosing CVs

- Keep this as a conceptual supplement.
- Explain why synthetic PMFs are used instead of running a full MD simulation.
- Make the distinction between a good and bad collective variable clear for beginners.

### Module 6: Umbrella Sampling

- Import repeated double-well and Langevin helpers.
- Keep umbrella sampling window setup visible.
- Keep enough WHAM logic visible to understand the workflow, but consider importing the final reusable WHAM solver.
- Add clearer guidance on interpreting overlap and reconstructed PMFs.

### Module 6.1: WHAM Detailed

- Remove `FAST_MODE`.
- Use one explicit local-run parameter set.
- Keep WHAM implementation visible because this notebook is specifically teaching WHAM.
- Remove fallback/local duplicate WHAM code if it becomes confusing.

### Module 7: Metadynamics

- Remove `FAST_MODE`.
- Use one explicit local-run parameter set.
- Import repeated double-well helpers.
- Keep metadynamics-specific bias and hill logic visible.
- Clarify what the user should observe as hills fill the free-energy landscape.

### Module 8: ASE LJ Fluid Simulation

- Remove `!pip install ase` from the notebook.
- Replace with a note that ASE must be installed through the local setup instructions.
- Keep ASE imports and ASE-specific workflow visible.
- Add expected runtime and hardware expectations.

## 11. Clean Notebook Outputs And Metadata

- Remove Colab-specific metadata where practical.
- Remove large embedded outputs if they make notebooks hard to download and read.
- Keep essential plots in the rendered book if they help users understand the result before running locally.
- Clear unnecessary installation outputs and traceback outputs.

## 12. Verification Checklist

- Create a fresh local environment.
- Install runtime dependencies from the local requirements file.
- Launch JupyterLab from the repository root.
- Run every notebook in order.
- Confirm helper imports work in every notebook.
- Confirm no user-facing Binder, Colab, Thebe, or fast-mode instructions remain.
- Build the Jupyter Book.
- Check rendered pages for broken links, missing images, confusing headings, and repeated material.

## 13. Recommended User Workflow

The recommended supported workflow should be: users download or clone the entire repository and run notebooks from the repository root. This is better than standalone notebook downloads because shared helper modules keep notebooks clean and avoid repeated code.
