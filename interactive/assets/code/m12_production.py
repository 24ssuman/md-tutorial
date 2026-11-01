"""Module 12: properties of liquid SPC/E water with ASE (125 molecules, Ewald, 300 K).

Protocol: minimise -> Langevin equilibration -> NVE production; everything below is computed from the NVE run.
"""
import sys, time
import numpy as np
from ase import units
from ase.md.langevin import Langevin
from ase.md.verlet import VelocityVerlet
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution, Stationary
from ase.optimize import FIRE
from water_ase import Water3Site, water_box, rigid_constraint, MODELS, KE

N_MOL = int(sys.argv[1]) if len(sys.argv) > 1 else 125
N_EQ, N_PROD = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (3000, 8000)
T0, DT = 300.0, 2.0                                   # K, fs
KJ = 96.4853                                          # eV -> kJ/mol
kT = units.kB * T0

atoms = water_box("spce", N_MOL, density_gcc=0.997, seed=11)
L = atoms.cell[0, 0]; V = L ** 3
RC = min(9.0, L / 2 - 0.01)                           # real-space cutoff: 9 A, or just under half the box; pinned so that it does not change when the volume is perturbed
calc = Water3Site("spce", rc=RC); atoms.calc = calc
atoms.set_constraint(rigid_constraint(N_MOL, "spce"))
print(f"SPC/E, {N_MOL} molecules in a {L:.3f} A cube (density {N_MOL * 18.01528 / 0.602214076 / V:.3f} g/cm^3), Ewald real-space cutoff {RC:.2f} A")
FIRE(atoms, logfile=None).run(fmax=0.3, steps=500)
MaxwellBoltzmannDistribution(atoms, temperature_K=T0, rng=np.random.default_rng(3)); Stationary(atoms)
Langevin(atoms, 1.0 * units.fs, temperature_K=T0, friction=0.1 / units.fs, rng=np.random.default_rng(4)).run(400)
eq = Langevin(atoms, DT * units.fs, temperature_K=T0, friction=0.01 / units.fs, rng=np.random.default_rng(5))
t0 = time.time()
eq.attach(lambda: print(f"  equilibration {eq.nsteps * DT / 1000:5.1f} ps  Epot/N = {atoms.get_potential_energy() / N_MOL * KJ:7.2f} kJ/mol  T = {atoms.get_temperature():6.1f} K", flush=True), interval=1000)
eq.run(N_EQ)
print(f"equilibrated in {time.time() - t0:.0f} s", flush=True)

# ---------------------------------------------------------------- production (NVE)
m = atoms.get_masses()[:3]; q = np.array([MODELS["spce"]["qO"], MODELS["spce"]["qH"], MODELS["spce"]["qH"]])
rec = dict(t=[], T=[], U=[], Utail=[], Opos=[], M=[], P=[], hb=[])
rmax, nb = L / 2 - 0.05, 200
hist = np.zeros(nb); nfr = 0

def box_dipole():
    return (atoms.positions.reshape(-1, 3, 3) * q[None, :, None]).sum(axis=(0, 1))          # e*A

def hbonds():
    R = atoms.positions.reshape(-1, 3, 3); O, H = R[:, 0], R[:, 1:]
    d = O[None, :, :] - O[:, None, :]; d -= L * np.round(d / L)                              # O_i -> O_j
    r = np.linalg.norm(d, axis=-1); np.fill_diagonal(r, 99)
    n = 0
    for h in range(2):
        v = H[:, h, :] - O                                                                    # O_i -> its H
        cos = (v[:, None, :] * d).sum(-1) / (np.linalg.norm(v, axis=1)[:, None] * r)
        n += ((r < 3.5) & (cos > np.cos(np.radians(30)))).sum()
    return n / N_MOL

def pressure_bar():
    """Pressure of the rigid-molecule system: kinetic (centre-of-mass) part + (-dU/dV) from rigid scaling of the molecules."""
    R = atoms.positions.reshape(-1, 3, 3); com = (R * m[None, :, None]).sum(1) / m.sum()
    pcom = (atoms.get_momenta().reshape(-1, 3, 3)).sum(1)
    ke_com = (pcom ** 2).sum() / (2 * m.sum())
    def U(lam):
        a2 = atoms.copy(); a2.set_constraint()
        a2.set_cell(atoms.cell * lam, scale_atoms=False)
        a2.set_positions((R + (lam - 1) * com[:, None, :]).reshape(-1, 3))
        a2.calc = pcalc
        return a2.get_potential_energy()
    dl = 2e-4
    dUdl = (U(1 + dl) - U(1 - dl)) / (2 * dl)
    Pc = -dUdl / (3 * V)                                   # eV/A^3
    Pk = 2 * ke_com / (3 * V)
    x3 = (MODELS["spce"]["sigma"] / calc.rc) ** 3; rho = N_MOL / V                            # analytic LJ tail of the pressure
    Ptail = 16 / 3 * np.pi * rho ** 2 * MODELS["spce"]["eps"] * MODELS["spce"]["sigma"] ** 3 * (2 / 3 * x3 ** 3 - x3)
    return (Pk + Pc + Ptail) * 1.602176634e6               # bar

# a calculator with the Ewald k-set pinned, so that U(lambda) is a smooth function of the volume
atoms.get_potential_energy(); pcalc = Water3Site("spce", rc=RC, nmax=int(np.ceil(3.03 * calc.alpha * L / np.pi)))

def save():
    np.savez("m12_out.npz", **{k: np.array(v) for k, v in rec.items()}, hist=hist, nfr=nfr, L=L)

nve = VelocityVerlet(atoms, DT * units.fs)
step = {"i": 0}
def sample():
    i = step["i"] = step["i"] + 1
    rec["M"].append(box_dipole())
    if i % 5 == 0:
        rec["t"].append(i * DT / 1000); rec["T"].append(atoms.get_temperature())
        rec["U"].append(atoms.get_potential_energy()); rec["Utail"].append(calc.tail_correction(atoms))
        rec["Opos"].append(atoms.positions.reshape(-1, 3, 3)[:, 0].copy())
    if i % 20 == 0:
        global hist, nfr
        O = atoms.positions.reshape(-1, 3, 3)[:, 0]; d = O[None] - O[:, None]; d -= L * np.round(d / L)
        r = np.linalg.norm(d, axis=-1)[np.triu_indices(N_MOL, 1)]
        hist += 2 * np.histogram(r, bins=nb, range=(0, rmax))[0]; nfr += 1
        rec["hb"].append(hbonds())
    if i % 100 == 0: rec["P"].append(pressure_bar())
    if i % 2000 == 0:
        save()                                          # checkpoint, so that an interrupted run keeps its data
        print(f"  production {i * DT / 1000:5.1f} ps  T = {np.mean(rec['T'][-400:]):6.1f} K  Epot/N = {np.mean(rec['U'][-400:]) / N_MOL * KJ:7.2f} kJ/mol  elapsed {time.time() - t0:5.0f} s", flush=True)
nve.attach(sample, interval=1)
Etot0 = atoms.get_total_energy()
nve.run(N_PROD)
print(f"NVE total-energy drift over {N_PROD * DT / 1000:.0f} ps: {(atoms.get_total_energy() - Etot0) * 1000:+.1f} meV for {N_MOL} molecules", flush=True)
save()
