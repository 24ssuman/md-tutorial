import numpy as np
from ase import Atoms, units
from ase.vibrations import Vibrations
from water_ase import Water3Site, MODELS

par = MODELS["spcfw"]
h = np.radians(par["theta"]) / 2
mol = Atoms("OHH", positions=[[0, 0, 0],
                              [par["rOH"] * np.sin(h), par["rOH"] * np.cos(h), 0],
                              [-par["rOH"] * np.sin(h), par["rOH"] * np.cos(h), 0]],
            cell=[24, 24, 24], pbc=True)
mol.center()
mol.calc = Water3Site("spcfw")
print(f"energy of the relaxed geometry: {mol.get_potential_energy():.6f} eV (bonded part = {mol.calc.parts['bond'] + mol.calc.parts['angle']:.6f} eV)")
vib = Vibrations(mol, name="tmp_vib", delta=0.01)
vib.run()
freqs = vib.get_frequencies()
for i, f in enumerate(freqs):
    print(f"mode {i}: {f.real:9.1f} cm^-1" if abs(f.imag) < 1e-6 else f"mode {i}: {f.imag:9.1f}i cm^-1")
vib.clean()
