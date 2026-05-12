import numpy as np

k_B = 1.0


def velocity_verlet_step(x_curr, v_curr, mass, dt, force_func, **force_args):
    """
    One step of the Velocity Verlet algorithm in 1D (NVE).

    Args:
        x_curr: Current position.
        v_curr: Current velocity.
        mass: Mass of the particle.
        dt: Time step.
        force_func: Function f(x, **kwargs) returning the force.
        **force_args: Extra arguments for force_func.

    Returns:
        (x_new, v_new)
    """
    f_curr = force_func(x_curr, **force_args)
    a_curr = f_curr / mass

    v_half = v_curr + 0.5 * a_curr * dt
    x_new = x_curr + v_half * dt

    f_new = force_func(x_new, **force_args)
    a_new = f_new / mass

    v_new = v_half + 0.5 * a_new * dt

    return x_new, v_new


def velocity_verlet_langevin(x_curr, v_curr, mass, dt, gamma, target_temp,
                             force_func, **force_args):
    """
    One step of Langevin dynamics (BAOAB) in 1D (NVT).

    Args:
        x_curr: Current position.
        v_curr: Current velocity.
        mass: Mass of the particle.
        dt: Time step.
        gamma: Friction coefficient.
        target_temp: Target temperature (kB=1).
        force_func: Function f(x, **kwargs) returning the force.
        **force_args: Extra arguments for force_func.

    Returns:
        (x_new, v_new)
    """
    f_curr = force_func(x_curr, **force_args)
    v_half_b = v_curr + (f_curr / mass) * (dt / 2.0)

    x_half_a = x_curr + v_half_b * (dt / 2.0)

    c1 = np.exp(-gamma * dt)
    c2 = np.sqrt(k_B * max(0, target_temp) * (1.0 - c1**2) / mass)
    random_kick = np.random.normal(0, 1)
    v_half_o = c1 * v_half_b + c2 * random_kick

    x_new = x_half_a + v_half_o * (dt / 2.0)

    f_new = force_func(x_new, **force_args)
    v_new = v_half_o + (f_new / mass) * (dt / 2.0)

    return x_new, v_new
