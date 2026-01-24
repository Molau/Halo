#!/usr/bin/env python3
"""
i18n Key Consolidation Script
==============================

Consolidates i18n keys by:
1. Removing old key(s) from strings_de.json and strings_en.json (optional)
2. Adding new key to strings_de.json and strings_en.json (optional)
3. Replacing all code references to old key with new key (always)

Usage:
    Full consolidation (remove old keys, add new key, replace code):
        python scripts/consolidate_i18n_key.py --old-keys "active_label,table_active" --new-key "common.active" --value-de "Aktiv" --value-en "Active"
    
    Code-only replacement (key already exists in JSON):
        python scripts/consolidate_i18n_key.py --old-keys "add_title" --new-key "observers.add_title"
"""

import json
import re
import sys
import argparse
from pathlib import Path
from collections import defaultdict


def load_json_with_formatting(filepath):
    """Load JSON file while preserving formatting."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        data = json.loads(content)
    return content, data


def save_json_with_formatting(filepath, content, modifications):
    """
    Apply modifications to JSON content while preserving formatting.
    
    Args:
        filepath: Path to JSON file
        content: Original file content as string
        modifications: List of (action, key, value) tuples
                      action: 'add' or 'remove'
                      key: dot-notation key (e.g., 'common.active')
                      value: value for 'add' action (ignored for 'remove')
    """
    lines = content.split('\n')
    
    for action, key, value in modifications:
        if action == 'remove':
            # Find and remove the line containing this key
            key_name = key.split('.')[-1]  # Get last part (e.g., 'active_label')
            pattern = rf'^\s*"{key_name}":\s*".*",?\s*$'
            
            new_lines = []
            removed_line_idx = None
            for i, line in enumerate(lines):
                if re.match(pattern, line):
                    print(f"  Removing line {i+1}: {line.strip()}")
                    removed_line_idx = i
                    continue  # Skip this line
                new_lines.append(line)
            
            # Fix comma on previous line if needed
            if removed_line_idx is not None and removed_line_idx > 0:
                prev_idx = removed_line_idx - 1
                # Check if the line we removed had a comma, and if the next line doesn't need one
                if prev_idx < len(new_lines):
                    prev_line = new_lines[prev_idx]
                    # If previous line ends with comma and next line is closing brace, remove comma
                    if prev_line.rstrip().endswith(','):
                        next_idx = removed_line_idx
                        if next_idx < len(new_lines):
                            next_line = new_lines[next_idx].strip()
                            if next_line.startswith('}'):
                                new_lines[prev_idx] = prev_line.rstrip()[:-1] + '\n'
                                print(f"  Fixed comma on line {prev_idx+1}")
            
            lines = new_lines
            
        elif action == 'add':
            # Find the right section and add the key
            parts = key.split('.')
            if len(parts) == 2:
                section, key_name = parts
                # Find the section
                section_pattern = rf'^\s*"{section}":\s*\{{\s*$'
                
                for i, line in enumerate(lines):
                    if re.match(section_pattern, line):
                        # Found the section, add the key after the opening brace
                        indent = '    '
                        new_line = f'{indent}"{key_name}": "{value}"'
                        # Check if there are more keys in this section
                        if i + 1 < len(lines) and '"' in lines[i + 1]:
                            new_line += ','
                        lines.insert(i + 1, new_line)
                        print(f"  Adding to section '{section}': {new_line}")
                        break
    
    # Write back
    with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))
    
    print(f"✓ Updated {filepath}")


def replace_in_file(filepath, old_pattern, new_text, line_numbers=None):
    """
    Replace text in a file at specific line numbers or everywhere.
    
    Args:
        filepath: Path to file
        old_pattern: Text pattern to find (can be regex)
        new_text: Replacement text
        line_numbers: List of line numbers (1-indexed) to restrict replacement, or None for all
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    replacements = 0
    for i, line in enumerate(lines):
        line_num = i + 1
        if line_numbers is None or line_num in line_numbers:
            if old_pattern in line:
                lines[i] = line.replace(old_pattern, new_text)
                replacements += 1
                print(f"  Line {line_num}: {old_pattern} → {new_text}")
            else:
                # Debug: show what we searched for and what was in the line
                if line_numbers and line_num in line_numbers:
                    print(f"  Line {line_num}: Pattern '{old_pattern}' not found in: {line.strip()[:100]}")
    
    if replacements > 0:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.writelines(lines)
        print(f"✓ Updated {filepath} ({replacements} replacements)")
    else:
        print(f"⚠ No replacements in {filepath}")
    
    return replacements


def get_code_references(audit_csv, key):
    """Get all code references for a specific key from audit CSV."""
    import csv
    references = defaultdict(list)
    
    with open(audit_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['key'] == key:
                file_path = row['file']
                line_num = int(row['line'])
                references[file_path].append(line_num)
    
    return references


def consolidate_key(old_keys, new_key, new_value_de, new_value_en):
    """Consolidate i18n keys with provided parameters."""
    print("=" * 80)
    print("i18n Key Consolidation")
    print("=" * 80)
    print(f"Old keys to remove: {', '.join(old_keys) if old_keys else '(none)'}")
    print(f"New key to add: {new_key}")
    print(f"Value DE: {new_value_de if new_value_de is not None else '(not provided - code-only mode)'}")
    print(f"Value EN: {new_value_en if new_value_en is not None else '(not provided - code-only mode)'}")
    print()
    
    base_dir = Path(__file__).parent.parent
    strings_de = base_dir / "resources" / "strings_de.json"
    strings_en = base_dir / "resources" / "strings_en.json"
    audit_csv = base_dir / "temp" / "i18n_audit_20260119_091354.csv"
    
    # Check if we need to modify JSON files
    # Only modify if values are provided (not None)
    modify_json = new_value_de is not None and new_value_en is not None
    
    if modify_json:
        print("=" * 80)
        print("STEP 1: Modify strings_de.json")
        print("=" * 80)
        
        # Load German strings
        content_de, data_de = load_json_with_formatting(strings_de)
        
        # Prepare modifications
        mods_de = []
        for old_key in old_keys:
            if old_key:  # Skip empty keys
                mods_de.append(('remove', old_key, None))
        if new_key:
            mods_de.append(('add', new_key, new_value_de))
        
        if mods_de:
            save_json_with_formatting(strings_de, content_de, mods_de)
        else:
            print("  No modifications needed")
        
        print()
        print("=" * 80)
        print("STEP 2: Modify strings_en.json")
        print("=" * 80)
        
        # Load English strings
        content_en, data_en = load_json_with_formatting(strings_en)
        
        # Prepare modifications
        mods_en = []
        for old_key in old_keys:
            if old_key:  # Skip empty keys
                mods_en.append(('remove', old_key, None))
        if new_key:
            mods_en.append(('add', new_key, new_value_en))
        
        if mods_en:
            save_json_with_formatting(strings_en, content_en, mods_en)
        else:
            print("  No modifications needed")
    else:
        print("Skipping JSON modifications (code-only replacement)")
        print()
    
    print()
    print("=" * 80)
    print("STEP 3: Replace code references" if modify_json else "Replace code references")
    print("=" * 80)
    
    # For each old key, get references and replace
    total_replacements = 0
    
    # Special case: if no old_keys but we have new_key, we're renaming without removing
    # This means the audit CSV will have the OLD pattern (without prefix)
    # and we want to replace it with the NEW pattern (with prefix)
    
    if not old_keys or not any(k for k in old_keys):
        # Code-only replacement mode: user provides old pattern and new pattern differently
        # For add_title → observers.add_title case:
        # The audit CSV has "add_title" as the key
        # We need to search for that and replace with the full path
        print("Note: Code-only replacement mode requires old_key parameter")
        print("Use format: old_pattern (from audit) -> new_pattern (full path)")
    
    for old_key in old_keys:
        if not old_key:  # Skip empty keys
            continue
            
        print(f"\nProcessing references to '{old_key}'...")
        
        refs = get_code_references(audit_csv, old_key)
        
        if not refs:
            print(f"  No references found in audit CSV")
            continue
        
        # Determine old pattern and new pattern
        # Pattern in code: i18n.old_key or i18nStrings.old_key
        old_pattern_1 = f"i18n.{old_key}"
        old_pattern_2 = f"i18nStrings.{old_key}"
        new_pattern = f"i18nStrings.{new_key}"
        
        for file_path, line_numbers in refs.items():
            file_full_path = base_dir / file_path
            print(f"\n  File: {file_path}")
            print(f"  Lines: {sorted(line_numbers)}")
            
            # Try both patterns
            count1 = replace_in_file(file_full_path, old_pattern_1, new_pattern, line_numbers)
            count2 = replace_in_file(file_full_path, old_pattern_2, new_pattern, line_numbers)
            total_replacements += count1 + count2
    
    print()
    print("=" * 80)
    print("CONSOLIDATION COMPLETE")
    print("=" * 80)
    print(f"✓ Removed {len(old_keys)} old key(s) from strings_de.json and strings_en.json")
    print(f"✓ Added new key '{new_key}' to both files")
    print(f"✓ Replaced {total_replacements} code references")
    print()
    print("Next: Run validation script to verify:")
    print("  python scripts/validate_i18n_keys.py")


if __name__ == '__main__':
    try:
        parser = argparse.ArgumentParser(
            description='Consolidate i18n keys - remove old keys, add new key, replace code references',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  Full consolidation (remove old keys, add new key, replace code):
    python scripts/consolidate_i18n_key.py --old-keys "active_label,table_active" --new-key "common.active" --value-de "Aktiv" --value-en "Active"
  
  Code-only replacement (key already exists in JSON):
    python scripts/consolidate_i18n_key.py --old-keys "add_title" --new-key "observers.add_title"
            """
        )
        
        parser.add_argument('--old-keys', '-o', required=True,
                          help='Comma-separated list of old keys to remove (e.g., "active_label,table_active")')
        parser.add_argument('--new-key', '-n', required=True,
                          help='New key to add (e.g., "common.active")')
        parser.add_argument('--value-de', '-d', default=None,
                          help='German value (optional - omit for code-only replacement)')
        parser.add_argument('--value-en', '-e', default=None,
                          help='English value (optional - omit for code-only replacement)')
        
        args = parser.parse_args()
        
        old_keys = [k.strip() for k in args.old_keys.split(',')]
        
        consolidate_key(old_keys, args.new_key, args.value_de, args.value_en)
        
    except KeyboardInterrupt:
        print("\n\nCancelled by user.")
    except Exception as e:
        print(f"\n\nERROR: {e}")
        import traceback
        traceback.print_exc()
