#!/usr/bin/env python3
"""
Special fix for Cap 26 which has malformed id fields
"""

import json

filepath = 'src/data/cap26-structure.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix parts
part_num = 0
for part in data['parts']:
    # Fix empty Part 0 (preliminary sections)
    if part.get('id') == '' or part.get('title') == '':
        part_num = 0  # Don't increment for preliminary
        part['id'] = 'Preliminary'
        if not part.get('title'):
            part['title'] = 'Preliminary Sections'
    else:
        # Fix Part IDs: "I" → "Part I"
        part_num += 1
        if part.get('id') and not part['id'].startswith('Part'):
            part['id'] = f"Part {part['id']}"

    # Fix sections
    for section in part.get('sections', []):
        # Fix section IDs: "1" → "Section 1"
        if section.get('id') and not section['id'].startswith('Section'):
            section['id'] = f"Section {section['id']}"

# Write back
with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"✓ Fixed {filepath}")
