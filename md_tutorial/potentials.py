import numpy as np


def potential_sh(x, k):
    """Potential energy of a simple harmonic oscillator: V(x) = 0.5 * k * x^2."""
    return 0.5 * k * x**2


def force_sh(x, k):
    """Force from a simple harmonic potential: F(x) = -dV/dx = -k * x."""
    return -k * x


def potential_dw(x, a, b):
    """Potential energy of a double-well: V(x) = a * x^4 - b * x^2."""
    return a * x**4 - b * x**2


def force_dw(x, a, b):
    """Force from a double-well potential: F(x) = -dV/dx = -4a*x^3 + 2b*x."""
    return -4 * a * x**3 + 2 * b * x
