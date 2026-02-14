import glob
import json
import re
import os

def check_file(filepath):
    with open(filepath, 'r') as f:
        try:
            nb = json.load(f)
        except:
            print(f"Skipping {filepath} (not json)")
            return

    file_errors = False
    for i, cell in enumerate(nb.get('cells', [])):
        if cell['cell_type'] != 'markdown':
            continue
        
        source = "".join(cell['source'])
        
        # Regex to find $...$ blocks
        # (?<!\\) : Not preceded by backslash
        # (?<!\$) : Not preceded by dollar (avoids $$)
        # \$ : The opening dollar
        # (?!\$) : Not followed by dollar (avoids $$)
        # (.*?) : Content (non-greedy)
        # (?<!\\) : Not preceded by backslash
        # (?<!\$) : Not preceded by dollar
        # \$ : The closing dollar
        # (?!\$) : Not followed by dollar
        
        # Note: This is a single-line regex. It might miss multi-line inline math if that exists, 
        # but inline math with spaces is usually on one line.
        
        matches = re.finditer(r'(?<!\\)(?<!\$)\$(?!\$)(.*?)(?<!\\)(?<!\$)\$(?!\$)', source)
        
        for m in matches:
            content = m.group(1)
            full_match = m.group(0)
            
            if not content:
                continue

            # Check for errors: Whitespace at start or end
            if content[0].isspace() or content[-1].isspace():
                # Heuristic to report
                if not file_errors:
                    print(f"File: {filepath}")
                    file_errors = True
                print(f"  Cell {i}: Error in '{full_match}'")

def main():
    notebooks_dir = '/home/s7saha/work/md_tutorial/md_notebook_site_test/notebooks'
    notebooks = glob.glob(os.path.join(notebooks_dir, '*.ipynb'))
    
    print(f"Scanning {len(notebooks)} notebooks for inline math errors...")
    for nb in notebooks:
        check_file(nb)
    print("Scan complete.")

if __name__ == '__main__':
    main()
