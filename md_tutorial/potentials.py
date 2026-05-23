from typing import Union
import numpy as np


def potential_sh(
    x: Union[float, np.ndarray],
    k: float
) -> Union[float, np.ndarray]:
    """
    Potential energy of a simple harmonic oscillator.

    Formula: V(x) = 0.5 * k * x^2

    Args:
        x: Position of the particle (scalar or array).
        k: Force constant (spring stiffness). Controls the curvature of the well.

    Returns:
        Potential energy at position(s) x.
    """
    return 0.5 * k * x**2


def force_sh(
    x: Union[float, np.ndarray],
    k: float
) -> Union[float, np.ndarray]:
    """
    Analytical force from a simple harmonic potential.

    Formula: F(x) = -dV/dx = -k * x

    Args:
        x: Position of the particle (scalar or array).
        k: Force constant (spring stiffness).

    Returns:
        Force acting on the particle at position(s) x.
    """
    return -k * x


def potential_dw(
    x: Union[float, np.ndarray],
    a: float,
    b: float
) -> Union[float, np.ndarray]:
    """
    Potential energy of a symmetric double-well potential.

    Formula: V(x) = a * x^4 - b * x^2

    The double-well potential has two energy minima separated by a central barrier.
    - Minima are located at x = ±sqrt(b / 2a).
    - The central barrier height is ΔV = b^2 / 4a.

    Args:
        x: Position of the particle (scalar or array).
        a: Coefficient of the quartic (x^4) repulsive term (a > 0).
           Higher 'a' makes the outer walls steeper and barrier lower/narrower.
        b: Coefficient of the quadratic (x^2) attractive term (b > 0).
           Higher 'b' increases the barrier height and moves the minima further apart.

    Returns:
        Potential energy at position(s) x.
    """
    return a * x**4 - b * x**2


def force_dw(
    x: Union[float, np.ndarray],
    a: float,
    b: float
) -> Union[float, np.ndarray]:
    """
    Analytical force from a symmetric double-well potential.

    Formula: F(x) = -dV/dx = -4 * a * x^3 + 2 * b * x

    Args:
        x: Position of the particle (scalar or array).
        a: Coefficient of the quartic term (a > 0).
        b: Coefficient of the quadratic term (b > 0).

    Returns:
        Force acting on the particle at position(s) x.
    """
    return -4 * a * x**3 + 2 * b * x

