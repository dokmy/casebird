#!/usr/bin/env python3
"""
Fix ordinance structure format to match OrdinanceViewer expectations.

CORRECT format (like Cap 201):
{
  "cap": "201",
  "title": "Prevention of Bribery Ordinance",  // NOT titleEn
  "titleZh": "防止賄賂條例",  // optional
  "parts": [
    {
      "id": "Part I",  // REQUIRED
      "title": "Preliminary",  // NOT titleEn
      "titleZh": "導言",  // optional
      "sections": [
        {
          "id": "Section 1",  // NOT "section": "1"
          "title": "Short title",  // NOT titleEn
          "titleZh": "簡稱",  // optional
          "subpath": "s1",
          "textEn": "...",
          "textZh": "..."
        }
      ]
    }
  ]
}
"""

import json
import sys

def roman_numeral(n):
    """Convert number to Roman numeral"""
    val = [
        1000, 900, 500, 400,
        100, 90, 50, 40,
        10, 9, 5, 4,
        1
    ]
    syms = [
        "M", "CM", "D", "CD",
        "C", "XC", "L", "XL",
        "X", "IX", "V", "IV",
        "I"
    ]
    roman_num = ''
    i = 0
    while  n > 0:
        for _ in range(n // val[i]):
            roman_num += syms[i]
            n -= val[i]
        i += 1
    return roman_num

def fix_ordinance(cap_num):
    filepath = f'src/data/cap{cap_num}-structure.json'

    print(f"Fixing {filepath}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Fix top-level title
    if 'titleEn' in data:
        data['title'] = data.pop('titleEn')

    # Fix parts
    for part_idx, part in enumerate(data.get('parts', []), 1):
        # Add part ID
        if 'id' not in part:
            part['id'] = f"Part {roman_numeral(part_idx)}"

        # Fix part title
        if 'titleEn' in part:
            part['title'] = part.pop('titleEn')

        # Fix sections
        for section in part.get('sections', []):
            # Fix section ID (handle both 'section' and 'number' fields)
            if 'id' not in section:
                if 'section' in section:
                    section_num = section.pop('section')
                    section['id'] = f"Section {section_num}"
                elif 'number' in section:
                    section_num = section.pop('number')
                    section['id'] = f"Section {section_num}"

            # Fix section title
            if 'titleEn' in section:
                section['title'] = section.pop('titleEn')

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  ✓ Fixed {filepath}")

if __name__ == '__main__':
    caps_to_fix = ['221', '374', '455', '115', '26', '528']

    for cap in caps_to_fix:
        fix_ordinance(cap)

    print(f"\n✅ Fixed all {len(caps_to_fix)} ordinances")
