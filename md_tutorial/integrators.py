from typing import Tuple, Callable, Any, Union
import numpy as np

k_B = 1.0


def velocity_verlet_step(
    x_curr: Union[float, np.ndarray],
    v_curr: Union[float, np.ndarray],
    mass: float,
    dt: float,
    force_func: Callable[..., Union[float, np.ndarray]],
    **force_args: Any
) -> Tuple[Union[float, np.ndarray], Union[float, np.ndarray]]:
    """
    One step of the Velocity Verlet algorithm in 1D (NVE ensemble).

    This integrates Newton's equations of motion (deterministic, constant energy).

    Steps:
        1. Half-step velocity update: v(t + dt/2) = v(t) + 0.5 * a(t) * dt
        2. Full-step position update: x(t + dt) = x(t) + v(t + dt/2) * dt
        3. Recalculate forces/acceleration at x(t + dt)
        4. Half-step velocity update: v(t + dt) = v(t + dt/2) + 0.5 * a(t + dt) * dt

    Args:
        x_curr: Current position(s).
        v_curr: Current velocity(ies).
        mass: Mass of the particle.
        dt: Time step.
        force_func: Function f(x, **kwargs) returning the force.
        **force_args: Extra arguments passed to force_func.

    Returns:
        (x_new, v_new) - Updated position and velocity.
    """
    f_curr = force_func(x_curr, **force_args)
    a_curr = f_curr / mass

    v_half = v_curr + 0.5 * a_curr * dt
    x_new = x_curr + v_half * dt

    f_new = force_func(x_new, **force_args)
    a_new = f_new / mass

    v_new = v_half + 0.5 * a_new * dt

    return x_new, v_new


def velocity_verlet_langevin(
    x_curr: Union[float, np.ndarray],
    v_curr: Union[float, np.ndarray],
    mass: float,
    dt: float,
    gamma: float,
    target_temp: float,
    force_func: Callable[..., Union[float, np.ndarray]],
    **force_args: Any
) -> Tuple[Union[float, np.ndarray], Union[float, np.ndarray]]:
    """
    One step of Langevin dynamics using the symmetric BAOAB splitting scheme (NVT ensemble).

    Langevin dynamics models a system in contact with a heat bath. It adds a friction
    force and a stochastic random thermal noise force to maintain a target temperature.

    The BAOAB scheme is highly stable and gives exceptional accuracy for configuration
    sampling (positions) even at relatively large time steps.

    The splitting steps are:
        - B: Half-step update of velocity (deterministic force)
        - A: Half-step update of position (using velocity)
        - O: Thermostat step - exact solution to the Ornstein-Uhlenbeck process (friction + noise)
        - A: Half-step update of position (using new velocity)
        - B: Half-step update of velocity (deterministic force)

    Args:
        x_curr: Current position(s).
        v_curr: Current velocity(ies).
        mass: Mass of the particle.
        dt: Time step.
        gamma: Friction coefficient (coupling strength to thermostat).
        target_temp: Target temperature (kB = 1).
        force_func: Function f(x, **kwargs) returning the force.
        **force_args: Extra arguments passed to force_func.

    Returns:
        (x_new, v_new) - Updated position and velocity.
    """
    # Step B (Half-kick): Update velocity with physical force for dt/2
    f_curr = force_func(x_curr, **force_args)
    v_half_b = v_curr + (f_curr / mass) * (dt / 2.0)

    # Step A (Half-drift): Update position for dt/2
    x_half_a = x_curr + v_half_b * (dt / 2.0)

    # Step O (Thermostat/Fluctuation-Dissipation):
    # exact solution of the stochastic part over dt
    c1 = np.exp(-gamma * dt)
    c2 = np.sqrt(k_B * max(0.0, target_temp) * (1.0 - c1**2) / mass)
    random_kick = np.random.normal(0.0, 1.0, size=np.shape(v_curr))
    v_half_o = c1 * v_half_b + c2 * random_kick

    # Step A (Half-drift): Update position for another dt/2
    x_new = x_half_a + v_half_o * (dt / 2.0)

    # Step B (Half-kick): Update velocity with new force for dt/2
    f_new = force_func(x_new, **force_args)
    v_new = v_half_o + (f_new / mass) * (dt / 2.0)

    return x_new, v_new

