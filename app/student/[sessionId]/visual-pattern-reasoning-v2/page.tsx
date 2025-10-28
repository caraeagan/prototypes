"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Questions from 15+ content - converted to "find the wrong one" format
const QUESTIONS = [
  {
    id: 53,
    ageGroup: "15+",
    type: "find_wrong_one",
    question: "Click on the shape that doesn't belong in the pattern",
    grid: [
      [
        { svgPath: "/svg/q53/shape-row1-col1.svg", row: 0, col: 0 },
        { svgPath: "/svg/q53/shape-row1-col2.svg", row: 0, col: 1 },
        { svgPath: "/svg/q53/shape-row1-col3.svg", row: 0, col: 2 },
        { svgPath: "/svg/q53/shape-row1-col4.svg", row: 0, col: 3 }
      ],
      [
        { svgPath: "/svg/q53/shape-row2-col1.svg", row: 1, col: 0 },
        { svgPath: "/svg/q53/shape-row2-col2.svg", row: 1, col: 1 },
        { svgPath: "/svg/q53/shape-row2-col3.svg", row: 1, col: 2 },
        { svgPath: "/svg/q53/shape-row2-col4.svg", row: 1, col: 3 }
      ],
      [
        { svgPath: "/svg/q53/shape-row3-col1.svg", row: 2, col: 0 },
        { svgPath: "/svg/q53/shape-row3-col2.svg", row: 2, col: 1 },
        { svgPath: "/svg/q53/shape-row3-col3.svg", row: 2, col: 2 },
        { svgPath: "/svg/q53/shape-row3-col4.svg", row: 2, col: 3 }
      ],
      [
        { svgPath: "/svg/q53/shape-row4-col1.svg", row: 3, col: 0 },
        { svgPath: "/svg/q53/shape-row4-col2.svg", row: 3, col: 1 },
        { svgPath: "/svg/q53/shape-row4-col3.svg", row: 3, col: 2 },
        { svgPath: "/svg/q53/option-B.svg", row: 3, col: 3 }  // WRONG ONE - should be option-A
      ]
    ],
    wrongCellRow: 3,
    wrongCellCol: 3
  },
  {
    id: 54,
    ageGroup: "15+",
    type: "find_wrong_one",
    question: "Click on the shape that doesn't belong in the pattern",
    grid: [
      [
        { svgPath: "/svg/q54/octagon-row1-col1.svg", row: 0, col: 0 },
        { svgPath: "/svg/q54/octagon-row1-col2.svg", row: 0, col: 1 },
        { svgPath: "/svg/q54/octagon-row1-col3.svg", row: 0, col: 2 },
        { svgPath: "/svg/q54/octagon-row1-col4.svg", row: 0, col: 3 }
      ],
      [
        { svgPath: "/svg/q54/octagon-row2-col1.svg", row: 1, col: 0 },
        { svgPath: "/svg/q54/octagon-row2-col2.svg", row: 1, col: 1 },
        { svgPath: "/svg/q54/octagon-row2-col3.svg", row: 1, col: 2 },
        { svgPath: "/svg/q54/octagon-row2-col4.svg", row: 1, col: 3 }
      ],
      [
        { svgPath: "/svg/q54/octagon-row3-col1.svg", row: 2, col: 0 },
        { svgPath: "/svg/q54/octagon-row3-col2.svg", row: 2, col: 1 },
        { svgPath: "/svg/q54/octagon-row3-col3.svg", row: 2, col: 2 },
        { svgPath: "/svg/q54/octagon-row2-col3.svg", row: 2, col: 3 }  // WRONG ONE - should be octagon-row3-col4.svg
      ],
      [
        { svgPath: "/svg/q54/octagon-row4-col1.svg", row: 3, col: 0 },
        { svgPath: "/svg/q54/octagon-row4-col2.svg", row: 3, col: 1 },
        { svgPath: "/svg/q54/octagon-row4-col3.svg", row: 3, col: 2 },
        { svgPath: "/svg/q54/octagon-row4-col4.svg", row: 3, col: 3 }
      ]
    ],
    wrongCellRow: 2,
    wrongCellCol: 3
  },
  {
    id: 55,
    ageGroup: "15+",
    type: "find_wrong_one",
    question: "Click on the shape that doesn't belong in the pattern",
    gridSize: "3x3",
    grid: [
      [
        { svgPath: "/svg/q55/hexagon-row1-col1.svg", row: 0, col: 0 },
        { svgPath: "/svg/q55/hexagon-row1-col2.svg", row: 0, col: 1 },
        { svgPath: "/svg/q55/hexagon-row1-col3.svg", row: 0, col: 2 }
      ],
      [
        { svgPath: "/svg/q55/hexagon-row2-col1.svg", row: 1, col: 0 },
        { svgPath: "/svg/q55/hexagon-row2-col2.svg", row: 1, col: 1 },
        { svgPath: "/svg/q55/hexagon-row2-col3.svg", row: 1, col: 2 }
      ],
      [
        { svgPath: "/svg/q55/hexagon-row3-col1.svg", row: 2, col: 0 },
        { svgPath: "/svg/q55/hexagon-row3-col2.svg", row: 2, col: 1 },
        { svgPath: "/svg/q55/hexagon-row3-col3.svg", row: 2, col: 2 }
      ]
    ],
    wrongCellRow: -1,
    wrongCellCol: -1
  }
]

export default function VisualPatternReasoningV2() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null)

  const question = QUESTIONS[currentQuestion]

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col })
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      // Move to next question
      setCurrentQuestion(currentQuestion + 1)
      setSelectedCell(null)
    } else {
      // Test complete
      router.push(`/student/${sessionId}`)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Visual Pattern Reasoning V2</h1>
              <p className="text-sm text-gray-600 mt-1">Ages 15+ • Question {currentQuestion + 1} of {QUESTIONS.length}</p>
            </div>
            <button
              onClick={() => router.push(`/student/${sessionId}`)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Exit Test
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Question Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {question.question}
            </h2>
            <p className="text-gray-600">
              Study the pattern carefully and click on the shape that doesn't fit.
            </p>
          </div>

          {/* Grid Display */}
          <div className="flex justify-center mb-8">
            <div className={`grid gap-4 ${question.gridSize === '3x3' ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {question.grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    className={`
                      w-32 h-32 border-4 rounded-lg transition-all cursor-pointer
                      ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }
                    `}
                  >
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <Image
                        src={cell.svgPath}
                        alt={`Pattern shape at row ${rowIndex + 1}, column ${colIndex + 1}`}
                        width={100}
                        height={100}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>


          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={() => router.push(`/student/${sessionId}`)}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
            >
              Back
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800"
            >
              {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Complete Test'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
