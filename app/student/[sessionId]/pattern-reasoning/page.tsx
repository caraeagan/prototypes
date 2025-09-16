"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

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
          { shape: "triangle", color: "indigo", label: "Triangle" },
          { shape: "triangle", color: "indigo", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "indigo", label: "Triangle" },
          { id: "2", shape: "circle", color: "fuchsia", label: "Circle" },
          { id: "3", shape: "square", color: "sky", label: "Square" },
          { id: "4", shape: "star", color: "slate", label: "Star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 7,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", color: "yellow", label: "Star" },
          { shape: "star", color: "yellow", label: "Star" }
        ],
        options: [
          { id: "1", shape: "heart", color: "pink", label: "Heart" },
          { id: "2", shape: "circle", color: "blue", label: "Circle" },
          { id: "3", shape: "star", color: "yellow", label: "Star" },
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
        type: "shape_sequence_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "emerald", label: "Circle" },
          { shape: "square", color: "purple", label: "Square" },
          { shape: "circle", color: "emerald", label: "Circle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "emerald", label: "Circle" },
          { id: "2", shape: "square", color: "purple", label: "Square" },
          { id: "3", shape: "triangle", color: "orange", label: "Triangle" },
          { id: "4", shape: "star", color: "gold", label: "Star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 9,
        ageGroup: "3.5-4",
        type: "size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", size: "big", color: "teal", label: "Big circle" },
          { shape: "circle", size: "small", color: "teal", label: "Small circle" },
          { shape: "circle", size: "big", color: "teal", label: "Big circle" }
        ],
        options: [
          { id: "1", shape: "square", size: "big", color: "red", label: "Big square" },
          { id: "2", shape: "circle", size: "small", color: "teal", label: "Small circle" },
          { id: "3", shape: "star", size: "small", color: "gold", label: "Small star" },
          { id: "4", shape: "triangle", color: "pink", label: "Triangle" }
        ],
        correctAnswer: "2"
      },
      {
        id: 10,
        ageGroup: "3.5-4",
        type: "shape_sequence_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "coral", label: "Triangle" },
          { shape: "circle", color: "lime", label: "Circle" },
          { shape: "triangle", color: "coral", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "lime", label: "Circle" },
          { id: "2", shape: "square", color: "violet", label: "Square" },
          { id: "3", shape: "star", color: "amber", label: "Star" },
          { id: "4", shape: "heart", color: "rose", label: "Heart" }
        ],
        correctAnswer: "1"
      },
      {
        id: 11,
        ageGroup: "3.5-4",
        type: "size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", size: "big", color: "navy", label: "Big square" },
          { shape: "square", size: "small", color: "navy", label: "Small square" },
          { shape: "square", size: "big", color: "navy", label: "Big square" }
        ],
        options: [
          { id: "1", shape: "circle", size: "small", color: "cyan", label: "Small circle" },
          { id: "2", shape: "square", size: "small", color: "navy", label: "Small square" },
          { id: "3", shape: "triangle", color: "maroon", label: "Triangle" },
          { id: "4", shape: "heart", color: "fuchsia", label: "Heart" }
        ],
        correctAnswer: "2"
      },
      {
        id: 12,
        ageGroup: "3.5-4",
        type: "alternating_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", color: "gold", label: "Star" },
          { shape: "heart", color: "crimson", label: "Heart" },
          { shape: "star", color: "gold", label: "Star" },
          { shape: "heart", color: "crimson", label: "Heart" }
        ],
        options: [
          { id: "1", shape: "circle", color: "sky", label: "Circle" },
          { id: "2", shape: "square", color: "emerald", label: "Square" },
          { id: "3", shape: "star", color: "gold", label: "Star" },
          { id: "4", shape: "triangle", color: "slate", label: "Triangle" }
        ],
        correctAnswer: "3"
      },
      {
        id: 13,
        ageGroup: "3.5-4",
        type: "complex_size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", size: "big", color: "violet", label: "Big triangle" },
          { shape: "triangle", size: "small", color: "violet", label: "Small triangle" },
          { shape: "triangle", size: "big", color: "violet", label: "Big triangle" },
          { shape: "triangle", size: "small", color: "violet", label: "Small triangle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "aqua", label: "Circle" },
          { id: "2", shape: "triangle", size: "big", color: "violet", label: "Big triangle" },
          { id: "3", shape: "square", color: "peach", label: "Square" },
          { id: "4", shape: "star", color: "mint", label: "Star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 14,
        ageGroup: "3.5-4",
        type: "alternating_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "turquoise", label: "Circle" },
          { shape: "triangle", color: "lavender", label: "Triangle" },
          { shape: "circle", color: "turquoise", label: "Circle" },
          { shape: "triangle", color: "lavender", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "heart", color: "rose", label: "Heart" },
          { id: "2", shape: "square", color: "amber", label: "Square" },
          { id: "3", shape: "circle", color: "turquoise", label: "Circle" },
          { id: "4", shape: "star", color: "gold", label: "Star" }
        ],
        correctAnswer: "3"
      }
    ]
  },
  "4.5-5": {
    title: "Ages 4.5-5 (Pre-K)",
    questions: [
      {
        id: 15,
        ageGroup: "4.5-5",
        type: "repeating_sequence_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "green", label: "Circle" },
          { shape: "square", color: "purple", label: "Square" },
          { shape: "triangle", color: "orange", label: "Triangle" },
          { shape: "circle", color: "green", label: "Circle" },
          { shape: "square", color: "purple", label: "Square" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "orange", label: "Triangle" },
          { id: "2", shape: "circle", color: "green", label: "Circle" },
          { id: "3", shape: "star", color: "yellow", label: "Star" },
          { id: "4", shape: "square", color: "purple", label: "Square" }
        ],
        correctAnswer: "1"
      },
      {
        id: 16,
        ageGroup: "4.5-5",
        type: "dot_counting_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dots", count: 1, color: "red", label: "1 dot" },
          { shape: "dots", count: 2, color: "red", label: "2 dots" },
          { shape: "dots", count: 3, color: "red", label: "3 dots" },
          { shape: "dots", count: 4, color: "red", label: "4 dots" }
        ],
        options: [
          { id: "1", shape: "dots", count: 5, color: "red", label: "5 dots" },
          { id: "2", shape: "dots", count: 6, color: "red", label: "6 dots" },
          { id: "3", shape: "dots", count: 2, color: "red", label: "2 dots" },
          { id: "4", shape: "dots", count: 1, color: "red", label: "1 dot" }
        ],
        correctAnswer: "2"
      },
      {
        id: 17,
        ageGroup: "4.5-5",
        type: "repeating_sequence_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", color: "teal", label: "Square" },
          { shape: "triangle", color: "pink", label: "Triangle" },
          { shape: "circle", color: "lime", label: "Circle" },
          { shape: "square", color: "teal", label: "Square" },
          { shape: "triangle", color: "pink", label: "Triangle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "lime", label: "Circle" },
          { id: "2", shape: "star", color: "gold", label: "Star" },
          { id: "3", shape: "square", color: "teal", label: "Square" },
          { id: "4", shape: "heart", color: "crimson", label: "Heart" }
        ],
        correctAnswer: "1"
      },
      {
        id: 18,
        ageGroup: "4.5-5",
        type: "size_progression_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", size: "big", color: "coral", label: "Big circle" },
          { shape: "circle", size: "medium", color: "coral", label: "Medium circle" },
          { shape: "circle", size: "small", color: "coral", label: "Small circle" }
        ],
        options: [
          { id: "1", shape: "circle", size: "tiny", color: "coral", label: "Tiny circle" },
          { id: "2", shape: "square", color: "navy", label: "Square" },
          { id: "3", shape: "triangle", color: "emerald", label: "Triangle" },
          { id: "4", shape: "circle", size: "big", color: "maroon", label: "Big square" }
        ],
        correctAnswer: "1"
      },
      {
        id: 19,
        ageGroup: "4.5-5",
        type: "repeating_sequence_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "violet", label: "Triangle" },
          { shape: "star", color: "amber", label: "Star" },
          { shape: "heart", color: "rose", label: "Heart" },
          { shape: "triangle", color: "violet", label: "Triangle" },
          { shape: "star", color: "amber", label: "Star" }
        ],
        options: [
          { id: "1", shape: "heart", color: "rose", label: "Heart" },
          { id: "2", shape: "circle", color: "cyan", label: "Circle" },
          { id: "3", shape: "square", color: "emerald", label: "Square" },
          { id: "4", shape: "triangle", color: "violet", label: "Triangle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 20,
        ageGroup: "4.5-5",
        type: "star_counting_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "stars", count: 1, color: "gold", label: "1 star" },
          { shape: "stars", count: 2, color: "gold", label: "2 stars" },
          { shape: "stars", count: 3, color: "gold", label: "3 stars" }
        ],
        options: [
          { id: "1", shape: "stars", count: 4, color: "gold", label: "4 stars" },
          { id: "2", shape: "stars", count: 5, color: "gold", label: "5 stars" },
          { id: "3", shape: "stars", count: 2, color: "gold", label: "2 stars" },
          { id: "4", shape: "stars", count: 1, color: "gold", label: "1 star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 21,
        ageGroup: "4.5-5",
        type: "size_progression_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", size: "small", color: "mint", label: "Small square" },
          { shape: "square", size: "medium", color: "mint", label: "Medium square" },
          { shape: "square", size: "big", color: "mint", label: "Big square" }
        ],
        options: [
          { id: "1", shape: "circle", size: "tiny", color: "cyan", label: "Tiny circle" },
          { id: "2", shape: "triangle", color: "fuchsia", label: "Triangle" },
          { id: "3", shape: "square", size: "bigger", color: "mint", label: "Bigger square" },
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
        id: 22,
        ageGroup: "6-7",
        type: "rotation_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", rotation: 0, color: "blue", label: "Triangle (pointing up)" },
          { shape: "triangle", rotation: 90, color: "blue", label: "Triangle (pointing right)" },
          { shape: "triangle", rotation: 180, color: "blue", label: "Triangle (pointing down)" },
          { shape: "triangle", rotation: 0, color: "blue", label: "Triangle (pointing up)" },
          { shape: "triangle", rotation: 90, color: "blue", label: "Triangle (pointing right)" }
        ],
        options: [
          { id: "1", shape: "triangle", rotation: 270, color: "blue", label: "Triangle (pointing left)" },
          { id: "2", shape: "triangle", rotation: 180, color: "blue", label: "Triangle (pointing down)" },
          { id: "3", shape: "triangle", rotation: 0, color: "blue", label: "Triangle (pointing up)" },
          { id: "4", shape: "triangle", rotation: 90, color: "blue", label: "Triangle (pointing right)" }
        ],
        correctAnswer: "2"
      },
      {
        id: 23,
        ageGroup: "6-7",
        type: "color_alternating_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", label: "Red circle" },
          { shape: "circle", color: "blue", label: "Blue circle" },
          { shape: "circle", color: "red", label: "Red circle" },
          { shape: "circle", color: "blue", label: "Blue circle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "green", label: "Green circle" },
          { id: "2", shape: "circle", color: "yellow", label: "Yellow circle" },
          { id: "3", shape: "circle", color: "red", label: "Red circle" },
          { id: "4", shape: "circle", color: "purple", label: "Purple circle" }
        ],
        correctAnswer: "3"
      },
      {
        id: 24,
        ageGroup: "6-7",
        type: "star_counting_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "stars", count: 1, color: "gold", label: "1 star" },
          { shape: "stars", count: 2, color: "gold", label: "2 stars" },
          { shape: "stars", count: 3, color: "gold", label: "3 stars" }
        ],
        options: [
          { id: "1", shape: "stars", count: 5, color: "gold", label: "5 stars" },
          { id: "2", shape: "stars", count: 2, color: "gold", label: "2 stars" },
          { id: "3", shape: "stars", count: 4, color: "gold", label: "4 stars" },
          { id: "4", shape: "stars", count: 1, color: "gold", label: "1 star" }
        ],
        correctAnswer: "3"
      },
      {
        id: 25,
        ageGroup: "6-7",
        type: "size_progression_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", size: "small", color: "purple", label: "Small square" },
          { shape: "square", size: "medium", color: "purple", label: "Medium square" },
          { shape: "square", size: "big", color: "purple", label: "Big square" }
        ],
        options: [
          { id: "1", shape: "circle", size: "small", color: "orange", label: "Small circle" },
          { id: "2", shape: "triangle", size: "medium", color: "green", label: "Medium triangle" },
          { id: "3", shape: "square", size: "bigger", color: "purple", label: "Bigger square" },
          { id: "4", shape: "star", size: "big", color: "yellow", label: "Big star" }
        ],
        correctAnswer: "3"
      },
      {
        id: 26,
        ageGroup: "6-7",
        type: "position_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", position: "left", color: "teal", label: "Circle on the left" },
          { shape: "circle", position: "middle", color: "teal", label: "Circle in the middle" },
          { shape: "circle", position: "right", color: "teal", label: "Circle on the right" },
          { shape: "circle", position: "left", color: "teal", label: "Circle on the left" },
          { shape: "circle", position: "middle", color: "teal", label: "Circle in the middle" }
        ],
        options: [
          { id: "1", shape: "circle", position: "left", color: "teal", label: "Left" },
          { id: "2", shape: "circle", position: "right", color: "teal", label: "Right" },
          { id: "3", shape: "circle", position: "middle", color: "teal", label: "Middle" },
          { id: "4", shape: "circle", position: "nowhere", color: "gray", label: "Nowhere" }
        ],
        correctAnswer: "2"
      },
      {
        id: 27,
        ageGroup: "6-7",
        type: "matrix_pattern",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "circle", color: "blue", label: "Circle" },
          { shape: "triangle", color: "red", label: "Triangle" },
          { shape: "circle", modifier: "dot", color: "blue", label: "Circle + dot" }
        ],
        options: [
          { id: "1", shape: "triangle", modifier: "stripe", color: "red", label: "Triangle + stripe" },
          { id: "2", shape: "triangle", size: "bigger", color: "red", label: "Triangle (bigger)" },
          { id: "3", shape: "triangle", modifier: "dot", color: "red", label: "Triangle + dot" },
          { id: "4", shape: "triangle", rotation: 90, color: "red", label: "Triangle (rotated)" }
        ],
        correctAnswer: "3"
      },
      {
        id: 28,
        ageGroup: "6-7",
        type: "matrix_pattern",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "star", size: "small", color: "gold", label: "Small star" },
          { shape: "star", size: "medium", color: "gold", label: "Medium star" },
          { shape: "heart", size: "small", color: "pink", label: "Small heart" }
        ],
        options: [
          { id: "1", shape: "heart", size: "big", color: "pink", label: "Large heart" },
          { id: "2", shape: "triangle", size: "small", color: "green", label: "Small triangle" },
          { id: "3", shape: "heart", size: "medium", color: "pink", label: "Medium heart" },
          { id: "4", shape: "circle", size: "medium", color: "blue", label: "Medium circle" }
        ],
        correctAnswer: "3"
      }
    ]
  },
  "8-9": {
    title: "Ages 8-9",
    questions: [
      {
        id: 29,
        ageGroup: "8-9",
        type: "matrix_3x3_pattern",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "circle", size: "small", color: "red", label: "Red small circle" },
          { shape: "circle", size: "small", color: "blue", label: "Blue small circle" },
          { shape: "circle", size: "small", color: "green", label: "Green small circle" },
          { shape: "circle", size: "medium", color: "red", label: "Red medium circle" },
          { shape: "circle", size: "medium", color: "blue", label: "Blue medium circle" },
          { shape: "circle", size: "medium", color: "green", label: "Green medium circle" },
          { shape: "circle", size: "big", color: "red", label: "Red large circle" },
          { shape: "circle", size: "big", color: "blue", label: "Blue large circle" }
        ],
        options: [
          { id: "1", shape: "circle", size: "small", color: "red", label: "Red small circle" },
          { id: "2", shape: "square", size: "big", color: "blue", label: "Blue large square" },
          { id: "3", shape: "circle", size: "big", color: "green", label: "Green large circle" },
          { id: "4", shape: "circle", size: "medium", color: "green", label: "Green medium circle" }
        ],
        correctAnswer: "3"
      },
      {
        id: 30,
        ageGroup: "8-9",
        type: "matrix_3x3_pattern",
        question: "What goes in the bottom-middle cell?",
        sequence: [
          { shape: "triangle", color: "yellow", label: "Yellow triangle" },
          { shape: "triangle", color: "orange", label: "Orange triangle" },
          { shape: "triangle", color: "red", label: "Red triangle" },
          { shape: "square", color: "yellow", label: "Yellow square" },
          { shape: "square", color: "orange", label: "Orange square" },
          { shape: "square", color: "red", label: "Red square" },
          { shape: "circle", color: "yellow", label: "Yellow circle" },
          null,
          { shape: "circle", color: "red", label: "Red circle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "yellow", label: "Yellow circle" },
          { id: "2", shape: "triangle", color: "red", label: "Red triangle" },
          { id: "3", shape: "circle", color: "orange", label: "Orange circle" },
          { id: "4", shape: "square", color: "red", label: "Red square" }
        ],
        correctAnswer: "3"
      },
      {
        id: 31,
        ageGroup: "8-9",
        type: "matrix_3x3_pattern",
        question: "What goes in the bottom-right corner?",
        sequence: [
          { shape: "star", size: "small", color: "gold", label: "Small star" },
          { shape: "heart", size: "small", color: "pink", label: "Small heart" },
          { shape: "diamond", size: "small", color: "purple", label: "Small diamond" },
          { shape: "star", size: "medium", color: "gold", label: "Medium star" },
          { shape: "heart", size: "medium", color: "pink", label: "Medium heart" },
          { shape: "diamond", size: "medium", color: "purple", label: "Medium diamond" },
          { shape: "star", size: "big", color: "gold", label: "Large star" },
          { shape: "heart", size: "big", color: "pink", label: "Large heart" }
        ],
        options: [
          { id: "1", shape: "diamond", size: "big", color: "purple", label: "Large diamond" },
          { id: "2", shape: "star", size: "big", color: "gold", label: "Large star" },
          { id: "3", shape: "heart", size: "medium", color: "pink", label: "Medium heart" },
          { id: "4", shape: "diamond", size: "small", color: "purple", label: "Small diamond" }
        ],
        correctAnswer: "1"
      },
      {
        id: 32,
        ageGroup: "8-9",
        type: "matrix_3x3_pattern",
        question: "What goes in the bottom-left cell?",
        sequence: [
          { shape: "circle", color: "blue", style: "solid", label: "Solid blue circle" },
          { shape: "circle", color: "purple", style: "solid", label: "Solid purple circle" },
          { shape: "circle", color: "pink", style: "solid", label: "Solid pink circle" },
          { shape: "triangle", color: "blue", style: "outline", label: "Outline blue triangle" },
          { shape: "triangle", color: "purple", style: "outline", label: "Outline purple triangle" },
          { shape: "triangle", color: "pink", style: "outline", label: "Outline pink triangle" },
          null,
          { shape: "square", color: "purple", modifier: "stripe", label: "Striped purple square" },
          { shape: "square", color: "pink", modifier: "stripe", label: "Striped pink square" }
        ],
        options: [
          { id: "1", shape: "circle", color: "purple", modifier: "stripe", label: "Striped purple circle" },
          { id: "2", shape: "triangle", color: "pink", modifier: "stripe", label: "Striped pink triangle" },
          { id: "3", shape: "square", color: "blue", modifier: "stripe", label: "Striped blue square" },
          { id: "4", shape: "star", color: "blue", style: "outline", label: "Outline blue star" }
        ],
        correctAnswer: "3"
      },
      {
        id: 33,
        ageGroup: "8-9",
        type: "matrix_3x3_pattern",
        question: "What goes in row 3, column 2?",
        sequence: [
          { shape: "circle", count: 1, color: "blue", label: "1 circle" },
          { shape: "circle", count: 2, color: "blue", label: "2 circles" },
          { shape: "circle", count: 3, color: "blue", label: "3 circles" },
          { shape: "triangle", count: 1, color: "green", label: "1 triangle" },
          { shape: "triangle", count: 2, color: "green", label: "2 triangles" },
          { shape: "triangle", count: 3, color: "green", label: "3 triangles" },
          { shape: "square", count: 1, color: "red", label: "1 square" },
          null,
          { shape: "square", count: 3, color: "red", label: "3 squares" }
        ],
        options: [
          { id: "1", shape: "triangle", count: 2, color: "green", label: "2 triangles" },
          { id: "2", shape: "circle", count: 3, color: "blue", label: "3 circles" },
          { id: "3", shape: "square", count: 2, color: "red", label: "2 squares" },
          { id: "4", shape: "square", count: 1, color: "red", label: "1 square" }
        ],
        correctAnswer: "3"
      },
      {
        id: 34,
        ageGroup: "8-9",
        type: "matrix_3x3_pattern", 
        question: "What goes in the middle-right cell?",
        sequence: [
          { shape: "square", size: "small", rotation: 0, color: "purple", label: "Small square" },
          { shape: "square", size: "small", rotation: 90, color: "purple", label: "Small rotated square" },
          { shape: "square", size: "small", rotation: 180, color: "purple", label: "Small rotated square" },
          { shape: "triangle", size: "medium", rotation: 0, color: "orange", label: "Medium triangle" },
          null,
          { shape: "triangle", size: "medium", rotation: 180, color: "orange", label: "Medium rotated triangle" },
          { shape: "star", size: "big", rotation: 0, color: "teal", label: "Large star" },
          { shape: "star", size: "big", rotation: 90, color: "teal", label: "Large rotated star" },
          { shape: "star", size: "big", rotation: 180, color: "teal", label: "Large rotated star" }
        ],
        options: [
          { id: "1", shape: "circle", size: "big", color: "yellow", label: "Large circle" },
          { id: "2", shape: "triangle", size: "medium", rotation: 90, color: "orange", label: "Medium rotated triangle" },
          { id: "3", shape: "star", size: "medium", color: "teal", label: "Medium star" },
          { id: "4", shape: "square", size: "small", color: "purple", label: "Small square" }
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
}

// Include all age group questions
const QUESTIONS = [
  ...QUESTION_GROUPS["2.5-3.5"].questions,
  ...QUESTION_GROUPS["3.5-4"].questions,
  ...QUESTION_GROUPS["4.5-5"].questions,
  ...QUESTION_GROUPS["6-7"].questions,
  ...QUESTION_GROUPS["8-9"].questions,
  ...QUESTION_GROUPS["10-11"].questions
]

export default function StudentPatternReasoning() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: any}>({})
  const [testState, setTestState] = useState("active")
  const [showOptions, setShowOptions] = useState(true)


  useEffect(() => {
    // Get student info - only on client side
    if (typeof window !== 'undefined') {
      const studentData = localStorage.getItem(`student_${sessionId}`)
      if (studentData) {
        setStudentInfo(JSON.parse(studentData))
      }
    }
  }, [sessionId])


  // Poll for examiner commands when in waiting state
  useEffect(() => {
    if (testState === "waiting" && typeof window !== 'undefined') {
      const pollForNextSubtest = () => {
        try {
          const examinerCommand = localStorage.getItem(`examinerCommand_${sessionId}`)
          if (examinerCommand) {
            const command = JSON.parse(examinerCommand)
            if (command.action === "complete_test") {
              localStorage.removeItem(`examinerCommand_${sessionId}`)
              setTestState("completed")
            }
          }
        } catch (error) {
          console.error("Error polling for examiner commands:", error)
        }
      }

      pollForNextSubtest()
      const interval = setInterval(pollForNextSubtest, 1000)
      return () => clearInterval(interval)
    }
  }, [testState, sessionId, router])

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers }
    newAnswers[currentQuestion] = {
      answer: answer,
      isComplete: true
    }
    
    setAnswers(newAnswers)
    
    // Update test state for examiner
    if (typeof window !== 'undefined') {
      const currentTestState = {
        currentQuestion,
        answers: newAnswers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'pattern-reasoning'
      }
      localStorage.setItem(`patternReasoningTestState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleFinishTest = () => {
    const testResults = QUESTIONS.map((question, index) => {
      const answer = answers[index]
      const isCorrect = answer?.answer === question.correctAnswer
      
      return {
        questionId: question.id,
        answer,
        isCorrect,
        timestamp: new Date().toISOString()
      }
    })
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pattern_reasoning_test_${sessionId}`, JSON.stringify(testResults))
      
      // Mark as waiting for examiner
      const waitingState = {
        testComplete: true,
        currentSubtest: "pattern_reasoning_complete",
        studentName: studentInfo?.firstName || 'Student'
      }
      localStorage.setItem(`waitingState_${sessionId}`, JSON.stringify(waitingState))
      
      // Notify examiner that test is completed
      localStorage.setItem(`test_completed_${sessionId}`, JSON.stringify({
        completed: true,
        subtest: "pattern-reasoning",
        timestamp: new Date().toISOString()
      }))
    }
    
    setTestState("waiting")
  }

  // Render triangle with rotation - make it fill the available space
  const renderTriangle = (rotation: number) => {
    return (
      <div 
        style={{ 
          transform: `rotate(${rotation}deg)`,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width="70" height="70" viewBox="0 0 70 70">
          <polygon 
            points="35,8 60,55 10,55"
            fill="#3B82F6" 
            stroke="#1E40AF" 
            strokeWidth="2"
          />
        </svg>
      </div>
    )
  }

  // Render complete SVG tile with background and border
  const renderSVGTile = (item: any, isQuestionMark = false, isSelected = false, size = 'large') => {
    const tileSize = size === 'small' ? 80 : 96 // w-20 h-20 (80px) or w-24 h-24 (96px)
    const borderWidth = 2
    const cornerRadius = 12
    
    // Determine tile colors based on state
    let fillColor = '#FFFFFF'
    let strokeColor = '#D1D5DB'
    let strokeDashArray = ''
    
    if (isQuestionMark && !item) {
      fillColor = '#DBEAFE'
      strokeColor = '#1E3A8A'
      strokeDashArray = '5,5'
    } else if (isSelected) {
      fillColor = '#DBEAFE'
      strokeColor = '#1E3A8A'
    }
    
    return (
      <svg width={tileSize} height={tileSize} className="shadow-sm">
        {/* Tile background and border */}
        <rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={tileSize - borderWidth}
          height={tileSize - borderWidth}
          rx={cornerRadius}
          ry={cornerRadius}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={borderWidth}
          strokeDasharray={strokeDashArray}
        />
        
        {/* Shape content */}
        {item ? (
          <g transform={`translate(${tileSize / 2}, ${tileSize / 2})`}>
            {renderShapeContent(item)}
          </g>
        ) : isQuestionMark ? (
          <text
            x={tileSize / 2}
            y={tileSize / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="32"
            fontWeight="bold"
            fill="#1E3A8A"
          >
            ?
          </text>
        ) : null}
      </svg>
    )
  }

  // Render shape with original div container (for backward compatibility)
  const renderShape = (item: any) => {
    return renderShapeContent(item)
  }

  // Render shape content (without the tile container)
  const renderShapeContent = (item: any) => {
    const colorMap: {[key: string]: {fill: string, stroke: string}} = {
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
    }

    const colors = colorMap[item.color] || { fill: '#2563EB', stroke: '#1D4ED8' }
    const size = item.size === 'big' ? 50 : 
                 item.size === 'small' ? 35 : 
                 item.size === 'medium' ? 42 :
                 item.size === 'tiny' ? 28 :
                 item.size === 'bigger' ? 55 : 42
    const viewBox = 70
    let centerX = viewBox / 2
    let centerY = viewBox / 2
    
    // Handle position property
    if (item.position) {
      switch(item.position) {
        case 'top':
          centerY = viewBox / 4
          break
        case 'bottom':
          centerY = (viewBox * 3) / 4
          break
        case 'left':
          centerX = viewBox / 3
          break
        case 'right':
          centerX = (viewBox * 2) / 3
          break
        case 'middle':
        default:
          // Keep center position
          break
      }
    }

    const commonStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%'
    }

    const viewBoxSize = 80

    switch (item.shape) {
      case 'circle':
        const circleCount = item.count || 1
        if (circleCount > 1) {
          // Handle multiple circles
          const positions = []
          if (circleCount === 2) {
            positions.push({ x: centerX - size/4, y: centerY })
            positions.push({ x: centerX + size/4, y: centerY })
          } else if (circleCount === 3) {
            positions.push({ x: centerX, y: centerY - size/4 })
            positions.push({ x: centerX - size/4, y: centerY + size/4 })
            positions.push({ x: centerX + size/4, y: centerY + size/4 })
          }
          
          return (
            <>
              {positions.map((pos, i) => (
                <circle 
                  key={i}
                  cx={pos.x - centerX} 
                  cy={pos.y - centerY} 
                  r={size / 4}
                  fill={item.style === 'outline' ? 'none' : colors.fill}
                  stroke={colors.stroke} 
                  strokeWidth="2"
                />
              ))}
            </>
          )
        }
        
        return (
          <>
            {item.modifier === 'stripe' && (
              <defs>
                <pattern id="stripePatternCircle" patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={colors.fill}/>
                  <rect width="2" height="4" fill="black"/>
                </pattern>
              </defs>
            )}
            <circle 
              cx={0} 
              cy={0} 
              r={size / 2}
              fill={item.style === 'outline' ? 'none' : (item.modifier === 'stripe' ? 'url(#stripePatternCircle)' : colors.fill)}
                stroke={colors.stroke} 
                strokeWidth="2"
                transform={item.reflected ? `scale(-1, 1) translate(${-2 * centerX}, 0)` : undefined}
              />
              {item.modifier === 'dot' && (
                <circle
                  cx={0}
                  cy={0}
                  r={size / 8}
                  fill="black"
                />
              )}
          </>
        )

      case 'square':
        const squareCount = item.count || 1
        if (squareCount > 1) {
          // Handle multiple squares
          const positions = []
          if (squareCount === 2) {
            positions.push({ x: centerX - size/4, y: centerY })
            positions.push({ x: centerX + size/4, y: centerY })
          } else if (squareCount === 3) {
            positions.push({ x: centerX, y: centerY - size/4 })
            positions.push({ x: centerX - size/4, y: centerY + size/4 })
            positions.push({ x: centerX + size/4, y: centerY + size/4 })
          }
          
          return (
            <>
              {positions.map((pos, i) => (
                <rect 
                  key={i}
                  x={pos.x - centerX - size/6} 
                  y={pos.y - centerY - size/6} 
                  width={size/3} 
                  height={size/3}
                  fill={item.style === 'outline' ? 'none' : colors.fill}
                  stroke={colors.stroke} 
                  strokeWidth="2"
                  rx="2"
                />
              ))}
            </>
          )
        }
        
        return (
          <>
            {item.modifier === 'stripe' && (
              <defs>
                <pattern id="stripePatternSquare" patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={colors.fill}/>
                  <rect width="2" height="4" fill="black"/>
                </pattern>
              </defs>
            )}
            <rect 
              x={-size / 2} 
              y={-size / 2} 
              width={size} 
              height={size}
              fill={item.style === 'outline' ? 'none' : (item.modifier === 'stripe' ? 'url(#stripePatternSquare)' : colors.fill)}
              stroke={colors.stroke} 
              strokeWidth="2"
              rx="3"
              transform={item.reflected ? `scale(-1, 1)` : undefined}
            />
          </>
        )

      case 'triangle':
        const rotation = item.rotation || 0
        const triangleCount = item.count || 1
        
        if (triangleCount > 1) {
          // Handle multiple triangles
          const positions = []
          if (triangleCount === 2) {
            positions.push({ x: centerX - size/4, y: centerY })
            positions.push({ x: centerX + size/4, y: centerY })
          } else if (triangleCount === 3) {
            positions.push({ x: centerX, y: centerY - size/4 })
            positions.push({ x: centerX - size/4, y: centerY + size/4 })
            positions.push({ x: centerX + size/4, y: centerY + size/4 })
          }
          
          return (
            <div style={commonStyle}>
              <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
                {positions.map((pos, i) => (
                  <polygon 
                    key={i}
                    points={`${pos.x},${pos.y - size / 6} ${pos.x + size / 6},${pos.y + size / 6} ${pos.x - size / 6},${pos.y + size / 6}`}
                    fill={item.style === 'outline' ? 'none' : colors.fill}
                    stroke={colors.stroke} 
                    strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
          )
        }
        
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {item.modifier === 'stripe' && (
                <defs>
                  <pattern id="stripePattern" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill={colors.fill}/>
                    <rect width="2" height="4" fill="black"/>
                  </pattern>
                </defs>
              )}
              <polygon 
                points={`${centerX},${centerY - size / 2} ${centerX + size / 2},${centerY + size / 2} ${centerX - size / 2},${centerY + size / 2}`}
                fill={item.style === 'outline' ? 'none' : (item.modifier === 'stripe' ? 'url(#stripePattern)' : colors.fill)} 
                stroke={colors.stroke} 
                strokeWidth="2"
                transform={item.reflected ? `rotate(${rotation} ${centerX} ${centerY}) scale(-1, 1) translate(${-2 * centerX}, 0)` : `rotate(${rotation} ${centerX} ${centerY})`}
              />
              {item.modifier === 'dot' && (
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={size / 8}
                  fill="black"
                  transform={item.reflected ? `rotate(${rotation} ${centerX} ${centerY}) scale(-1, 1) translate(${-2 * centerX}, 0)` : `rotate(${rotation} ${centerX} ${centerY})`}
                />
              )}
            </svg>
          </div>
        )

      case 'diamond':
        if (item.color === 'split' && item.topColor && item.bottomColor) {
          const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' }
          const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' }
          
          return (
            <div style={commonStyle}>
              <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
                <g transform={item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : undefined}>
                  {/* Top half of diamond */}
                  <polygon 
                    points={`${centerX},${centerY - size / 2} ${centerX + size / 2},${centerY} ${centerX},${centerY} ${centerX - size / 2},${centerY}`}
                    fill={topColors.fill} 
                    stroke={colors.stroke} 
                    strokeWidth="2"
                  />
                  {/* Bottom half of diamond */}
                  <polygon 
                    points={`${centerX - size / 2},${centerY} ${centerX},${centerY} ${centerX + size / 2},${centerY} ${centerX},${centerY + size / 2}`}
                    fill={bottomColors.fill} 
                    stroke={colors.stroke} 
                    strokeWidth="2"
                  />
                </g>
              </svg>
            </div>
          )
        }
        
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <polygon 
                points={`${centerX},${centerY - size / 2} ${centerX + size / 2},${centerY} ${centerX},${centerY + size / 2} ${centerX - size / 2},${centerY}`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
                transform={item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : undefined}
              />
            </svg>
          </div>
        )

      case 'star':
        const starCount = item.count || 1
        // Much more aggressive adaptive sizing for better fit
        let adaptiveStarSize, adaptiveSpacing
        
        if (starCount === 1) {
          adaptiveStarSize = size / 2
          adaptiveSpacing = 0
        } else if (starCount === 2) {
          adaptiveStarSize = size / 4
          adaptiveSpacing = 25
        } else if (starCount === 3) {
          adaptiveStarSize = size / 6
          adaptiveSpacing = 18
        } else if (starCount === 4) {
          adaptiveStarSize = size / 8
          adaptiveSpacing = 14
        } else if (starCount === 5) {
          adaptiveStarSize = size / 10
          adaptiveSpacing = 11
        } else {
          adaptiveStarSize = size / 12
          adaptiveSpacing = 9
        }
        
        const innerRadius = adaptiveStarSize * 0.4
        const starTotalWidth = (starCount - 1) * adaptiveSpacing
        const starStartX = centerX - starTotalWidth / 2

        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {Array.from({ length: starCount }, (_, i) => {
                let starPoints = ''
                const starCenterX = starStartX + i * adaptiveSpacing
                for (let j = 0; j < 10; j++) {
                  const angle = (j * Math.PI) / 5
                  const radius = j % 2 === 0 ? adaptiveStarSize : innerRadius
                  const x = starCenterX + Math.cos(angle - Math.PI / 2) * radius
                  const y = centerY + Math.sin(angle - Math.PI / 2) * radius
                  starPoints += `${x},${y} `
                }
                return (
                  <polygon 
                    key={i}
                    points={starPoints}
                    fill={colors.fill} 
                    stroke={colors.stroke} 
                    strokeWidth="1"
                  />
                )
              })}
            </svg>
          </div>
        )

      case 'heart':
        const heartDirection = item.direction || 'up'
        let heartTransform = ''
        
        switch (heartDirection) {
          case 'down':
            heartTransform = `rotate(180 ${centerX} ${centerY})`
            break
          case 'left':
            heartTransform = `rotate(270 ${centerX} ${centerY})`
            break
          case 'right':
            heartTransform = `rotate(90 ${centerX} ${centerY})`
            break
          case 'up':
          default:
            heartTransform = `rotate(180 ${centerX} ${centerY})`
            break
        }
        
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <path 
                d={`M${centerX},${centerY + size * 0.3} C${centerX - size * 0.5},${centerY - size * 0.1} ${centerX - size * 0.5},${centerY - size * 0.5} ${centerX},${centerY - size * 0.2} C${centerX + size * 0.5},${centerY - size * 0.5} ${centerX + size * 0.5},${centerY - size * 0.1} ${centerX},${centerY + size * 0.3}Z`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
                transform={heartTransform}
              />
            </svg>
          </div>
        )

      case 'dots':
        const dotCount = item.count || 1
        
        // Multi-row dot layout with bigger dots
        let dotSize, dotsPerRow, rows
        
        if (dotCount <= 3) {
          dotSize = 8
          dotsPerRow = dotCount
          rows = 1
        } else if (dotCount <= 6) {
          dotSize = 7
          dotsPerRow = Math.ceil(dotCount / 2)
          rows = 2
        } else if (dotCount <= 12) {
          dotSize = 6
          dotsPerRow = Math.ceil(dotCount / 3)
          rows = 3
        } else if (dotCount <= 20) {
          dotSize = 5
          dotsPerRow = Math.ceil(dotCount / 4)
          rows = 4
        } else {
          dotSize = 4
          dotsPerRow = Math.ceil(dotCount / 5)
          rows = 5
        }
        
        const spacing = Math.min(12, (60 - dotsPerRow * dotSize) / (dotsPerRow + 1))
        const rowSpacing = Math.min(12, (60 - rows * dotSize) / (rows + 1))

        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {Array.from({ length: dotCount }, (_, i) => {
                const row = Math.floor(i / dotsPerRow)
                const col = i % dotsPerRow
                const dotsInThisRow = Math.min(dotsPerRow, dotCount - row * dotsPerRow)
                
                const totalRowWidth = dotsInThisRow * dotSize + (dotsInThisRow - 1) * spacing
                const startX = centerX - totalRowWidth / 2
                const startY = centerY - (rows * dotSize + (rows - 1) * rowSpacing) / 2
                
                const cx = startX + col * (dotSize + spacing) + dotSize / 2
                const cy = startY + row * (dotSize + rowSpacing) + dotSize / 2
                
                return (
                  <circle 
                    key={i}
                    cx={cx} 
                    cy={cy} 
                    r={dotSize / 2}
                    fill={colors.fill}
                    stroke={colors.stroke} 
                    strokeWidth="1"
                  />
                )
              })}
            </svg>
          </div>
        )

      case 'stars':
        const numStars = item.count || 1
        
        // Multi-row star layout
        let starSize, starsPerRow, starRows
        
        if (numStars <= 3) {
          starSize = 8
          starsPerRow = numStars
          starRows = 1
        } else if (numStars <= 6) {
          starSize = 7
          starsPerRow = Math.ceil(numStars / 2)
          starRows = 2
        } else if (numStars <= 12) {
          starSize = 6
          starsPerRow = Math.ceil(numStars / 3)
          starRows = 3
        } else if (numStars <= 20) {
          starSize = 5
          starsPerRow = Math.ceil(numStars / 4)
          starRows = 4
        } else {
          starSize = 4
          starsPerRow = Math.ceil(numStars / 5)
          starRows = 5
        }
        
        const starSpacing = Math.min(12, (60 - starsPerRow * starSize) / (starsPerRow + 1))
        const starRowSpacing = Math.min(12, (60 - starRows * starSize) / (starRows + 1))

        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {Array.from({ length: numStars }, (_, i) => {
                const row = Math.floor(i / starsPerRow)
                const col = i % starsPerRow
                const starsInThisRow = Math.min(starsPerRow, numStars - row * starsPerRow)
                
                const totalRowWidth = starsInThisRow * starSize + (starsInThisRow - 1) * starSpacing
                const startX = centerX - totalRowWidth / 2
                const startY = centerY - (starRows * starSize + (starRows - 1) * starRowSpacing) / 2
                
                const cx = startX + col * (starSize + starSpacing) + starSize / 2
                const cy = startY + row * (starSize + starRowSpacing) + starSize / 2
                
                const starRadius = starSize / 2
                const points = []
                for (let j = 0; j < 5; j++) {
                  const outerAngle = (j * 2 * Math.PI) / 5 - Math.PI / 2
                  const innerAngle = ((j + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2
                  const outerX = cx + Math.cos(outerAngle) * starRadius
                  const outerY = cy + Math.sin(outerAngle) * starRadius
                  const innerX = cx + Math.cos(innerAngle) * (starRadius * 0.4)
                  const innerY = cy + Math.sin(innerAngle) * (starRadius * 0.4)
                  points.push(`${outerX},${outerY}`)
                  points.push(`${innerX},${innerY}`)
                }
                
                return (
                  <polygon
                    key={i}
                    points={points.join(' ')}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="1"
                  />
                )
              })}
            </svg>
          </div>
        )

      default:
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <circle 
                cx={centerX} 
                cy={centerY} 
                r={size / 2}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )
        
      case 'hexagon':
        const hexagonDotCount = item.dotCount || 0
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {item.modifier === 'stripe' && (
                <defs>
                  <pattern id="stripePatternHex" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill={colors.fill}/>
                    <rect width="2" height="4" fill="black"/>
                  </pattern>
                </defs>
              )}
              <polygon 
                points={`${centerX + size/2},${centerY} ${centerX + size/4},${centerY - size/2} ${centerX - size/4},${centerY - size/2} ${centerX - size/2},${centerY} ${centerX - size/4},${centerY + size/2} ${centerX + size/4},${centerY + size/2}`}
                fill={item.modifier === 'stripe' ? 'url(#stripePatternHex)' : colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
                transform={item.rotation ? `rotate(${item.rotation} ${centerX} ${centerY})` : undefined}
              />
              {hexagonDotCount > 0 && Array.from({ length: hexagonDotCount }, (_, i) => {
                // Arrange dots in a small grid inside hexagon
                let dotX, dotY
                if (hexagonDotCount === 1) {
                  dotX = centerX
                  dotY = centerY
                } else if (hexagonDotCount === 2) {
                  dotX = centerX + (i === 0 ? -8 : 8)
                  dotY = centerY
                } else if (hexagonDotCount === 3) {
                  dotX = centerX + (i === 1 ? -8 : i === 2 ? 8 : 0)
                  dotY = centerY + (i === 0 ? -8 : 8)
                } else if (hexagonDotCount === 4) {
                  dotX = centerX + (i % 2 === 0 ? -8 : 8)
                  dotY = centerY + (i < 2 ? -8 : 8)
                } else {
                  // For more dots, arrange in a circle pattern
                  const angle = (i * 2 * Math.PI) / hexagonDotCount
                  dotX = centerX + Math.cos(angle) * 10
                  dotY = centerY + Math.sin(angle) * 10
                }
                
                return (
                  <circle 
                    key={i}
                    cx={dotX} 
                    cy={dotY} 
                    r={3}
                    fill="black"
                  />
                )
              })}
            </svg>
          </div>
        )
    }
  }

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (testState === "waiting") {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Wait</h2>
          <p className="text-gray-600">The next activity will begin soon.</p>
        </div>
      </div>
    )
  }

  if (testState === "completed") {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Great Job!</h2>
          <p className="text-gray-600">You completed the pattern reasoning test.</p>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">Pattern Reasoning</h1>
              <span className="text-sm text-gray-500">Welcome {studentInfo.firstName}</span>
            </div>
            <div className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-6 relative">
          {/* Age range indicator in top left corner */}
          <div className="absolute top-4 left-4 bg-blue-900 text-white px-3 py-1 rounded-md text-sm font-medium">
            Ages {question.ageGroup}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center mt-6">
            {question.question}
          </h2>

          {/* Pattern Sequence */}
          <div className="space-y-4">
            <div className="text-center">
              {/* Matrix questions (2x2 or 3x3 grid) or regular sequence */}
              {question.type === 'matrix_pattern' ? (
                <div className="flex justify-center mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Top-left */}
                    <div className="flex flex-col items-center">
                      {renderSVGTile(question.sequence[0])}
                    </div>
                    
                    {/* Top-right */}
                    <div className="flex flex-col items-center">
                      {renderSVGTile(question.sequence[1])}
                    </div>
                    
                    {/* Bottom-left */}
                    <div className="flex flex-col items-center">
                      {renderSVGTile(question.sequence[2])}
                    </div>
                    
                    {/* Bottom-right (question mark) */}
                    <div className="flex flex-col items-center">
                      {renderSVGTile(
                        answers[currentQuestion]?.answer 
                          ? question.options.find((opt: any) => opt.id === answers[currentQuestion].answer) 
                          : null,
                        !answers[currentQuestion]?.answer
                      )}
                    </div>
                  </div>
                </div>
              ) : question.type === 'matrix_3x3_pattern' ? (
                <div className="flex justify-center mb-4">
                  <div className="grid grid-cols-3 gap-3">
                    {question.sequence.map((item: any, index: number) => (
                      <div key={index} className="flex flex-col items-center">
                        {renderSVGTile(
                          item === null ? (
                            answers[currentQuestion]?.answer 
                              ? question.options.find((opt: any) => opt.id === answers[currentQuestion].answer) 
                              : null
                          ) : item,
                          item === null && !answers[currentQuestion]?.answer,
                          false,
                          'small'
                        )}
                      </div>
                    ))}
                    {/* Add the missing cell for bottom-right if not already present */}
                    {question.sequence.length === 8 && (
                      <div className="flex flex-col items-center">
                        {renderSVGTile(
                          answers[currentQuestion]?.answer 
                            ? question.options.find((opt: any) => opt.id === answers[currentQuestion].answer) 
                            : null,
                          !answers[currentQuestion]?.answer,
                          false,
                          'small'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Regular sequence display */
                <div className="flex justify-center items-center mb-4 gap-6">
                  {question.sequence.map((step: any, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="mb-2">
                        {renderSVGTile(step)}
                      </div>
                      <p className="text-lg font-bold text-gray-900">{index + 1}</p>
                    </div>
                  ))}
                  
                  {/* Fourth tile with question mark */}
                  <div className="flex flex-col items-center">
                    <div className="mb-2">
                      {renderSVGTile(
                        answers[currentQuestion]?.answer 
                          ? question.options.find((opt: any) => opt.id === answers[currentQuestion].answer) 
                          : null,
                        !answers[currentQuestion]?.answer
                      )}
                    </div>
                    <p className="text-lg font-bold text-gray-900">4</p>
                  </div>
                </div>
              )}
            </div>

            {/* Light grey divider line */}
            <div className="border-t border-gray-300 mx-8"></div>

            {/* Answer options below */}
            {showOptions && (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                  {question.options.map((option: any) => (
                    <div key={option.id} className="flex flex-col items-center">
                      <button
                        onClick={() => handleAnswer(option.id)}
                        className="transition-all mb-2 hover:scale-105"
                      >
                        {renderSVGTile(option, false, answers[currentQuestion]?.answer === option.id)}
                      </button>
                      <p className="text-lg font-bold text-gray-900">{option.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Question {currentQuestion + 1} of {QUESTIONS.length}
              </div>
              <select
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white"
              >
                {QUESTIONS.map((q, index) => (
                  <option key={q.id} value={index}>
                    Q{index + 1} (Ages {q.ageGroup})
                  </option>
                ))}
              </select>
            </div>

            {currentQuestion === QUESTIONS.length - 1 ? (
              <button
                onClick={handleFinishTest}
                disabled={!answers[currentQuestion]?.isComplete}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finish Test
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion]?.isComplete}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}