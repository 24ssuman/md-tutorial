"""Three-site water for ASE: SPC, SPC/E (rigid) and SPC/Fw (flexible) with Ewald electrostatics.

The same physics as the browser engine used on the course pages (interactive/assets/js/water.js).
Cubic periodic cell, atoms ordered O, H, H, O, H, H, ...
"""
import numpy as np
from scipy.special import erfc, erf
from ase import units
from ase.calculators.calculator import Calculator, all_changes
from ase.constraints import FixBondLengths

KE = units.Hartree * units.Bohr            # e^2/(4 pi eps0) in eV*A
KCAL = units.kcal / units.mol              # eV

MODELS = {
    #            qO       qH      sigma    epsilon      r_OH   theta   k_bond (eV/A^2)       k_angle (eV/rad^2)
    "spc":   dict(qO=-0.82,   qH=0.41,   sigma=3.166,   eps=0.1553 * KCAL, rOH=1.0,   theta=109.47),
    "spce":  dict(qO=-0.8476, qH=0.4238, sigma=3.166,   eps=0.1553 * KCAL, rOH=1.0,   theta=109.47),
    "spcfw": dict(qO=-0.82,   qH=0.41,   sigma=3.165,   eps=0.1554 * KCAL, rOH=1.012, theta=113.24,
                  kb=1059.162 * KCAL, ktheta=75.90 * KCAL),     # energies written 1/2 k (x - x0)^2
}


def water_box(model, n_molecules, density_gcc=0.997, seed=0):
    """Molecules on a simple-cubic lattice, each in the least clashing of 60 random orientations."""
    from ase import Atoms
    from scipy.spatial.transform import Rotation
    par = MODELS[model]; rng = np.random.default_rng(seed)
    n_per_A3 = density_gcc * 0.602214076 / 18.01528
    L = (n_molecules / n_per_A3) ** (1 / 3)
    m = int(np.ceil(n_molecules ** (1 / 3))); a = L / m
    h = np.radians(par["theta"]) / 2
    tmpl = np.array([[0, 0, 0], [par["rOH"] * np.sin(h), par["rOH"] * np.cos(h), 0], [-par["rOH"] * np.sin(h), par["rOH"] * np.cos(h), 0]])
    q = np.array([par["qO"], par["qH"], par["qH"]])
    placed = []
    sites = [(i, j, k) for i in range(m) for j in range(m) for k in range(m)][:n_molecules]
    for (i, j, k) in sites:
        c = (np.array([i, j, k]) + 0.5) * a
        best, best_e = None, np.inf
        for _ in range(60):
            cand = Rotation.random(random_state=int(rng.integers(1 << 30))).apply(tmpl) + c
            e = 0.0
            for other in placed:
                d = cand[:, None, :] - other[None, :, :]; d -= L * np.round(d / L)
                r = np.maximum(np.linalg.norm(d, axis=-1), 0.8)
                e += (KE * q[:, None] * q[None, :] / r).sum()
                e += 4 * par["eps"] * ((par["sigma"] / r[0, 0]) ** 12 - (par["sigma"] / r[0, 0]) ** 6)
            if e < best_e: best, best_e = cand, e
        placed.append(best)
    pos = np.concatenate(placed)
    # molecules stay whole (sites may stick out of the cell a little); the calculator uses the minimum image
    atoms = Atoms("OHH" * n_molecules, positions=pos, cell=[L, L, L], pbc=True)
    return atoms


class RigidWater(FixBondLengths):
    """SHAKE/RATTLE for rigid three-site water, vectorised over all molecules.

    ase.constraints.FixBondLengths loops over every bond in Python, which is far too slow for a water box;
    the molecules are independent, so all of them can be corrected at once with NumPy.
    """
    def __init__(self, n_molecules, d_oh, d_hh, tolerance=1e-10):
        pairs = []
        for m in range(n_molecules):
            o = 3 * m
            pairs += [[o, o + 1], [o, o + 2], [o + 1, o + 2]]
        super().__init__(pairs, tolerance=tolerance, bondlengths=np.tile([d_oh, d_oh, d_hh], n_molecules))
        self.n = n_molecules
        self.d2 = np.array([d_oh, d_oh, d_hh]) ** 2
    cons = ((0, 1), (0, 2), (1, 2))

    def adjust_positions(self, atoms, new):
        old = atoms.positions.reshape(-1, 3, 3); X = new.reshape(-1, 3, 3)   # views: edits go into `new`
        m = atoms.get_masses()[:3]
        for _ in range(100):
            worst = 0.0
            for c, (a, b) in enumerate(self.cons):
                s = X[:, a] - X[:, b]; d0 = old[:, a] - old[:, b]
                diff = self.d2[c] - (s * s).sum(1)
                worst = max(worst, np.abs(diff).max() / self.d2[c])
                g = diff / (2 * (1 / m[a] + 1 / m[b]) * (s * d0).sum(1))
                X[:, a] += (g / m[a])[:, None] * d0; X[:, b] -= (g / m[b])[:, None] * d0
            if worst < self.tolerance: return
        raise RuntimeError("SHAKE did not converge")

    def adjust_momenta(self, atoms, p):
        R = atoms.positions.reshape(-1, 3, 3); P = p.reshape(-1, 3, 3)
        m = atoms.get_masses()[:3]
        for _ in range(100):
            worst = 0.0
            for c, (a, b) in enumerate(self.cons):
                d = R[:, a] - R[:, b]
                dv = P[:, a] / m[a] - P[:, b] / m[b]
                k = (dv * d).sum(1) / ((1 / m[a] + 1 / m[b]) * self.d2[c])
                worst = max(worst, np.abs((dv * d).sum(1)).max() / self.d2[c])
                P[:, a] -= k[:, None] * d; P[:, b] += k[:, None] * d
            if worst < self.tolerance: return
        raise RuntimeError("RATTLE did not converge")


def rigid_constraint(n_molecules, model="spce"):
    p = MODELS[model]
    d_hh = 2 * p["rOH"] * np.sin(np.radians(p["theta"]) / 2)
    return RigidWater(n_molecules, p["rOH"], d_hh)


class Water3Site(Calculator):
    implemented_properties = ["energy", "forces"]

    def __init__(self, model="spce", rc=None, nmax=None, **kw):
        super().__init__(**kw)
        self.par = MODELS[model]; self.model = model; self.rc_arg = rc; self.nmax_arg = nmax
        self.flexible = "kb" in self.par
        self.parts = {}

    def _setup(self, atoms):
        L = atoms.cell[0, 0]; N = len(atoms) // 3
        self.L, self.N = L, N
        self.rc = min(self.rc_arg or 9.0, 0.5 * L - 1e-6)
        self.alpha = 3.0 / self.rc
        nmax = self.nmax_arg or int(np.ceil(3.03 * self.alpha * L / np.pi))     # nmax can be pinned (volume derivatives)
        kv = []
        for a in range(0, nmax + 1):
            for b in range(-nmax, nmax + 1):
                for c in range(-nmax, nmax + 1):
                    if a == 0 and (b < 0 or (b == 0 and c <= 0)): continue
                    if a * a + b * b + c * c > nmax * nmax: continue
                    kv.append((a, b, c))
        kv = np.array(kv, float) * 2 * np.pi / L
        k2 = (kv ** 2).sum(1)
        self.kv, self.A = kv, np.exp(-k2 / (4 * self.alpha ** 2)) / k2
        p = self.par
        self.q = np.array([p["qO"], p["qH"], p["qH"]])
        self.e_self = -KE * self.alpha / np.sqrt(np.pi) * N * (self.q ** 2).sum()
        self._key = (L, N)

    def calculate(self, atoms=None, properties=("energy",), system_changes=all_changes):
        super().calculate(atoms, properties, system_changes)
        atoms = self.atoms
        if getattr(self, "_key", None) != (atoms.cell[0, 0], len(atoms) // 3): self._setup(atoms)
        L, N, rc, al, q, p = self.L, self.N, self.rc, self.alpha, self.q, self.par
        R = atoms.positions.reshape(N, 3, 3)
        F = np.zeros_like(R)
        # ---- real space, all molecule pairs at once, minimum image per site pair
        d = R[:, None, :, None, :] - R[None, :, None, :, :]          # (N, N, 3, 3, 3)
        d -= L * np.round(d / L)
        r2 = (d ** 2).sum(-1)                                          # (N, N, 3, 3)
        iu = np.triu(np.ones((N, N), bool), 1)[:, :, None, None]
        m = iu & (r2 < rc * rc)
        r = np.sqrt(np.where(m, r2, 1.0))
        qq = KE * q[:, None] * q[None, :]
        u = np.where(m, qq * erfc(al * r) / r, 0.0)
        fr = np.where(m, qq * (erfc(al * r) / r ** 2 + 2 * al / np.sqrt(np.pi) * np.exp(-(al * r) ** 2) / r) / r, 0.0)
        e_real = u.sum()
        # Lennard-Jones on O-O, shifted so that the energy is continuous at rc
        sig2 = p["sigma"] ** 2; eps4 = 4 * p["eps"]
        x6c = (sig2 / rc ** 2) ** 3; shift = eps4 * (x6c * x6c - x6c)
        mo = m[:, :, 0, 0]; r2o = np.where(mo, r2[:, :, 0, 0], 1.0)
        x6 = (sig2 / r2o) ** 3
        e_lj = np.where(mo, eps4 * (x6 * x6 - x6) - shift, 0.0).sum()
        fr[:, :, 0, 0] += np.where(mo, eps4 * (12 * x6 * x6 - 6 * x6) / r2o, 0.0)
        self.n_lj = int(mo.sum())
        fvec = fr[..., None] * d                                       # force on molecule i site a from j site b
        F += fvec.sum(axis=(1, 3))
        F -= fvec.sum(axis=(0, 2))
        # ---- intramolecular exclusion correction: -qi qj erf(alpha r)/r for the three pairs
        e_excl = 0.0
        for a, c in ((0, 1), (0, 2), (1, 2)):
            v = R[:, a] - R[:, c]; rr = np.linalg.norm(v, axis=1); pre = qq[a, c]
            e_excl -= (pre * erf(al * rr) / rr).sum()
            f = pre * (2 * al / np.sqrt(np.pi) * np.exp(-(al * rr) ** 2) / rr - erf(al * rr) / rr ** 2) / rr
            F[:, a] += f[:, None] * v; F[:, c] -= f[:, None] * v
        # ---- reciprocal space
        pos = atoms.positions; qs = np.tile(q, N)
        kr = pos @ self.kv.T
        c_, s_ = np.cos(kr), np.sin(kr)
        Sr, Si = qs @ c_, qs @ s_
        V = L ** 3
        e_rec = 4 * np.pi * KE / V * (self.A * (Sr ** 2 + Si ** 2)).sum()
        g = (8 * np.pi * KE / V) * qs[:, None] * self.A[None, :] * (Sr[None, :] * s_ - Si[None, :] * c_)
        Frec = g @ self.kv
        # ---- bonded terms
        e_b = e_a = 0.0
        if self.flexible:
            kb, kt, r0, t0 = p["kb"], p["ktheta"], p["rOH"], np.radians(p["theta"])
            v1, v2 = R[:, 1] - R[:, 0], R[:, 2] - R[:, 0]
            r1, rb = np.linalg.norm(v1, axis=1), np.linalg.norm(v2, axis=1)
            e1, e2 = v1 / r1[:, None], v2 / rb[:, None]
            e_b = 0.5 * kb * ((r1 - r0) ** 2 + (rb - r0) ** 2).sum()
            f1, f2 = -kb * (r1 - r0), -kb * (rb - r0)
            F[:, 1] += f1[:, None] * e1; F[:, 0] -= f1[:, None] * e1
            F[:, 2] += f2[:, None] * e2; F[:, 0] -= f2[:, None] * e2
            cth = np.clip((e1 * e2).sum(1), -0.999999, 0.999999); th = np.arccos(cth); sth = np.sqrt(1 - cth ** 2)
            dth = th - t0; e_a = 0.5 * kt * (dth ** 2).sum()
            pref = kt * dth / sth
            g1 = pref[:, None] * (e2 - cth[:, None] * e1) / r1[:, None]
            g2 = pref[:, None] * (e1 - cth[:, None] * e2) / rb[:, None]
            F[:, 1] += g1; F[:, 2] += g2; F[:, 0] -= g1 + g2
        forces = F.reshape(-1, 3) + Frec
        self.parts = dict(real=e_real, lj=e_lj, excl=e_excl, recip=e_rec, self=self.e_self, bond=e_b, angle=e_a)
        self.results["energy"] = sum(self.parts.values())
        self.results["forces"] = forces

    def tail_correction(self, atoms):
        """eV: unshifted O-O LJ energy plus the analytic long-range tail (add to the potential energy for comparisons)."""
        p = self.par; N = self.N; rc = self.rc; L = self.L
        x3 = (p["sigma"] / rc) ** 3; x6c = x3 * x3
        shift = 4 * p["eps"] * (x6c * x6c - x6c)
        tail = 8 / 3 * np.pi * (N / L ** 3) * p["eps"] * p["sigma"] ** 3 * (x3 ** 3 / 3 - x3)
        return self.n_lj * shift + N * tail
