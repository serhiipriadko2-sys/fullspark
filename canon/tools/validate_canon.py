import os
import re
import sys

# Configuration
CANON_DIR = os.path.join(os.path.dirname(__file__), "../alfawork_synced/CURRENT_SOT_FLAT19")
INDEX_FILE = "00_INDEX_AND_ROUTING.md"

def get_markdown_files(directory):
    return [f for f in os.listdir(directory) if f.endswith(".md")]

def check_file_structure(filepath, filename):
    errors = []
    warnings = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return [f"Could not read file: {e}"], []

    # Check 1: P0 Keywords
    if not re.search(r"^## P0: Keywords", content, re.MULTILINE):
        errors.append(f"{filename}: Missing '## P0: Keywords' block")

    # Check 2: P0 Router
    if not re.search(r"^## P0: Router", content, re.MULTILINE):
        # 00_INDEX might technically have it, but let's enforce it for content files mainly
        # Actually 00_INDEX has it too in the example.
        errors.append(f"{filename}: Missing '## P0: Router' block")

    # Check 3: Forbidden Terms (HUNDUN spelling)
    if "HUYNDUN" in content:
        errors.append(f"{filename}: Contains forbidden spelling 'HUYNDUN'. Use 'HUNDUN'.")

    return errors, warnings

def validate_index_consistency(files):
    errors = []
    if INDEX_FILE not in files:
        return [f"Missing Index File: {INDEX_FILE}"]

    index_path = os.path.join(CANON_DIR, INDEX_FILE)
    try:
        with open(index_path, 'r', encoding='utf-8') as f:
            index_content = f.read()
    except Exception as e:
        return [f"Could not read index file: {e}"]

    for filename in files:
        if filename == INDEX_FILE:
            continue
        if filename not in index_content:
            errors.append(f"File {filename} exists but is not referenced in {INDEX_FILE}")

    return errors

def main():
    print(f"Validating Canon in: {os.path.abspath(CANON_DIR)}")

    if not os.path.exists(CANON_DIR):
        print(f"Error: Directory not found: {CANON_DIR}")
        sys.exit(1)

    files = get_markdown_files(CANON_DIR)
    all_errors = []

    # 1. Validate individual files
    for filename in files:
        filepath = os.path.join(CANON_DIR, filename)
        f_errors, f_warnings = check_file_structure(filepath, filename)
        all_errors.extend(f_errors)
        for w in f_warnings:
            print(f"WARN: {w}")

    # 2. Validate Index consistency
    index_errors = validate_index_consistency(files)
    all_errors.extend(index_errors)

    if all_errors:
        print("\n=== VALIDATION FAILED ===")
        for e in all_errors:
            print(f"[ERROR] {e}")
        sys.exit(1)
    else:
        print("\n=== VALIDATION SUCCESS ===")
        print(f"Checked {len(files)} files. Structure is valid.")
        sys.exit(0)

if __name__ == "__main__":
    main()
