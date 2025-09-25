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
          { shape: "triangle", rotation: 270, color: "blue", label: "Triangle (pointing left)" }
        ],
        options: [
          { id: "1", shape: "triangle", rotation: 0, color: "blue", label: "Triangle (pointing up)" },
          { id: "2", shape: "triangle", rotation: 180, color: "blue", label: "Triangle (pointing down)" },
          { id: "3", shape: "triangle", rotation: 270, color: "blue", label: "Triangle (pointing left)" },
          { id: "4", shape: "triangle", rotation: 90, color: "blue", label: "Triangle (pointing right)" }
        ],
        correctAnswer: "1"
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
        type: "rotation_split_color_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 0, label: "Split-color circle with dot at top" },
          { shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 270, label: "Split-color circle with dot at left" },
          { shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 180, label: "Split-color circle with dot at bottom" },
          { shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 90, label: "Split-color circle with dot at right" }
        ],
        options: [
          { id: "1", shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 0, label: "Dot at top" },
          { id: "2", shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 90, label: "Dot at right" },
          { id: "3", shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 180, label: "Dot at bottom" },
          { id: "4", shape: "circle", color: "split", topColor: "yellow", bottomColor: "blue", modifier: "dot", rotation: 270, label: "Dot at left" }
        ],
        correctAnswer: "1"
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
          { id: "1", shape: "heart", size: "small", color: "pink", label: "Small heart" },
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
          { id: "2", shape: "square", color: "purple", modifier: "stripe", stroke: "red", label: "Purple striped square with red border" },
          { id: "3", shape: "square", color: "blue", modifier: "stripe", label: "Striped blue square" },
          { id: "4", shape: "square", color: "purple", modifier: "horizontal-stripe", stroke: "red", label: "Purple horizontal striped square with red border" }
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
          { shape: "square", size: "small", rotation: 0, color: "split", topColor: "purple", bottomColor: "pink", label: "Small split square" },
          { shape: "square", size: "small", rotation: 90, color: "split", topColor: "purple", bottomColor: "pink", label: "Small rotated split square" },
          { shape: "square", size: "small", rotation: 180, color: "split", topColor: "purple", bottomColor: "pink", label: "Small rotated split square" },
          { shape: "triangle", size: "medium", rotation: 0, color: "split", topColor: "orange", bottomColor: "yellow", label: "Medium split triangle" },
          null,
          { shape: "triangle", size: "medium", rotation: 180, color: "split", topColor: "orange", bottomColor: "yellow", label: "Medium rotated split triangle" },
          { shape: "star", size: "big", rotation: 0, color: "split", topColor: "teal", bottomColor: "blue", label: "Large split star" },
          { shape: "star", size: "big", rotation: 90, color: "split", topColor: "teal", bottomColor: "blue", label: "Large rotated split star" },
          { shape: "star", size: "big", rotation: 180, color: "split", topColor: "teal", bottomColor: "blue", label: "Large rotated split star" }
        ],
        options: [
          { id: "1", shape: "triangle", size: "medium", rotation: 0, color: "split", topColor: "orange", bottomColor: "yellow", label: "Medium triangle (0°)" },
          { id: "2", shape: "triangle", size: "medium", rotation: 90, color: "split", topColor: "orange", bottomColor: "yellow", label: "Medium triangle (90°)" },
          { id: "3", shape: "triangle", size: "medium", rotation: 180, color: "split", topColor: "orange", bottomColor: "yellow", label: "Medium triangle (180°)" },
          { id: "4", shape: "triangle", size: "medium", rotation: 270, color: "split", topColor: "orange", bottomColor: "yellow", label: "Medium triangle (270°)" }
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
      },
      {
        id: 37,
        ageGroup: "10-11",
        type: "size_rotation_sequence",
        question: "A star rotates 45° each step. Missing cell in row 1, col 3",
        sequence: [
          { shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 0, size: "medium" },
          { shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 45, size: "medium" },
          null, // Missing cell - should be medium star rotated 90°
          { shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 135, size: "medium" },
          { shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 180, size: "medium" }
        ],
        options: [
          { id: "1", shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 90, size: "medium", label: "Medium star rotated 90°" },
          { id: "2", shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 135, size: "medium", label: "Medium star rotated 135°" },
          { id: "3", shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 135, size: "medium", label: "Medium star rotated 135°" },
          { id: "4", shape: "star", color: "split", topColor: "pink", bottomColor: "blue", rotation: 45, size: "medium", label: "Medium star rotated 45°" }
        ],
        correctAnswer: "1"
      },
      {
        id: 38,
        ageGroup: "10-11",
        type: "matrix_transformation",
        question: "Complex multi-attribute pattern: Shapes cycle (square→triangle→circle), colors shift (blue/yellow→red/green→pink/purple), sizes grow (small→medium→big), rotations increase (0°→45°→90°). Missing: position [2,2]",
        grid: [
          [
            { shape: "square", color: "split", topColor: "blue", bottomColor: "yellow", rotation: 0, reflected: false, size: "small" },
            { shape: "triangle", color: "split", topColor: "red", bottomColor: "green", rotation: 45, reflected: false, size: "medium" },
            { shape: "circle", color: "split", topColor: "pink", bottomColor: "purple", rotation: 90, reflected: false, size: "big" }
          ],
          [
            { shape: "triangle", color: "split", topColor: "red", bottomColor: "green", rotation: 45, reflected: true, size: "medium" },
            { shape: "circle", color: "split", topColor: "pink", bottomColor: "purple", rotation: 90, reflected: true, size: "big" },
            { shape: "square", color: "split", topColor: "blue", bottomColor: "yellow", rotation: 135, reflected: true, size: "small" }
          ],
          [
            { shape: "circle", color: "split", topColor: "pink", bottomColor: "purple", rotation: 90, reflected: false, size: "big" },
            { shape: "square", color: "split", topColor: "blue", bottomColor: "yellow", rotation: 135, reflected: false, size: "small" },
            null // Missing cell - should be triangle with specific attributes
          ]
        ],
        options: [
          { id: "1", shape: "triangle", color: "split", topColor: "red", bottomColor: "green", rotation: 180, reflected: false, size: "medium", label: "Triangle: red/green, 180°, medium" },
          { id: "2", shape: "triangle", color: "split", topColor: "red", bottomColor: "green", rotation: 45, reflected: true, size: "medium", label: "Triangle: red/green, 45°, reflected, medium" },
          { id: "3", shape: "triangle", color: "split", topColor: "red", bottomColor: "green", rotation: 135, reflected: false, size: "big", label: "Triangle: red/green, 135°, big" },
          { id: "4", shape: "triangle", color: "split", topColor: "red", bottomColor: "green", rotation: 90, reflected: false, size: "small", label: "Triangle: red/green, 90°, small" }
        ],
        correctAnswer: "1"
      },
      {
        id: 39,
        ageGroup: "10-11",
        type: "sequence_pattern",
        question: "Mathematical sequence: Each step shows dots equal to the sum of the previous two numbers (like Fibonacci). Pattern: 1, 1, 2, 3, 5... Missing: position 8",
        sequence: [
          { shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 1 },
          { shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 1 },
          { shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 2 },
          { shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 3 },
          { shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 5 },
          { shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 8 },
          { shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 13 },
          null // Missing cell - should be 21 dots (8+13=21)
        ],
        options: [
          { id: "1", shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 21, label: "21 dots" },
          { id: "2", shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 14, label: "14 dots" },
          { id: "3", shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 20, label: "20 dots" },
          { id: "4", shape: "dots", color: "blue", rotation: 0, reflected: false, size: "medium", count: 15, label: "15 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 40,
        ageGroup: "10-11",
        type: "matrix_transformation",
        question: "Dual-rule matrix: Rule 1 = shapes alternate between filled and outline. Rule 2 = size increases down each column. Missing: bottom-right cell",
        grid: [
          [
            { shape: "star", color: "blue", style: "filled", size: "small", rotation: 0, reflected: false },
            { shape: "circle", color: "blue", style: "outline", size: "small", rotation: 0, reflected: false },
            { shape: "triangle", color: "blue", style: "filled", size: "small", rotation: 0, reflected: false }
          ],
          [
            { shape: "circle", color: "blue", style: "outline", size: "medium", rotation: 0, reflected: false },
            { shape: "triangle", color: "blue", style: "filled", size: "medium", rotation: 0, reflected: false },
            { shape: "square", color: "blue", style: "outline", size: "medium", rotation: 0, reflected: false }
          ],
          [
            { shape: "triangle", color: "blue", style: "filled", size: "large", rotation: 0, reflected: false },
            { shape: "square", color: "blue", style: "outline", size: "large", rotation: 0, reflected: false },
            null // Missing cell - should be star, filled, large
          ]
        ],
        options: [
          { id: "1", shape: "star", color: "blue", style: "filled", size: "large", rotation: 0, reflected: false, label: "Large filled star" },
          { id: "2", shape: "circle", color: "blue", style: "outline", size: "large", rotation: 0, reflected: false, label: "Large outline circle" },
          { id: "3", shape: "square", color: "blue", style: "filled", size: "large", rotation: 0, reflected: false, label: "Large filled square" },
          { id: "4", shape: "star", color: "blue", style: "filled", size: "small", rotation: 0, reflected: false, label: "Small filled star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 41,
        ageGroup: "10-11",
        type: "sequence_pattern",
        question: "Heart reflection sequence: Hearts alternate between facing left and facing right. Pattern: left→right→left→right... Missing: position 8",
        sequence: [
          { shape: "heart", color: "red", rotation: 0, reflected: false, size: "medium", direction: "left" },
          { shape: "heart", color: "red", rotation: 0, reflected: true, size: "medium", direction: "right" },
          { shape: "heart", color: "red", rotation: 0, reflected: false, size: "medium", direction: "left" },
          { shape: "heart", color: "red", rotation: 0, reflected: true, size: "medium", direction: "right" },
          { shape: "heart", color: "red", rotation: 0, reflected: false, size: "medium", direction: "left" },
          { shape: "heart", color: "red", rotation: 0, reflected: true, size: "medium", direction: "right" },
          { shape: "heart", color: "red", rotation: 0, reflected: false, size: "medium", direction: "left" },
          null // Missing cell - should be heart facing right (reflected: true)
        ],
        options: [
          { id: "1", shape: "heart", color: "red", rotation: 0, reflected: true, size: "medium", direction: "right", label: "Heart facing right" },
          { id: "2", shape: "heart", color: "red", rotation: 0, reflected: false, size: "medium", direction: "left", label: "Heart facing left" },
          { id: "3", shape: "heart", color: "blue", rotation: 0, reflected: true, size: "medium", direction: "right", label: "Blue heart facing right" },
          { id: "4", shape: "heart", color: "red", rotation: 0, reflected: true, size: "large", direction: "right", label: "Large heart facing right" }
        ],
        correctAnswer: "1"
      },
      {
        id: 42,
        ageGroup: "10-11",
        type: "matrix_transformation",
        question: "4x4 Circle shading pattern: Each row shifts the sequence (filled→outline→left-half→right-half) one position to the right. Missing: position (2,2).",
        grid: [
          [
            { shape: "circle", color: "blue", size: "medium", style: "filled", label: "Filled circle" },
            { shape: "circle", color: "blue", size: "medium", style: "outline", label: "Outline circle" },
            { shape: "circle", color: "split", size: "medium", topColor: "red", bottomColor: "blue", label: "Red-blue split circle" },
            { shape: "circle", color: "split", size: "medium", topColor: "blue", bottomColor: "red", label: "Blue-red split circle" }
          ],
          [
            { shape: "circle", color: "blue", size: "medium", style: "outline", label: "Outline circle" },
            null, // Missing cell - should be red-blue split circle with 90-degree rotation
            { shape: "circle", color: "split", size: "medium", topColor: "blue", bottomColor: "red", rotation: 90, label: "Blue-red split circle (vertical)" },
            { shape: "circle", color: "blue", size: "medium", style: "filled", label: "Filled circle" }
          ],
          [
            { shape: "circle", color: "split", size: "medium", topColor: "red", bottomColor: "blue", label: "Red-blue split circle" },
            { shape: "circle", color: "split", size: "medium", topColor: "blue", bottomColor: "red", label: "Blue-red split circle" },
            { shape: "circle", color: "blue", size: "medium", style: "filled", label: "Filled circle" },
            { shape: "circle", color: "blue", size: "medium", style: "outline", label: "Outline circle" }
          ],
          [
            { shape: "circle", color: "split", size: "medium", topColor: "blue", bottomColor: "red", rotation: 90, label: "Blue-red split circle (vertical)" },
            { shape: "circle", color: "blue", size: "medium", style: "filled", label: "Filled circle" },
            { shape: "circle", color: "blue", size: "medium", style: "outline", label: "Outline circle" },
            { shape: "circle", color: "split", size: "medium", topColor: "red", bottomColor: "blue", rotation: 90, label: "Red-blue split circle (vertical)" }
          ]
        ],
        options: [
          { id: "1", shape: "circle", color: "split", size: "medium", topColor: "red", bottomColor: "blue", rotation: 90, label: "Red-blue split circle (vertical)" },
          { id: "2", shape: "circle", color: "split", size: "medium", topColor: "red", bottomColor: "blue", label: "Red-blue split circle (horizontal)" },
          { id: "3", shape: "circle", color: "blue", size: "medium", style: "outline", label: "Outline circle" },
          { id: "4", shape: "circle", color: "split", size: "medium", topColor: "blue", bottomColor: "red", rotation: 90, label: "Blue-red split circle (vertical)" }
        ],
        correctAnswer: "1"
      }
    ]
  },
  "12-14": {
    questions: [
      {
        id: 43,
        ageGroup: "12-14",
        type: "sequence_pattern",
        question: "Dual transformation: A square rotates 90° clockwise each step, and at the same time its shading alternates between filled and outline. After: (filled square → rotated outline square → filled rotated square)… Missing: position 6",
        sequence: [
          { shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "filled", rotation: 0 },
          { shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "outline", rotation: 0 },
          { shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "filled", rotation: 90 },
          { shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "outline", rotation: 90 },
          { shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "filled", rotation: 180 },
          null // Missing cell - should be outline square rotated 180°
        ],
        options: [
          { id: "1", shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "outline", rotation: 180, label: "Split-color outline square rotated 180°" },
          { id: "2", shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "outline", rotation: 0, label: "Split-color outline square not rotated" },
          { id: "3", shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "outline", rotation: 90, label: "Split-color outline square rotated 90°" },
          { id: "4", shape: "square", color: "split", topColor: "yellow", bottomColor: "purple", size: "medium", style: "outline", rotation: 270, label: "Split-color outline square rotated 270°" }
        ],
        correctAnswer: "1"
      },
      {
        id: 44,
        ageGroup: "12-14",
        type: "matrix_transformation",
        question: "Complex 3×3 matrix: Row rule = shapes change AND rotate 45°. Column rule = colors change AND size increases. Diagonal rule = fill/outline alternates. Missing: center cell.",
        grid: [
          [
            { shape: "triangle", color: "red", size: "small", style: "filled", rotation: 0, label: "Small red filled triangle" },
            { shape: "square", color: "red", size: "small", style: "outline", rotation: 45, label: "Small red outline square rotated 45°" },
            { shape: "circle", color: "red", size: "small", style: "filled", rotation: 90, label: "Small red filled circle rotated 90°" }
          ],
          [
            { shape: "triangle", color: "blue", size: "medium", style: "outline", rotation: 0, label: "Medium blue outline triangle" },
            null, // Missing cell - should be medium blue filled square rotated 45°
            { shape: "circle", color: "blue", size: "medium", style: "outline", rotation: 90, label: "Medium blue outline circle rotated 90°" }
          ],
          [
            { shape: "triangle", color: "green", size: "big", style: "filled", rotation: 0, label: "Large green filled triangle" },
            { shape: "square", color: "green", size: "big", style: "outline", rotation: 45, label: "Large green outline square rotated 45°" },
            { shape: "circle", color: "green", size: "big", style: "filled", rotation: 90, label: "Large green filled circle rotated 90°" }
          ]
        ],
        options: [
          { id: "1", shape: "square", color: "blue", size: "medium", style: "filled", rotation: 45, label: "Medium blue filled square rotated 45°" },
          { id: "2", shape: "square", color: "blue", size: "medium", style: "outline", rotation: 45, label: "Medium blue outline square rotated 45°" },
          { id: "3", shape: "triangle", color: "blue", size: "medium", style: "filled", rotation: 0, label: "Medium blue filled triangle" },
          { id: "4", shape: "circle", color: "blue", size: "medium", style: "filled", rotation: 45, label: "Medium blue filled circle rotated 45°" }
        ],
        correctAnswer: "1"
      },
      {
        id: 45,
        ageGroup: "12-14",
        type: "sequence_pattern",
        question: "A sequence of yellow hearts changes in two ways at once: Orientation flips left/right every step, and Size alternates Small ↔ Large. Step 1: Yellow heart, Left, Small. Step 2: Yellow heart, Right, Large. Question: What will Step 8 look like?",
        sequence: [
          { shape: "heart", color: "yellow", reflected: false, size: "small", direction: "left" },
          { shape: "heart", color: "yellow", reflected: true, size: "big", direction: "right" },
          { shape: "heart", color: "yellow", reflected: false, size: "small", direction: "left" },
          { shape: "heart", color: "yellow", reflected: true, size: "big", direction: "right" },
          { shape: "heart", color: "yellow", reflected: true, size: "small", direction: "right" }, // Second cycle: flips to Right
          { shape: "heart", color: "yellow", reflected: false, size: "big", direction: "left" }, // flips to Left
          { shape: "heart", color: "yellow", reflected: true, size: "small", direction: "right" }, // flips to Right
          null  // Step 8: Yellow heart, Left, Large (flips to Left)
        ],
        options: [
          { id: "1", shape: "heart", color: "yellow", reflected: false, size: "big", direction: "left", label: "Yellow heart, Left, Large" },
          { id: "2", shape: "heart", color: "yellow", reflected: true, size: "small", direction: "right", label: "Yellow heart, Right, Small" },
          { id: "3", shape: "heart", color: "yellow", reflected: false, size: "small", direction: "left", label: "Yellow heart, Left, Small" },
          { id: "4", shape: "heart", color: "yellow", reflected: true, size: "big", direction: "right", label: "Yellow heart, Right, Large" }
        ],
        correctAnswer: "1"
      },
      {
        id: 46,
        ageGroup: "12-14",
        type: "sequence_pattern",
        question: "A sequence of yellow triangles changes in two ways at once: First 4 steps rotate counter-clockwise (0°, 90°, 180°, 270°), then next 4 rotate clockwise (270°, 180°, 90°, 0°). Size cycles in groups of 2: Big, Big, Small, Small, Medium, Medium, then repeats. Question: What will Step 8 look like?",
        sequence: [
          { shape: "triangle", color: "yellow", rotation: 0, size: "big" },      // Step 1: Yellow, 0°, Big
          { shape: "triangle", color: "yellow", rotation: 90, size: "big" },     // Step 2: Yellow, 90°, Big  
          { shape: "triangle", color: "yellow", rotation: 180, size: "small" },  // Step 3: Yellow, 180°, Small
          { shape: "triangle", color: "yellow", rotation: 270, size: "small" },  // Step 4: Yellow, 270°, Small
          { shape: "triangle", color: "yellow", rotation: 180, size: "medium" }, // Step 5: Yellow, 180°, Medium (clockwise starts)
          { shape: "triangle", color: "yellow", rotation: 90, size: "medium" },  // Step 6: Yellow, 90°, Medium
          { shape: "triangle", color: "yellow", rotation: 0, size: "big" },      // Step 7: Yellow, 0°, Big (size cycle repeats)
          null  // Step 8: Yellow, 270°, Big (clockwise continues, size cycle continues)
        ],
        options: [
          { id: "1", shape: "triangle", color: "yellow", rotation: 270, size: "big", label: "Yellow triangle, 270°, Big" },
          { id: "2", shape: "triangle", color: "yellow", rotation: 180, size: "big", label: "Yellow triangle, 180°, Big" },
          { id: "3", shape: "triangle", color: "yellow", rotation: 90, size: "small", label: "Yellow triangle, 90°, Small" },
          { id: "4", shape: "triangle", color: "yellow", rotation: 0, size: "medium", label: "Yellow triangle, 0°, Medium" }
        ],
        correctAnswer: "1"
      },
      {
        id: 47,
        ageGroup: "12-14",
        type: "matrix_transformation",
        question: "What goes in position 12?",
        grid: [
          [
            { shape: "heart", color: "red", reflected: false, size: "medium", direction: "left" },   // Pos 1: Red, Left (normal)
            { shape: "heart", color: "blue", reflected: true, size: "medium", direction: "right" },  // Pos 2: Blue, Right (normal flip)
            { shape: "heart", color: "green", reflected: false, size: "medium", direction: "left" }, // Pos 3: Green, Left (normal flip)
            { shape: "heart", color: "blue", reflected: false, size: "medium", direction: "left" }    // Pos 4: Special rule - Blue (skip 2: G→R→B→G, so G+2=B), Left (no flip)
          ],
          [
            { shape: "heart", color: "green", reflected: true, size: "medium", direction: "right" }, // Pos 5: Green, Right (normal from pos 4 Blue)
            { shape: "heart", color: "red", reflected: false, size: "medium", direction: "left" },   // Pos 6: Red, Left (normal)
            { shape: "heart", color: "blue", reflected: true, size: "medium", direction: "right" },  // Pos 7: Blue, Right (normal)
            { shape: "heart", color: "red", reflected: true, size: "medium", direction: "right" }    // Pos 8: Special rule - Red (skip 2: B→G→R→B, so B+2=R), Right (no flip from pos 7)
          ],
          [
            { shape: "heart", color: "green", reflected: false, size: "medium", direction: "left" },  // Pos 9: Green, Left (normal from pos 8 Red)
            { shape: "heart", color: "blue", reflected: true, size: "medium", direction: "right" },   // Pos 10: Blue, Right (normal)
            { shape: "heart", color: "green", reflected: false, size: "medium", direction: "left" },  // Pos 11: Green, Left (normal)
            null // Pos 12: Special rule - Red (skip 2: G→R→B→G, so G+2=B), Left (no flip from pos 11)
          ]
        ],
        options: [
          { id: "1", shape: "heart", color: "blue", reflected: false, size: "medium", direction: "left", label: "Blue heart, Left" },
          { id: "2", shape: "heart", color: "red", reflected: false, size: "medium", direction: "left", label: "Red heart, Left" },
          { id: "3", shape: "heart", color: "green", reflected: true, size: "medium", direction: "right", label: "Green heart, Right" },
          { id: "4", shape: "heart", color: "blue", reflected: true, size: "medium", direction: "right", label: "Blue heart, Right" }
        ],
        correctAnswer: "1"
      },
      {
        id: 48,
        ageGroup: "12-14",
        type: "matrix_transformation",
        question: "What goes in position 10?",
        grid: [
          [
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 0, size: "medium" },         // Pos 1: Red/Blue, 0° (Rule A: start)
            { shape: "star", color: "split", topColor: "green", bottomColor: "orange", rotation: 0, size: "medium" },     // Pos 2: Green/Orange, 0° (Rule B: start)
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 90, size: "medium" },        // Pos 3: Red/Blue, 90° (Rule A: +90° clockwise)
            { shape: "star", color: "split", topColor: "purple", bottomColor: "yellow", rotation: 270, size: "medium" },  // Pos 4: Purple/Yellow, 270° (Rule B: -90° counter-clockwise)
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 180, size: "medium" }        // Pos 5: Red/Blue, 180° (Rule A: +90° clockwise)
          ],
          [
            { shape: "star", color: "split", topColor: "pink", bottomColor: "black", rotation: 180, size: "medium" },     // Pos 6: Pink/Black, 180° (Rule B: -90° counter-clockwise)
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 270, size: "medium" },       // Pos 7: Red/Blue, 270° (Rule A: +90° clockwise)
            { shape: "star", color: "split", topColor: "green", bottomColor: "orange", rotation: 90, size: "medium" },    // Pos 8: Green/Orange, 90° (Rule B: -90° counter-clockwise, cycle repeats)
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 0, size: "medium" },         // Pos 9: Red/Blue, 0° (Rule A: +90° clockwise, back to 0°)
            null // Pos 10: Purple/Yellow, 0° (Rule B: -90° counter-clockwise, back to 0°, next color)
          ]
        ],
        options: [
          { id: "1", shape: "star", color: "split", topColor: "purple", bottomColor: "yellow", rotation: 0, size: "medium", label: "Purple/Yellow star, 0°" },
          { id: "2", shape: "star", color: "split", topColor: "red", bottomColor: "pink", rotation: 0, size: "medium", label: "Red/Pink star, 0°" },
          { id: "3", shape: "star", color: "split", topColor: "pink", bottomColor: "black", rotation: 0, size: "medium", label: "Pink/Black star, 0°" },
          { id: "4", shape: "star", color: "split", topColor: "purple", bottomColor: "yellow", rotation: 270, size: "medium", label: "Purple/Yellow star, 270°" }
        ],
        correctAnswer: "1"
      },
      {
        id: 49,
        ageGroup: "15+",
        type: "matrix_transformation",
        question: "What goes in position 8?",
        grid: [
          [
            { shape: "arrow", color: "red", reflected: false, size: "small", direction: "left", strokeWidth: 1 },     // Pos 1: Red arrow, Left, Thin
            { shape: "arrow", color: "blue", reflected: true, size: "small", direction: "right", strokeWidth: 3 },   // Pos 2: Blue arrow, Right, Thick  
            { shape: "arrow", color: "green", reflected: false, size: "small", direction: "left", strokeWidth: 3 },  // Pos 3: Green arrow, Left, Thick
            { shape: "arrow", color: "red", reflected: true, size: "small", direction: "right", strokeWidth: 1 }     // Pos 4: Red arrow, Right, Thin
          ],
          [
            { shape: "arrow", color: "blue", reflected: false, size: "small", direction: "left", strokeWidth: 1 },   // Pos 5: Blue arrow, Left, Thin
            { shape: "arrow", color: "green", reflected: true, size: "small", direction: "right", strokeWidth: 3 },  // Pos 6: Green arrow, Right, Thick
            { shape: "arrow", color: "red", reflected: false, size: "small", direction: "left", strokeWidth: 3 },    // Pos 7: Red arrow, Left, Thick
            null // Pos 8: Missing - Blue arrow, Right, Thick
          ],
          [
            { shape: "arrow", color: "green", reflected: false, size: "small", direction: "left", strokeWidth: 1 },  // Pos 9: Green arrow, Left, Thin
            { shape: "arrow", color: "red", reflected: true, size: "small", direction: "right", strokeWidth: 3 },    // Pos 10: Red arrow, Right, Thick
            { shape: "arrow", color: "blue", reflected: false, size: "small", direction: "left", strokeWidth: 3 },   // Pos 11: Blue arrow, Left, Thick
            { shape: "arrow", color: "green", reflected: true, size: "small", direction: "right", strokeWidth: 1 }   // Pos 12: Green arrow, Right, Thin
          ]
        ],
        options: [
          { id: "A", shape: "arrow", color: "blue", reflected: true, size: "small", direction: "right", strokeWidth: 1, label: "Blue arrow, Right, Thin" },
          { id: "B", shape: "arrow", color: "blue", reflected: true, size: "small", direction: "right", strokeWidth: 3, label: "Blue arrow, Right, Thick" },
          { id: "C", shape: "arrow", color: "green", reflected: true, size: "small", direction: "right", strokeWidth: 1, label: "Green arrow, Right, Thin" },
          { id: "D", shape: "arrow", color: "blue", reflected: false, size: "small", direction: "left", strokeWidth: 1, label: "Blue arrow, Left, Thin" }
        ],
        correctAnswer: "B"
      }
    ]
  },
  "15+": {
    questions: [
      {
        id: 50,
        ageGroup: "15+",
        type: "matrix_transformation",
        question: "Colors pass from one diamond to the next following the path 1→2→3→6→5→4→7→8→9. What goes in the missing cell?",
        grid: [
          [
            { shape: "diamond", color: "split", topColor: "red", bottomColor: "blue", rotation: 0, strokeWidth: 1, size: "small" },     // Position 1: Red/Blue → Blue passes to position 2
            { shape: "diamond", color: "split", topColor: "blue", bottomColor: "green", rotation: 45, strokeWidth: 2, size: "small" },  // Position 2: Blue/Green → Green passes to position 3
            { shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 90, strokeWidth: 3, size: "small" } // Position 3: Green/Yellow → Yellow passes to position 6
          ],
          [
            { shape: "diamond", color: "split", topColor: "purple", bottomColor: "pink", rotation: 225, strokeWidth: 1, size: "medium" }, // Position 4: Purple/Pink → Pink passes to position 7
            { shape: "diamond", color: "split", topColor: "orange", bottomColor: "purple", rotation: 180, strokeWidth: 2, size: "medium" }, // Position 5: Orange/Purple → Purple passes to position 4
            null                                                                                                                             // Position 6 (missing): Yellow/Orange → Orange passes to position 5, rotation 135°
          ],
          [
            { shape: "diamond", color: "split", topColor: "pink", bottomColor: "cyan", rotation: 270, strokeWidth: 3, size: "big" },    // Position 7: Pink/Cyan → Cyan passes to position 8
            { shape: "diamond", color: "split", topColor: "cyan", bottomColor: "navy", rotation: 315, strokeWidth: 1, size: "big" },    // Position 8: Cyan/Navy → Navy passes to position 9  
            { shape: "diamond", color: "split", topColor: "navy", bottomColor: "lime", rotation: 0, strokeWidth: 2, size: "big" }       // Position 9: Navy/Lime
          ]
        ],
        options: [
          { id: "A", shape: "diamond", color: "split", topColor: "yellow", bottomColor: "orange", rotation: 135, strokeWidth: 3, size: "medium", label: "Yellow/Orange split diamond, 135° rotation" },
          { id: "B", shape: "diamond", color: "split", topColor: "green", bottomColor: "orange", rotation: 135, strokeWidth: 3, size: "medium", label: "Green/Orange split diamond" },
          { id: "C", shape: "diamond", color: "split", topColor: "yellow", bottomColor: "purple", rotation: 135, strokeWidth: 3, size: "medium", label: "Yellow/Purple split diamond" },
          { id: "D", shape: "diamond", color: "split", topColor: "orange", bottomColor: "yellow", rotation: 180, strokeWidth: 3, size: "medium", label: "Orange/Yellow split diamond, wrong rotation" }
        ],
        correctAnswer: "A"
      },
      {
        id: 51,
        ageGroup: "15+",
        type: "matrix_transformation", 
        question: "What goes in the missing position?",
        grid: [
          [
            { shape: "triangle", color: "split", topColor: "red", bottomColor: "blue", rotation: 20, size: "small" },       // R1C1: Red/Blue small triangle 20°
            { shape: "triangle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 40, size: "medium" },  // R1C2: Green/Yellow medium triangle 40°
            { shape: "triangle", color: "split", topColor: "blue", bottomColor: "red", rotation: 60, size: "large" },       // R1C3: Blue/Red large triangle 60°
            { shape: "triangle", color: "split", topColor: "yellow", bottomColor: "green", rotation: 80, size: "small" }    // R1C4: Yellow/Green small triangle 80°
          ],
          [
            { shape: "triangle", color: "split", topColor: "blue", bottomColor: "red", rotation: 100, size: "medium" },     // R2C1: Blue/Red medium triangle 100°
            { shape: "triangle", color: "split", topColor: "yellow", bottomColor: "green", rotation: 120, size: "large" },  // R2C2: Yellow/Green large triangle 120°
            { shape: "triangle", color: "split", topColor: "red", bottomColor: "blue", rotation: 140, size: "small" },      // R2C3: Red/Blue small triangle 140°
            { shape: "triangle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 160, size: "medium" }  // R2C4: Green/Yellow medium triangle 160°
          ],
          [
            { shape: "triangle", color: "split", topColor: "yellow", bottomColor: "green", rotation: 180, size: "large" },  // R3C1: Yellow/Green large triangle 180°
            { shape: "triangle", color: "split", topColor: "red", bottomColor: "blue", rotation: 200, size: "small" },      // R3C2: Red/Blue small triangle 200°
            { shape: "triangle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 220, size: "medium" }, // R3C3: Green/Yellow medium triangle 220°
            { shape: "triangle", color: "split", topColor: "blue", bottomColor: "red", rotation: 240, size: "large" }       // R3C4: Blue/Red large triangle 240°
          ],
          [
            { shape: "triangle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 260, size: "small" },  // R4C1: Green/Yellow small triangle 260°
            { shape: "triangle", color: "split", topColor: "blue", bottomColor: "red", rotation: 280, size: "medium" },     // R4C2: Blue/Red medium triangle 280°
            { shape: "triangle", color: "split", topColor: "yellow", bottomColor: "green", rotation: 300, size: "large" },  // R4C3: Yellow/Green large triangle 300°
            null                                                                                                             // R4C4: Missing - should be Red/Blue small triangle 320°
          ]
        ],
        options: [
          { id: "A", shape: "triangle", color: "split", topColor: "red", bottomColor: "blue", rotation: 320, size: "small", label: "Red-Blue small triangle 320°" },
          { id: "B", shape: "triangle", color: "split", topColor: "red", bottomColor: "blue", rotation: 320, size: "medium", label: "Red-Blue medium triangle 320°" },
          { id: "C", shape: "triangle", color: "split", topColor: "blue", bottomColor: "red", rotation: 320, size: "small", label: "Blue-Red small triangle 320°" },
          { id: "D", shape: "triangle", color: "split", topColor: "red", bottomColor: "blue", rotation: 300, size: "small", label: "Red-Blue small triangle 300°" }
        ],
        correctAnswer: "A"
      },
      {
        id: 52,
        ageGroup: "15+",
        type: "matrix_transformation",
        question: "A 3×4 grid (12 boxes) follows a mathematical pattern: For odd positions, use the position number. For even positions, add half the position number (e.g., position 2 = 2+1=3, position 4 = 4+2=6). All shapes are blue circles. Find the missing cell at position 10.",
        grid: [
          [
            { shapes: [{shape: "circle", color: "blue"}], gridPosition: "r1c1" }, // Position 1: 1 shape
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r1c2" }, // Position 2: 2+1=3 shapes
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r1c3" }, // Position 3: 3 shapes
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r1c4" } // Position 4: 4+2=6 shapes
          ],
          [
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r2c1" }, // Position 5: 5 shapes
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r2c2" }, // Position 6: 6+3=9 shapes
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r2c3" }, // Position 7: 7 shapes
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r2c4" } // Position 8: 8+4=12 shapes
          ],
          [
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r3c1" }, // Position 9: 9 shapes
            null, // Position 10: Missing - should be 15 shapes
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r3c3" }, // Position 11: 11 shapes
            { shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], gridPosition: "r3c4" } // Position 12: 12+6=18 shapes
          ]
        ],
        options: [
          { id: "A", shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], label: "15 blue circles" },
          { id: "B", shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], label: "12 blue circles" },
          { id: "C", shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], label: "10 blue circles" },
          { id: "D", shapes: [{shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}, {shape: "circle", color: "blue"}], label: "13 blue circles" }
        ],
        correctAnswer: "A"
      },
      {
        id: 53,
        ageGroup: "15+",
        type: "sequence",
        question: "Each tile increases by the number of sides of the current shape. If a circle counts as 0 sides, what comes next?",
        sequence: [
          { shapes: [{shape: "triangle", color: "blue"}] },                                    // 1 blue triangle (3 sides)
          { shapes: [{shape: "square", color: "yellow"}, {shape: "square", color: "yellow"}, {shape: "square", color: "yellow"}, {shape: "square", color: "yellow"}] },  // 4 yellow squares (1+3=4, square has 4 sides)
          { shapes: [{shape: "circle", color: "pink"}, {shape: "circle", color: "pink"}, {shape: "circle", color: "pink"}, {shape: "circle", color: "pink"}, {shape: "circle", color: "pink"}, {shape: "circle", color: "pink"}, {shape: "circle", color: "pink"}, {shape: "circle", color: "pink"}] }, // 8 pink circles (4+4=8, circle has 0 sides)
          { shapes: [{shape: "diamond", color: "green"}, {shape: "diamond", color: "green"}, {shape: "diamond", color: "green"}, {shape: "diamond", color: "green"}, {shape: "diamond", color: "green"}, {shape: "diamond", color: "green"}, {shape: "diamond", color: "green"}, {shape: "diamond", color: "green"}] }, // 8 green diamonds (8+0=8, diamond has 4 sides)
          null // Next: 12 blue triangles (8+4=12, triangle has 3 sides)
        ],
        options: [
          { id: "A", shapes: Array.from({length: 12}, () => ({shape: "triangle", color: "blue"})), label: "12 blue triangles" },
          { id: "B", shapes: Array.from({length: 11}, () => ({shape: "triangle", color: "blue"})), label: "11 blue triangles" },
          { id: "C", shapes: Array.from({length: 10}, () => ({shape: "triangle", color: "blue"})), label: "10 blue triangles" },
          { id: "D", shapes: Array.from({length: 13}, () => ({shape: "triangle", color: "blue"})), label: "13 blue triangles" }
        ],
        correctAnswer: "A"
      },
      {
        id: 54,
        ageGroup: "15+",
        type: "matrix_transformation",
        question: "What goes in the missing position?",
        grid: [
          [
            { shape: "triangle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 0 },        // R1C1: Green top, yellow bottom
            { shape: "square", color: "split", topColor: "green", bottomColor: "yellow", rotation: 60 },       // R1C2: Green top, yellow bottom
            { shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 120 }       // R1C3: Green top, yellow bottom
          ],
          [
            { shape: "square", color: "split", topColor: "green", bottomColor: "yellow", rotation: 60 },       // R2C1: Green top, yellow bottom
            { shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 120 },       // R2C2: Green top, yellow bottom
            { shape: "circle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 180 }      // R2C3: Green top, yellow bottom
          ],
          [
            { shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 120 },     // R3C1: Green top, yellow bottom
            { shape: "circle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 180 },      // R3C2: Green top, yellow bottom
            null                                                                                              // R3C3: Green top, yellow bottom
          ]
        ],
        options: [
          { id: "A", shape: "star", color: "split", topColor: "green", bottomColor: "yellow", rotation: 240, label: "Green-Yellow star 240°" },
          { id: "B", shape: "circle", color: "split", topColor: "green", bottomColor: "yellow", rotation: 240, label: "Green-Yellow circle 240°" },
          { id: "C", shape: "star", color: "split", topColor: "yellow", bottomColor: "green", rotation: 240, label: "Yellow-Green star 240°" },
          { id: "D", shape: "star", color: "split", topColor: "green", bottomColor: "yellow", rotation: 180, label: "Green-Yellow star 180°" }
        ],
        correctAnswer: "A"
      },
      {
        id: 55,
        ageGroup: "15+",
        type: "matrix_transformation",
        question: "What goes in the missing position?",
        grid: [
          [
            { shape: "triangle", color: "split", topColor: "red", bottomColor: "blue", rotation: 0 },      // Row 1: Shapes progress, colors cycle, rotation increases by 45°
            { shape: "square", color: "split", topColor: "blue", bottomColor: "green", rotation: 45 },     
            { shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 90 },   
            { shape: "circle", color: "split", topColor: "yellow", bottomColor: "red", rotation: 135 }  
          ],
          [
            { shape: "square", color: "split", topColor: "blue", bottomColor: "green", rotation: 45 },     // Row 2: Shifts one position right from row 1
            { shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 90 },       
            { shape: "circle", color: "split", topColor: "yellow", bottomColor: "red", rotation: 135 },        
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 180 }     
          ],
          [
            { shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 90 },   // Row 3: Shifts one position right from row 2
            { shape: "circle", color: "split", topColor: "yellow", bottomColor: "red", rotation: 135 },       
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 180 },       
            { shape: "triangle", color: "split", topColor: "blue", bottomColor: "green", rotation: 225 }         
          ],
          [
            { shape: "circle", color: "split", topColor: "yellow", bottomColor: "red", rotation: 135 },      // Row 4: Shifts one position right from row 3
            { shape: "star", color: "split", topColor: "red", bottomColor: "blue", rotation: 180 },    
            { shape: "triangle", color: "split", topColor: "blue", bottomColor: "green", rotation: 225 },        
            null                                                                                            // Should be: square, green/yellow, 270°
          ]
        ],
        options: [
          { id: "A", shape: "square", color: "split", topColor: "green", bottomColor: "yellow", rotation: 270, label: "Green-Yellow square 270°" },
          { id: "B", shape: "square", color: "split", topColor: "yellow", bottomColor: "green", rotation: 270, label: "Yellow-Green square 270°" },
          { id: "C", shape: "square", color: "split", topColor: "green", bottomColor: "yellow", rotation: 315, label: "Green-Yellow square 315°" },
          { id: "D", shape: "diamond", color: "split", topColor: "green", bottomColor: "yellow", rotation: 270, label: "Green-Yellow diamond 270°" }
        ],
        correctAnswer: "A"
      }
    ]
  }
}

// Include all age group questions
const ALL_QUESTIONS = [
  ...QUESTION_GROUPS["2.5-3.5"].questions,
  ...QUESTION_GROUPS["3.5-4"].questions,
  ...QUESTION_GROUPS["4.5-5"].questions,
  ...QUESTION_GROUPS["6-7"].questions,
  ...QUESTION_GROUPS["8-9"].questions,
  ...QUESTION_GROUPS["10-11"].questions,
  ...QUESTION_GROUPS["12-14"].questions,
  ...QUESTION_GROUPS["15+"].questions
]

const FILTERED_QUESTIONS_12_PLUS = [
  ...QUESTION_GROUPS["12-14"].questions,
  ...QUESTION_GROUPS["15+"].questions
]

// Function to render pure SVG shapes without tile wrapper for export - clean without borders
const renderPureSVG = (item: any, size = 100) => {
  if (!item) return null
  
  const centerX = size / 2
  const centerY = size / 2
  
  // Create a modified version of renderShapeContent but without borders
  const renderCleanShapeContent = () => {
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
      'amber': { fill: '#F59E0B', stroke: '#D97706' },
      'gray': { fill: '#6B7280', stroke: '#4B5563' },
      'slate': { fill: '#64748B', stroke: '#475569' },
      'zinc': { fill: '#71717A', stroke: '#52525B' },
      'neutral': { fill: '#737373', stroke: '#525252' },
      'stone': { fill: '#78716C', stroke: '#57534E' },
      'sky': { fill: '#0EA5E9', stroke: '#0284C7' },
      'emerald': { fill: '#10B981', stroke: '#059669' },
      'lime': { fill: '#84CC16', stroke: '#65A30D' },
      'yellow': { fill: '#EAB308', stroke: '#CA8A04' },
      'orange': { fill: '#F97316', stroke: '#EA580C' },
      'red': { fill: '#EF4444', stroke: '#DC2626' },
      'pink': { fill: '#EC4899', stroke: '#DB2777' },
      'fuchsia': { fill: '#D946EF', stroke: '#C026D3' },
      'purple': { fill: '#A855F7', stroke: '#9333EA' },
      'violet': { fill: '#8B5CF6', stroke: '#7C3AED' },
      'indigo': { fill: '#6366F1', stroke: '#4F46E5' },
      'blue': { fill: '#3B82F6', stroke: '#2563EB' },
      'cyan': { fill: '#06B6D4', stroke: '#0891B2' },
      'teal': { fill: '#14B8A6', stroke: '#0D9488' },
      'green': { fill: '#22C55E', stroke: '#16A34A' },
      'gold': { fill: '#FFD700', stroke: '#FFA500' },
      'crimson': { fill: '#DC143C', stroke: '#B91C1C' },
      'navy': { fill: '#000080', stroke: '#000060' },
      'maroon': { fill: '#800000', stroke: '#600000' },
      'turquoise': { fill: '#40E0D0', stroke: '#20C0B0' },
      'lavender': { fill: '#E6E6FA', stroke: '#D0D0E0' },
      'peach': { fill: '#FFCBA4', stroke: '#FF9A84' },
      'mint': { fill: '#98FB98', stroke: '#78DB78' },
      'aqua': { fill: '#00FFFF', stroke: '#00DFDF' }
    }

    if (!item) return null

    const shapeSize = size * 0.6 // Adjust size for clean export
    const colors = colorMap[item.color] || { fill: '#2563EB', stroke: '#1D4ED8' }
    const rotation = item.rotation || 0
    
    // Only use stroke if the shape is specifically outline style
    const strokeWidth = item.style === 'outline' ? 2 : 0
    const stroke = item.style === 'outline' ? colors.stroke : 'none'
    const fill = item.style === 'outline' ? 'none' : colors.fill

    switch (item.shape) {
      case 'circle':
        return (
          <circle 
            cx={0} 
            cy={0} 
            r={shapeSize / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            transform={item.reflected ? `scale(-1, 1)` : undefined}
          />
        )

      case 'square':
        const squareCustomStroke = item.stroke ? (colorMap[item.stroke]?.stroke || item.stroke) : stroke
        return (
          <>
            {(item.modifier === 'stripe' || item.modifier === 'horizontal-stripe') && (
              <defs>
                <pattern id={`pureStripePatternSquare_${item.modifier || 'stripe'}`} patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={colors.fill}/>
                  {item.modifier === 'horizontal-stripe' ? (
                    <rect width="4" height="2" fill="black"/>
                  ) : (
                    <rect width="2" height="4" fill="black"/>
                  )}
                </pattern>
              </defs>
            )}
            <rect 
              x={-shapeSize / 2} 
              y={-shapeSize / 2} 
              width={shapeSize} 
              height={shapeSize}
              fill={item.modifier === 'stripe' || item.modifier === 'horizontal-stripe' ? `url(#pureStripePatternSquare_${item.modifier || 'stripe'})` : fill}
              stroke={squareCustomStroke}
              strokeWidth={strokeWidth}
              rx="3"
              transform={item.reflected ? `scale(-1, 1)` : undefined}
            />
          </>
        )

      case 'triangle':
        const triangleRotation = item.rotation || 0
        return (
          <polygon 
            points={`0,${-shapeSize / 2} ${shapeSize / 2},${shapeSize / 2} ${-shapeSize / 2},${shapeSize / 2}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            transform={`${triangleRotation ? `rotate(${triangleRotation})` : ''} ${item.reflected ? 'scale(-1, 1)' : ''}`.trim()}
          />
        )

      case 'diamond':
        // Make diamond more directional - narrower width for clear pointing
        const diamondWidth = shapeSize * 0.6
        const diamondHeight = shapeSize
        return (
          <polygon 
            points={`0,${-diamondHeight / 2} ${diamondWidth / 2},0 0,${diamondHeight / 2} ${-diamondWidth / 2},0`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            transform={item.rotation ? `rotate(${item.rotation})` : undefined}
          />
        )

      case 'star':
        const starSize = shapeSize / 2
        let starPoints = ''
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5
          const radius = i % 2 === 0 ? starSize : starSize * 0.4
          const x = Math.cos(angle - Math.PI / 2) * radius
          const y = Math.sin(angle - Math.PI / 2) * radius
          starPoints += `${x},${y} `
        }
        return (
          <polygon 
            points={starPoints}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )

      case 'heart':
        return (
          <path 
            d={`M0,${shapeSize * 0.3} C${-shapeSize * 0.5},${-shapeSize * 0.1} ${-shapeSize * 0.5},${-shapeSize * 0.5} 0,${-shapeSize * 0.2} C${shapeSize * 0.5},${-shapeSize * 0.5} ${shapeSize * 0.5},${-shapeSize * 0.1} 0,${shapeSize * 0.3}Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )

      case 'dots':
        const dotCount = item.count || 1
        const dotSize = 6
        const spacing = 12
        return (
          <>
            {Array.from({ length: dotCount }, (_, i) => {
              // Simple grid layout for dots
              const cols = Math.ceil(Math.sqrt(dotCount))
              const row = Math.floor(i / cols)
              const col = i % cols
              const gridWidth = (cols - 1) * spacing
              const gridHeight = (Math.ceil(dotCount / cols) - 1) * spacing
              const x = col * spacing - gridWidth / 2
              const y = row * spacing - gridHeight / 2
              
              return (
                <circle 
                  key={i}
                  cx={x} 
                  cy={y} 
                  r={dotSize / 2}
                  fill={colors.fill}
                  stroke="none"
                  strokeWidth="0"
                />
              )
            })}
          </>
        )

      default:
        return (
          <circle 
            cx={0} 
            cy={0} 
            r={shapeSize / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )
    }
  }
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${centerX}, ${centerY}) ${item.rotation ? `rotate(${item.rotation})` : ''}`}>
        {renderCleanShapeContent()}
      </g>
    </svg>
  )
}

// Function to export SVG
const exportShapeAsSVG = (item: any, filename: string) => {
  const svgElement = renderPureSVG(item, 200)
  if (!svgElement) return
  
  const svgString = new XMLSerializer().serializeToString(svgElement as any)
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function StudentPatternReasoning() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  
  // Check for 12+ filter in URL
  const [isFiltered, setIsFiltered] = useState(false)
  const [QUESTIONS, setQuestions] = useState(ALL_QUESTIONS)
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
      
      // Check URL parameters for filtering
      const urlParams = new URLSearchParams(window.location.search)
      const filter = urlParams.get('filter')
      if (filter === '12plus') {
        setIsFiltered(true)
        setQuestions(FILTERED_QUESTIONS_12_PLUS)
      } else {
        setIsFiltered(false)
        setQuestions(ALL_QUESTIONS)
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
      isComplete: true,
      timestamp: new Date().toISOString()
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

  const handleFinishTest = async () => {
    const testResults = QUESTIONS.map((question, index) => {
      const answer = answers[index]
      const isCorrect = answer?.answer === question.correctAnswer
      
      return {
        questionId: question.id,
        questionText: "What's the missing pattern?",
        ageGroup: question.ageGroup,
        userAnswer: answer?.answer || null,
        correctAnswer: question.correctAnswer,
        isCorrect,
        timestamp: answer?.timestamp || new Date().toISOString()
      }
    })
    
    // Calculate score
    const correctCount = testResults.filter(r => r.isCorrect).length
    const totalQuestions = testResults.length
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100)
    
    // Prepare data for submission
    const submissionData = {
      name: studentInfo?.firstName || 'Unknown',
      sessionId,
      completedAt: new Date().toISOString(),
      totalQuestions,
      correctAnswers: correctCount,
      score: scorePercentage,
      isFiltered: isFiltered,
      filterType: isFiltered ? '12plus' : 'all',
      answers: testResults.reduce((acc: any, result, index) => {
        acc[index + 1] = {
          answer: result.userAnswer,
          isCorrect: result.isCorrect,
          question: result.questionText,
          ageGroup: result.ageGroup
        }
        return acc
      }, {}),
      detailedResults: testResults
    }
    
    try {
      // Submit to API
      const response = await fetch('/api/submit-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })
      
      if (response.ok) {
        console.log('Test results submitted successfully!')
      } else {
        console.error('Failed to submit test results')
      }
    } catch (error) {
      console.error('Error submitting test results:', error)
    }
    
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
        timestamp: new Date().toISOString(),
        score: scorePercentage
      }))
    }
    
    // Check if this is a standalone test (from /pattern-test) or part of a multi-subtest flow
    const urlParams = new URLSearchParams(window.location.search)
    const filter = urlParams.get('filter')
    
    console.log('Test completion - URL filter:', filter)
    console.log('Test completion - window.location.href:', window.location.href)
    
    // Always show completion with CSV download for standalone pattern test
    if (filter === '12plus' || window.location.pathname.includes('pattern-reasoning')) {
      // This is the standalone public test - show completion message with CSV download
      console.log('Setting state to completed - standalone test detected')
      setTestState("completed")
    } else {
      // This is part of a multi-subtest flow - wait for next subtest
      console.log('Setting state to waiting - multi-subtest flow')
      setTestState("waiting")
    }
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
            {item.shapes ? renderStackedShapes(item.shapes) : renderShapeContent(item)}
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
  const renderStackedShapes = (shapes: any[]) => {
    if (!shapes || shapes.length === 0) return null
    
    const shapeSize = 8 // Smaller size for grid arrangement
    const spacing = 12 // Spacing between shapes
    
    // Arrange shapes in a compact grid
    const getGridPosition = (index: number, total: number) => {
      if (total <= 3) {
        // Single row for 1-3 shapes
        const startX = -(total - 1) * spacing / 2
        return { x: startX + index * spacing, y: 0 }
      } else if (total <= 6) {
        // 2 rows for 4-6 shapes
        const cols = Math.ceil(total / 2)
        const row = Math.floor(index / cols)
        const col = index % cols
        const startX = -(cols - 1) * spacing / 2
        const startY = row * spacing - spacing / 2
        return { x: startX + col * spacing, y: startY }
      } else if (total <= 12) {
        // 3 rows for 7-12 shapes
        const cols = Math.ceil(total / 3)
        const row = Math.floor(index / cols)
        const col = index % cols
        const startX = -(cols - 1) * spacing / 2
        const startY = row * spacing - spacing
        return { x: startX + col * spacing, y: startY }
      } else {
        // 4 rows for 13+ shapes
        const cols = Math.ceil(total / 4)
        const row = Math.floor(index / cols)
        const col = index % cols
        const startX = -(cols - 1) * spacing / 2
        const startY = row * spacing - spacing * 1.5
        return { x: startX + col * spacing, y: startY }
      }
    }
    
    return (
      <>
        {shapes.map((shapeData, index) => {
          const pos = getGridPosition(index, shapes.length)
          return (
            <g key={index} transform={`translate(${pos.x}, ${pos.y})`}>
              {renderSingleShape(shapeData, shapeSize)}
            </g>
          )
        })}
      </>
    )
  }

  const renderSingleShape = (shapeData: any, size: number) => {
    const colorMap: {[key: string]: {fill: string, stroke: string}} = {
      'blue': { fill: '#2563EB', stroke: '#1D4ED8' },
      'green': { fill: '#16A34A', stroke: '#15803D' },
      'orange': { fill: '#EA580C', stroke: '#C2410C' },
      'gray': { fill: '#6B7280', stroke: '#4B5563' },
      'yellow': { fill: '#EAB308', stroke: '#CA8A04' },
      'pink': { fill: '#EC4899', stroke: '#DB2777' }
    }
    
    const colors = colorMap[shapeData.color] || { fill: '#2563EB', stroke: '#1D4ED8' }
    
    switch (shapeData.shape) {
      case 'triangle':
        const trianglePoints = `0,${-size/2} ${-size/2},${size/2} ${size/2},${size/2}`
        return <polygon points={trianglePoints} fill={colors.fill} stroke={colors.stroke} strokeWidth="1"/>
      
      case 'square':
        return <rect x={-size/2} y={-size/2} width={size} height={size} fill={colors.fill} stroke={colors.stroke} strokeWidth="1"/>
      
      case 'diamond':
        const diamondPoints = `0,${-size/2} ${size/2},0 0,${size/2} ${-size/2},0`
        return <polygon points={diamondPoints} fill={colors.fill} stroke={colors.stroke} strokeWidth="1"/>
      
      default:
        return <circle cx={0} cy={0} r={size/2} fill={colors.fill} stroke={colors.stroke} strokeWidth="1"/>
    }
  }

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

    // Handle split colors
    const colors = colorMap[item.color] || { fill: '#2563EB', stroke: '#1D4ED8' }
    const topColorStyle = item.topColor ? colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' } : null
    const bottomColorStyle = item.bottomColor ? colorMap[item.bottomColor] || { fill: '#2563EB', stroke: '#1D4ED8' } : null
    const isSplit = item.color === 'split' && topColorStyle && bottomColorStyle
    const size = item.size === 'big' ? 50 : 
                 item.size === 'small' ? 30 : 
                 item.size === 'medium' ? 42 :
                 item.size === 'tiny' ? 20 :
                 item.size === 'bigger' ? 65 : 42
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


    const viewBoxSize = 80

    switch (item.shape) {
      case 'circle':
        const circleCount = item.count || 1
        if (circleCount > 1) {
          // Handle multiple circles
          const positions = []
          if (circleCount === 2) {
            positions.push({ x: 0 - size/4, y: 0 })
            positions.push({ x: 0 + size/4, y: 0 })
          } else if (circleCount === 3) {
            positions.push({ x: 0, y: 0 - size/4 })
            positions.push({ x: 0 - size/4, y: 0 + size/4 })
            positions.push({ x: 0 + size/4, y: 0 + size/4 })
          }
          
          return (
            <>
              {positions.map((pos, i) => (
                <circle 
                  key={i}
                  cx={pos.x} 
                  cy={pos.y} 
                  r={size / 4}
                  fill={item.style === 'outline' ? 'none' : colors.fill}
                  stroke={colors.stroke} 
                  strokeWidth="2"
                />
              ))}
            </>
          )
        }
        
        // Handle split color circles
        if (item.color === 'split' && item.topColor && item.bottomColor) {
          const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' }
          const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' }
          
          const rotation = item.rotation || 0
          
          return (
            <>
              <defs>
                <clipPath id={`circleTopHalf${rotation}`}>
                  <rect x={-size} y={-size} width={size*2} height={size} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
                <clipPath id={`circleBottomHalf${rotation}`}>
                  <rect x={-size} y="0" width={size*2} height={size} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
              </defs>
              <circle 
                cx={0} 
                cy={0} 
                r={size / 2}
                fill={topColors.fill}
                stroke={topColors.stroke} 
                strokeWidth="2"
                clipPath={`url(#circleTopHalf${rotation})`}
                transform={item.reflected ? `scale(-1, 1)` : undefined}
              />
              <circle 
                cx={0} 
                cy={0} 
                r={size / 2}
                fill={bottomColors.fill}
                stroke={bottomColors.stroke} 
                strokeWidth="2"
                clipPath={`url(#circleBottomHalf${rotation})`}
                transform={item.reflected ? `scale(-1, 1)` : undefined}
              />
              {item.modifier === 'dot' && (
                <circle
                  cx={0}
                  cy={0 - size / 4}
                  r={size / 8}
                  fill="black"
                  transform={rotation ? `rotate(${rotation})` : undefined}
                />
              )}
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
                transform={item.reflected ? `scale(-1, 1)` : undefined}
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
            positions.push({ x: 0 - size/4, y: 0 })
            positions.push({ x: 0 + size/4, y: 0 })
          } else if (squareCount === 3) {
            positions.push({ x: 0, y: 0 - size/4 })
            positions.push({ x: 0 - size/4, y: 0 + size/4 })
            positions.push({ x: 0 + size/4, y: 0 + size/4 })
          }
          
          return (
            <>
              {positions.map((pos, i) => (
                <rect 
                  key={i}
                  x={pos.x - size/6} 
                  y={pos.y - size/6} 
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
        
        // Handle split color squares
        if (item.color === 'split' && item.topColor && item.bottomColor) {
          const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' }
          const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' }
          
          const rotation = item.rotation || 0
          
          return (
            <>
              <defs>
                <clipPath id={`squareTopHalf${rotation}`}>
                  <rect x={-size} y={-size} width={size*2} height={size} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
                <clipPath id={`squareBottomHalf${rotation}`}>
                  <rect x={-size} y="0" width={size*2} height={size} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
              </defs>
              <rect 
                x={-size / 2} 
                y={-size / 2} 
                width={size} 
                height={size}
                fill={item.style === 'outline' ? 'none' : topColors.fill}
                stroke={topColors.stroke}
                strokeWidth="2"
                rx="3"
                clipPath={`url(#squareTopHalf${rotation})`}
                transform={item.reflected ? `scale(-1, 1)` : undefined}
              />
              <rect 
                x={-size / 2} 
                y={-size / 2} 
                width={size} 
                height={size}
                fill={item.style === 'outline' ? 'none' : bottomColors.fill}
                stroke={bottomColors.stroke}
                strokeWidth="2"
                rx="3"
                clipPath={`url(#squareBottomHalf${rotation})`}
                transform={item.reflected ? `scale(-1, 1)` : undefined}
              />
            </>
          )
        }
        
        // Use custom stroke color if provided
        const customStroke = item.stroke ? (colorMap[item.stroke]?.stroke || item.stroke) : colors.stroke
        
        return (
          <>
            {(item.modifier === 'stripe' || item.modifier === 'horizontal-stripe') && (
              <defs>
                <pattern id={`stripePatternSquare_${item.modifier || 'stripe'}`} patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={colors.fill}/>
                  {item.modifier === 'horizontal-stripe' ? (
                    <rect width="4" height="2" fill="black"/>
                  ) : (
                    <rect width="2" height="4" fill="black"/>
                  )}
                </pattern>
              </defs>
            )}
            <rect 
              x={-size / 2} 
              y={-size / 2} 
              width={size} 
              height={size}
              fill={item.style === 'outline' ? 'none' : (item.modifier === 'stripe' || item.modifier === 'horizontal-stripe' ? `url(#stripePatternSquare_${item.modifier || 'stripe'})` : colors.fill)}
              stroke={customStroke} 
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
            positions.push({ x: 0 - size/4, y: 0 })
            positions.push({ x: 0 + size/4, y: 0 })
          } else if (triangleCount === 3) {
            positions.push({ x: 0, y: 0 - size/4 })
            positions.push({ x: 0 - size/4, y: 0 + size/4 })
            positions.push({ x: 0 + size/4, y: 0 + size/4 })
          }
          
          return (
            <>
              {positions.map((pos, i) => (
                <polygon 
                  key={i}
                  points={`${pos.x},${pos.y - size / 6} ${pos.x + size / 6},${pos.y + size / 6} ${pos.x - size / 6},${pos.y + size / 6}`}
                  fill={item.style === 'outline' ? 'none' : colors.fill}
                  stroke={colors.stroke} 
                  strokeWidth="2"
                />
              ))}
            </>
          )
        }
        
        // Handle split color triangles
        if (item.color === 'split' && item.topColor && item.bottomColor) {
          const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' }
          const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' }
          
          return (
            <>
              <defs>
                <clipPath id={`triangleTopHalf${rotation}`}>
                  <rect x={-size*1.5} y={-size} width={size*3} height={size} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
                <clipPath id={`triangleBottomHalf${rotation}`}>
                  <rect x={-size*1.5} y="0" width={size*3} height={size} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
              </defs>
              <polygon 
                points={`0,${-size / 2} ${size / 2},${size / 2} ${-size / 2},${size / 2}`}
                fill={topColors.fill}
                stroke={topColors.stroke} 
                strokeWidth="2"
                clipPath={`url(#triangleTopHalf${rotation})`}
                transform={item.reflected ? `scale(-1, 1)` : undefined}
              />
              <polygon 
                points={`0,${-size / 2} ${size / 2},${size / 2} ${-size / 2},${size / 2}`}
                fill={bottomColors.fill}
                stroke={bottomColors.stroke} 
                strokeWidth="2"
                clipPath={`url(#triangleBottomHalf${rotation})`}
                transform={item.reflected ? `scale(-1, 1)` : undefined}
              />
            </>
          )
        }
        
        return (
          <>
            {item.modifier === 'stripe' && (
              <defs>
                <pattern id="stripePattern" patternUnits="userSpaceOnUse" width="4" height="4">
                  <rect width="4" height="4" fill={colors.fill}/>
                  <rect width="2" height="4" fill="black"/>
                </pattern>
              </defs>
            )}
            <polygon 
              points={`0,${-size / 2} ${size / 2},${size / 2} ${-size / 2},${size / 2}`}
              fill={item.style === 'outline' ? 'none' : (item.modifier === 'stripe' ? 'url(#stripePattern)' : colors.fill)} 
              stroke={colors.stroke} 
              strokeWidth="2"
              transform={`${rotation ? `rotate(${rotation})` : ''} ${item.reflected ? 'scale(-1, 1)' : ''}`.trim()}
            />
            {item.modifier === 'dot' && (
              <circle
                cx={0}
                cy={0}
                r={size / 8}
                fill="black"
                transform={item.reflected ? `scale(-1, 1)` : undefined}
              />
            )}
          </>
        )

      case 'diamond':
        if (item.color === 'split' && item.topColor && item.bottomColor) {
          const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' }
          const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' }
          
          return (
            <>
              <g transform={item.rotation ? `rotate(${item.rotation})` : undefined}>
                {/* Top half of diamond - narrower for clear pointing */}
                <polygon 
                  points={`0,${-size / 2} ${size * 0.6 / 2},0 0,0 ${-size * 0.6 / 2},0`}
                  fill={topColors.fill} 
                  stroke={colors.stroke} 
                  strokeWidth="2"
                />
                {/* Bottom half of diamond */}
                <polygon 
                  points={`${-size * 0.6 / 2},0 0,0 ${size * 0.6 / 2},0 0,${size / 2}`}
                  fill={bottomColors.fill} 
                  stroke={colors.stroke} 
                  strokeWidth="2"
                />
              </g>
            </>
          )
        }
        
        return (
          <>
              <polygon 
                points={`0,${-size / 2} ${size * 0.6 / 2},0 0,${size / 2} ${-size * 0.6 / 2},0`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
                transform={item.rotation ? `rotate(${item.rotation})` : undefined}
              />
          </>
        )

      case 'star':
        const starCount = item.count || 1
        
        // Handle split color for single star
        if (starCount === 1 && item.color === 'split' && item.topColor && item.bottomColor) {
          const topColors = colorMap[item.topColor] || { fill: '#2563EB', stroke: '#1D4ED8' }
          const bottomColors = colorMap[item.bottomColor] || { fill: '#DC2626', stroke: '#B91C1C' }
          
          const starSize = size / 2
          const innerRadius = starSize * 0.4
          
          // Create two overlapping star halves with clipping masks
          let starPoints = ''
          for (let j = 0; j < 10; j++) {
            const angle = (j * Math.PI) / 5
            const radius = j % 2 === 0 ? starSize : innerRadius
            const x = Math.cos(angle - Math.PI / 2) * radius
            const y = Math.sin(angle - Math.PI / 2) * radius
            starPoints += `${x},${y} `
          }
          
          const rotation = item.rotation || 0
          
          return (
            <>
              <defs>
                <clipPath id={`leftHalf${item.size}${rotation}`}>
                  <rect x={-starSize * 1.5} y={-starSize * 1.5} width={starSize * 1.5} height={starSize * 3} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
                <clipPath id={`rightHalf${item.size}${rotation}`}>
                  <rect x="0" y={-starSize * 1.5} width={starSize * 1.5} height={starSize * 3} transform={`rotate(${rotation} 0 0)`} />
                </clipPath>
              </defs>
              <polygon 
                points={starPoints}
                fill={topColors.fill} 
                stroke={colors.stroke} 
                strokeWidth="1"
                clipPath={`url(#leftHalf${item.size}${rotation})`}
              />
              <polygon 
                points={starPoints}
                fill={bottomColors.fill} 
                stroke={colors.stroke} 
                strokeWidth="1"
                clipPath={`url(#rightHalf${item.size}${rotation})`}
              />
            </>
          )
        }
        
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
        const starStartX = -starTotalWidth / 2

        return (
          <>
              {Array.from({ length: starCount }, (_, i) => {
                let starPoints = ''
                const starCenterX = starStartX + i * adaptiveSpacing
                for (let j = 0; j < 10; j++) {
                  const angle = (j * Math.PI) / 5
                  const radius = j % 2 === 0 ? adaptiveStarSize : innerRadius
                  const x = starCenterX + Math.cos(angle - Math.PI / 2) * radius
                  const y = 0 + Math.sin(angle - Math.PI / 2) * radius
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
          </>
        )

      case 'heart':
        const heartDirection = item.direction || 'up'
        let heartTransform = ''
        
        switch (heartDirection) {
          case 'down':
            heartTransform = `rotate(180 0 0)`
            break
          case 'left':
            heartTransform = `rotate(270 0 0)`
            break
          case 'right':
            heartTransform = `rotate(90 0 0)`
            break
          case 'up':
          default:
            heartTransform = ``
            break
        }
        
        return (
          <>
              <path 
                d={`M0,${size * 0.3} C${-size * 0.5},${-size * 0.1} ${-size * 0.5},${-size * 0.5} 0,${-size * 0.2} C${size * 0.5},${-size * 0.5} ${size * 0.5},${-size * 0.1} 0,${size * 0.3}Z`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
                transform={heartTransform}
              />
          </>
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
          <>
              {Array.from({ length: dotCount }, (_, i) => {
                const row = Math.floor(i / dotsPerRow)
                const col = i % dotsPerRow
                const dotsInThisRow = Math.min(dotsPerRow, dotCount - row * dotsPerRow)
                
                const totalRowWidth = dotsInThisRow * dotSize + (dotsInThisRow - 1) * spacing
                const startX = 0 - totalRowWidth / 2
                const startY = 0 - (rows * dotSize + (rows - 1) * rowSpacing) / 2
                
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
          </>
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
          <>
              {Array.from({ length: numStars }, (_, i) => {
                const row = Math.floor(i / starsPerRow)
                const col = i % starsPerRow
                const starsInThisRow = Math.min(starsPerRow, numStars - row * starsPerRow)
                
                const totalRowWidth = starsInThisRow * starSize + (starsInThisRow - 1) * starSpacing
                const startX = 0 - totalRowWidth / 2
                const startY = 0 - (starRows * starSize + (starRows - 1) * starRowSpacing) / 2
                
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
          </>
        )

      case 'arrow':
        const arrowStrokeWidth = item.strokeWidth === 1 ? 0.01 : item.strokeWidth === 3 ? 5 : 2
        const arrowSize = size * 1.2 // Make arrows 20% larger
        // Create longer arrow path pointing right, then rotate/reflect as needed
        const arrowPath = `M ${-arrowSize/1.5} ${-arrowSize/6} L ${arrowSize/3} ${-arrowSize/6} L ${arrowSize/3} ${-arrowSize/3} L ${arrowSize/1.5} 0 L ${arrowSize/3} ${arrowSize/3} L ${arrowSize/3} ${arrowSize/6} L ${-arrowSize/1.5} ${arrowSize/6} Z`
        
        return (
          <path 
            d={arrowPath}
            fill={colors.fill}
            stroke={colors.stroke} 
            strokeWidth={arrowStrokeWidth}
            transform={item.reflected ? `scale(-1, 1)` : undefined}
          />
        )
      
      case 'trapezoid':
        const trapPoints = `${-size/2},${size/3} ${size/2},${size/3} ${size/4},${-size/3} ${-size/4},${-size/3}`
        return (
          <>
            {isSplit && topColorStyle && bottomColorStyle ? (
              <>
                <defs>
                  <clipPath id={`trapTopHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-size/2} y={-size/2} width={size} height={size/2}/>
                  </clipPath>
                  <clipPath id={`trapBottomHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-size/2} y={0} width={size} height={size/2}/>
                  </clipPath>
                </defs>
                <polygon 
                  points={trapPoints}
                  fill={topColorStyle.fill}
                  stroke={topColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#trapTopHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
                <polygon 
                  points={trapPoints}
                  fill={bottomColorStyle.fill}
                  stroke={bottomColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#trapBottomHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
              </>
            ) : (
              <polygon 
                points={trapPoints}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth={item.strokeWidth || "2"}
                transform={item.rotation ? `rotate(${item.rotation})` : undefined}
              />
            )}
          </>
        )
      
      case 'rectangle':
        const rectWidth = size * 0.8
        const rectHeight = size * 0.5
        return (
          <>
            {isSplit && topColorStyle && bottomColorStyle ? (
              <>
                <defs>
                  <clipPath id={`rectTopHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-rectWidth/2} y={-rectHeight/2} width={rectWidth} height={rectHeight/2}/>
                  </clipPath>
                  <clipPath id={`rectBottomHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-rectWidth/2} y={0} width={rectWidth} height={rectHeight/2}/>
                  </clipPath>
                </defs>
                <rect 
                  x={-rectWidth/2}
                  y={-rectHeight/2}
                  width={rectWidth}
                  height={rectHeight}
                  fill={topColorStyle.fill}
                  stroke={topColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#rectTopHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
                <rect 
                  x={-rectWidth/2}
                  y={-rectHeight/2}
                  width={rectWidth}
                  height={rectHeight}
                  fill={bottomColorStyle.fill}
                  stroke={bottomColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#rectBottomHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
              </>
            ) : (
              <rect 
                x={-rectWidth/2}
                y={-rectHeight/2}
                width={rectWidth}
                height={rectHeight}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth={item.strokeWidth || "2"}
                transform={item.rotation ? `rotate(${item.rotation})` : undefined}
              />
            )}
          </>
        )
      
      case 'halfcircle':
        const halfCircleRadius = size / 2
        return (
          <>
            {isSplit && topColorStyle && bottomColorStyle ? (
              <>
                <defs>
                  <clipPath id={`halfCircleTopHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-halfCircleRadius} y={-halfCircleRadius} width={halfCircleRadius * 2} height={halfCircleRadius}/>
                  </clipPath>
                  <clipPath id={`halfCircleBottomHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-halfCircleRadius} y={0} width={halfCircleRadius * 2} height={halfCircleRadius}/>
                  </clipPath>
                </defs>
                <path 
                  d={`M ${-halfCircleRadius} 0 A ${halfCircleRadius} ${halfCircleRadius} 0 1 1 ${halfCircleRadius} 0 Z`}
                  fill={topColorStyle.fill}
                  stroke={topColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#halfCircleTopHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
                <path 
                  d={`M ${-halfCircleRadius} 0 A ${halfCircleRadius} ${halfCircleRadius} 0 1 1 ${halfCircleRadius} 0 Z`}
                  fill={bottomColorStyle.fill}
                  stroke={bottomColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#halfCircleBottomHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
              </>
            ) : (
              <path 
                d={`M ${-halfCircleRadius} 0 A ${halfCircleRadius} ${halfCircleRadius} 0 0 1 ${halfCircleRadius} 0 Z`}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth={item.strokeWidth || "2"}
                transform={item.rotation ? `rotate(${item.rotation})` : undefined}
              />
            )}
          </>
        )
      
      case 'oval':
        const ovalWidth = size * 0.8
        const ovalHeight = size * 0.6
        return (
          <>
            {isSplit && topColorStyle && bottomColorStyle ? (
              <>
                <defs>
                  <clipPath id={`ovalTopHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-ovalWidth/2} y={-ovalHeight/2} width={ovalWidth} height={ovalHeight/2}/>
                  </clipPath>
                  <clipPath id={`ovalBottomHalf-${Math.random().toString(36).substr(2, 9)}`}>
                    <rect x={-ovalWidth/2} y={0} width={ovalWidth} height={ovalHeight/2}/>
                  </clipPath>
                </defs>
                <ellipse 
                  cx={0}
                  cy={0}
                  rx={ovalWidth/2}
                  ry={ovalHeight/2}
                  fill={topColorStyle.fill}
                  stroke={topColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#ovalTopHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
                <ellipse 
                  cx={0}
                  cy={0}
                  rx={ovalWidth/2}
                  ry={ovalHeight/2}
                  fill={bottomColorStyle.fill}
                  stroke={bottomColorStyle.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  clipPath="url(#ovalBottomHalf)"
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
              </>
            ) : (
              <ellipse 
                cx={0}
                cy={0}
                rx={ovalWidth/2}
                ry={ovalHeight/2}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth={item.strokeWidth || "2"}
                transform={item.rotation ? `rotate(${item.rotation})` : undefined}
              />
            )}
          </>
        )

      default:
        return (
          <>
              <circle 
                cx={0} 
                cy={0} 
                r={size / 2}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
              />
          </>
        )
        
      case 'hexagon':
        const hexagonDotCount = item.dotCount || 0
        const hexPoints = `${size/2},${0} ${size/4},${-size/2} ${-size/4},${-size/2} ${-size/2},${0} ${-size/4},${size/2} ${size/4},${size/2}`
        return (
          <>
              {item.modifier === 'stripe' && (
                <defs>
                  <pattern id="stripePatternHex" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill={colors.fill}/>
                    <rect width="2" height="4" fill="black"/>
                  </pattern>
                </defs>
              )}
              {isSplit && topColorStyle && bottomColorStyle ? (
                <>
                  <defs>
                    <clipPath id={`hexTopHalf-${Math.random().toString(36).substr(2, 9)}`}>
                      <rect x={-size/2} y={-size/2} width={size} height={size/2}/>
                    </clipPath>
                    <clipPath id={`hexBottomHalf-${Math.random().toString(36).substr(2, 9)}`}>
                      <rect x={-size/2} y={0} width={size} height={size/2}/>
                    </clipPath>
                  </defs>
                  {/* Top half */}
                  <polygon 
                    points={hexPoints}
                    fill={topColorStyle.fill}
                    stroke={topColorStyle.stroke} 
                    strokeWidth={item.strokeWidth || "2"}
                    clipPath="url(#hexTopHalf)"
                    transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                  />
                  {/* Bottom half */}
                  <polygon 
                    points={hexPoints}
                    fill={bottomColorStyle.fill}
                    stroke={bottomColorStyle.stroke} 
                    strokeWidth={item.strokeWidth || "2"}
                    clipPath="url(#hexBottomHalf)"
                    transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                  />
                </>
              ) : (
                <polygon 
                  points={hexPoints}
                  fill={item.modifier === 'stripe' ? 'url(#stripePatternHex)' : colors.fill}
                  stroke={colors.stroke} 
                  strokeWidth={item.strokeWidth || "2"}
                  transform={item.rotation ? `rotate(${item.rotation})` : undefined}
                />
              )}
              {hexagonDotCount > 0 && Array.from({ length: hexagonDotCount }, (_, i) => {
                // Arrange dots in a small grid inside hexagon
                let dotX, dotY
                if (hexagonDotCount === 1) {
                  dotX = 0
                  dotY = 0
                } else if (hexagonDotCount === 2) {
                  dotX = 0 + (i === 0 ? -8 : 8)
                  dotY = 0
                } else if (hexagonDotCount === 3) {
                  dotX = 0 + (i === 1 ? -8 : i === 2 ? 8 : 0)
                  dotY = 0 + (i === 0 ? -8 : 8)
                } else if (hexagonDotCount === 4) {
                  dotX = 0 + (i % 2 === 0 ? -8 : 8)
                  dotY = 0 + (i < 2 ? -8 : 8)
                } else {
                  // For more dots, arrange in a circle pattern
                  const angle = (i * 2 * Math.PI) / hexagonDotCount
                  dotX = 0 + Math.cos(angle) * 10
                  dotY = 0 + Math.sin(angle) * 10
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
          </>
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

  // Function to generate and download CSV
  const downloadCSV = () => {
    const headers = [
      'Name',
      'Question Number',
      'Question',
      'Your Answer',
      'Correct Answer', 
      'Result',
      'Age Group'
    ]
    
    const userName = studentInfo?.firstName || 'Student'
    
    // If testResults is empty, try to get from localStorage
    let resultsToUse = testResults
    if (!resultsToUse || resultsToUse.length === 0) {
      const storedResults = localStorage.getItem(`pattern_reasoning_test_${sessionId}`)
      if (storedResults) {
        try {
          resultsToUse = JSON.parse(storedResults)
        } catch (error) {
          console.error('Error parsing stored results:', error)
          resultsToUse = []
        }
      }
    }
    
    console.log('downloadCSV called with results:', resultsToUse?.length || 0)
    
    const rows = (resultsToUse || []).map((result, index) => [
      userName,
      index + 1,
      `"${result.questionText || 'N/A'}"`,
      result.userAnswer || 'No Answer',
      result.correctAnswer || 'N/A',
      result.isCorrect ? 'Correct' : 'Incorrect',
      result.ageGroup || 'N/A'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pattern-test-results-${studentInfo?.firstName || 'student'}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  console.log('Current testState:', testState)
  console.log('Current testResults length:', testResults?.length || 0)

  if (testState === "completed") {
    console.log('Rendering completed state with testResults:', testResults?.length || 0, 'results')
    console.log('downloadCSV function exists:', typeof downloadCSV)
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Great Job!</h2>
          <p className="text-gray-600 mb-6">You completed the pattern reasoning test. Your responses have been submitted successfully.</p>
          
          <button
            onClick={() => {
              console.log('Download button clicked!')
              downloadCSV()
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Your Results (CSV)</span>
          </button>
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
            What's the missing pattern?
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
                      <div className="relative group">
                        {renderSVGTile(question.sequence[0])}
                        <button
                          onClick={() => exportShapeAsSVG(question.sequence[0], `pattern_q${currentQuestion + 1}_matrix_topleft.svg`)}
                          className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                          title="Export as SVG"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    
                    {/* Top-right */}
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        {renderSVGTile(question.sequence[1])}
                        <button
                          onClick={() => exportShapeAsSVG(question.sequence[1], `pattern_q${currentQuestion + 1}_matrix_topright.svg`)}
                          className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                          title="Export as SVG"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    
                    {/* Bottom-left */}
                    <div className="flex flex-col items-center">
                      <div className="relative group">
                        {renderSVGTile(question.sequence[2])}
                        <button
                          onClick={() => exportShapeAsSVG(question.sequence[2], `pattern_q${currentQuestion + 1}_matrix_bottomleft.svg`)}
                          className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                          title="Export as SVG"
                        >
                          ↓
                        </button>
                      </div>
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
                        <div className="relative group">
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
                          {item !== null && (
                            <button
                              onClick={() => exportShapeAsSVG(item, `pattern_q${currentQuestion + 1}_matrix3x3_${index + 1}.svg`)}
                              className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                              title="Export as SVG"
                            >
                              ↓
                            </button>
                          )}
                        </div>
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
              ) : question.type === 'matrix_transformation' ? (
                <div className="flex justify-center mb-4">
                  <div className={`grid gap-4 ${question.grid[0]?.length === 5 ? 'grid-cols-5' : question.grid[0]?.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                    {question.grid.map((row: any[], rowIndex: number) =>
                      row.map((item: any, colIndex: number) => (
                        <div key={`${rowIndex}-${colIndex}`} className="flex flex-col items-center p-2">
                          <div className="relative group">
                            {renderSVGTile(
                              item === null ? (
                                answers[currentQuestion]?.answer 
                                  ? question.options.find((opt: any) => opt.id === answers[currentQuestion].answer) 
                                  : null
                              ) : item,
                              item === null && !answers[currentQuestion]?.answer,
                              false,
                              question.grid.length === 4 ? 'small' : 'medium'
                            )}
                            {item !== null && (
                              <button
                                onClick={() => exportShapeAsSVG(item, `pattern_q${currentQuestion + 1}_grid_r${rowIndex + 1}c${colIndex + 1}.svg`)}
                                className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                                title="Export as SVG"
                              >
                                ↓
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Regular sequence display */
                <div className="flex justify-center items-center mb-4 gap-6">
                  {question.sequence && question.sequence.map((step: any, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="mb-2 relative group">
                        {renderSVGTile(
                          step === null ? (
                            answers[currentQuestion]?.answer 
                              ? question.options.find((opt: any) => opt.id === answers[currentQuestion].answer) 
                              : null
                          ) : step,
                          step === null && !answers[currentQuestion]?.answer
                        )}
                        {/* Export button - appears on hover */}
                        {step !== null && (
                          <button
                            onClick={() => exportShapeAsSVG(step, `pattern_q${currentQuestion + 1}_step${index + 1}.svg`)}
                            className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                            title="Export as SVG"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900">{index + 1}</p>
                    </div>
                  ))}
                  
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
                      <div className="relative group">
                        <button
                          onClick={() => handleAnswer(option.id)}
                          className="transition-all mb-2 hover:scale-105"
                        >
                          {renderSVGTile(option, false, answers[currentQuestion]?.answer === option.id)}
                        </button>
                        {/* Export button - appears on hover */}
                        <button
                          onClick={() => exportShapeAsSVG(option, `pattern_q${currentQuestion + 1}_option${option.id}.svg`)}
                          className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                          title="Export as SVG"
                        >
                          ↓
                        </button>
                      </div>
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