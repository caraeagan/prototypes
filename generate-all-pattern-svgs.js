const fs = require('fs');
const path = require('path');

// This script extracts all question data from the React component and generates complete SVG exports

// Copy the complete QUESTION_GROUPS data from the React component
const QUESTION_GROUPS = {
  "2.5-3.5": {
    title: "Ages 2.5-3.5 (Early Pre-K)",
    questions: [
      {
        id: 1,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { color: "red", shape: "circle", label: "Red circle" },
          { color: "red", shape: "circle", label: "Red circle" }
        ],
        options: [
          { id: "1", color: "blue", shape: "circle", label: "Blue circle" },
          { id: "2", color: "yellow", shape: "circle", label: "Yellow circle" },
          { id: "3", color: "green", shape: "circle", label: "Green circle" },
          { id: "4", color: "red", shape: "circle", label: "Red circle" }
        ],
        correctAnswer: "4"
      },
      {
        id: 2,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { color: "blue", shape: "square", label: "Blue square" },
          { color: "blue", shape: "square", label: "Blue square" }
        ],
        options: [
          { id: "1", color: "yellow", shape: "square", label: "Yellow square" },
          { id: "2", color: "blue", shape: "square", label: "Blue square" },
          { id: "3", color: "red", shape: "square", label: "Red square" },
          { id: "4", color: "green", shape: "square", label: "Green square" }
        ],
        correctAnswer: "2"
      },
      {
        id: 3,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { color: "yellow", shape: "diamond", label: "Yellow diamond" },
          { color: "yellow", shape: "diamond", label: "Yellow diamond" }
        ],
        options: [
          { id: "1", color: "red", shape: "diamond", label: "Red diamond" },
          { id: "2", color: "blue", shape: "diamond", label: "Blue diamond" },
          { id: "3", color: "yellow", shape: "diamond", label: "Yellow diamond" },
          { id: "4", color: "green", shape: "diamond", label: "Green diamond" }
        ],
        correctAnswer: "3"
      },
      {
        id: 4,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "coral", label: "Circle" },
          { shape: "circle", color: "coral", label: "Circle" }
        ],
        options: [
          { id: "1", shape: "square", color: "turquoise", label: "Square" },
          { id: "2", shape: "triangle", color: "lavender", label: "Triangle" },
          { id: "3", shape: "star", color: "mint", label: "Star" },
          { id: "4", shape: "circle", color: "coral", label: "Circle" }
        ],
        correctAnswer: "4"
      },
      {
        id: 5,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", color: "peach", label: "Square" },
          { shape: "square", color: "peach", label: "Square" }
        ],
        options: [
          { id: "1", shape: "circle", color: "navy", label: "Circle" },
          { id: "2", shape: "triangle", color: "maroon", label: "Triangle" },
          { id: "3", shape: "square", color: "peach", label: "Square" },
          { id: "4", shape: "star", color: "aqua", label: "Star" }
        ],
        correctAnswer: "3"
      },
      {
        id: 6,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "gold", label: "Triangle" },
          { shape: "triangle", color: "gold", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "gold", label: "Triangle" },
          { id: "2", shape: "circle", color: "blue", label: "Circle" },
          { id: "3", shape: "star", color: "yellow", label: "Star" },
          { id: "4", shape: "square", color: "green", label: "Square" }
        ],
        correctAnswer: "1"
      },
      {
        id: 7,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", color: "crimson", label: "Star" },
          { shape: "star", color: "crimson", label: "Star" }
        ],
        options: [
          { id: "1", shape: "heart", color: "pink", label: "Heart" },
          { id: "2", shape: "circle", color: "blue", label: "Circle" },
          { id: "3", shape: "star", color: "crimson", label: "Star" },
          { id: "4", shape: "square", color: "green", label: "Square" }
        ],
        correctAnswer: "3"
      }
    ]
  },
  "3.5-4": {
    title: "Ages 3.5-4 (Pre-K)",
    questions: [
      {
        id: 8,
        ageGroup: "3.5-4",
        type: "ab_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "orange", label: "Circle" },
          { shape: "square", color: "teal", label: "Square" },
          { shape: "circle", color: "orange", label: "Circle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "orange", label: "Circle" },
          { id: "2", shape: "square", color: "teal", label: "Square" },
          { id: "3", shape: "triangle", color: "purple", label: "Triangle" },
          { id: "4", shape: "star", color: "yellow", label: "Star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 9,
        ageGroup: "3.5-4",
        type: "size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", size: "big", color: "indigo", label: "Big circle" },
          { shape: "circle", size: "small", color: "indigo", label: "Small circle" },
          { shape: "circle", size: "big", color: "indigo", label: "Big circle" }
        ],
        options: [
          { id: "1", shape: "square", size: "big", color: "purple", label: "Big square" },
          { id: "2", shape: "circle", size: "small", color: "indigo", label: "Small circle" },
          { id: "3", shape: "star", size: "small", color: "yellow", label: "Small star" },
          { id: "4", shape: "triangle", color: "red", label: "Triangle" }
        ],
        correctAnswer: "2"
      },
      {
        id: 10,
        ageGroup: "3.5-4",
        type: "mixed_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "rose", label: "Triangle" },
          { shape: "circle", color: "violet", label: "Circle" },
          { shape: "triangle", color: "rose", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "violet", label: "Circle" },
          { id: "2", shape: "square", color: "amber", label: "Square" },
          { id: "3", shape: "circle", color: "turquoise", label: "Circle" },
          { id: "4", shape: "star", color: "gold", label: "Star" }
        ],
        correctAnswer: "1"
      }
    ]
  },
  "4.5-5": {
    title: "Ages 4.5-5 (Pre-K)",
    questions: [
      {
        id: 11,
        ageGroup: "4.5-5",
        type: "abc_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", label: "Circle" },
          { shape: "square", color: "blue", label: "Square" },
          { shape: "triangle", color: "green", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "red", label: "Circle" },
          { id: "2", shape: "square", color: "blue", label: "Square" },
          { id: "3", shape: "triangle", color: "green", label: "Triangle" },
          { id: "4", shape: "star", color: "yellow", label: "Star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 12,
        ageGroup: "4.5-5",
        type: "dot_counting",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dots", count: 1, color: "purple", label: "1 dot" },
          { shape: "dots", count: 2, color: "purple", label: "2 dots" },
          { shape: "dots", count: 3, color: "purple", label: "3 dots" }
        ],
        options: [
          { id: "1", shape: "dots", count: 5, color: "purple", label: "5 dots" },
          { id: "2", shape: "dots", count: 4, color: "purple", label: "4 dots" },
          { id: "3", shape: "dots", count: 6, color: "purple", label: "6 dots" },
          { id: "4", shape: "dots", count: 1, color: "purple", label: "1 dot" }
        ],
        correctAnswer: "2"
      },
      {
        id: 13,
        ageGroup: "4.5-5",
        type: "star_counting",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "stars", count: 2, color: "gold", label: "2 stars" },
          { shape: "stars", count: 3, color: "gold", label: "3 stars" },
          { shape: "stars", count: 4, color: "gold", label: "4 stars" }
        ],
        options: [
          { id: "1", shape: "stars", count: 4, color: "gold", label: "4 stars" },
          { id: "2", shape: "stars", count: 5, color: "gold", label: "5 stars" },
          { id: "3", shape: "stars", count: 3, color: "gold", label: "3 stars" },
          { id: "4", shape: "stars", count: 6, color: "gold", label: "6 stars" }
        ],
        correctAnswer: "2"
      },
      {
        id: 14,
        ageGroup: "4.5-5",
        type: "size_progression",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", size: "small", color: "sky", label: "Small circle" },
          { shape: "circle", size: "medium", color: "sky", label: "Medium circle" },
          { shape: "circle", size: "big", color: "sky", label: "Large circle" }
        ],
        options: [
          { id: "1", shape: "circle", size: "big", color: "sky", label: "Large circle" },
          { id: "2", shape: "square", size: "big", color: "sky", label: "Large square" },
          { id: "3", shape: "circle", size: "bigger", color: "sky", label: "Bigger circle" },
          { id: "4", shape: "star", color: "crimson", label: "Star" }
        ],
        correctAnswer: "3"
      }
    ]
  },
  "6-7": {
    title: "Ages 6-7",
    questions: [
      {
        id: 15,
        ageGroup: "6-7",
        type: "abcd_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", label: "Circle" },
          { shape: "square", color: "blue", label: "Square" },
          { shape: "triangle", color: "green", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "star", color: "yellow", label: "Star" },
          { id: "2", shape: "circle", color: "red", label: "Circle" },
          { id: "3", shape: "heart", color: "pink", label: "Heart" },
          { id: "4", shape: "diamond", color: "purple", label: "Diamond" }
        ],
        correctAnswer: "1"
      },
      {
        id: 16,
        ageGroup: "6-7",
        type: "alternating_size",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", size: "small", color: "teal", label: "Small square" },
          { shape: "square", size: "big", color: "teal", label: "Large square" },
          { shape: "square", size: "small", color: "teal", label: "Small square" }
        ],
        options: [
          { id: "1", shape: "square", size: "small", color: "teal", label: "Small square" },
          { id: "2", shape: "square", size: "big", color: "teal", label: "Large square" },
          { id: "3", shape: "circle", size: "medium", color: "orange", label: "Medium circle" },
          { id: "4", shape: "triangle", color: "purple", label: "Triangle" }
        ],
        correctAnswer: "2"
      },
      {
        id: 17,
        ageGroup: "6-7",
        type: "rotation_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", rotation: 0, color: "orange", label: "Triangle pointing up" },
          { shape: "triangle", rotation: 90, color: "orange", label: "Triangle pointing right" },
          { shape: "triangle", rotation: 180, color: "orange", label: "Triangle pointing down" }
        ],
        options: [
          { id: "1", shape: "triangle", rotation: 0, color: "orange", label: "Triangle pointing up" },
          { id: "2", shape: "triangle", rotation: 270, color: "orange", label: "Triangle pointing left" },
          { id: "3", shape: "triangle", rotation: 180, color: "orange", label: "Triangle pointing down" },
          { id: "4", shape: "square", color: "blue", label: "Square" }
        ],
        correctAnswer: "2"
      },
      {
        id: 18,
        ageGroup: "6-7",
        type: "position_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", position: "left", color: "purple", label: "Circle on left" },
          { shape: "circle", position: "middle", color: "purple", label: "Circle in middle" },
          { shape: "circle", position: "right", color: "purple", label: "Circle on right" }
        ],
        options: [
          { id: "1", shape: "circle", position: "top", color: "purple", label: "Circle on top" },
          { id: "2", shape: "circle", position: "left", color: "purple", label: "Circle on left" },
          { id: "3", shape: "square", color: "green", label: "Square" },
          { id: "4", shape: "triangle", color: "red", label: "Triangle" }
        ],
        correctAnswer: "2"
      },
      {
        id: 19,
        ageGroup: "6-7",
        type: "matrix_pattern",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "circle", color: "red", label: "Red circle" },
          { shape: "square", color: "blue", label: "Blue square" },
          { shape: "triangle", color: "green", label: "Green triangle" },
          null
        ],
        options: [
          { id: "1", shape: "star", color: "yellow", label: "Yellow star" },
          { id: "2", shape: "heart", color: "pink", label: "Pink heart" },
          { id: "3", shape: "diamond", color: "purple", label: "Purple diamond" },
          { id: "4", shape: "circle", color: "orange", label: "Orange circle" }
        ],
        correctAnswer: "1"
      }
    ]
  },
  "8-9": {
    title: "Ages 8-9",
    questions: [
      {
        id: 20,
        ageGroup: "8-9",
        type: "complex_alternating",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", size: "small", color: "red", label: "Small red circle" },
          { shape: "square", size: "big", color: "blue", label: "Large blue square" },
          { shape: "circle", size: "small", color: "red", label: "Small red circle" }
        ],
        options: [
          { id: "1", shape: "circle", size: "small", color: "red", label: "Small red circle" },
          { id: "2", shape: "square", size: "big", color: "blue", label: "Large blue square" },
          { id: "3", shape: "triangle", size: "medium", color: "green", label: "Medium green triangle" },
          { id: "4", shape: "star", color: "yellow", label: "Yellow star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 21,
        ageGroup: "8-9",
        type: "attribute_sequence",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", size: "small", color: "purple", label: "Small purple triangle" },
          { shape: "triangle", size: "medium", color: "purple", label: "Medium purple triangle" },
          { shape: "triangle", size: "big", color: "purple", label: "Large purple triangle" }
        ],
        options: [
          { id: "1", shape: "square", size: "small", color: "blue", label: "Small blue square" },
          { id: "2", shape: "triangle", size: "small", color: "purple", label: "Small purple triangle" },
          { id: "3", shape: "triangle", size: "bigger", color: "purple", label: "Extra large purple triangle" },
          { id: "4", shape: "circle", size: "big", color: "red", label: "Large red circle" }
        ],
        correctAnswer: "3"
      },
      {
        id: 22,
        ageGroup: "8-9",
        type: "shape_rotation",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", rotation: 0, color: "green", label: "Triangle pointing up" },
          { shape: "triangle", rotation: 45, color: "green", label: "Triangle rotated 45°" },
          { shape: "triangle", rotation: 90, color: "green", label: "Triangle pointing right" }
        ],
        options: [
          { id: "1", shape: "triangle", rotation: 90, color: "green", label: "Triangle pointing right" },
          { id: "2", shape: "triangle", rotation: 135, color: "green", label: "Triangle rotated 135°" },
          { id: "3", shape: "square", color: "blue", label: "Blue square" },
          { id: "4", shape: "circle", color: "red", label: "Red circle" }
        ],
        correctAnswer: "2"
      },
      {
        id: 23,
        ageGroup: "8-9",
        type: "matrix_pattern",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "circle", size: "small", color: "red", label: "Small red circle" },
          { shape: "circle", size: "medium", color: "blue", label: "Medium blue circle" },
          { shape: "square", size: "small", color: "green", label: "Small green square" },
          null
        ],
        options: [
          { id: "1", shape: "triangle", size: "small", color: "yellow", label: "Small yellow triangle" },
          { id: "2", shape: "square", size: "medium", color: "purple", label: "Medium purple square" },
          { id: "3", shape: "circle", size: "big", color: "orange", label: "Large orange circle" },
          { id: "4", shape: "star", size: "small", color: "pink", label: "Small pink star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 24,
        ageGroup: "8-9",
        type: "complex_sequence",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", size: "small", color: "gold", label: "Small gold star" },
          { shape: "heart", size: "medium", color: "pink", label: "Medium pink heart" },
          { shape: "diamond", size: "big", color: "purple", label: "Large purple diamond" }
        ],
        options: [
          { id: "1", shape: "triangle", size: "small", color: "green", label: "Small green triangle" },
          { id: "2", shape: "circle", size: "medium", color: "blue", label: "Medium blue circle" },
          { id: "3", shape: "square", size: "big", color: "red", label: "Large red square" },
          { id: "4", shape: "star", size: "bigger", color: "silver", label: "Extra large silver star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 25,
        ageGroup: "8-9",
        type: "dot_matrix",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", size: "medium", color: "teal", label: "Square" },
          { shape: "square", size: "big", color: "teal", label: "Large square" },
          { shape: "square", size: "big", color: "teal", label: "Large square" }
        ],
        options: [
          { id: "1", shape: "square", size: "big", color: "teal", label: "Large square" },
          { id: "2", shape: "square", size: "small", color: "teal", label: "Small square" },
          { id: "3", shape: "square", size: "medium", color: "teal", label: "Medium square" },
          { id: "4", shape: "circle", size: "big", color: "blue", label: "Large blue circle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 26,
        ageGroup: "8-9",
        type: "position_sequence",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", position: "left", color: "orange", label: "Circle on left" },
          { shape: "circle", position: "middle", color: "orange", label: "Circle in middle" },
          { shape: "circle", position: "right", color: "orange", label: "Circle on right" }
        ],
        options: [
          { id: "1", shape: "circle", position: "top", color: "orange", label: "Circle on top" },
          { id: "2", shape: "circle", position: "bottom", color: "orange", label: "Circle on bottom" },
          { id: "3", shape: "circle", position: "left", color: "orange", label: "Circle on left" },
          { id: "4", shape: "square", color: "blue", label: "Blue square" }
        ],
        correctAnswer: "3"
      },
      {
        id: 27,
        ageGroup: "8-9",
        type: "matrix_pattern",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "circle", modifier: "dot", color: "blue", label: "Circle with dot" },
          { shape: "triangle", modifier: "stripe", color: "red", label: "Striped triangle" },
          { shape: "triangle", size: "bigger", color: "green", label: "Larger triangle" },
          null
        ],
        options: [
          { id: "1", shape: "square", color: "yellow", label: "Yellow square" },
          { id: "2", shape: "triangle", modifier: "dot", color: "purple", label: "Triangle with dot" },
          { id: "3", shape: "circle", size: "big", color: "orange", label: "Large orange circle" },
          { id: "4", shape: "star", color: "pink", label: "Pink star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 28,
        ageGroup: "8-9",
        type: "complex_matrix",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "square", size: "small", color: "purple", label: "Small purple square" },
          { shape: "circle", size: "medium", color: "teal", label: "Medium teal circle" },
          { shape: "triangle", size: "big", color: "orange", label: "Large orange triangle" },
          null
        ],
        options: [
          { id: "1", shape: "diamond", size: "small", color: "yellow", label: "Small yellow diamond" },
          { id: "2", shape: "star", size: "medium", color: "pink", label: "Medium pink star" },
          { id: "3", shape: "heart", size: "big", color: "red", label: "Large red heart" },
          { id: "4", shape: "hexagon", size: "medium", color: "blue", label: "Medium blue hexagon" }
        ],
        correctAnswer: "2"
      }
    ]
  },
  "10-11": {
    title: "Ages 10-11",
    questions: [
      {
        id: 35,
        ageGroup: "10-11",
        type: "rotation_sequence",
        question: "A diamond rotates 90° clockwise each step. The blue half points up, right, down… What comes next?",
        sequence: [
          { shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 0, size: "medium" },
          { shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 90, size: "medium" },
          { shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 180, size: "medium" }
        ],
        options: [
          { id: "1", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 270, size: "medium", label: "Left" },
          { id: "2", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 0, size: "medium", label: "Up" },
          { id: "3", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 90, size: "medium", label: "Right" },
          { id: "4", shape: "diamond", color: "split", topColor: "blue", bottomColor: "red", rotation: 180, size: "medium", label: "Down" }
        ],
        correctAnswer: "1"
      },
      {
        id: 36,
        ageGroup: "10-11",
        type: "flip_rotate_pattern",
        question: "A triangle flips horizontally, then rotates 180°, then flips again (pattern repeats). If the last position was 'pointing left,' what comes next?",
        sequence: [
          { shape: "triangle", color: "green", rotation: 0, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 90, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 270, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 180, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 0, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 90, reflected: false, size: "medium" },
          { shape: "triangle", color: "green", rotation: 270, reflected: false, size: "medium" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "green", rotation: 0, reflected: false, size: "medium", label: "Pointing up" },
          { id: "2", shape: "triangle", color: "green", rotation: 270, reflected: false, size: "medium", label: "Pointing right" },
          { id: "3", shape: "triangle", color: "green", rotation: 270, reflected: true, size: "medium", label: "Pointing left" },
          { id: "4", shape: "triangle", color: "green", rotation: 180, reflected: false, size: "medium", label: "Pointing down" }
        ],
        correctAnswer: "4"
      }
    ]
  }
};

// Include all SVG generation functions from the previous script
const colorMap = {
  'red': { fill: '#DC2626', stroke: '#B91C1C' },
  'blue': { fill: '#2563EB', stroke: '#1D4ED8' },
  'yellow': { fill: '#EAB308', stroke: '#CA8A04' },
  'green': { fill: '#16A34A', stroke: '#15803D' },
  'orange': { fill: '#EA580C', stroke: '#C2410C' },
  'purple': { fill: '#9333EA', stroke: '#7C3AED' },
  'pink': { fill: '#EC4899', stroke: '#DB2777' },
  'indigo': { fill: '#4F46E5', stroke: '#4338CA' },
  'teal': { fill: '#0D9488', stroke: '#0F766E' },
  'cyan': { fill: '#0891B2', stroke: '#0E7490' },
  'lime': { fill: '#65A30D', stroke: '#4D7C0F' },
  'emerald': { fill: '#059669', stroke: '#047857' },
  'violet': { fill: '#7C3AED', stroke: '#6D28D9' },
  'fuchsia': { fill: '#C026D3', stroke: '#A21CAF' },
  'rose': { fill: '#E11D48', stroke: '#BE123C' },
  'amber': { fill: '#D97706', stroke: '#B45309' },
  'sky': { fill: '#0284C7', stroke: '#0369A1' },
  'slate': { fill: '#475569', stroke: '#334155' },
  'coral': { fill: '#FF6B6B', stroke: '#EE5A52' },
  'turquoise': { fill: '#06B6D4', stroke: '#0891B2' },
  'lavender': { fill: '#A78BFA', stroke: '#8B5CF6' },
  'mint': { fill: '#34D399', stroke: '#10B981' },
  'peach': { fill: '#FB923C', stroke: '#EA580C' },
  'navy': { fill: '#1E40AF', stroke: '#1D4ED8' },
  'maroon': { fill: '#991B1B', stroke: '#7F1D1D' },
  'gold': { fill: '#F59E0B', stroke: '#D97706' },
  'crimson': { fill: '#DC143C', stroke: '#B91C1C' },
  'aqua': { fill: '#06B6D4', stroke: '#0891B2' },
  'lightblue': { fill: '#7DD3FC', stroke: '#38BDF8' },
  'darkblue': { fill: '#1E3A8A', stroke: '#1E40AF' }
};

function generateShapeDescription(item) {
  if (!item) return 'empty';
  
  let description = [];
  
  if (item.size) description.push(item.size);
  if (item.color && item.color !== 'split') description.push(item.color);
  if (item.topColor && item.bottomColor) description.push(`${item.topColor}_${item.bottomColor}`);
  if (item.shape) description.push(item.shape);
  if (item.count && item.count > 1) description.push(`x${item.count}`);
  if (item.rotation) description.push(`rot${item.rotation}`);
  if (item.reflected) description.push('reflected');
  if (item.style) description.push(item.style);
  if (item.modifier) description.push(item.modifier);
  if (item.direction) description.push(item.direction);
  if (item.dotCount) description.push(`${item.dotCount}dots`);
  if (item.position) description.push(`pos_${item.position}`);
  
  return description.join('_') || 'unknown';
}

function generateSVGTile(item, isQuestionMark = false, isSelected = false, size = 'large') {
  const tileSize = size === 'small' ? 80 : 96;
  const borderWidth = 2;
  const cornerRadius = 12;
  
  // Determine tile colors based on state
  let fillColor = '#FFFFFF';
  let strokeColor = '#D1D5DB';
  let strokeDashArray = '';
  
  if (isQuestionMark && !item) {
    fillColor = '#DBEAFE';
    strokeColor = '#1E3A8A';
    strokeDashArray = '5,5';
  } else if (isSelected) {
    fillColor = '#DBEAFE';
    strokeColor = '#1E3A8A';
  }
  
  let content = '';
  
  if (item) {
    content = generateShapeContent(item);
  } else if (isQuestionMark) {
    content = `<text x="${tileSize / 2}" y="${tileSize / 2}" text-anchor="middle" dominant-baseline="central" font-size="32" font-weight="bold" fill="#1E3A8A">?</text>`;
  }
  
  return `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${borderWidth / 2}" y="${borderWidth / 2}" width="${tileSize - borderWidth}" height="${tileSize - borderWidth}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${borderWidth}" stroke-dasharray="${strokeDashArray}"/>
    <g transform="translate(${tileSize / 2}, ${tileSize / 2})">
      ${content}
    </g>
  </svg>`;
}

function generateShapeContent(item) {
  if (!item) return '';
  
  const colors = colorMap[item.color] || { fill: '#2563EB', stroke: '#1D4ED8' };
  const size = item.size === 'big' ? 50 : 
               item.size === 'small' ? 35 : 
               item.size === 'medium' ? 42 :
               item.size === 'tiny' ? 28 :
               item.size === 'bigger' ? 55 : 42;
  
  const viewBox = 70;
  let centerX = viewBox / 2;
  let centerY = viewBox / 2;
  
  // Adjust positioning if needed
  if (item.position) {
    switch (item.position) {
      case 'top':
        centerY = viewBox / 3;
        break;
      case 'bottom':
        centerY = (viewBox * 2) / 3;
        break;
      case 'left':
        centerX = viewBox / 3;
        break;
      case 'right':
        centerX = (viewBox * 2) / 3;
        break;
    }
  }
  
  // Adjust coordinates to center around (0,0) for the tile
  centerX = centerX - viewBox / 2;
  centerY = centerY - viewBox / 2;
  
  switch (item.shape) {
    case 'circle':
      return generateCircleContent(item, colors, size, centerX, centerY);
    case 'square':
      return generateSquareContent(item, colors, size, centerX, centerY);
    case 'triangle':
      return generateTriangleContent(item, colors, size, centerX, centerY);
    case 'diamond':
      return generateDiamondContent(item, colors, size, centerX, centerY);
    case 'star':
      return generateStarContent(item, colors, size, centerX, centerY);
    case 'heart':
      return generateHeartContent(item, colors, size, centerX, centerY);
    case 'hexagon':
      return generateHexagonContent(item, colors, size, centerX, centerY);
    case 'dots':
      return generateDotsContent(item, colors, size, centerX, centerY);
    case 'stars':
      return generateStarsContent(item, colors, size, centerX, centerY);
    default:
      return `<circle cx="${centerX}" cy="${centerY}" r="10" fill="${colors.fill}" stroke="${colors.stroke}"/>`;
  }
}

function generateCircleContent(item, colors, size, centerX, centerY) {
  const count = item.count || 1;
  let content = '';
  
  if (count > 1) {
    const positions = [];
    if (count === 2) {
      positions.push({ x: centerX - size/4, y: centerY });
      positions.push({ x: centerX + size/4, y: centerY });
    } else if (count === 3) {
      positions.push({ x: centerX, y: centerY - size/4 });
      positions.push({ x: centerX - size/4, y: centerY + size/4 });
      positions.push({ x: centerX + size/4, y: centerY + size/4 });
    }
    
    positions.forEach(pos => {
      content += `<circle cx="${pos.x}" cy="${pos.y}" r="${size/4}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`;
    });
  } else {
    const transform = item.reflected ? `scale(-1, 1) translate(${-2 * centerX}, 0)` : '';
    content = `<circle cx="${centerX}" cy="${centerY}" r="${size/2}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
    
    // Add modifier dot
    if (item.modifier === 'dot') {
      content += `<circle cx="${centerX}" cy="${centerY}" r="${size/8}" fill="black"/>`;
    }
  }
  
  return content;
}

function generateSquareContent(item, colors, size, centerX, centerY) {
  const transform = item.reflected ? `scale(-1, 1) translate(${-2 * centerX}, 0)` : '';
  return `<rect x="${centerX - size/2}" y="${centerY - size/2}" width="${size}" height="${size}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2" rx="3" transform="${transform}"/>`;
}

function generateTriangleContent(item, colors, size, centerX, centerY) {
  const rotation = item.rotation || 0;
  const transform = item.reflected ? 
    `rotate(${rotation} ${centerX} ${centerY}) scale(-1, 1) translate(${-2 * centerX}, 0)` : 
    `rotate(${rotation} ${centerX} ${centerY})`;
  
  let content = `<polygon points="${centerX},${centerY - size/2} ${centerX + size/2},${centerY + size/2} ${centerX - size/2},${centerY + size/2}" fill="${item.style === 'outline' ? 'none' : colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
  
  // Add modifier stripe pattern
  if (item.modifier === 'stripe') {
    content = `<defs><pattern id="stripePattern" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="4" height="4" fill="${colors.fill}"/><rect width="2" height="4" fill="black"/></pattern></defs>` + content.replace(colors.fill, 'url(#stripePattern)');
  }
  
  return content;
}

function generateDiamondContent(item, colors, size, centerX, centerY) {
  if (item.color === 'split' && item.topColor && item.bottomColor) {
    const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' };
    const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' };
    const transform = item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : '';
    
    return `<g transform="${transform}">
      <polygon points="${centerX},${centerY - size/2} ${centerX + size/2},${centerY} ${centerX},${centerY} ${centerX - size/2},${centerY}" fill="${topColors.fill}" stroke="${colors.stroke}" stroke-width="2"/>
      <polygon points="${centerX - size/2},${centerY} ${centerX},${centerY} ${centerX + size/2},${centerY} ${centerX},${centerY + size/2}" fill="${bottomColors.fill}" stroke="${colors.stroke}" stroke-width="2"/>
    </g>`;
  }
  
  const transform = item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : '';
  return `<polygon points="${centerX},${centerY - size/2} ${centerX + size/2},${centerY} ${centerX},${centerY + size/2} ${centerX - size/2},${centerY}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
}

function generateStarContent(item, colors, size, centerX, centerY) {
  const starSize = size / 2;
  const innerRadius = starSize * 0.4;
  let points = '';
  
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? starSize : innerRadius;
    const x = centerX + Math.cos(angle - Math.PI / 2) * radius;
    const y = centerY + Math.sin(angle - Math.PI / 2) * radius;
    points += `${x},${y} `;
  }
  
  return `<polygon points="${points}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1"/>`;
}

function generateHeartContent(item, colors, size, centerX, centerY) {
  const heartDirection = item.direction || 'up';
  let transform = '';
  
  switch (heartDirection) {
    case 'down':
      transform = `rotate(180 ${centerX} ${centerY})`;
      break;
    case 'left':
      transform = `rotate(270 ${centerX} ${centerY})`;
      break;
    case 'right':
      transform = `rotate(90 ${centerX} ${centerY})`;
      break;
    case 'up':
    default:
      transform = `rotate(180 ${centerX} ${centerY})`;
      break;
  }
  
  return `<path d="M${centerX},${centerY + size * 0.3} C${centerX - size * 0.5},${centerY - size * 0.1} ${centerX - size * 0.5},${centerY - size * 0.5} ${centerX},${centerY - size * 0.2} C${centerX + size * 0.5},${centerY - size * 0.5} ${centerX + size * 0.5},${centerY - size * 0.1} ${centerX},${centerY + size * 0.3}Z" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
}

function generateHexagonContent(item, colors, size, centerX, centerY) {
  const transform = item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : '';
  const hexPoints = `${centerX + size/2},${centerY} ${centerX + size/4},${centerY - size/2} ${centerX - size/4},${centerY - size/2} ${centerX - size/2},${centerY} ${centerX - size/4},${centerY + size/2} ${centerX + size/4},${centerY + size/2}`;
  
  let content = `<polygon points="${hexPoints}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2" transform="${transform}"/>`;
  
  const dotCount = item.dotCount || 0;
  if (dotCount > 0) {
    for (let i = 0; i < dotCount; i++) {
      let dotX, dotY;
      if (dotCount === 1) {
        dotX = centerX;
        dotY = centerY;
      } else if (dotCount === 2) {
        dotX = centerX + (i === 0 ? -8 : 8);
        dotY = centerY;
      } else if (dotCount === 3) {
        dotX = centerX + (i === 1 ? -8 : i === 2 ? 8 : 0);
        dotY = centerY + (i === 0 ? -8 : 8);
      } else {
        const angle = (i * 2 * Math.PI) / dotCount;
        dotX = centerX + Math.cos(angle) * 10;
        dotY = centerY + Math.sin(angle) * 10;
      }
      content += `<circle cx="${dotX}" cy="${dotY}" r="3" fill="black"/>`;
    }
  }
  
  return content;
}

function generateDotsContent(item, colors, size, centerX, centerY) {
  const dotCount = item.count || 1;
  let content = '';
  
  // Multi-row dot layout
  let dotSize, dotsPerRow, rows;
  
  if (dotCount <= 3) {
    dotSize = 8;
    dotsPerRow = dotCount;
    rows = 1;
  } else if (dotCount <= 6) {
    dotSize = 7;
    dotsPerRow = Math.ceil(dotCount / 2);
    rows = 2;
  } else {
    dotSize = 6;
    dotsPerRow = Math.ceil(dotCount / 3);
    rows = 3;
  }
  
  const spacing = Math.min(12, (60 - dotsPerRow * dotSize) / (dotsPerRow + 1));
  const rowSpacing = Math.min(12, (60 - rows * dotSize) / (rows + 1));
  
  for (let i = 0; i < dotCount; i++) {
    const row = Math.floor(i / dotsPerRow);
    const col = i % dotsPerRow;
    const dotsInThisRow = Math.min(dotsPerRow, dotCount - row * dotsPerRow);
    
    const totalRowWidth = dotsInThisRow * dotSize + (dotsInThisRow - 1) * spacing;
    const startX = centerX - totalRowWidth / 2;
    const startY = centerY - (rows * dotSize + (rows - 1) * rowSpacing) / 2;
    
    const cx = startX + col * (dotSize + spacing) + dotSize / 2;
    const cy = startY + row * (dotSize + rowSpacing) + dotSize / 2;
    
    content += `<circle cx="${cx}" cy="${cy}" r="${dotSize / 2}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1"/>`;
  }
  
  return content;
}

function generateStarsContent(item, colors, size, centerX, centerY) {
  const starCount = item.count || 1;
  let content = '';
  
  // Multi-row star layout
  let starSize, starsPerRow, rows;
  
  if (starCount <= 3) {
    starSize = 8;
    starsPerRow = starCount;
    rows = 1;
  } else if (starCount <= 6) {
    starSize = 7;
    starsPerRow = Math.ceil(starCount / 2);
    rows = 2;
  } else {
    starSize = 6;
    starsPerRow = Math.ceil(starCount / 3);
    rows = 3;
  }
  
  const spacing = Math.min(12, (60 - starsPerRow * starSize) / (starsPerRow + 1));
  const rowSpacing = Math.min(12, (60 - rows * starSize) / (rows + 1));
  
  for (let i = 0; i < starCount; i++) {
    const row = Math.floor(i / starsPerRow);
    const col = i % starsPerRow;
    const starsInThisRow = Math.min(starsPerRow, starCount - row * starsPerRow);
    
    const totalRowWidth = starsInThisRow * starSize + (starsInThisRow - 1) * spacing;
    const startX = centerX - totalRowWidth / 2;
    const startY = centerY - (rows * starSize + (rows - 1) * rowSpacing) / 2;
    
    const cx = startX + col * (starSize + spacing) + starSize / 2;
    const cy = startY + row * (starSize + rowSpacing) + starSize / 2;
    
    const innerRadius = starSize * 0.4;
    let points = '';
    
    for (let j = 0; j < 10; j++) {
      const angle = (j * Math.PI) / 5;
      const radius = j % 2 === 0 ? starSize : innerRadius;
      const x = cx + Math.cos(angle - Math.PI / 2) * radius;
      const y = cy + Math.sin(angle - Math.PI / 2) * radius;
      points += `${x},${y} `;
    }
    
    content += `<polygon points="${points}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="1"/>`;
  }
  
  return content;
}

// Generate all SVG files
function generateAllSVGs() {
  const outputDir = './pattern-reasoning-svgs';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let totalFiles = 0;
  
  Object.values(QUESTION_GROUPS).forEach(group => {
    group.questions.forEach(question => {
      // Generate sequence SVGs
      question.sequence.forEach((item, index) => {
        const description = generateShapeDescription(item);
        const filename = `q_${String(question.id).padStart(2, '0')}_sequence_${index + 1}_${description}.svg`;
        const svg = generateSVGTile(item);
        
        fs.writeFileSync(path.join(outputDir, filename), svg);
        console.log(`Generated: ${filename}`);
        totalFiles++;
      });
      
      // Generate option SVGs
      question.options.forEach(option => {
        const description = generateShapeDescription(option);
        const filename = `q_${String(question.id).padStart(2, '0')}_option_${option.id}_${description}.svg`;
        const svg = generateSVGTile(option);
        
        fs.writeFileSync(path.join(outputDir, filename), svg);
        console.log(`Generated: ${filename}`);
        totalFiles++;
      });
      
      // Generate question mark SVG
      const questionMarkFilename = `q_${String(question.id).padStart(2, '0')}_question_mark.svg`;
      const questionMarkSvg = generateSVGTile(null, true);
      fs.writeFileSync(path.join(outputDir, questionMarkFilename), questionMarkSvg);
      console.log(`Generated: ${questionMarkFilename}`);
      totalFiles++;
    });
  });
  
  console.log(`\n✅ Successfully generated ${totalFiles} SVG files in ${outputDir}/`);
  console.log(`📁 Directory: ${path.resolve(outputDir)}`);
}

// Run the generation
generateAllSVGs();