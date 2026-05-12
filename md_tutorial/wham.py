import numpy as np
import warnings


def run_wham(N_ij, n_i, u_ij, max_iter=20000, tol=1e-8):
    """
    Perform the iterative WHAM calculation.

    Args:
        N_ij: Counts matrix (n_windows x n_bins).
        n_i: Total samples per window (n_windows,).
        u_ij: Reduced bias energies beta * w_i(x_j) (n_windows x n_bins).
        max_iter: Maximum iterations.
        tol: Convergence tolerance on free energy offsets f_i.

    Returns:
        (P_j, f_i, delta_f_hist)
        P_j: Unbiased bin probabilities (n_bins,), sum to 1.
        f_i: Window free energy offsets (n_windows,), f_0 = 0.
        delta_f_hist: Array of max |Δf| per iteration.
    """
    N_ij = np.asarray(N_ij, dtype=float)
    n_i = np.asarray(n_i, dtype=float)
    u_ij = np.asarray(u_ij, dtype=float)

    n_win, n_bins = N_ij.shape

    f_i = np.zeros(n_win)
    P_j = np.sum(N_ij, axis=0)
    if np.sum(P_j) <= 0:
        raise ValueError("No counts in any bin.")
    P_j /= np.sum(P_j)

    delta_hist = []

    for it in range(max_iter):
        f_old = f_i.copy()

        denom = np.sum(n_i[:, None] * np.exp(f_i[:, None] - u_ij), axis=0)
        numer = np.sum(N_ij, axis=0)

        P_new = np.zeros_like(P_j)
        ok = denom > 1e-300
        P_new[ok] = numer[ok] / denom[ok]

        s = np.sum(P_new)
        if s <= 0:
            raise RuntimeError(
                "WHAM collapsed: sum(P_new) <= 0 (likely zero overlap)."
            )
        P_j = P_new / s

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", category=RuntimeWarning)
            Z_i = np.sum(P_j[None, :] * np.exp(-u_ij), axis=1)
            f_i = -np.log(Z_i)

        f_i -= f_i[0]

        delta = float(np.max(np.abs(f_i - f_old)))
        delta_hist.append(delta)
        if delta < tol:
            break

    return P_j, f_i, np.array(delta_hist)
