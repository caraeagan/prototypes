#!/usr/bin/env python3
"""
Transform pattern reasoning test from multiple choice to "click the wrong item" format.
"""

import json
import re

def transform_question(question_text):
    """Transform all questions to read the file and convert format"""

    # Read the original file
    with open('/Users/caraeagan/dev/prototypes/app/student/[sessionId]/pattern-reasoning/page.tsx', 'r') as f:
        content = f.read()

    # Parse and transform the QUESTION_GROUPS structure
    # We'll use regex to find and transform each question

    lines = content.split('\n')
    new_lines = []
    in_question = False
    question_depth = 0
    current_question = []

    for i, line in enumerate(lines):
        # Detect question start
        if re.match(r'\s+\{\s*$', line) and i > 0 and ('id:' in lines[i+1] or 'id:' in lines[i+2]):
            in_question = True
            question_depth = len(line) - len(line.lstrip())
            current_question = [line]
        elif in_question:
            current_question.append(line)
            # Check if question ends
            if line.strip() == '},' or line.strip() == '}':
                indent = len(line) - len(line.lstrip())
                if indent == question_depth:
                    # Process this question
                    transformed = transform_single_question('\n'.join(current_question))
                    new_lines.extend(transformed.split('\n'))
                    in_question = False
                    current_question = []
        else:
            new_lines.append(line)

    return '\n'.join(new_lines)

def transform_single_question(question_block):
    """Transform a single question from old to new format"""

    # Extract key parts using regex
    id_match = re.search(r'id:\s*(\d+)', question_block)
    age_match = re.search(r'ageGroup:\s*"([^"]+)"', question_block)
    type_match = re.search(r'type:\s*"([^"]+)"', question_block)

    # For now, we'll need to actually parse the structure properly
    # This is complex - let's take a different approach

    return question_block

# Simpler approach: manually read and understand structure
def main():
    print("Reading file...")
    with open('/Users/caraeagan/dev/prototypes/app/student/[sessionId]/pattern-reasoning/page.tsx', 'r') as f:
        content = f.read()

    print("File read successfully")
    print(f"Total length: {len(content)} characters")
    print(f"Total lines: {len(content.split(chr(10)))}")

if __name__ == '__main__':
    main()
