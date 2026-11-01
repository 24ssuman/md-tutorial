import time, sys
import numpy as np
from ase import units
from ase.md.langevin import Langevin
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution, Stationary
from ase.optimize import FIRE
from water_ase import Water3Site, water_box, rigid_constraint

model, nmol, dt_fs, n_steps, every = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
kJ = 96.4853                                    # eV -> kJ/mol
atoms = water_box(model, nmol, density_gcc=0.997, seed=11)
atoms.calc = Water3Site(model)
L = atoms.cell[0, 0]
print(f"{model}: {nmol} molecules, {len(atoms)} atoms, box {L:.3f} A, density {nmol * 18.01528 / 0.602214076 / L**3:.3f} g/cm^3")
if model != "spcfw":
    atoms.set_constraint(rigid_constraint(nmol, model))
print(f"E before minimisation: {atoms.get_potential_energy() / nmol * kJ:.2f} kJ/mol per molecule")
FIRE(atoms, logfile=None).run(fmax=0.3, steps=300)
print(f"E after minimisation:  {atoms.get_potential_energy() / nmol * kJ:.2f} kJ/mol per molecule, max |F| = {abs(atoms.get_forces()).max():.2f} eV/A")
MaxwellBoltzmannDistribution(atoms, temperature_K=300, rng=np.random.default_rng(3)); Stationary(atoms)

# stage 1: strong friction and a short step absorb the heat released while the lattice relaxes
Langevin(atoms, 0.5 * dt_fs * units.fs, temperature_K=300, friction=0.1 / units.fs, rng=np.random.default_rng(4)).run(int(0.4 * n_steps))
# stage 2: production-like run with weak friction
dyn = Langevin(atoms, dt_fs * units.fs, temperature_K=300, friction=0.01 / units.fs, rng=np.random.default_rng(5))
t0 = time.time()
def log():
    n = dyn.nsteps
    print(f"step {n:5d}  t = {n * dt_fs / 1000:5.2f} ps  Epot/molecule = {atoms.get_potential_energy() / nmol * kJ:7.2f} kJ/mol  T = {atoms.get_temperature():6.1f} K")
dyn.attach(log, interval=every)
dyn.run(n_steps)
print(f"done in {time.time() - t0:.0f} s ({(time.time() - t0) / n_steps * 1000:.0f} ms per step)")
