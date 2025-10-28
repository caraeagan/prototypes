#!/usr/bin/env node
/**
 * Transform pattern reasoning test from multiple-choice to click-the-wrong-item format
 *
 * OLD FORMAT:
 * - sequence: [item1, item2]  (partial)
 * - options: [option1, option2, option3, option4]
 * - correctAnswer: "2"
 * - question: "What comes next?"
 *
 * NEW FORMAT:
 * - full_sequence: [item1, item2, item3, WRONG_ITEM, item4, item5]  (complete with one wrong)
 * - wrongItemIndex: 3
 * - question: "Click on the shape that doesn't belong in the pattern"
 */

const fs = require('fs');

// Read the original file
const content = fs.readFileSync('/Users/caraeagan/dev/prototypes/app/student/[sessionId]/pattern-reasoning/page.tsx', 'utf8');

console.log('File read successfully');
console.log(`Total length: ${content.length} characters`);
console.log(`Total lines: ${content.split('\n').length}`);

// This script will help us understand the structure
// For the actual transformation, we'll need to manually handle it given the complexity

// Count questions
const correctAnswerMatches = content.match(/correctAnswer:/g);
console.log(`\nTotal questions found: ${correctAnswerMatches ? correctAnswerMatches.length : 0}`);
