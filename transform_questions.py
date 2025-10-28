#!/usr/bin/env python3
"""
Transform pattern reasoning questions from "what comes next?" format
to "click the wrong item" format.

Strategy:
- For each question with sequence + options + correctAnswer
- Build a full_sequence by adding the correct answer to the sequence
- Insert one wrong answer somewhere in the full sequence
- Mark that position as wrongItemIndex
"""

import json
import re
import random

def read_file():
    with open('/Users/caraeagan/dev/prototypes/app/student/[sessionId]/pattern-reasoning/page.tsx', 'r') as f:
        return f.read()

def extract_sequence_items(sequence_str):
    """Extract individual items from a sequence array string"""
    items = []
    depth = 0
    current_item = ""

    for char in sequence_str:
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                current_item += char
                items.append(current_item.strip().strip(',').strip())
                current_item = ""
                continue

        if depth > 0:
            current_item += char

    return [item for item in items if item]

def build_full_sequence_from_question(question_obj):
    """
    Build a complete sequence with one wrong item inserted.
    Returns (full_sequence, wrongItemIndex)
    """
    # Parse the question object
    # This is a simplified version - actual implementation would parse JS object
    pass

def main():
    content = read_file()
    print(f"Read file: {len(content)} characters")

    # Split into lines for processing
    lines = content.split('\n')

    # Find where QUESTION_GROUPS starts and ends
    start_idx = None
    end_idx = None

    for i, line in enumerate(lines):
        if 'const QUESTION_GROUPS' in line:
            start_idx = i
        if start_idx is not None and 'export default function PatternReasoning' in line:
            end_idx = i
            break

    print(f"QUESTION_GROUPS section: lines {start_idx} to {end_idx}")

    # For now, just output file structure info
    print(f"\nTotal lines: {len(lines)}")

if __name__ == '__main__':
    main()
