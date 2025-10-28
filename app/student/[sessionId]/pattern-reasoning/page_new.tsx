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
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { color: "red", shape: "circle", label: "Red circle" },
          { color: "red", shape: "circle", label: "Red circle" },
          { color: "blue", shape: "circle", label: "Blue circle" },  // WRONG
          { color: "red", shape: "circle", label: "Red circle" },
          { color: "red", shape: "circle", label: "Red circle" }
        ],
        wrongItemIndex: 2
      },
      {
        id: 2,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { color: "blue", shape: "square", label: "Blue square" },
          { color: "blue", shape: "square", label: "Blue square" },
          { color: "blue", shape: "square", label: "Blue square" },
          { color: "yellow", shape: "square", label: "Yellow square" },  // WRONG
          { color: "blue", shape: "square", label: "Blue square" }
        ],
        wrongItemIndex: 3
      },
      {
        id: 3,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { color: "yellow", shape: "diamond", label: "Yellow diamond" },
          { color: "yellow", shape: "diamond", label: "Yellow diamond" },
          { color: "red", shape: "diamond", label: "Red diamond" },  // WRONG
          { color: "yellow", shape: "diamond", label: "Yellow diamond" },
          { color: "yellow", shape: "diamond", label: "Yellow diamond" }
        ],
        wrongItemIndex: 2
      },
      {
        id: 4,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "circle", color: "coral", label: "Circle" },
          { shape: "circle", color: "coral", label: "Circle" },
          { shape: "square", color: "turquoise", label: "Square" },  // WRONG
          { shape: "circle", color: "coral", label: "Circle" },
          { shape: "circle", color: "coral", label: "Circle" }
        ],
        wrongItemIndex: 2
      },
      {
        id: 6,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "triangle", color: "indigo", label: "Triangle" },
          { shape: "triangle", color: "indigo", label: "Triangle" },
          { shape: "triangle", color: "indigo", label: "Triangle" },
          { shape: "circle", color: "fuchsia", label: "Circle" },  // WRONG
          { shape: "triangle", color: "indigo", label: "Triangle" }
        ],
        wrongItemIndex: 3
      },
      {
        id: 7,
        ageGroup: "2.5-3.5",
        type: "repetition_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "star", color: "yellow", label: "Star" },
          { shape: "star", color: "yellow", label: "Star" },
          { shape: "heart", color: "pink", label: "Heart" },  // WRONG
          { shape: "star", color: "yellow", label: "Star" },
          { shape: "star", color: "yellow", label: "Star" }
        ],
        wrongItemIndex: 2
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
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "circle", color: "emerald", label: "Circle" },
          { shape: "square", color: "purple", label: "Square" },
          { shape: "circle", color: "emerald", label: "Circle" },
          { shape: "square", color: "purple", label: "Square" },
          { shape: "triangle", color: "orange", label: "Triangle" },  // WRONG
          { shape: "square", color: "purple", label: "Square" }
        ],
        wrongItemIndex: 4
      },
      {
        id: 9,
        ageGroup: "3.5-4",
        type: "size_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "circle", size: "big", color: "teal", label: "Big circle" },
          { shape: "circle", size: "small", color: "teal", label: "Small circle" },
          { shape: "circle", size: "big", color: "teal", label: "Big circle" },
          { shape: "circle", size: "big", color: "teal", label: "Big circle" },  // WRONG (should be small)
          { shape: "circle", size: "big", color: "teal", label: "Big circle" }
        ],
        wrongItemIndex: 3
      },
      {
        id: 10,
        ageGroup: "3.5-4",
        type: "shape_sequence_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "triangle", color: "coral", label: "Triangle" },
          { shape: "circle", color: "lime", label: "Circle" },
          { shape: "triangle", color: "coral", label: "Triangle" },
          { shape: "circle", color: "lime", label: "Circle" },
          { shape: "square", color: "violet", label: "Square" },  // WRONG
          { shape: "circle", color: "lime", label: "Circle" }
        ],
        wrongItemIndex: 4
      },
      {
        id: 11,
        ageGroup: "3.5-4",
        type: "size_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "square", size: "big", color: "navy", label: "Big square" },
          { shape: "square", size: "small", color: "navy", label: "Small square" },
          { shape: "square", size: "big", color: "navy", label: "Big square" },
          { shape: "square", size: "small", color: "navy", label: "Small square" },
          { shape: "square", size: "small", color: "navy", label: "Small square" },  // WRONG (should be big)
          { shape: "square", size: "small", color: "navy", label: "Small square" }
        ],
        wrongItemIndex: 4
      },
      {
        id: 12,
        ageGroup: "3.5-4",
        type: "alternating_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "star", color: "gold", label: "Star" },
          { shape: "heart", color: "crimson", label: "Heart" },
          { shape: "star", color: "gold", label: "Star" },
          { shape: "heart", color: "crimson", label: "Heart" },
          { shape: "circle", color: "sky", label: "Circle" },  // WRONG
          { shape: "heart", color: "crimson", label: "Heart" }
        ],
        wrongItemIndex: 4
      },
      {
        id: 13,
        ageGroup: "3.5-4",
        type: "complex_size_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "triangle", size: "big", color: "violet", label: "Big triangle" },
          { shape: "triangle", size: "small", color: "violet", label: "Small triangle" },
          { shape: "triangle", size: "big", color: "violet", label: "Big triangle" },
          { shape: "triangle", size: "small", color: "violet", label: "Small triangle" },
          { shape: "triangle", size: "small", color: "violet", label: "Small triangle" },  // WRONG
          { shape: "triangle", size: "small", color: "violet", label: "Small triangle" }
        ],
        wrongItemIndex: 4
      },
      {
        id: 14,
        ageGroup: "3.5-4",
        type: "alternating_pattern",
        question: "Click on the shape that doesn't belong in the pattern",
        full_sequence: [
          { shape: "circle", color: "turquoise", label: "Circle" },
          { shape: "triangle", color: "lavender", label: "Triangle" },
          { shape: "circle", color: "turquoise", label: "Circle" },
          { shape: "triangle", color: "lavender", label: "Triangle" },
          { shape: "square", color: "amber", label: "Square" },  // WRONG
          { shape: "triangle", color: "lavender", label: "Triangle" }
        ],
        wrongItemIndex: 4
      }
    ]
  }
}

// Continue with more age groups...
// This file is getting very large. Let me create a separate function to read the rest.
