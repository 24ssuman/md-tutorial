
import json
import glob
import re
import os

def fix_content(source):
    # Regex to find $...$ blocks and capture content
    # Look for $ not preceded by \ or $ and not followed by $
    pattern = r'(?<!\\)(?<!\$)\$(?!\$)(.*?)(?<!\\)(?<!\$)\$(?!\$)'
    
    def replacer(match):
        content = match.group(1)
        # Strip leading/trailing whitespace
        cleaned_content = content.strip()
        return f"${cleaned_content}$"

    # Use DOTALL so . matches newlines if math spans multiple lines (though inline math usually doesn't, but let's be safe)
    # However, inline math in markdown usually shouldn't span multiple lines?
    # Actually, let's assume inline math is on one line or handled correctly by DOTALL.
    # But wait, if I use DOTALL, .*? might be too greedy if I have multiple $ pairs on different lines.
    # The regex `.*?` is non-greedy, so it should stop at the first closing $. 
    # But if I have `$ math $ text $ math $`, it will match `$ math $` correctly.
    # If I have `$ math \n $`, DOTALL handles it.
    
    return re.sub(pattern, replacer, source, flags=re.DOTALL)

def fix_notebook(filepath):
    print(f"Processing {filepath}...")
    try:
        with open(filepath, 'r') as f:
            nb = json.load(f)
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    file_changed = False
    
    # Iterate through cells
    for i, cell in enumerate(nb.get('cells', [])):
        if cell.get('cell_type') != 'markdown':
            continue
            
        source_list = cell.get('source', [])
        if not source_list:
            continue
            
        # Join source lines to process as a single string
        original_source = "".join(source_list)
        
        # Apply fix
        new_source = fix_content(original_source)
        
        if new_source != original_source:
            print(f"  Fixing formatting in cell {i}")
            # Split back into lines, preserving line endings if possible.
            # Jupyter typically uses \n at end of strings in the list.
            # splitlines(keepends=True) does exactly this.
            new_lines = new_source.splitlines(keepends=True)
            cell['source'] = new_lines
            file_changed = True

    if file_changed:
        print(f"  Saving changes to {filepath}")
        with open(filepath, 'w') as f:
            # Use indent=1 to match existing style
            json.dump(nb, f, indent=1)
            # Add a trailing newline as textual files usually have
            f.write('\n')
    else:
        print(f"  No changes needed for {filepath}")

def main():
    notebooks_dir = '/home/s7saha/work/md_tutorial/md_notebook_site_test/notebooks'
    notebooks = glob.glob(os.path.join(notebooks_dir, '*.ipynb'))
    
    if not notebooks:
        print(f"No notebooks found in {notebooks_dir}")
        return

    print(f"Found {len(notebooks)} notebooks. Checking for math formatting errors...")
    for nb in notebooks:
        fix_notebook(nb)
    print("Done.")

if __name__ == "__main__":
    main()
