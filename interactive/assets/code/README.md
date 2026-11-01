# ASE scripts behind the water modules

Plain Python files that were run to produce the code cells and printed outputs on the course pages. They need `numpy`, `scipy` and `ase` (tested with ASE 3.26).

| File | Used in | What it does |
|---|---|---|
| `water_ase.py` | Modules 9, 12 | `Water3Site`, an ASE `Calculator` for SPC, SPC/E (rigid) and SPC/Fw (flexible) water with Ewald electrostatics; `RigidWater`, a vectorised SHAKE/RATTLE constraint; `water_box`, a lattice builder. Import it from the other scripts (keep the files in one folder). |
| `rahman_ase.py` | Module 8, Lesson 5 | Recreation of Rahman's 1964 liquid-argon MD: 864 atoms, 94.4 K, 1.374 g/cm³, NVE; g(r), VACF, MSD, diffusion constant. About 12 minutes on a laptop. |
| `m9_monomer.py` | Module 9 | Vibrational modes of one SPC/Fw molecule with `ase.vibrations.Vibrations`. |
| `m9_boxes.py` | Module 9 | A box of liquid water: `python m9_boxes.py spce 64 2.0 1500 150` (model, molecules, time step in fs, steps, log interval). |
| `m12_production.py` | Module 12 | 125 SPC/E molecules: equilibration, 16 ps of NVE, and sampling of the energy, oxygen positions, box dipole, pressure and hydrogen bonds into `m12_out.npz`. About 15 to 20 minutes. |
| `m12_analyse.py` | Module 12 | Turns `m12_out.npz` into heat of vaporisation, g_OO, diffusion constant (with finite-size correction), dielectric constant and pressure. |

The scripts write their data files into the current directory. See `interactive/README.md` for the rest of the site.
