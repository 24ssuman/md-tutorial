/* ==========================================================================
   MD Tutorial: browser water engine (Modules 9 and 12).
   Three-site water (SPC, SPC/E rigid; SPC/Fw flexible) in a periodic cubic box.

   Units: length Å, mass amu, energy kJ/mol, charge e. The derived time unit is
   Å·sqrt(amu / (kJ/mol)) = 100 fs exactly, so dt = 2 fs is 0.02 time units.

   Electrostatics: Ewald summation (real-space erfc sum with a tabulated, cubic-Hermite
   interpolated kernel, plus the reciprocal-space sum, the self term and the intramolecular
   exclusion correction), as in Module 3. Thermostat: stochastic velocity rescaling
   (Bussi et al. 2007), a global rescaling that keeps the rigid-water constraints satisfied.
   Box sizes are small (64-216 molecules) so that the pages stay fast; finite-size effects are
   discussed on the pages.
   Exposes window.MD.water.
   ========================================================================== */
(function () {
  "use strict";

  const MD = (window.MD = window.MD || {});
  const W = (MD.water = {});

  const KB = 0.0083144626;        // kJ/mol/K
  const KE = 1389.35457;          // e²/(4πε0) in kJ/mol·Å/e²
  const TU_FS = 100;              // 1 time unit = 100 fs
  const MO = 15.9994, MH = 1.008, MW = MO + 2 * MH;
  const KCAL = 4.184, DEG = Math.PI / 180, DEBYE = 4.80320471;   // e·Å → D
  const NA_RHO = 0.602214076;     // g/cm³ × this / (g/mol) → molecules/Å³
  Object.assign(W, { KB, KE, TU_FS, MO, MH, MW, KCAL, DEBYE });

  /** Model parameters. Bond and angle terms are written ½k(x−x0)². */
  W.models = {
    spc: { name: "SPC", rigid: true, qO: -0.82, qH: 0.41, sigma: 3.166, eps: 0.1553 * KCAL, rOH: 1.0, theta: 109.47, dtFs: 2 },
    spce: { name: "SPC/E", rigid: true, qO: -0.8476, qH: 0.4238, sigma: 3.166, eps: 0.1553 * KCAL, rOH: 1.0, theta: 109.47, dtFs: 2 },
    spcfw: { name: "SPC/Fw", rigid: false, qO: -0.82, qH: 0.41, sigma: 3.165, eps: 0.1554 * KCAL, rOH: 1.012, theta: 113.24,
      kb: 1059.162 * KCAL, ktheta: 75.90 * KCAL, dtFs: 0.5 },
  };

  // ------------------------------------------------------------------ math helpers
  /** erfc, Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7). */
  function erfc(x) {
    const t = 1 / (1 + 0.3275911 * x);
    const y = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return y;
  }
  const SQRTPI = Math.sqrt(Math.PI);

  /** erf via erfc. */
  const erf = (x) => 1 - erfc(x);

  // ------------------------------------------------------------------ system
  /**
   * W.create({model, N, rho, rc, alpha}) — N molecules at density rho (g/cm³); rc is the real-space cutoff (≤ L/2),
   * alpha the Ewald splitting parameter (default 3/rc). Fill it with W.lattice and W.initVelocities.
   * Site layout: pos[9*m + 3*s + k], s = 0 (O), 1, 2 (H); k = x, y, z.
   */
  W.create = function (o) {
    const par = Object.assign({}, W.models[o.model || "spce"]);
    const N = o.N, rho = o.rho === undefined ? 0.997 : o.rho;
    const L = Math.cbrt(N / (rho * NA_RHO / MW));
    const rc = Math.min(o.rc || 9, 0.5 * L - 1e-6);
    const alpha = o.alpha || 3.0 / rc;                       // erfc(alpha*rc) = 2e-5
    const nmax = Math.ceil((3.03 * alpha * L) / Math.PI);    // exp(-k²/4α²) < 1e-4 at the edge
    const s = {
      N, L, rc, alpha, par, rho,
      pos: new Float64Array(9 * N), vel: new Float64Array(9 * N), frc: new Float64Array(9 * N),
      mass: [MO, MH, MH], q: [par.qO, par.qH, par.qH],
      ePair: 0, eLJ: 0, eIntra: 0, eRecip: 0, eBond: 0, eAngle: 0, step: 0, time: 0,
      dt: par.dtFs / TU_FS, dtFs: par.dtFs,
    };
    s.dHH = 2 * par.rOH * Math.sin(0.5 * par.theta * DEG);
    // lookup tables over r² for the real-space Ewald kernel erfc(αr)/r: values u and F/r
    const nTab = 4096, rc2 = rc * rc;
    s.nTab = nTab; s.tabK = nTab / rc2; s.tU = new Float64Array(nTab + 2); s.tF = new Float64Array(nTab + 2);
    for (let k = 0; k <= nTab + 1; k++) {
      const r = Math.max(1e-3, Math.sqrt(Math.min(k, nTab) / s.tabK));
      s.tU[k] = erfc(alpha * r) / r;
      s.tF[k] = (erfc(alpha * r) / (r * r) + (2 * alpha / SQRTPI) * Math.exp(-alpha * alpha * r * r) / r) / r;
    }
    s.eSelf = -(alpha / SQRTPI) * KE * N * (par.qO ** 2 + 2 * par.qH ** 2);
    // reciprocal lattice: half space, inside the sphere |n| <= nmax
    const kv = [], twoPiL = (2 * Math.PI) / L, V = L ** 3;
    for (let a = 0; a <= nmax; a++) for (let b = -nmax; b <= nmax; b++) for (let c = -nmax; c <= nmax; c++) {
      if (a === 0 && (b < 0 || (b === 0 && c <= 0))) continue;
      if (a * a + b * b + c * c > nmax * nmax) continue;
      const k2 = twoPiL * twoPiL * (a * a + b * b + c * c);
      kv.push([a, b, c, twoPiL * a, twoPiL * b, twoPiL * c, Math.exp(-k2 / (4 * alpha * alpha)) / k2]);
    }
    s.kv = kv; s.nmax = nmax; s.V = V;
    s.cosT = new Float64Array(kv.length * 3 * N); s.sinT = new Float64Array(kv.length * 3 * N);
    s.Sr = new Float64Array(kv.length); s.Si = new Float64Array(kv.length);
    s.ndof = (par.rigid ? 6 : 9) * N - 3;
    return s;
  };

  W.lattice = function (s, rng) {
    // Sequential greedy placement: each molecule goes on a simple-cubic site with the lowest-energy of 60 random
    // orientations against the molecules already placed (bare Coulomb + LJ, minimum image).
    const { N, L, par } = s, m = Math.ceil(Math.cbrt(N)), a = L / m;
    const tmpl = W.template(par);
    const placed = [];
    let n = 0;
    for (let i = 0; i < m && n < N; i++) for (let j = 0; j < m && n < N; j++) for (let k = 0; k < m && n < N; k++, n++) {
      const cx = (i + 0.5) * a, cy = (j + 0.5) * a, cz = (k + 0.5) * a;
      let best = null, bestE = Infinity;
      for (let trial = 0; trial < 60; trial++) {
        const R = randRot(rng), sites = new Float64Array(9);
        for (let q = 0; q < 3; q++) {
          const x = tmpl[3 * q], y = tmpl[3 * q + 1], z = tmpl[3 * q + 2];
          sites[3 * q] = cx + R[0] * x + R[1] * y + R[2] * z;
          sites[3 * q + 1] = cy + R[3] * x + R[4] * y + R[5] * z;
          sites[3 * q + 2] = cz + R[6] * x + R[7] * y + R[8] * z;
        }
        let e = 0;
        for (const p of placed) e += pairEnergyBare(s, sites, p);
        if (e < bestE) { bestE = e; best = sites; }
      }
      placed.push(best);
      s.pos.set(best, 9 * n);
    }
    wrapMolecules(s);
  };

  /** Template geometry (O at the origin, molecule in the xy plane, centred on the centre of mass later by rotation). */
  W.template = function (par) {
    const h = 0.5 * par.theta * DEG;
    return Float64Array.from([0, 0, 0, par.rOH * Math.sin(h), par.rOH * Math.cos(h), 0, -par.rOH * Math.sin(h), par.rOH * Math.cos(h), 0]);
  };
  function randRot(rng) {   // uniform random rotation matrix from a random unit quaternion
    let a, b, c, d, n;
    do { a = rng.normal(); b = rng.normal(); c = rng.normal(); d = rng.normal(); n = a * a + b * b + c * c + d * d; } while (n < 1e-8);
    n = 1 / Math.sqrt(n); a *= n; b *= n; c *= n; d *= n;
    return [1 - 2 * (c * c + d * d), 2 * (b * c - a * d), 2 * (b * d + a * c),
      2 * (b * c + a * d), 1 - 2 * (b * b + d * d), 2 * (c * d - a * b),
      2 * (b * d - a * c), 2 * (c * d + a * b), 1 - 2 * (b * b + c * c)];
  }
  function pairEnergyBare(s, A, B) {
    const { L, par } = s, q = s.q;
    let ox = A[0] - B[0], oy = A[1] - B[1], oz = A[2] - B[2];
    const sx = L * Math.round(ox / L), sy = L * Math.round(oy / L), sz = L * Math.round(oz / L);
    let e = 0;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const dx = A[3 * a] - B[3 * b] - sx, dy = A[3 * a + 1] - B[3 * b + 1] - sy, dz = A[3 * a + 2] - B[3 * b + 2] - sz;
      const r2 = Math.max(0.64, dx * dx + dy * dy + dz * dz);
      e += KE * q[a] * q[b] / Math.sqrt(r2);
      if (a === 0 && b === 0) { const x6 = (par.sigma * par.sigma / r2) ** 3; e += 4 * par.eps * (x6 * x6 - x6); }
    }
    return e;
  }
  function wrapMolecules(s) {
    const { N, L, pos } = s;
    for (let m = 0; m < N; m++) {
      for (let k = 0; k < 3; k++) {
        const sh = L * Math.floor(pos[9 * m + k] / L);
        if (sh !== 0) for (let q = 0; q < 3; q++) pos[9 * m + 3 * q + k] -= sh;
      }
    }
  }

  // ------------------------------------------------------------------ forces
  /** Reciprocal-space Ewald sum: adds the forces, returns the energy. Uses stored cos/sin per (k, site). */
  function reciprocal(s) {
    const { N, L, pos, frc, q, kv, nmax, V, cosT, sinT, Sr, Si } = s, nS = 3 * N, tp = (2 * Math.PI) / L;
    // per-site 1D phases e^{i n 2π x/L}, n = 0..nmax, for the three axes
    const ec = [new Float64Array(nS * (nmax + 1)), new Float64Array(nS * (nmax + 1)), new Float64Array(nS * (nmax + 1))];
    const es = [new Float64Array(nS * (nmax + 1)), new Float64Array(nS * (nmax + 1)), new Float64Array(nS * (nmax + 1))];
    for (let site = 0; site < nS; site++) {
      const m = (site / 3) | 0, a = site - 3 * m, base = 9 * m + 3 * a;
      for (let ax = 0; ax < 3; ax++) {
        const ang = tp * pos[base + ax], c1 = Math.cos(ang), s1 = Math.sin(ang), o = site * (nmax + 1);
        ec[ax][o] = 1; es[ax][o] = 0;
        for (let n = 1; n <= nmax; n++) {
          ec[ax][o + n] = ec[ax][o + n - 1] * c1 - es[ax][o + n - 1] * s1;
          es[ax][o + n] = es[ax][o + n - 1] * c1 + ec[ax][o + n - 1] * s1;
        }
      }
    }
    const qs = new Float64Array(nS);
    for (let site = 0; site < nS; site++) qs[site] = q[site % 3];
    let E = 0;
    const pref = (4 * Math.PI * KE) / V;      // E = pref · Σ_half A|S|²
    for (let ik = 0; ik < kv.length; ik++) {
      const K = kv[ik], na = K[0], nb = K[1], nc = K[2], sb = nb < 0 ? -1 : 1, sc = nc < 0 ? -1 : 1, ab = Math.abs(nb), ac = Math.abs(nc);
      let sr = 0, si = 0;
      const o = ik * nS;
      for (let site = 0; site < nS; site++) {
        const oo = site * (nmax + 1);
        const xc = ec[0][oo + na], xs = es[0][oo + na];
        const yc = ec[1][oo + ab], ys = sb * es[1][oo + ab];
        const zc = ec[2][oo + ac], zs = sc * es[2][oo + ac];
        const xyc = xc * yc - xs * ys, xys = xs * yc + xc * ys;
        const cc = xyc * zc - xys * zs, ss = xys * zc + xyc * zs;
        cosT[o + site] = cc; sinT[o + site] = ss;
        sr += qs[site] * cc; si += qs[site] * ss;
      }
      Sr[ik] = sr; Si[ik] = si;
      E += pref * K[6] * (sr * sr + si * si);
    }
    // forces: F_i = (8π KE / V) q_i Σ_half A k (Sr sinθ − Si cosθ)
    const fpref = (8 * Math.PI * KE) / V;
    for (let ik = 0; ik < kv.length; ik++) {
      const K = kv[ik], A = fpref * K[6], sr = Sr[ik], si = Si[ik], o = ik * nS;
      for (let site = 0; site < nS; site++) {
        const m = (site / 3) | 0, a = site - 3 * m, base = 9 * m + 3 * a;
        const g = A * qs[site] * (sr * sinT[o + site] - si * cosT[o + site]);
        frc[base] += g * K[3]; frc[base + 1] += g * K[4]; frc[base + 2] += g * K[5];
      }
    }
    return E;
  }

  W.forces = function (s) {
    const { N, L, pos, frc, rc, q, par, tU, tF, tabK } = s;
    const dInv = tabK, dTab = 1 / tabK, hL = 0.5 * L;      // table spacing in r² and its inverse
    const rc2 = rc * rc, cut2 = (rc + 2.5) * (rc + 2.5), sig2 = par.sigma * par.sigma, eps4 = 4 * par.eps;
    const x6c = (sig2 / rc2) * (sig2 / rc2) * (sig2 / rc2), ljShift = eps4 * (x6c * x6c - x6c);
    frc.fill(0);
    let eP = 0, eLJ = 0, nLJ = 0;
    const qq = [KE * q[0] * q[0], KE * q[0] * q[1], KE * q[0] * q[2], KE * q[1] * q[0], KE * q[1] * q[1], KE * q[1] * q[2], KE * q[2] * q[0], KE * q[2] * q[1], KE * q[2] * q[2]];
    for (let i = 0; i < N - 1; i++) {
      const bi = 9 * i, oix = pos[bi], oiy = pos[bi + 1], oiz = pos[bi + 2];
      for (let j = i + 1; j < N; j++) {
        const bj = 9 * j;
        let dx0 = oix - pos[bj], dy0 = oiy - pos[bj + 1], dz0 = oiz - pos[bj + 2];
        if (dx0 > hL) dx0 -= L; else if (dx0 < -hL) dx0 += L;
        if (dy0 > hL) dy0 -= L; else if (dy0 < -hL) dy0 += L;
        if (dz0 > hL) dz0 -= L; else if (dz0 < -hL) dz0 += L;
        if (dx0 * dx0 + dy0 * dy0 + dz0 * dz0 > cut2) continue;
        for (let a = 0; a < 3; a++) {
          const ax = pos[bi + 3 * a], ay = pos[bi + 3 * a + 1], az = pos[bi + 3 * a + 2];
          for (let b = 0; b < 3; b++) {
            // minimum image of every site pair separately (valid for rc <= L/2, whatever the molecule size)
            let dx = ax - pos[bj + 3 * b], dy = ay - pos[bj + 3 * b + 1], dz = az - pos[bj + 3 * b + 2];
            if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
            if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
            if (dz > hL) dz -= L; else if (dz < -hL) dz += L;
            const r2 = dx * dx + dy * dy + dz * dz;
            if (r2 >= rc2) continue;
            // cubic Hermite interpolation of u(r²) from the tabulated values and slopes; the force is the exact
            // derivative of the interpolant, so energy and force are consistent (energy is conserved).
            const x = r2 * tabK, k = x | 0, t = x - k, t2 = t * t, t3 = t2 * t;
            const u0 = tU[k], u1 = tU[k + 1], m0 = -0.5 * tF[k] * dTab, m1 = -0.5 * tF[k + 1] * dTab;
            const u = (2 * t3 - 3 * t2 + 1) * u0 + (t3 - 2 * t2 + t) * m0 + (3 * t2 - 2 * t3) * u1 + (t3 - t2) * m1;
            const ff = (-2 * dInv) * ((6 * t2 - 6 * t) * (u0 - u1) + (3 * t2 - 4 * t + 1) * m0 + (3 * t2 - 2 * t) * m1);
            const c = qq[3 * a + b];
            eP += c * u;
            let fr = c * ff;                                    // F/r
            if (a === 0 && b === 0) {
              const i2 = sig2 / r2, x6 = i2 * i2 * i2;
              eLJ += eps4 * (x6 * x6 - x6) - ljShift; nLJ++;
              fr += (eps4 * (12 * x6 * x6 - 6 * x6)) / r2;
            }
            const fx = fr * dx, fy = fr * dy, fz = fr * dz;
            frc[bi + 3 * a] += fx; frc[bi + 3 * a + 1] += fy; frc[bi + 3 * a + 2] += fz;
            frc[bj + 3 * b] -= fx; frc[bj + 3 * b + 1] -= fy; frc[bj + 3 * b + 2] -= fz;
          }
        }
      }
    }
    // intramolecular exclusion correction: subtract qi qj erf(αr)/r for the 1-2 and 1-3 pairs of every molecule
    let eX = 0;
    const al = s.alpha, twoAlSqrtPi = (2 * al) / SQRTPI;
    for (let m = 0; m < N; m++) {
      const b = 9 * m;
      for (let a = 0; a < 3; a++) for (let c = a + 1; c < 3; c++) {
        const dx = pos[b + 3 * a] - pos[b + 3 * c], dy = pos[b + 3 * a + 1] - pos[b + 3 * c + 1], dz = pos[b + 3 * a + 2] - pos[b + 3 * c + 2];
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz), pre = qq[3 * a + c];
        eX -= (pre * erf(al * r)) / r;
        const fr = (pre * (twoAlSqrtPi * Math.exp(-al * al * r * r) / r - erf(al * r) / (r * r))) / r;   // −dU/dr / r
        frc[b + 3 * a] += fr * dx; frc[b + 3 * a + 1] += fr * dy; frc[b + 3 * a + 2] += fr * dz;
        frc[b + 3 * c] -= fr * dx; frc[b + 3 * c + 1] -= fr * dy; frc[b + 3 * c + 2] -= fr * dz;
      }
    }
    const eR = reciprocal(s);
    let eB = 0, eA = 0;
    if (!par.rigid) {
      const kb = par.kb, kt = par.ktheta, r0 = par.rOH, t0 = par.theta * DEG;
      for (let m = 0; m < N; m++) {
        const b = 9 * m;
        const v1 = [pos[b + 3] - pos[b], pos[b + 4] - pos[b + 1], pos[b + 5] - pos[b + 2]];
        const v2 = [pos[b + 6] - pos[b], pos[b + 7] - pos[b + 1], pos[b + 8] - pos[b + 2]];
        const r1 = Math.hypot(v1[0], v1[1], v1[2]), r2 = Math.hypot(v2[0], v2[1], v2[2]);
        const e1 = [v1[0] / r1, v1[1] / r1, v1[2] / r1], e2 = [v2[0] / r2, v2[1] / r2, v2[2] / r2];
        // bonds
        const f1 = -kb * (r1 - r0), f2 = -kb * (r2 - r0);
        eB += 0.5 * kb * ((r1 - r0) ** 2 + (r2 - r0) ** 2);
        for (let k = 0; k < 3; k++) {
          frc[b + 3 + k] += f1 * e1[k]; frc[b + k] -= f1 * e1[k];
          frc[b + 6 + k] += f2 * e2[k]; frc[b + k] -= f2 * e2[k];
        }
        // angle
        let cth = e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2];
        cth = Math.max(-0.999999, Math.min(0.999999, cth));
        const th = Math.acos(cth), sth = Math.sqrt(1 - cth * cth), dth = th - t0;
        eA += 0.5 * kt * dth * dth;
        const pref = (kt * dth) / sth;     // −dV/dcosθ = kt·dth / sinθ
        for (let k = 0; k < 3; k++) {
          const g1 = pref * (e2[k] - cth * e1[k]) / r1, g2 = pref * (e1[k] - cth * e2[k]) / r2;
          frc[b + 3 + k] += g1; frc[b + 6 + k] += g2; frc[b + k] -= g1 + g2;
        }
      }
    }
    s.nLJ = nLJ; s.ePair = eP; s.eLJ = eLJ; s.eIntra = eX; s.eRecip = eR; s.eBond = eB; s.eAngle = eA;
    return eP + eLJ + eX + eR + eB + eA + s.eSelf;
  };

  /** Total potential energy (kJ/mol): real + reciprocal + self + exclusion + LJ + bond + angle. */
  W.epot = (s) => s.ePair + s.eLJ + s.eIntra + s.eRecip + s.eBond + s.eAngle + s.eSelf;
  /** Potential energy without the intramolecular bond and angle terms (the intermolecular energy for a rigid model). */
  W.eInter = (s) => s.ePair + s.eLJ + s.eIntra + s.eRecip + s.eSelf;

  /**
   * Energy correction (kJ/mol, whole box) that turns the shifted, truncated O–O Lennard-Jones energy into the
   * unshifted one plus the analytic long-range tail: use it when comparing with experiment (e.g. ΔHvap).
   */
  W.eTail = function (s) {
    const { par, N, L, rc } = s, x3 = Math.pow(par.sigma / rc, 3), rho = N / L ** 3;
    const x6c = x3 * x3, ljShift = 4 * par.eps * (x6c * x6c - x6c);
    const tail = (8 / 3) * Math.PI * rho * par.eps * par.sigma ** 3 * (x3 * x3 * x3 / 3 - x3);
    return s.nLJ * ljShift + N * tail;
  };

  // ------------------------------------------------------------------ dynamics
  W.kinetic = function (s) {
    let k = 0; const v = s.vel;
    for (let m = 0; m < s.N; m++) for (let a = 0; a < 3; a++) {
      const b = 9 * m + 3 * a, ms = s.mass[a];
      k += ms * (v[b] * v[b] + v[b + 1] * v[b + 1] + v[b + 2] * v[b + 2]);
    }
    return 0.5 * k;
  };
  W.temperature = (s) => (2 * W.kinetic(s)) / (s.ndof * KB);

  W.initVelocities = function (s, T, rng) {
    for (let m = 0; m < s.N; m++) for (let a = 0; a < 3; a++) {
      const sd = Math.sqrt((KB * T) / s.mass[a]);
      for (let k = 0; k < 3; k++) s.vel[9 * m + 3 * a + k] = rng.normal(0, sd);
    }
    // remove net momentum, enforce constraints, rescale to exactly T
    const P = [0, 0, 0]; let M = 0;
    for (let m = 0; m < s.N; m++) for (let a = 0; a < 3; a++) { M += s.mass[a]; for (let k = 0; k < 3; k++) P[k] += s.mass[a] * s.vel[9 * m + 3 * a + k]; }
    for (let m = 0; m < s.N; m++) for (let a = 0; a < 3; a++) for (let k = 0; k < 3; k++) s.vel[9 * m + 3 * a + k] -= P[k] / M;
    if (s.par.rigid) rattleVel(s);
    const f = Math.sqrt(T / W.temperature(s));
    for (let i = 0; i < s.vel.length; i++) s.vel[i] *= f;
  };

  // SHAKE (positions) and RATTLE (velocities) for the three constraints of every molecule.
  const CONS = [[0, 1], [0, 2], [1, 2]];
  function shake(s, old, dt) {
    const { N, pos, vel, mass, par } = s, d = [par.rOH, par.rOH, s.dHH], tol = 1e-9;
    for (let m = 0; m < N; m++) {
      const b = 9 * m;
      for (let it = 0; it < 50; it++) {
        let done = true;
        for (let c = 0; c < 3; c++) {
          const i = CONS[c][0], j = CONS[c][1];
          const sx = pos[b + 3 * i] - pos[b + 3 * j], sy = pos[b + 3 * i + 1] - pos[b + 3 * j + 1], sz = pos[b + 3 * i + 2] - pos[b + 3 * j + 2];
          const diff = d[c] * d[c] - (sx * sx + sy * sy + sz * sz);
          if (Math.abs(diff) > tol * d[c] * d[c]) {
            done = false;
            const ox = old[b + 3 * i] - old[b + 3 * j], oy = old[b + 3 * i + 1] - old[b + 3 * j + 1], oz = old[b + 3 * i + 2] - old[b + 3 * j + 2];
            const g = diff / (2 * (1 / mass[i] + 1 / mass[j]) * (sx * ox + sy * oy + sz * oz));
            const gi = g / mass[i], gj = g / mass[j];
            pos[b + 3 * i] += gi * ox; pos[b + 3 * i + 1] += gi * oy; pos[b + 3 * i + 2] += gi * oz;
            pos[b + 3 * j] -= gj * ox; pos[b + 3 * j + 1] -= gj * oy; pos[b + 3 * j + 2] -= gj * oz;
            vel[b + 3 * i] += gi * ox / dt; vel[b + 3 * i + 1] += gi * oy / dt; vel[b + 3 * i + 2] += gi * oz / dt;
            vel[b + 3 * j] -= gj * ox / dt; vel[b + 3 * j + 1] -= gj * oy / dt; vel[b + 3 * j + 2] -= gj * oz / dt;
          }
        }
        if (done) break;
      }
    }
  }
  function rattleVel(s) {
    const { N, pos, vel, mass, par } = s, d = [par.rOH, par.rOH, s.dHH];
    for (let m = 0; m < N; m++) {
      const b = 9 * m;
      for (let it = 0; it < 50; it++) {
        let done = true;
        for (let c = 0; c < 3; c++) {
          const i = CONS[c][0], j = CONS[c][1];
          const sx = pos[b + 3 * i] - pos[b + 3 * j], sy = pos[b + 3 * i + 1] - pos[b + 3 * j + 1], sz = pos[b + 3 * i + 2] - pos[b + 3 * j + 2];
          const vx = vel[b + 3 * i] - vel[b + 3 * j], vy = vel[b + 3 * i + 1] - vel[b + 3 * j + 1], vz = vel[b + 3 * i + 2] - vel[b + 3 * j + 2];
          const dot = vx * sx + vy * sy + vz * sz;
          if (Math.abs(dot) > 1e-10 * d[c] * d[c]) {
            done = false;
            const k = dot / ((1 / mass[i] + 1 / mass[j]) * d[c] * d[c]);
            const ki = k / mass[i], kj = k / mass[j];
            vel[b + 3 * i] -= ki * sx; vel[b + 3 * i + 1] -= ki * sy; vel[b + 3 * i + 2] -= ki * sz;
            vel[b + 3 * j] += kj * sx; vel[b + 3 * j + 1] += kj * sy; vel[b + 3 * j + 2] += kj * sz;
          }
        }
        if (done) break;
      }
    }
  }

  /** Stochastic velocity rescaling (Bussi, Donadio, Parrinello 2007); tau in time units. */
  function csvr(s, dt, tau, T, rng) {
    const K = W.kinetic(s), Kbar = 0.5 * s.ndof * KB * T, c = Math.exp(-dt / tau);
    const r1 = rng.normal(), nm1 = s.ndof - 1;
    const sumR2 = nm1 + Math.sqrt(2 * nm1) * rng.normal();     // chi-square(ndof−1), Gaussian limit
    const Knew = c * K + ((1 - c) * Kbar / s.ndof) * (r1 * r1 + sumR2) + 2 * r1 * Math.sqrt((c * (1 - c) * Kbar * K) / s.ndof);
    const f = Math.sqrt(Math.max(Knew, 0) / K);
    for (let i = 0; i < s.vel.length; i++) s.vel[i] *= f;
  }

  /**
   * One velocity-Verlet step (RATTLE for rigid models) followed by the thermostat.
   * Options: o.T (K), o.tauPs (thermostat time, ps, 0 = off), o.dtScale, o.vmax (Å per time unit; clips velocities while relaxing).
   * Returns false if the energy became non-finite.
   */
  W.step = function (s, rng, o) {
    const dt = s.dt * (o.dtScale || 1), { pos, vel, frc, mass, N } = s;
    const half = 0.5 * dt, rigid = s.par.rigid;
    let old = null;
    if (rigid) { old = s._old || (s._old = new Float64Array(pos.length)); old.set(pos); }
    for (let m = 0; m < N; m++) for (let a = 0; a < 3; a++) {
      const im = 1 / mass[a], b = 9 * m + 3 * a;
      for (let k = 0; k < 3; k++) { vel[b + k] += half * frc[b + k] * im; }
    }
    if (o.vmax) for (let i = 0; i < vel.length; i++) { if (vel[i] > o.vmax) vel[i] = o.vmax; else if (vel[i] < -o.vmax) vel[i] = -o.vmax; }
    for (let i = 0; i < pos.length; i++) pos[i] += dt * vel[i];
    if (rigid) shake(s, old, dt);
    wrapMolecules(s);
    const e = W.forces(s);
    for (let m = 0; m < N; m++) for (let a = 0; a < 3; a++) {
      const im = 1 / mass[a], b = 9 * m + 3 * a;
      for (let k = 0; k < 3; k++) vel[b + k] += half * frc[b + k] * im;
    }
    if (rigid) rattleVel(s);
    if (o.tauPs > 0) csvr(s, dt, (o.tauPs * 1000) / TU_FS, o.T, rng);
    s.step++; s.time += dt;
    return isFinite(e) && Math.abs(e) < 1e12;
  };

  /** Relax a freshly built lattice: small steps, clipped velocities, strong thermostat. */
  W.relaxStep = function (s, rng, T, i, nSteps) {
    if (i === 0) W.forces(s);
    const ramp = Math.min(1, (i + 1) / (0.5 * nSteps));
    return W.step(s, rng, { T, tauPs: 0.02, dtScale: 0.1 + 0.9 * ramp * ramp, vmax: 0.4 + 6 * ramp });
  };
  W.relax = function (s, rng, T, nSteps) {
    for (let i = 0; i < nSteps; i++) if (!W.relaxStep(s, rng, T, i, nSteps)) return false;
    return true;
  };

  // ------------------------------------------------------------------ observables
  /** Molecular dipole (Debye) averaged over molecules. */
  W.meanDipole = function (s) {
    let sum = 0;
    for (let m = 0; m < s.N; m++) {
      let x = 0, y = 0, z = 0;
      for (let a = 0; a < 3; a++) { x += s.q[a] * s.pos[9 * m + 3 * a]; y += s.q[a] * s.pos[9 * m + 3 * a + 1]; z += s.q[a] * s.pos[9 * m + 3 * a + 2]; }
      sum += Math.hypot(x, y, z);
    }
    return (sum / s.N) * DEBYE;
  };
  /** Total box dipole (e·Å) — used for the dielectric constant. */
  W.boxDipole = function (s) {
    const D = [0, 0, 0];
    for (let m = 0; m < s.N; m++) for (let a = 0; a < 3; a++) for (let k = 0; k < 3; k++) D[k] += s.q[a] * s.pos[9 * m + 3 * a + k];
    return D;
  };

  /** O–O pair histogram, g(r) normalised like the LJ module. */
  W.rdfOO = function (nbins, rmax) {
    const acc = { nbins, rmax, dr: rmax / nbins, counts: new Float64Array(nbins), frames: 0, N: 0, L: 0 };
    acc.add = (s) => {
      const { N, L, pos } = s, hL = 0.5 * L, r2max = rmax * rmax;
      for (let i = 0; i < N - 1; i++) for (let j = i + 1; j < N; j++) {
        let dx = pos[9 * i] - pos[9 * j]; if (dx > hL) dx -= L; else if (dx < -hL) dx += L;
        let dy = pos[9 * i + 1] - pos[9 * j + 1]; if (dy > hL) dy -= L; else if (dy < -hL) dy += L;
        let dz = pos[9 * i + 2] - pos[9 * j + 2]; if (dz > hL) dz -= L; else if (dz < -hL) dz += L;
        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 < r2max) acc.counts[Math.floor(Math.sqrt(r2) / acc.dr)] += 2;
      }
      acc.frames++; acc.N = N; acc.L = L;
    };
    acc.result = () => {
      const r = [], g = [], rho = acc.N / acc.L ** 3;
      for (let k = 0; k < nbins; k++) {
        const r1 = k * acc.dr, r2 = r1 + acc.dr, shell = (4 / 3) * Math.PI * (r2 ** 3 - r1 ** 3);
        r.push(r1 + 0.5 * acc.dr);
        g.push(acc.frames ? acc.counts[k] / (acc.frames * acc.N * rho * shell) : 0);
      }
      return { r, g };
    };
    acc.reset = () => { acc.counts.fill(0); acc.frames = 0; };
    return acc;
  };

  /** Mean number of hydrogen bonds per molecule (O···O < 3.5 Å and H–O···O angle < 30°). */
  W.hbonds = function (s) {
    const { N, L, pos } = s, cosMin = Math.cos(30 * DEG), r2max = 3.5 * 3.5;
    let n = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (i === j) continue;
      let dx = pos[9 * j] - pos[9 * i], dy = pos[9 * j + 1] - pos[9 * i + 1], dz = pos[9 * j + 2] - pos[9 * i + 2];
      dx -= L * Math.round(dx / L); dy -= L * Math.round(dy / L); dz -= L * Math.round(dz / L);
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 > r2max) continue;
      const r = Math.sqrt(r2);
      for (let h = 1; h <= 2; h++) {
        const hx = pos[9 * i + 3 * h] - pos[9 * i], hy = pos[9 * i + 3 * h + 1] - pos[9 * i + 1], hz = pos[9 * i + 3 * h + 2] - pos[9 * i + 2];
        const hn = Math.hypot(hx, hy, hz);
        if ((hx * dx + hy * dy + hz * dz) / (hn * r) > cosMin) n++;
      }
    }
    return n / N;
  };

  /** Follows unwrapped oxygen positions (for the MSD). */
  W.tracker = function (s) {
    const n = s.N, t = { unw: new Float64Array(3 * n), last: new Float64Array(3 * n), ref: new Float64Array(3 * n) };
    const grab = (dst) => { for (let m = 0; m < n; m++) for (let k = 0; k < 3; k++) dst[3 * m + k] = s.pos[9 * m + k]; };
    grab(t.unw); grab(t.last); t.ref.set(t.unw);
    t.update = () => {
      const L = s.L, hL = 0.5 * L;
      for (let m = 0; m < n; m++) for (let k = 0; k < 3; k++) {
        let d = s.pos[9 * m + k] - t.last[3 * m + k];
        if (d > hL) d -= L; else if (d < -hL) d += L;
        t.unw[3 * m + k] += d; t.last[3 * m + k] = s.pos[9 * m + k];
      }
    };
    t.msd = () => { let m = 0; for (let i = 0; i < t.unw.length; i++) m += (t.unw[i] - t.ref[i]) ** 2; return m / n; };
    t.resetRef = () => t.ref.set(t.unw);
    return t;
  };
})();
