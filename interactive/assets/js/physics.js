/* ==========================================================================
   MD Tutorial — browser physics toolkit.
   JavaScript ports of the course's md_tutorial Python package (potentials,
   integrators, WHAM) plus the small NumPy-style helpers the labs need.
   Reduced units throughout (k_B = 1).
   ========================================================================== */
(function () {
  "use strict";
  const MD = (window.MD = window.MD || {});
  const P = (MD.phys = {});

  P.kB = 1.0;

  // ---------------------------------------------------------------------------
  // Random numbers (seeded so results are reproducible across reloads)
  // ---------------------------------------------------------------------------
  /** Mulberry32 PRNG. rng() -> uniform [0,1); rng.normal(mu, sigma) -> Gaussian. */
  P.rng = function (seed) {
    let a = (seed === undefined ? 42 : seed) >>> 0;
    const rng = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let spare = null;
    rng.normal = function (mu = 0, sigma = 1) {
      if (spare !== null) { const s = spare; spare = null; return mu + sigma * s; }
      let u, v, r;
      do { u = 2 * rng() - 1; v = 2 * rng() - 1; r = u * u + v * v; } while (r === 0 || r >= 1);
      const f = Math.sqrt((-2 * Math.log(r)) / r);
      spare = v * f;
      return mu + sigma * u * f;
    };
    rng.uniform = (lo = 0, hi = 1) => lo + (hi - lo) * rng();
    return rng;
  };

  // ---------------------------------------------------------------------------
  // Array helpers (NumPy-ish)
  // ---------------------------------------------------------------------------
  P.linspace = (a, b, n) => { const out = new Array(n); for (let i = 0; i < n; i++) out[i] = n === 1 ? a : a + ((b - a) * i) / (n - 1); return out; };
  P.arange = (a, b, step = 1) => { const out = []; for (let x = a; step > 0 ? x < b - 1e-12 : x > b + 1e-12; x += step) out.push(x); return out; };
  P.zeros = (n) => new Float64Array(n);
  P.sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  P.mean = (a) => (a.length ? P.sum(a) / a.length : NaN);
  P.std = (a) => { const m = P.mean(a); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2; return Math.sqrt(s / a.length); };
  P.min = (a) => { let m = Infinity; for (let i = 0; i < a.length; i++) if (a[i] < m) m = a[i]; return m; };
  P.max = (a) => { let m = -Infinity; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; };
  P.argmin = (a) => { let m = Infinity, k = -1; for (let i = 0; i < a.length; i++) if (a[i] < m) { m = a[i]; k = i; } return k; };
  P.cumsum = (a) => { const out = new Array(a.length); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; out[i] = s; } return out; };
  P.map = (a, f) => Array.from(a, f);
  /** Running (cumulative) average. */
  P.runningMean = (a) => { const out = new Array(a.length); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; out[i] = s / (i + 1); } return out; };
  /** Moving average with a centred window of `w` samples. */
  P.movingAverage = (a, w) => {
    const n = a.length, out = new Array(n), half = Math.floor(w / 2), cs = [0];
    for (let i = 0; i < n; i++) cs.push(cs[i] + a[i]);
    for (let i = 0; i < n; i++) { const lo = Math.max(0, i - half), hi = Math.min(n, i + half + 1); out[i] = (cs[hi] - cs[lo]) / (hi - lo); }
    return out;
  };
  /** Keep at most `n` evenly spaced points (for plotting long trajectories). */
  P.thin = (a, n = 2000) => { if (a.length <= n) return Array.from(a); const k = a.length / n, out = []; for (let i = 0; i < n; i++) out.push(a[Math.floor(i * k)]); return out; };

  /**
   * Histogram like numpy.histogram.
   * @returns {{counts:number[], edges:number[], centers:number[], density:number[]}}
   */
  P.histogram = function (data, bins = 50, range) {
    const lo = range ? range[0] : P.min(data), hi = range ? range[1] : P.max(data);
    const counts = new Array(bins).fill(0);
    const w = (hi - lo) / bins;
    let n = 0;
    for (let i = 0; i < data.length; i++) {
      const x = data[i];
      if (x < lo || x > hi || !isFinite(x)) continue;
      let k = Math.floor((x - lo) / w);
      if (k === bins) k = bins - 1;
      counts[k]++; n++;
    }
    const edges = P.linspace(lo, hi, bins + 1);
    const centers = counts.map((_, i) => lo + (i + 0.5) * w);
    const density = counts.map((c) => (n ? c / (n * w) : 0));
    return { counts, edges, centers, density, width: w, n };
  };

  /** Complementary error function (Numerical Recipes erfcc, |rel err| < 1.2e-7). */
  P.erfc = function (x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  };
  P.erf = (x) => 1 - P.erfc(x);

  // ---------------------------------------------------------------------------
  // Potentials (md_tutorial.potentials)
  // ---------------------------------------------------------------------------
  /** Simple harmonic: V = ½ k x² */
  P.potential_sh = (x, k) => 0.5 * k * x * x;
  /** F = −k x */
  P.force_sh = (x, k) => -k * x;
  /** Symmetric double well: V = a x⁴ − b x². Minima ±√(b/2a), barrier b²/4a. */
  P.potential_dw = (x, a, b) => a * x ** 4 - b * x * x;
  /** F = −4a x³ + 2b x */
  P.force_dw = (x, a, b) => -4 * a * x ** 3 + 2 * b * x;

  /** Lennard-Jones 12-6 potential and force magnitude (−dV/dr). */
  P.lj = (r, eps = 1, sig = 1) => { const sr6 = (sig / r) ** 6; return 4 * eps * (sr6 * sr6 - sr6); };
  P.ljForce = (r, eps = 1, sig = 1) => { const sr6 = (sig / r) ** 6; return (24 * eps / r) * (2 * sr6 * sr6 - sr6); };

  // ---------------------------------------------------------------------------
  // Integrators (md_tutorial.integrators) — scalar 1D versions.
  // `force` is a function x -> F(x).
  // ---------------------------------------------------------------------------
  /** One Velocity Verlet step (NVE). Returns [x_new, v_new]. */
  P.velocityVerletStep = function (x, v, m, dt, force) {
    const a = force(x) / m;
    const vHalf = v + 0.5 * a * dt;
    const xNew = x + vHalf * dt;
    const aNew = force(xNew) / m;
    return [xNew, vHalf + 0.5 * aNew * dt];
  };

  /** One explicit (forward) Euler step. Returns [x_new, v_new]. */
  P.eulerStep = function (x, v, m, dt, force) {
    const a = force(x) / m;
    return [x + v * dt, v + a * dt];
  };

  /**
   * One BAOAB Langevin step (NVT), identical splitting to velocity_verlet_langevin.
   * Returns [x_new, v_new].
   */
  P.langevinBAOAB = function (x, v, m, dt, gamma, T, force, rng) {
    const vB = v + (force(x) / m) * (dt / 2);
    const xA = x + vB * (dt / 2);
    const c1 = Math.exp(-gamma * dt);
    const c2 = Math.sqrt((P.kB * Math.max(0, T) * (1 - c1 * c1)) / m);
    const vO = c1 * vB + c2 * rng.normal();
    const xNew = xA + vO * (dt / 2);
    const vNew = vO + (force(xNew) / m) * (dt / 2);
    return [xNew, vNew];
  };

  /**
   * Run a 1D trajectory.
   * opts: { x0, v0, m=1, dt, steps, force, potential?, method:'vv'|'euler'|'langevin', gamma, T, seed, stride=1 }
   * Returns { t, x, v, ke, pe, te } arrays (sampled every `stride` steps, including t=0).
   */
  P.run1D = function (o) {
    const m = o.m || 1, dt = o.dt, steps = o.steps, stride = o.stride || 1;
    const rng = o.rng || P.rng(o.seed === undefined ? 42 : o.seed);
    const U = o.potential || (() => 0);
    let x = o.x0, v = o.v0 || 0;
    const t = [], X = [], V = [], KE = [], PE = [], TE = [];
    const rec = (i) => { const ke = 0.5 * m * v * v, pe = U(x); t.push(i * dt); X.push(x); V.push(v); KE.push(ke); PE.push(pe); TE.push(ke + pe); };
    rec(0);
    for (let i = 1; i <= steps; i++) {
      if (o.method === "euler") [x, v] = P.eulerStep(x, v, m, dt, o.force);
      else if (o.method === "langevin") [x, v] = P.langevinBAOAB(x, v, m, dt, o.gamma, o.T, o.force, rng);
      else [x, v] = P.velocityVerletStep(x, v, m, dt, o.force);
      if (!isFinite(x) || Math.abs(x) > 1e8) { rec(i); break; }
      if (i % stride === 0) rec(i);
    }
    return { t, x: X, v: V, ke: KE, pe: PE, te: TE };
  };

  // ---------------------------------------------------------------------------
  // WHAM (md_tutorial.wham.run_wham)
  //   N_ij: counts [n_windows][n_bins]; n_i: samples per window; u_ij: reduced bias β w_i(x_j)
  //   Returns { P, f, deltaHist, converged, iterations }
  // ---------------------------------------------------------------------------
  P.runWham = function (N_ij, n_i, u_ij, maxIter = 20000, tol = 1e-8) {
    const nW = N_ij.length, nB = N_ij[0].length;
    let f = new Array(nW).fill(0);
    const numer = new Array(nB).fill(0);
    for (let i = 0; i < nW; i++) for (let j = 0; j < nB; j++) numer[j] += N_ij[i][j];
    const tot = P.sum(numer);
    if (tot <= 0) throw new Error("No counts in any bin.");
    let Pj = numer.map((c) => c / tot);
    const expU = u_ij.map((row) => row.map((u) => Math.exp(-u)));
    const deltaHist = [];
    let converged = false, it = 0;
    for (it = 0; it < maxIter; it++) {
      const fOld = f.slice();
      const Pn = new Array(nB).fill(0);
      const w = f.map((fi, i) => n_i[i] * Math.exp(fi));
      for (let j = 0; j < nB; j++) {
        let den = 0;
        for (let i = 0; i < nW; i++) den += w[i] * expU[i][j];
        Pn[j] = den > 1e-300 ? numer[j] / den : 0;
      }
      const s = P.sum(Pn);
      if (s <= 0) throw new Error("WHAM collapsed: sum(P_new) <= 0 (likely zero overlap).");
      Pj = Pn.map((q) => q / s);
      for (let i = 0; i < nW; i++) {
        let Z = 0;
        for (let j = 0; j < nB; j++) Z += Pj[j] * expU[i][j];
        f[i] = -Math.log(Z);
      }
      const f0 = f[0];
      f = f.map((q) => q - f0);
      let d = 0;
      for (let i = 0; i < nW; i++) d = Math.max(d, Math.abs(f[i] - fOld[i]));
      deltaHist.push(d);
      if (d < tol) { converged = true; break; }
    }
    return { P: Pj, f, deltaHist, converged, iterations: it + 1 };
  };

  /** Free energy from a probability/density array: F = −kT ln P, shifted so min = 0 (NaN where P = 0). */
  P.freeEnergy = function (p, kT = 1) {
    const F = p.map((q) => (q > 0 ? -kT * Math.log(q) : NaN));
    let m = Infinity;
    for (const v of F) if (isFinite(v) && v < m) m = v;
    return F.map((v) => (isFinite(v) ? v - m : null));
  };
})();
