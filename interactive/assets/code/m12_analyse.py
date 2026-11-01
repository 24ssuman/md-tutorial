"""Module 12 analysis: turn the NVE trajectory data of m12_production.py into properties of liquid SPC/E water."""
import json, sys
import numpy as np
from ase import units

d = np.load(sys.argv[1] if len(sys.argv) > 1 else "m12_out.npz")
N = d["Opos"].shape[1]; L = float(d["L"]); V = L ** 3
T_U, U, Utail, Opos, M, P, hb = d["T"], d["U"], d["Utail"], d["Opos"], d["M"], d["P"], d["hb"]
dt_frame = 0.010                                   # ps between stored frames (5 steps of 2 fs)
n_frames = len(U); t = np.arange(n_frames) * dt_frame
kB = units.kB; Tm = T_U.mean(); kT = kB * Tm      # eV
KJ = 96.4853; RT_kJ = 8.314462618e-3 * Tm
blocks = np.array_split(np.arange(n_frames), 4)
def sem(x): return np.std(x, ddof=1) / np.sqrt(len(x))
print(f"{N} SPC/E molecules, box {L:.3f} A, NVE run of {n_frames * dt_frame:.0f} ps, <T> = {Tm:.1f} +- {T_U.std():.1f} K\n")

# ---- 1. energy and the heat of vaporisation ---------------------------------------------------------
u_mol = (U + Utail) / N * KJ                       # kJ/mol per molecule (unshifted LJ + analytic tail)
mu_liq, mu_gas, alpha_pol = 2.351, 1.85, 1.44      # D, D, A^3 (Berendsen et al. 1987)
E_pol = (mu_liq - mu_gas) ** 2 / (2 * alpha_pol) * 60.2214   # kJ/mol: 1 D^2/A^3 = 60.22 kJ/mol
dH_raw = [-u_mol[b].mean() + RT_kJ for b in blocks]
dH_cor = [x - E_pol for x in dH_raw]
print(f"potential energy      <U>/N          = {u_mol.mean():7.2f} kJ/mol  (blocks: {', '.join(f'{u_mol[b].mean():.2f}' for b in blocks)})")
print(f"heat of vaporisation  -<U>/N + RT    = {np.mean(dH_raw):7.2f} +- {sem(dH_raw):.2f} kJ/mol   ({np.mean(dH_raw) / 4.184:.2f} kcal/mol, before the polarisation correction)")
print(f"polarisation correction E_pol        = {E_pol:7.2f} kJ/mol  (mu = {mu_liq} D, gas-phase mu = {mu_gas} D, alpha = {alpha_pol} A^3)")
print(f"corrected             dHvap          = {np.mean(dH_cor):7.2f} +- {sem(dH_cor):.2f} kJ/mol   ({np.mean(dH_cor) / 4.184:.2f} kcal/mol)   experiment: 44.0 kJ/mol\n")

# ---- 2. structure -------------------------------------------------------------------------------------
hist, nfr = d["hist"], int(d["nfr"]); nb = len(hist); rmax = L / 2 - 0.05
edges = np.linspace(0, rmax, nb + 1); r = 0.5 * (edges[1:] + edges[:-1]); rho_n = N / V
shell = 4 / 3 * np.pi * (edges[1:] ** 3 - edges[:-1] ** 3)
g = hist / (nfr * N * rho_n * shell)
k1 = int(np.argmax(g)); kmin = k1 + int(np.argmin(g[k1:k1 + 40]))
cn = np.sum(4 * np.pi * rho_n * g[:kmin + 1] * r[:kmin + 1] ** 2 * (edges[1] - edges[0]))
print(f"g_OO(r): first peak at r = {r[k1]:.2f} A, height {g[k1]:.2f}; first minimum at {r[kmin]:.2f} A (g = {g[kmin]:.2f}); coordination number {cn:.2f}")
print(f"          experiment (X-ray, 298 K): first peak near 2.80 A, height about 2.5\n")

# ---- 3. hydrogen bonds and dipole -----------------------------------------------------------------
print(f"hydrogen bonds donated per molecule (O...O < 3.5 A, H-O...O < 30 deg): {hb.mean():.2f} +- {sem([hb[b2].mean() for b2 in np.array_split(np.arange(len(hb)), 4)]):.2f}  (3.5 donated+accepted)\n")

# ---- 4. self-diffusion -----------------------------------------------------------------------------
lag_frames = np.arange(0, min(1000, n_frames // 3), max(1, int(10 * min(1.0, n_frames * dt_frame / 40.0))))             # every 0.1 ps up to ~10 ps
def msd_curve(Pseg, lags):
    return np.array([0.0 if l == 0 else np.mean(np.sum((Pseg[l:] - Pseg[:-l]) ** 2, axis=2)) for l in lags]) if len(Pseg) > max(lags) else None
msd = msd_curve(Opos, lag_frames); tl = lag_frames * dt_frame
def slope_D(tt, mm, lo, hi):
    s = (tt >= lo) & (tt <= hi); return np.polyfit(tt[s], mm[s], 1)[0] / 6.0 * 1e-4 * 1e5        # A^2/ps -> 1e-5 cm^2/s
total_ps = n_frames * dt_frame
fit_lo, fit_hi = (1.5, 5.0) if total_ps >= 12 else (0.3 * total_ps / 3, 0.9 * total_ps / 3)        # diffusive window of the MSD (shorter for tiny test runs)
D_all = slope_D(tl, msd, fit_lo, fit_hi)
n_blk = 2 if total_ps < 30 else 4; seg = n_frames // n_blk; Db = []
for i in range(n_blk):
    lg = np.arange(0, seg // 2, 10); m_i = msd_curve(Opos[i * seg:(i + 1) * seg], lg)
    Db.append(slope_D(lg * dt_frame, m_i, 1.0, 3.5) if total_ps >= 12 else slope_D(lg * dt_frame, m_i, fit_lo / 2, fit_hi / 2))
eta = 0.890e-3                                                      # Pa s, experimental viscosity of water at 25 C (used for the correction)
dD = 2.837297 * units.kB * Tm * 1.602176634e-19 / (6 * np.pi * eta * L * 1e-10) * 1e4 / 1e-5       # m^2/s -> 1e-5 cm^2/s
print(f"self-diffusion D (Einstein, MSD slope {fit_lo:.1f}-{fit_hi:.1f} ps)     = {D_all:.2f} x 1e-5 cm^2/s")
print(f"  {n_blk} independent {total_ps / n_blk:.0f} ps blocks (slope 1-3.5 ps)       = {np.mean(Db):.2f} +- {sem(Db):.2f}  ({', '.join(f'{x:.2f}' for x in Db)})")
print(f"  finite-size correction (Yeh-Hummer, eta = 0.890 mPa s): +{dD:.2f}  ->  D(infinite system) = {D_all + dD:.2f} x 1e-5 cm^2/s   experiment: 2.30\n")

# ---- 5. dielectric constant ------------------------------------------------------------------------
Mv = M[len(M) - n_frames * 5:]                                     # one dipole per step; use the same NVE run
Mvar = lambda x: ((x ** 2).sum(1).mean() - (x.mean(0) ** 2).sum())
eps_f = lambda x: 1 + 4 * np.pi * 14.3996454784 * Mvar(x) / (3 * V * kT)
eps_b = [eps_f(Mv[i * (len(Mv) // 4):(i + 1) * (len(Mv) // 4)]) for i in range(4)]
print(f"static dielectric constant (box-dipole fluctuations): {eps_f(Mv):.0f}  (four {total_ps / 4:.0f} ps blocks: {', '.join(f'{x:.0f}' for x in eps_b)}; spread {np.std(eps_b, ddof=1):.0f})")
print(f"  SPC/E literature value: about 68-71;  experiment: 78.5\n")

# ---- 6. pressure -----------------------------------------------------------------------------------
Pb = [np.mean(P[b2]) for b2 in np.array_split(np.arange(len(P)), 4)]
print(f"pressure at 0.997 g/cm^3: {np.mean(P):.0f} bar  (blocks: {', '.join(f'{x:.0f}' for x in Pb)}; sem {sem(Pb):.0f})  -> 1 bar is the equilibrium state\n")

# ---- for the web page --------------------------------------------------------------------------------
def cum(f, step_ps, stride=1):
    out = []
    for tt in np.arange(step_ps, n_frames * dt_frame + 1e-9, step_ps):
        out.append((float(tt), float(f(tt))))
    return out
dh_cum = [(tt, float(-((U + Utail)[:int(tt / dt_frame)].mean()) / N * KJ + RT_kJ - E_pol)) for tt in np.arange(1, n_frames * dt_frame + 1e-9, 1.0)]
eps_cum = [(tt, float(eps_f(Mv[:int(tt / 0.002)]))) for tt in np.arange(2, n_frames * dt_frame + 1e-9, 1.0)]
json.dump({
    "uN": float(u_mol.mean()), "dHraw": [float(np.mean(dH_raw)), float(sem(dH_raw))], "dHrawk": float(np.mean(dH_raw) / 4.184), "Epol": float(E_pol),
    "dHdev": float(abs(np.mean(dH_cor) - 44.0) / 44.0 * 100), "Dinf": float(D_all + dD),
    "N": N, "L": L, "T": float(Tm), "tPs": float(n_frames * dt_frame),
    "g": {"r": [float(x) for x in r], "g": [float(x) for x in g]},
    "msd": {"t": [float(x) for x in tl], "msd": [float(x) for x in msd]},
    "dH": [float(np.mean(dH_cor)), float(sem(dH_cor))], "dHcum": dh_cum, "epsCum": eps_cum,
    "D": [float(D_all), float(np.mean(Db)), float(sem(Db)), float(dD)], "fitWin": [float(fit_lo), float(fit_hi)], "nBlk": int(n_blk), "eps": [float(eps_f(Mv))] + [float(x) for x in eps_b],
    "P": [float(np.mean(P)), float(sem(Pb))], "hb": float(hb.mean()), "peak": [float(r[k1]), float(g[k1])], "cn": float(cn),
}, open("m12_results.json", "w"))
