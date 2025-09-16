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
        type: "color_pattern",
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
        type: "color_pattern",
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
        type: "color_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { color: "orange", shape: "diamond", label: "Orange diamond" },
          { color: "orange", shape: "diamond", label: "Orange diamond" }
        ],
        options: [
          { id: "1", color: "orange", shape: "diamond", label: "Orange diamond" },
          { id: "2", color: "blue", shape: "diamond", label: "Blue diamond" },
          { id: "3", color: "green", shape: "diamond", label: "Green diamond" },
          { id: "4", color: "red", shape: "diamond", label: "Red diamond" }
        ],
        correctAnswer: "1"
      },
      {
        id: 4,
        ageGroup: "2.5-3.5",
        type: "shape_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "teal", label: "Teal circle" },
          { shape: "circle", color: "teal", label: "Teal circle" }
        ],
        options: [
          { id: "1", shape: "square", color: "coral", label: "Coral square" },
          { id: "2", shape: "triangle", color: "amber", label: "Amber triangle" },
          { id: "3", shape: "star", color: "lavender", label: "Lavender star" },
          { id: "4", shape: "circle", color: "teal", label: "Teal circle" }
        ],
        correctAnswer: "4"
      },
      {
        id: 5,
        ageGroup: "2.5-3.5",
        type: "shape_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", color: "mint", label: "Mint square" },
          { shape: "square", color: "mint", label: "Mint square" }
        ],
        options: [
          { id: "1", shape: "circle", color: "pink", label: "Pink circle" },
          { id: "2", shape: "triangle", color: "sky", label: "Sky triangle" },
          { id: "3", shape: "square", color: "mint", label: "Mint square" },
          { id: "4", shape: "star", color: "gold", label: "Gold star" }
        ],
        correctAnswer: "3"
      },
      {
        id: 6,
        ageGroup: "2.5-3.5",
        type: "shape_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "violet", label: "Violet triangle" },
          { shape: "triangle", color: "violet", label: "Violet triangle" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "violet", label: "Violet triangle" },
          { id: "2", shape: "circle", color: "peach", label: "Peach circle" },
          { id: "3", shape: "square", color: "turquoise", label: "Turquoise square" },
          { id: "4", shape: "star", color: "lime", label: "Lime star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 7,
        ageGroup: "2.5-3.5",
        type: "shape_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", color: "fuchsia", label: "Fuchsia star" },
          { shape: "star", color: "fuchsia", label: "Fuchsia star" }
        ],
        options: [
          { id: "1", shape: "heart", color: "crimson", label: "Crimson heart" },
          { id: "2", shape: "circle", color: "indigo", label: "Indigo circle" },
          { id: "3", shape: "star", color: "fuchsia", label: "Fuchsia star" },
          { id: "4", shape: "square", color: "emerald", label: "Emerald square" }
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
        type: "alternating_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "rose", label: "Rose circle" },
          { shape: "square", color: "cyan", label: "Cyan square" },
          { shape: "circle", color: "rose", label: "Rose circle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "rose", label: "Rose circle" },
          { id: "2", shape: "square", color: "cyan", label: "Cyan square" },
          { id: "3", shape: "triangle", color: "amber", label: "Amber triangle" },
          { id: "4", shape: "star", color: "lavender", label: "Lavender star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 9,
        ageGroup: "3.5-4",
        type: "size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", size: "big", label: "Big circle" },
          { shape: "circle", size: "small", label: "Small circle" },
          { shape: "circle", size: "big", label: "Big circle" }
        ],
        options: [
          { id: "1", shape: "square", size: "big", label: "Big square" },
          { id: "2", shape: "circle", size: "small", label: "Small circle" },
          { id: "3", shape: "star", size: "small", label: "Small star" },
          { id: "4", shape: "triangle", label: "Triangle" }
        ],
        correctAnswer: "2"
      },
      {
        id: 10,
        ageGroup: "3.5-4",
        type: "alternating_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "gold", label: "Gold triangle" },
          { shape: "circle", color: "teal", label: "Teal circle" },
          { shape: "triangle", color: "gold", label: "Gold triangle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "teal", label: "Teal circle" },
          { id: "2", shape: "square", color: "coral", label: "Coral square" },
          { id: "3", shape: "star", color: "mint", label: "Mint star" },
          { id: "4", shape: "heart", color: "violet", label: "Violet heart" }
        ],
        correctAnswer: "1"
      },
      {
        id: 11,
        ageGroup: "3.5-4",
        type: "size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", size: "big", label: "Big square" },
          { shape: "square", size: "small", label: "Small square" },
          { shape: "square", size: "big", label: "Big square" }
        ],
        options: [
          { id: "1", shape: "circle", size: "small", label: "Small circle" },
          { id: "2", shape: "square", size: "small", label: "Small square" },
          { id: "3", shape: "triangle", label: "Triangle" },
          { id: "4", shape: "heart", label: "Heart" }
        ],
        correctAnswer: "2"
      },
      {
        id: 12,
        ageGroup: "3.5-4",
        type: "alternating_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", label: "Star" },
          { shape: "heart", label: "Heart" },
          { shape: "star", label: "Star" }
        ],
        options: [
          { id: "1", shape: "circle", label: "Circle" },
          { id: "2", shape: "square", label: "Square" },
          { id: "3", shape: "star", label: "Star" },
          { id: "4", shape: "heart", label: "Heart" }
        ],
        correctAnswer: "4"
      },
      {
        id: 13,
        ageGroup: "3.5-4",
        type: "complex_size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", size: "big", label: "Big triangle" },
          { shape: "triangle", size: "small", label: "Small triangle" },
          { shape: "triangle", size: "big", label: "Big triangle" },
          { shape: "triangle", size: "small", label: "Small triangle" }
        ],
        options: [
          { id: "1", shape: "circle", label: "Circle" },
          { id: "2", shape: "triangle", size: "big", label: "Big triangle" },
          { id: "3", shape: "square", label: "Square" },
          { id: "4", shape: "star", label: "Star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 14,
        ageGroup: "3.5-4",
        type: "alternating_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "lavender", label: "Lavender circle" },
          { shape: "triangle", color: "peach", label: "Peach triangle" },
          { shape: "circle", color: "lavender", label: "Lavender circle" }
        ],
        options: [
          { id: "1", shape: "heart", color: "crimson", label: "Crimson heart" },
          { id: "2", shape: "square", color: "indigo", label: "Indigo square" },
          { id: "3", shape: "circle", color: "lavender", label: "Lavender circle" },
          { id: "4", shape: "triangle", color: "peach", label: "Peach triangle" }
        ],
        correctAnswer: "4"
      }
    ]
  },
  "4-5": {
    title: "Ages 4-5 (Pre-K)",
    questions: [
      {
        id: 15,
        ageGroup: "4-5",
        type: "three_shape_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "pink", label: "Pink circle" },
          { shape: "square", color: "lime", label: "Lime square" },
          { shape: "triangle", color: "sky", label: "Sky triangle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "pink", label: "Pink circle" },
          { id: "2", shape: "square", color: "lime", label: "Lime square" },
          { id: "3", shape: "triangle", color: "sky", label: "Sky triangle" },
          { id: "4", shape: "star", color: "gold", label: "Gold star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 16,
        ageGroup: "4-5",
        type: "counting_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 1, label: "1 dot" },
          { shape: "dot", count: 2, label: "2 dots" },
          { shape: "dot", count: 3, label: "3 dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 4, label: "4 dots" },
          { id: "2", shape: "dot", count: 2, label: "2 dots" },
          { id: "3", shape: "dot", count: 1, label: "1 dot" },
          { id: "4", shape: "dot", count: 5, label: "5 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 17,
        ageGroup: "4-5",
        type: "three_shape_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "coral", label: "Coral triangle" },
          { shape: "circle", color: "turquoise", label: "Turquoise circle" },
          { shape: "star", color: "amber", label: "Amber star" }
        ],
        options: [
          { id: "1", shape: "heart", color: "fuchsia", label: "Fuchsia heart" },
          { id: "2", shape: "triangle", color: "coral", label: "Coral triangle" },
          { id: "3", shape: "circle", color: "turquoise", label: "Turquoise circle" },
          { id: "4", shape: "square", color: "mint", label: "Mint square" }
        ],
        correctAnswer: "2"
      },
      {
        id: 18,
        ageGroup: "4-5",
        type: "star_counting_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", count: 1, label: "1 star" },
          { shape: "star", count: 2, label: "2 stars" },
          { shape: "star", count: 3, label: "3 stars" }
        ],
        options: [
          { id: "1", shape: "star", count: 4, label: "4 stars" },
          { id: "2", shape: "star", count: 1, label: "1 star" },
          { id: "3", shape: "star", count: 5, label: "5 stars" },
          { id: "4", shape: "star", count: 2, label: "2 stars" }
        ],
        correctAnswer: "1"
      },
      {
        id: 19,
        ageGroup: "4-5",
        type: "color_size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", size: "big", label: "Big red circle" },
          { shape: "circle", color: "blue", size: "small", label: "Small blue circle" },
          { shape: "circle", color: "red", size: "big", label: "Big red circle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "green", size: "medium", label: "Medium green circle" },
          { id: "2", shape: "circle", color: "blue", size: "small", label: "Small blue circle" },
          { id: "3", shape: "circle", color: "red", size: "small", label: "Small red circle" },
          { id: "4", shape: "square", color: "blue", label: "Blue square" }
        ],
        correctAnswer: "2"
      },
      {
        id: 20,
        ageGroup: "4-5",
        type: "progressive_size_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", size: "tiny", label: "Tiny square" },
          { shape: "square", size: "small", label: "Small square" },
          { shape: "square", size: "medium", label: "Medium square" }
        ],
        options: [
          { id: "1", shape: "square", size: "big", label: "Big square" },
          { id: "2", shape: "square", size: "small", label: "Small square" },
          { id: "3", shape: "triangle", size: "medium", label: "Medium triangle" },
          { id: "4", shape: "square", size: "tiny", label: "Tiny square" }
        ],
        correctAnswer: "1"
      },
      {
        id: 21,
        ageGroup: "4-5",
        type: "alternating_shape_size",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", size: "big", label: "Big triangle" },
          { shape: "circle", size: "small", label: "Small circle" },
          { shape: "triangle", size: "big", label: "Big triangle" }
        ],
        options: [
          { id: "1", shape: "triangle", size: "small", label: "Small triangle" },
          { id: "2", shape: "circle", size: "small", label: "Small circle" },
          { id: "3", shape: "square", size: "big", label: "Big square" },
          { id: "4", shape: "star", label: "Star" }
        ],
        correctAnswer: "2"
      }
    ]
  },
  "6-7": {
    title: "Ages 6-7 (Kindergarten)",
    questions: [
      {
        id: 22,
        ageGroup: "6-7",
        type: "abab_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", label: "Red circle" },
          { shape: "square", color: "blue", label: "Blue square" },
          { shape: "circle", color: "red", label: "Red circle" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "green", label: "Green triangle" },
          { id: "2", shape: "square", color: "blue", label: "Blue square" },
          { id: "3", shape: "circle", color: "blue", label: "Blue circle" },
          { id: "4", shape: "square", color: "red", label: "Red square" }
        ],
        correctAnswer: "2"
      },
      {
        id: 23,
        ageGroup: "6-7",
        type: "abc_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "emerald", label: "Emerald triangle" },
          { shape: "circle", color: "coral", label: "Coral circle" },
          { shape: "square", color: "sky", label: "Sky square" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "emerald", label: "Emerald triangle" },
          { id: "2", shape: "star", color: "gold", label: "Gold star" },
          { id: "3", shape: "heart", color: "fuchsia", label: "Fuchsia heart" },
          { id: "4", shape: "diamond", color: "peach", label: "Peach diamond" }
        ],
        correctAnswer: "1"
      },
      {
        id: 24,
        ageGroup: "6-7",
        type: "size_progression",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", size: "small", label: "Small circle" },
          { shape: "circle", size: "medium", label: "Medium circle" },
          { shape: "circle", size: "big", label: "Big circle" }
        ],
        options: [
          { id: "1", shape: "circle", size: "bigger", label: "Bigger circle" },
          { id: "2", shape: "circle", size: "small", label: "Small circle" },
          { id: "3", shape: "square", size: "big", label: "Big square" },
          { id: "4", shape: "circle", size: "medium", label: "Medium circle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 25,
        ageGroup: "6-7",
        type: "number_shape_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 2, label: "2 dots" },
          { shape: "dot", count: 4, label: "4 dots" },
          { shape: "dot", count: 6, label: "6 dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 8, label: "8 dots" },
          { id: "2", shape: "dot", count: 7, label: "7 dots" },
          { id: "3", shape: "dot", count: 5, label: "5 dots" },
          { id: "4", shape: "dot", count: 10, label: "10 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 26,
        ageGroup: "6-7",
        type: "complex_alternating",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", size: "big", color: "red", label: "Big red triangle" },
          { shape: "square", size: "small", color: "blue", label: "Small blue square" },
          { shape: "triangle", size: "big", color: "red", label: "Big red triangle" }
        ],
        options: [
          { id: "1", shape: "square", size: "small", color: "blue", label: "Small blue square" },
          { id: "2", shape: "circle", size: "medium", color: "green", label: "Medium green circle" },
          { id: "3", shape: "triangle", size: "small", color: "blue", label: "Small blue triangle" },
          { id: "4", shape: "star", size: "big", color: "yellow", label: "Big yellow star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 27,
        ageGroup: "6-7",
        type: "aaab_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "aqua", label: "Aqua circle" },
          { shape: "circle", color: "aqua", label: "Aqua circle" },
          { shape: "circle", color: "aqua", label: "Aqua circle" }
        ],
        options: [
          { id: "1", shape: "circle", color: "aqua", label: "Aqua circle" },
          { id: "2", shape: "square", color: "rose", label: "Rose square" },
          { id: "3", shape: "triangle", color: "gold", label: "Gold triangle" },
          { id: "4", shape: "star", color: "mint", label: "Mint star" }
        ],
        correctAnswer: "2"
      },
      {
        id: 28,
        ageGroup: "6-7",
        type: "abcd_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "violet", label: "Violet circle" },
          { shape: "square", color: "coral", label: "Coral square" },
          { shape: "triangle", color: "teal", label: "Teal triangle" }
        ],
        options: [
          { id: "1", shape: "star", color: "amber", label: "Amber star" },
          { id: "2", shape: "circle", color: "violet", label: "Violet circle" },
          { id: "3", shape: "heart", color: "pink", label: "Pink heart" },
          { id: "4", shape: "diamond", color: "lime", label: "Lime diamond" }
        ],
        correctAnswer: "1"
      }
    ]
  },
  "8-9": {
    title: "Ages 8-9 (Elementary)",
    questions: [
      {
        id: 29,
        ageGroup: "8-9",
        type: "rotation_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", rotation: 0, label: "Triangle pointing up" },
          { shape: "triangle", rotation: 90, label: "Triangle pointing right" },
          { shape: "triangle", rotation: 180, label: "Triangle pointing down" }
        ],
        options: [
          { id: "1", shape: "triangle", rotation: 270, label: "Triangle pointing left" },
          { id: "2", shape: "triangle", rotation: 0, label: "Triangle pointing up" },
          { id: "3", shape: "square", rotation: 0, label: "Square" },
          { id: "4", shape: "triangle", rotation: 45, label: "Tilted triangle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 30,
        ageGroup: "8-9",
        type: "fibonacci_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 1, label: "1 dot" },
          { shape: "dot", count: 1, label: "1 dot" },
          { shape: "dot", count: 2, label: "2 dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 3, label: "3 dots" },
          { id: "2", shape: "dot", count: 4, label: "4 dots" },
          { id: "3", shape: "dot", count: 2, label: "2 dots" },
          { id: "4", shape: "dot", count: 5, label: "5 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 31,
        ageGroup: "8-9",
        type: "color_rotation",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "square", color: "crimson", label: "Crimson square" },
          { shape: "square", color: "turquoise", label: "Turquoise square" },
          { shape: "square", color: "lime", label: "Lime square" }
        ],
        options: [
          { id: "1", shape: "square", color: "amber", label: "Amber square" },
          { id: "2", shape: "square", color: "crimson", label: "Crimson square" },
          { id: "3", shape: "triangle", color: "crimson", label: "Crimson triangle" },
          { id: "4", shape: "square", color: "lavender", label: "Lavender square" }
        ],
        correctAnswer: "1"
      },
      {
        id: 32,
        ageGroup: "8-9",
        type: "position_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "fuchsia", position: "top", label: "Fuchsia circle at top" },
          { shape: "circle", color: "fuchsia", position: "middle", label: "Fuchsia circle in middle" },
          { shape: "circle", color: "fuchsia", position: "bottom", label: "Fuchsia circle at bottom" }
        ],
        options: [
          { id: "1", shape: "circle", color: "fuchsia", position: "top", label: "Fuchsia circle at top" },
          { id: "2", shape: "circle", color: "fuchsia", position: "left", label: "Fuchsia circle on left" },
          { id: "3", shape: "square", color: "emerald", position: "top", label: "Emerald square at top" },
          { id: "4", shape: "circle", color: "fuchsia", position: "right", label: "Fuchsia circle on right" }
        ],
        correctAnswer: "1"
      },
      {
        id: 33,
        ageGroup: "8-9",
        type: "skip_counting",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", count: 3, label: "3 stars" },
          { shape: "star", count: 6, label: "6 stars" },
          { shape: "star", count: 9, label: "9 stars" }
        ],
        options: [
          { id: "1", shape: "star", count: 12, label: "12 stars" },
          { id: "2", shape: "star", count: 10, label: "10 stars" },
          { id: "3", shape: "star", count: 11, label: "11 stars" },
          { id: "4", shape: "star", count: 15, label: "15 stars" }
        ],
        correctAnswer: "1"
      },
      {
        id: 34,
        ageGroup: "8-9",
        type: "complex_color_shape",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "rose", size: "big", label: "Big rose circle" },
          { shape: "square", color: "cyan", size: "small", label: "Small cyan square" },
          { shape: "triangle", color: "mint", size: "medium", label: "Medium mint triangle" }
        ],
        options: [
          { id: "1", shape: "star", color: "gold", size: "big", label: "Big gold star" },
          { id: "2", shape: "heart", color: "violet", size: "small", label: "Small violet heart" },
          { id: "3", shape: "diamond", color: "coral", size: "medium", label: "Medium coral diamond" },
          { id: "4", shape: "circle", color: "rose", size: "small", label: "Small rose circle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 35,
        ageGroup: "8-9",
        type: "mirror_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", rotation: 0, label: "Triangle pointing up" },
          { shape: "triangle", rotation: 180, label: "Triangle pointing down" },
          { shape: "triangle", rotation: 0, label: "Triangle pointing up" }
        ],
        options: [
          { id: "1", shape: "triangle", rotation: 180, label: "Triangle pointing down" },
          { id: "2", shape: "triangle", rotation: 90, label: "Triangle pointing right" },
          { id: "3", shape: "square", rotation: 0, label: "Square" },
          { id: "4", shape: "triangle", rotation: 270, label: "Triangle pointing left" }
        ],
        correctAnswer: "1"
      }
    ]
  },
  "10-11": {
    title: "Ages 10-11 (Elementary)",
    questions: [
      {
        id: 36,
        ageGroup: "10-11",
        type: "matrix_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", size: "small", label: "Small red circle" },
          { shape: "circle", color: "red", size: "big", label: "Big red circle" },
          { shape: "square", color: "blue", size: "small", label: "Small blue square" }
        ],
        options: [
          { id: "1", shape: "square", color: "blue", size: "big", label: "Big blue square" },
          { id: "2", shape: "triangle", color: "green", size: "small", label: "Small green triangle" },
          { id: "3", shape: "circle", color: "red", size: "medium", label: "Medium red circle" },
          { id: "4", shape: "star", color: "yellow", size: "big", label: "Big yellow star" }
        ],
        correctAnswer: "1"
      },
      {
        id: 37,
        ageGroup: "10-11",
        type: "algebraic_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 2, label: "2 dots" },
          { shape: "dot", count: 5, label: "5 dots" },
          { shape: "dot", count: 8, label: "8 dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 11, label: "11 dots" },
          { id: "2", shape: "dot", count: 12, label: "12 dots" },
          { id: "3", shape: "dot", count: 10, label: "10 dots" },
          { id: "4", shape: "dot", count: 9, label: "9 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 38,
        ageGroup: "10-11",
        type: "transformation_rule",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "red", size: "small", label: "Small red triangle" },
          { shape: "triangle", color: "blue", size: "medium", label: "Medium blue triangle" },
          { shape: "triangle", color: "green", size: "big", label: "Big green triangle" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "yellow", size: "bigger", label: "Bigger yellow triangle" },
          { id: "2", shape: "square", color: "red", size: "small", label: "Small red square" },
          { id: "3", shape: "triangle", color: "purple", size: "small", label: "Small purple triangle" },
          { id: "4", shape: "circle", color: "orange", size: "big", label: "Big orange circle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 39,
        ageGroup: "10-11",
        type: "complex_rotation",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", rotation: 0, color: "red", label: "Red triangle pointing up" },
          { shape: "triangle", rotation: 45, color: "blue", label: "Blue triangle tilted right" },
          { shape: "triangle", rotation: 90, color: "green", label: "Green triangle pointing right" }
        ],
        options: [
          { id: "1", shape: "triangle", rotation: 135, color: "yellow", label: "Yellow triangle tilted down-right" },
          { id: "2", shape: "triangle", rotation: 0, color: "purple", label: "Purple triangle pointing up" },
          { id: "3", shape: "square", rotation: 45, color: "orange", label: "Tilted orange square" },
          { id: "4", shape: "triangle", rotation: 180, color: "red", label: "Red triangle pointing down" }
        ],
        correctAnswer: "1"
      },
      {
        id: 40,
        ageGroup: "10-11",
        type: "advanced_counting",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", count: 1, label: "1 star" },
          { shape: "star", count: 4, label: "4 stars" },
          { shape: "star", count: 9, label: "9 stars" }
        ],
        options: [
          { id: "1", shape: "star", count: 16, label: "16 stars" },
          { id: "2", shape: "star", count: 12, label: "12 stars" },
          { id: "3", shape: "star", count: 13, label: "13 stars" },
          { id: "4", shape: "star", count: 15, label: "15 stars" }
        ],
        correctAnswer: "1"
      },
      {
        id: 41,
        ageGroup: "10-11",
        type: "dual_transformation",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", size: "big", label: "Big red circle" },
          { shape: "square", color: "blue", size: "small", label: "Small blue square" },
          { shape: "triangle", color: "green", size: "medium", label: "Medium green triangle" }
        ],
        options: [
          { id: "1", shape: "star", color: "yellow", size: "tiny", label: "Tiny yellow star" },
          { id: "2", shape: "heart", color: "purple", size: "big", label: "Big purple heart" },
          { id: "3", shape: "diamond", color: "orange", size: "bigger", label: "Bigger orange diamond" },
          { id: "4", shape: "circle", color: "red", size: "medium", label: "Medium red circle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 42,
        ageGroup: "10-11",
        type: "pattern_within_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 3, color: "red", label: "3 red dots" },
          { shape: "dot", count: 6, color: "blue", label: "6 blue dots" },
          { shape: "dot", count: 9, color: "green", label: "9 green dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 12, color: "yellow", label: "12 yellow dots" },
          { id: "2", shape: "dot", count: 10, color: "purple", label: "10 purple dots" },
          { id: "3", shape: "dot", count: 15, color: "orange", label: "15 orange dots" },
          { id: "4", shape: "star", count: 12, color: "red", label: "12 red stars" }
        ],
        correctAnswer: "1"
      }
    ]
  },
  "12-14": {
    title: "Ages 12-14 (Middle School)",
    questions: [
      {
        id: 43,
        ageGroup: "12-14",
        type: "advanced_matrix",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "red", rotation: 0, size: "small", label: "Small red triangle up" },
          { shape: "triangle", color: "blue", rotation: 90, size: "medium", label: "Medium blue triangle right" },
          { shape: "triangle", color: "green", rotation: 180, size: "big", label: "Big green triangle down" }
        ],
        options: [
          { id: "1", shape: "triangle", color: "yellow", rotation: 270, size: "bigger", label: "Bigger yellow triangle left" },
          { id: "2", shape: "square", color: "purple", rotation: 0, size: "small", label: "Small purple square" },
          { id: "3", shape: "triangle", color: "orange", rotation: 45, size: "medium", label: "Medium orange triangle tilted" },
          { id: "4", shape: "circle", color: "red", rotation: 0, size: "big", label: "Big red circle" }
        ],
        correctAnswer: "1"
      },
      {
        id: 44,
        ageGroup: "12-14",
        type: "fibonacci_advanced",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", count: 1, label: "1 star" },
          { shape: "star", count: 2, label: "2 stars" },
          { shape: "star", count: 3, label: "3 stars" }
        ],
        options: [
          { id: "1", shape: "star", count: 5, label: "5 stars" },
          { id: "2", shape: "star", count: 4, label: "4 stars" },
          { id: "3", shape: "star", count: 6, label: "6 stars" },
          { id: "4", shape: "star", count: 8, label: "8 stars" }
        ],
        correctAnswer: "1"
      },
      {
        id: 45,
        ageGroup: "12-14",
        type: "geometric_progression",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 2, label: "2 dots" },
          { shape: "dot", count: 6, label: "6 dots" },
          { shape: "dot", count: 18, label: "18 dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 54, label: "54 dots" },
          { id: "2", shape: "dot", count: 36, label: "36 dots" },
          { id: "3", shape: "dot", count: 24, label: "24 dots" },
          { id: "4", shape: "dot", count: 72, label: "72 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 46,
        ageGroup: "12-14",
        type: "multi_rule_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", size: "small", rotation: 0, label: "Small red circle" },
          { shape: "square", color: "blue", size: "medium", rotation: 45, label: "Medium blue square tilted" },
          { shape: "triangle", color: "green", size: "big", rotation: 90, label: "Big green triangle right" }
        ],
        options: [
          { id: "1", shape: "star", color: "yellow", size: "bigger", rotation: 135, label: "Bigger yellow star tilted left" },
          { id: "2", shape: "heart", color: "purple", size: "small", rotation: 0, label: "Small purple heart" },
          { id: "3", shape: "diamond", color: "orange", size: "medium", rotation: 90, label: "Medium orange diamond right" },
          { id: "4", shape: "circle", color: "red", size: "big", rotation: 180, label: "Big red circle flipped" }
        ],
        correctAnswer: "1"
      },
      {
        id: 47,
        ageGroup: "12-14",
        type: "prime_number_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 2, label: "2 dots" },
          { shape: "dot", count: 3, label: "3 dots" },
          { shape: "dot", count: 5, label: "5 dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 7, label: "7 dots" },
          { id: "2", shape: "dot", count: 6, label: "6 dots" },
          { id: "3", shape: "dot", count: 8, label: "8 dots" },
          { id: "4", shape: "dot", count: 9, label: "9 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 48,
        ageGroup: "12-14",
        type: "complex_transformation_matrix",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "red", size: "small", rotation: 0, label: "Small red triangle up" },
          { shape: "circle", color: "blue", size: "medium", rotation: 90, label: "Medium blue circle" },
          { shape: "square", color: "green", size: "big", rotation: 180, label: "Big green square" }
        ],
        options: [
          { id: "1", shape: "star", color: "yellow", size: "bigger", rotation: 270, label: "Bigger yellow star" },
          { id: "2", shape: "heart", color: "purple", size: "tiny", rotation: 45, label: "Tiny purple heart tilted" },
          { id: "3", shape: "diamond", color: "orange", size: "small", rotation: 135, label: "Small orange diamond" },
          { id: "4", shape: "triangle", color: "red", size: "medium", rotation: 225, label: "Medium red triangle" }
        ],
        correctAnswer: "1"
      }
    ]
  },
  "15+": {
    title: "Ages 15+ (High School+)",
    questions: [
      {
        id: 49,
        ageGroup: "15+",
        type: "advanced_algebraic",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "dot", count: 1, label: "1 dot" },
          { shape: "dot", count: 8, label: "8 dots" },
          { shape: "dot", count: 27, label: "27 dots" }
        ],
        options: [
          { id: "1", shape: "dot", count: 64, label: "64 dots" },
          { id: "2", shape: "dot", count: 54, label: "54 dots" },
          { id: "3", shape: "dot", count: 36, label: "36 dots" },
          { id: "4", shape: "dot", count: 125, label: "125 dots" }
        ],
        correctAnswer: "1"
      },
      {
        id: 50,
        ageGroup: "15+",
        type: "complex_geometric_transformation",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "red", size: "small", rotation: 0, label: "Small red triangle up" },
          { shape: "square", color: "blue", size: "medium", rotation: 90, label: "Medium blue square rotated" },
          { shape: "pentagon", color: "green", size: "big", rotation: 180, label: "Big green pentagon flipped" }
        ],
        options: [
          { id: "1", shape: "hexagon", color: "yellow", size: "bigger", rotation: 270, label: "Bigger yellow hexagon rotated left" },
          { id: "2", shape: "circle", color: "purple", size: "tiny", rotation: 45, label: "Tiny purple circle tilted" },
          { id: "3", shape: "star", color: "orange", size: "small", rotation: 135, label: "Small orange star" },
          { id: "4", shape: "heart", color: "pink", size: "medium", rotation: 225, label: "Medium pink heart" }
        ],
        correctAnswer: "1"
      },
      {
        id: 51,
        ageGroup: "15+",
        type: "matrix_reasoning_advanced",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "circle", color: "red", size: "big", rotation: 0, position: "top", label: "Big red circle at top" },
          { shape: "square", color: "blue", size: "medium", rotation: 45, position: "middle", label: "Medium blue square tilted in middle" },
          { shape: "triangle", color: "green", size: "small", rotation: 90, position: "bottom", label: "Small green triangle right at bottom" }
        ],
        options: [
          { id: "1", shape: "star", color: "yellow", size: "tiny", rotation: 135, position: "top", label: "Tiny yellow star tilted at top" },
          { id: "2", shape: "heart", color: "purple", size: "bigger", rotation: 180, position: "middle", label: "Bigger purple heart flipped in middle" },
          { id: "3", shape: "diamond", color: "orange", size: "big", rotation: 225, position: "bottom", label: "Big orange diamond rotated at bottom" },
          { id: "4", shape: "circle", color: "pink", size: "medium", rotation: 270, position: "left", label: "Medium pink circle left rotated" }
        ],
        correctAnswer: "1"
      },
      {
        id: 52,
        ageGroup: "15+",
        type: "exponential_pattern",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "star", count: 4, label: "4 stars" },
          { shape: "star", count: 16, label: "16 stars" },
          { shape: "star", count: 64, label: "64 stars" }
        ],
        options: [
          { id: "1", shape: "star", count: 256, label: "256 stars" },
          { id: "2", shape: "star", count: 128, label: "128 stars" },
          { id: "3", shape: "star", count: 192, label: "192 stars" },
          { id: "4", shape: "star", count: 100, label: "100 stars" }
        ],
        correctAnswer: "1"
      },
      {
        id: 53,
        ageGroup: "15+",
        type: "multi_dimensional_transformation",
        question: "What comes next in the pattern?",
        sequence: [
          { shape: "triangle", color: "red", size: "small", rotation: 0, filled: true, label: "Small filled red triangle up" },
          { shape: "square", color: "blue", size: "medium", rotation: 90, filled: false, label: "Medium outline blue square right" },
          { shape: "circle", color: "green", size: "big", rotation: 180, filled: true, label: "Big filled green circle" }
        ],
        options: [
          { id: "1", shape: "star", color: "yellow", size: "bigger", rotation: 270, filled: false, label: "Bigger outline yellow star left" },
          { id: "2", shape: "heart", color: "purple", size: "tiny", rotation: 45, filled: true, label: "Tiny filled purple heart" },
          { id: "3", shape: "diamond", color: "orange", size: "small", rotation: 135, filled: false, label: "Small outline orange diamond" },
          { id: "4", shape: "triangle", color: "pink", size: "medium", rotation: 225, filled: true, label: "Medium filled pink triangle" }
        ],
        correctAnswer: "1"
      }
    ]
  }
}

// Flatten all question groups into single array for backwards compatibility  
const QUESTIONS = [
  ...QUESTION_GROUPS["2.5-3.5"].questions,
  ...QUESTION_GROUPS["3.5-4"].questions,
  ...QUESTION_GROUPS["4-5"].questions,
  ...QUESTION_GROUPS["6-7"].questions,
  ...QUESTION_GROUPS["8-9"].questions,
  ...QUESTION_GROUPS["10-11"].questions,
  ...QUESTION_GROUPS["12-14"].questions,
  ...QUESTION_GROUPS["15+"].questions
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

  // Render shape based on type, color, and size
  const renderShape = (item: any) => {
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
      'aqua': { fill: '#06B6D4', stroke: '#0891B2' }
    }

    const colors = colorMap[item.color] || { fill: '#6B7280', stroke: '#4B5563' }
    const size = item.size === 'big' ? 50 : 
                 item.size === 'small' ? 35 : 
                 item.size === 'medium' ? 42 :
                 item.size === 'tiny' ? 28 :
                 item.size === 'bigger' ? 55 : 42
    const viewBox = 70
    const center = viewBox / 2

    const commonStyle = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }

    switch (item.shape) {
      case 'circle':
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <circle 
                cx={center} 
                cy={center} 
                r={size / 2}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )

      case 'square':
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <rect 
                x={center - size / 2} 
                y={center - size / 2} 
                width={size} 
                height={size}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
                rx="3"
              />
            </svg>
          </div>
        )

      case 'triangle':
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <polygon 
                points={`${center},${center - size / 2} ${center + size / 2},${center + size / 2} ${center - size / 2},${center + size / 2}`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )

      case 'diamond':
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <polygon 
                points={`${center},${center - size / 2} ${center + size / 2},${center} ${center},${center + size / 2} ${center - size / 2},${center}`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
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
        const starStartX = center - starTotalWidth / 2

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
                  const y = center + Math.sin(angle - Math.PI / 2) * radius
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
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <path 
                d={`M${center},${center + size * 0.3} C${center - size * 0.5},${center - size * 0.1} ${center - size * 0.5},${center - size * 0.5} ${center},${center - size * 0.2} C${center + size * 0.5},${center - size * 0.5} ${center + size * 0.5},${center - size * 0.1} ${center},${center + size * 0.3}Z`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )

      case 'dot':
        const dotCount = item.count || 1
        // Adaptive dot size and spacing based on count
        let dotSize, dotSpacing
        
        if (dotCount === 1) {
          dotSize = 10
          dotSpacing = 0
        } else if (dotCount === 2) {
          dotSize = 8
          dotSpacing = 20
        } else if (dotCount === 3) {
          dotSize = 7
          dotSpacing = 15
        } else if (dotCount === 4) {
          dotSize = 6
          dotSpacing = 12
        } else if (dotCount === 5) {
          dotSize = 5
          dotSpacing = 10
        } else if (dotCount === 6) {
          dotSize = 4
          dotSpacing = 8
        } else if (dotCount === 7) {
          dotSize = 4
          dotSpacing = 7
        } else if (dotCount === 8) {
          dotSize = 3
          dotSpacing = 6
        } else {
          dotSize = 3
          dotSpacing = 5
        }
        
        const dotTotalWidth = (dotCount - 1) * dotSpacing
        const dotStartX = center - dotTotalWidth / 2

        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {Array.from({ length: dotCount }, (_, i) => (
                <circle 
                  key={i}
                  cx={dotStartX + i * dotSpacing} 
                  cy={center} 
                  r={dotSize / 2}
                  fill={colors.fill}
                  stroke={colors.stroke} 
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>
        )

      default:
        return (
          <div style={commonStyle}>
            <svg width="70" height="70" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <circle 
                cx={center} 
                cy={center} 
                r={size / 2}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
              />
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
              {/* Show 3 shapes in sequence + question mark for 4th */}
              <div className="flex justify-center items-center mb-4 gap-6">
                {question.sequence.map((step: any, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="w-24 h-24 border-2 border-gray-300 rounded-xl flex items-center justify-center bg-white shadow-sm mb-2">
                      {renderShape(step)}
                    </div>
                    <p className="text-lg font-bold text-gray-900">{index + 1}</p>
                  </div>
                ))}
                
                {/* Fourth tile with question mark */}
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 border-2 border-dashed border-blue-900 rounded-xl flex items-center justify-center bg-blue-50 shadow-sm mb-2">
                    {answers[currentQuestion]?.answer ? (
                      renderShape(
                        question.options.find((opt: any) => opt.id === answers[currentQuestion].answer) || {}
                      )
                    ) : (
                      <span className="text-2xl text-blue-900 font-bold">?</span>
                    )}
                  </div>
                  <p className="text-lg font-bold text-gray-900">4</p>
                </div>
              </div>
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
                        className={`w-24 h-24 rounded-xl border-2 transition-all flex items-center justify-center mb-2 ${
                          answers[currentQuestion]?.answer === option.id
                            ? "border-blue-900 bg-blue-100"
                            : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        {renderShape(option)}
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