
import json
import os

def fix_notebook(filepath):
    print(f"Processing {filepath}...")
    try:
        with open(filepath, 'r') as f:
            nb = json.load(f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    file_changed = False
    
    for cell in nb.get('cells', []):
        if cell.get('cell_type') != 'markdown':
            continue
            
        source_list = cell.get('source', [])
        new_source_list = []
        cell_changed = False
        
        for line in source_list:
            if "$au$" in line:
                print(f"  Found error in line: {line.strip()}")
                # Replace $au$ with $\tau$
                # In the JSON string, we want \tau.
                # In Python string in memory, we want \tau.
                new_line = line.replace("$au$", r"$\tau$")
                print(f"  Fixed line: {new_line.strip()}")
                new_source_list.append(new_line)
                cell_changed = True
            else:
                new_source_list.append(line)
        
        if cell_changed:
            cell['source'] = new_source_list
            file_changed = True

    if file_changed:
        print(f"  Saving changes to {filepath}")
        with open(filepath, 'w') as f:
            json.dump(nb, f, indent=1)
            f.write('\n')
    else:
        print(f"  No changes needed for {filepath}")

if __name__ == "__main__":
    fix_notebook('/home/s7saha/work/md_tutorial/md_notebook_site_test/notebooks/7_meta_dynamics.ipynb')
