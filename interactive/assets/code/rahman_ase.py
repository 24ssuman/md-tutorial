"""Recreate Rahman's 1964 liquid-argon MD with ASE (864 atoms, 94.4 K, 1.374 g/cm^3)."""
import time
import numpy as np
from ase import units
from ase.build import bulk
from ase.calculators.lj import LennardJones
from ase.md.langevin import Langevin
from ase.md.verlet import VelocityVerlet
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution, Stationary
from ase.neighborlist import neighbor_list

# --- Rahman's state point ---------------------------------------------------
sigma, eps_K, mass = 3.4, 120.0, 39.948          # A, K, amu
epsilon = eps_K * units.kB                       # eV
T_target, rho_gcc, N_cells = 94.4, 1.374, 6      # K, g/cm^3, 6x6x6 fcc cells -> 864 atoms
dt_fs = 10.0                                     # 1e-14 s
rc = 2.5 * sigma                                 # our choice

n_per_A3 = rho_gcc / (mass * 1.66053906660e-24) * 1e-24
a = (4.0 / n_per_A3) ** (1.0 / 3.0)
atoms = bulk("Ar", "fcc", a=a, cubic=True).repeat((N_cells,) * 3)
atoms.pbc = True
L = atoms.cell[0, 0]
print(f"N = {len(atoms)}, a = {a:.4f} A, L = {L:.3f} A = {L/sigma:.3f} sigma, rho = {len(atoms)/L**3:.5f} A^-3")
atoms.calc = LennardJones(sigma=sigma, epsilon=epsilon, rc=rc, smooth=False)

seed = np.random.default_rng(1964)
# 1) melt the lattice hot, 2) cool to 94.4 K, 3) NVE production
MaxwellBoltzmannDistribution(atoms, temperature_K=300, rng=seed); Stationary(atoms)
t0 = time.time()
dyn = Langevin(atoms, dt_fs * units.fs, temperature_K=300, friction=0.01 / units.fs, rng=seed)
dyn.run(300)       # 3 ps melt
dyn = Langevin(atoms, dt_fs * units.fs, temperature_K=T_target, friction=0.01 / units.fs, rng=seed)
dyn.run(500)       # 5 ps cool/equilibrate
print(f"equilibration done in {time.time()-t0:.1f} s, T = {atoms.get_temperature():.1f} K")

# rescale to exactly 94.4 K and switch to NVE
p = atoms.get_momenta(); atoms.set_momenta(p * np.sqrt(T_target / atoms.get_temperature()))
nve = VelocityVerlet(atoms, dt_fs * units.fs)

nsteps, every_rdf = 3000, 20
pos = np.empty((nsteps + 1, len(atoms), 3)); vel = np.empty_like(pos)
Ts, Es = [], []
rmax, nb = L / 2 - 0.05, 200
hist = np.zeros(nb); nframes = 0
def record(i):
    global nframes
    pos[i] = atoms.get_positions(); vel[i] = atoms.get_velocities() / (units.Ang / units.fs)  # A/fs
    if i % every_rdf == 0:
        d = neighbor_list("d", atoms, rmax)
        hist[:] += np.histogram(d, bins=nb, range=(0, rmax))[0]; nframes += 1
    Ts.append(atoms.get_temperature()); Es.append((atoms.get_potential_energy(), atoms.get_kinetic_energy()))
record(0)
for i in range(1, nsteps + 1):
    nve.run(1); record(i)
print(f"NVE run done: {nsteps} steps = {nsteps*dt_fs/1000:.0f} ps in {time.time()-t0:.1f} s total")
Es = np.array(Es); Etot = Es.sum(1)
print(f"<T> = {np.mean(Ts):.1f} +- {np.std(Ts):.1f} K;  E_tot drift = {Etot[-1]-Etot[0]:+.4f} eV over {nsteps} steps (std {Etot.std():.4f} eV)")
print(f"Epot/N = {Es[:,0].mean()/len(atoms):.5f} eV")

# --- g(r) ---------------------------------------------------------------------
edges = np.linspace(0, rmax, nb + 1); r = 0.5 * (edges[1:] + edges[:-1])
shell = 4 / 3 * np.pi * (edges[1:] ** 3 - edges[:-1] ** 3)
g = hist / (nframes * len(atoms) * (len(atoms) / L**3) * shell)
k = g.argmax(); print(f"g(r): first peak r = {r[k]:.2f} A, g = {g[k]:.2f}")
kmin = k + np.argmin(g[k:k + 40]); cn = np.sum(4*np.pi*(len(atoms)/L**3)*g[:kmin+1]*r[:kmin+1]**2*(edges[1]-edges[0]))
print(f"first minimum r = {r[kmin]:.2f} A, coordination number = {cn:.1f}")

# --- VACF (A/fs -> reduced to C(0)=1) and MSD -----------------------------------
M = pos.shape[0]; nlag = 400  # 4 ps
v = vel.reshape(M, -1)
f = np.fft.rfft(v, n=2 * M, axis=0); ac = np.fft.irfft(f * np.conj(f), axis=0)[:nlag].sum(1)
ac /= (M - np.arange(nlag)) ; C = ac / ac[0]
t_ps = np.arange(nlag) * dt_fs / 1000
kmin_v = C.argmin(); print(f"VACF: minimum {C[kmin_v]:.3f} at t = {t_ps[kmin_v]:.2f} ps; first zero crossing at {t_ps[np.argmax(C<0)]:.2f} ps")
# <v(0).v(t)> per atom is ac / N (ac sums over all 3N components); 1 A^2/fs = 0.1 cm^2/s
N = len(atoms)
D_gk = (ac[0] / N / 3.0) * np.trapz(C, dx=dt_fs) * 0.1
lags = np.arange(1, nlag); msd = np.array([np.mean(np.sum((pos[l:] - pos[:-l]) ** 2, axis=2)) for l in lags])
def D_from_msd(P):
    m = np.array([np.mean(np.sum((P[l:] - P[:-l]) ** 2, axis=2)) for l in lags])
    sel = (lags * dt_fs / 1000 >= 1.0) & (lags * dt_fs / 1000 <= 3.0)
    return np.polyfit(lags[sel] * dt_fs, m[sel], 1)[0] / 6.0 * 0.1      # cm^2/s
D_msd = D_from_msd(pos)
blocks = [D_from_msd(pos[i * 1000:(i + 1) * 1000 + 1]) for i in range(3)]  # three 10 ps blocks
err = np.std(blocks, ddof=1) / np.sqrt(3)
print(f"D (Einstein, MSD slope 1-3 ps)    = {D_msd*1e5:.2f} x 1e-5 cm^2/s  (3 blocks of 10 ps: {np.mean(blocks)*1e5:.2f} +- {err*1e5:.2f})")
print(f"D (Green-Kubo, VACF integral 4 ps) = {D_gk*1e5:.2f} x 1e-5 cm^2/s")
print("Rahman 1964: D = 2.43 x 1e-5 cm^2/s (15% below experiment)")

np.savez("rahman_out.npz", r=r, g=g, t_ps=t_ps, C=C, lags_ps=lags*dt_fs/1000, msd=msd, Ts=Ts, Es=Es)
