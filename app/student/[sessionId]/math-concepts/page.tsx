"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

const QUESTIONS = [
  {
    id: 1,
    question: "The temperature outside rises from 60 °F at 8 AM to 80 °F at 12 PM. What is the average rate of change in degrees per hour?",
    correctAnswer: "5",
    type: "numeric"
  },
  {
    id: 2,
    question: "A rectangular garden has a length of 15 feet and a width of 8 feet. What is the area of the garden in square feet?",
    correctAnswer: "120",
    type: "numeric"
  },
  {
    id: 3,
    question: "Sarah has $45. She buys 3 books that cost $12 each. How much money does she have left?",
    correctAnswer: "9",
    type: "numeric"
  }
]

export default function StudentMathConceptsTest() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: any}>({})
  const [testState, setTestState] = useState("active")
  const [calculatorDisplay, setCalculatorDisplay] = useState("0")
  const [calculatorExpression, setCalculatorExpression] = useState("")

  useEffect(() => {
    // Get student info
    const studentData = localStorage.getItem(`student_${sessionId}`)
    if (studentData) {
      setStudentInfo(JSON.parse(studentData))
    }
  }, [sessionId])

  const handleCalculatorInput = (value: string) => {
    if (value === "C") {
      setCalculatorDisplay("0")
      setCalculatorExpression("")
      handleAnswer("")
    } else if (value === "=") {
      try {
        // Replace display-friendly symbols with JavaScript operators
        let expression = calculatorExpression
          .replace(/Math\.sqrt\(/g, 'Math.sqrt(')
          .replace(/Math\.pow\(/g, 'Math.pow(')
          .replace(/Math\.log10\(/g, 'Math.log10(')
          .replace(/Math\.log\(/g, 'Math.log(')
          .replace(/Math\.sin\(/g, 'Math.sin(')
          .replace(/Math\.cos\(/g, 'Math.cos(')
          .replace(/Math\.tan\(/g, 'Math.tan(')
          .replace(/Math\.abs\(/g, 'Math.abs(')
          .replace(/Math\.PI/g, 'Math.PI')
        
        const result = eval(expression)
        const resultStr = result.toString()
        setCalculatorDisplay(resultStr)
        setCalculatorExpression(resultStr)
        handleAnswer(resultStr)
      } catch {
        setCalculatorDisplay("Error")
        setCalculatorExpression("")
        handleAnswer("")
      }
    } else if (value === "DEL") {
      if (calculatorExpression.length > 0) {
        const newExpression = calculatorExpression.slice(0, -1)
        const displayValue = newExpression || "0"
        setCalculatorExpression(newExpression)
        setCalculatorDisplay(displayValue)
        handleAnswer(displayValue === "0" ? "" : displayValue)
      }
    } else {
      const newExpression = calculatorExpression === "0" && !["(", ")", "Math.PI", "Math.sqrt(", "Math.pow(", "Math.log10(", "Math.log(", "Math.sin(", "Math.cos(", "Math.tan(", "Math.abs("].some(op => value.includes(op)) ? value : calculatorExpression + value
      setCalculatorExpression(newExpression)
      setCalculatorDisplay(newExpression)
      handleAnswer(newExpression === "0" ? "" : newExpression)
    }
  }

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers }
    newAnswers[currentQuestion] = {
      answer: answer,
      isComplete: true
    }
    
    setAnswers(newAnswers)
    
    // Update test state for examiner
    const currentTestState = {
      currentQuestion,
      answers: newAnswers,
      studentName: studentInfo?.firstName || 'Student',
      testType: 'math-concepts'
    }
    localStorage.setItem(`mathConceptsTestState_${sessionId}`, JSON.stringify(currentTestState))
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      const nextQuestion = currentQuestion + 1
      setCurrentQuestion(nextQuestion)
      
      // Clear calculator display when moving to next question
      setCalculatorDisplay("0")
      setCalculatorExpression("")
      
      // Update test state for examiner
      const currentTestState = {
        currentQuestion: nextQuestion,
        answers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'math-concepts'
      }
      localStorage.setItem(`mathConceptsTestState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prevQuestion = currentQuestion - 1
      setCurrentQuestion(prevQuestion)
      
      // Clear calculator display when moving to previous question
      setCalculatorDisplay("0")
      setCalculatorExpression("")
      
      // Update test state for examiner
      const currentTestState = {
        currentQuestion: prevQuestion,
        answers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'math-concepts'
      }
      localStorage.setItem(`mathConceptsTestState_${sessionId}`, JSON.stringify(currentTestState))
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
    
    localStorage.setItem(`math_concepts_test_${sessionId}`, JSON.stringify(testResults))
    
    // Notify examiner that test is completed
    localStorage.setItem(`test_completed_${sessionId}`, JSON.stringify({
      completed: true,
      subtest: "math-concepts",
      timestamp: new Date().toISOString()
    }))
    
    setTestState("completed")
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
          <p className="text-gray-600">You completed the math concepts test.</p>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Question Section */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 leading-relaxed">
                {question.question}
              </h2>
              
              {/* Answer Field */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Your Answer:
                </label>
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-lg font-lexend">
                  {calculatorDisplay === "0" ? "" : calculatorDisplay}
                </div>
              </div>
            </div>

            {/* Calculator Section */}
            <div className="flex justify-center">
              <div className="space-y-4">
                {/* Answer Output Box */}
                <div className="bg-white rounded-lg p-4 border border-gray-300 w-96">
                  <div className="text-center font-lexend text-black min-h-[60px] flex items-center justify-center">
                    <div className="text-4xl font-semibold break-all overflow-hidden" style={{
                      fontSize: calculatorDisplay.length > 15 ? '1.5rem' : calculatorDisplay.length > 10 ? '2rem' : '2.5rem'
                    }}>
                      {calculatorDisplay}
                    </div>
                  </div>
                </div>
                
                {/* Calculator */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 w-96">

                {/* Button Grid */}
                <div className="grid grid-cols-5 gap-3">
                  {/* Row 1 - Clear and Functions */}
                  <button onClick={() => handleCalculatorInput("C")} className="bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg font-semibold text-sm">
                    C
                  </button>
                  <button onClick={() => handleCalculatorInput("DEL")} className="bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg font-semibold text-sm">
                    ⌫
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.sqrt(")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-xs">
                    √
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.pow(", "²")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-xs">
                    x²
                  </button>
                  <button onClick={() => handleCalculatorInput("/")} className="bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg font-semibold text-lg">
                    ÷
                  </button>

                  {/* Row 2 - Trig Functions */}
                  <button onClick={() => handleCalculatorInput("Math.sin(")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-xs">
                    sin
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.cos(")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-xs">
                    cos
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.tan(")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-xs">
                    tan
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.log10(")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-xs">
                    log
                  </button>
                  <button onClick={() => handleCalculatorInput("*")} className="bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg font-semibold text-lg">
                    ×
                  </button>

                  {/* Row 3 - Numbers 7-9 */}
                  <button onClick={() => handleCalculatorInput("7")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    7
                  </button>
                  <button onClick={() => handleCalculatorInput("8")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    8
                  </button>
                  <button onClick={() => handleCalculatorInput("9")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    9
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.log(")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-xs">
                    ln
                  </button>
                  <button onClick={() => handleCalculatorInput("-")} className="bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg font-semibold text-lg">
                    -
                  </button>

                  {/* Row 4 - Numbers 4-6 */}
                  <button onClick={() => handleCalculatorInput("4")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    4
                  </button>
                  <button onClick={() => handleCalculatorInput("5")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    5
                  </button>
                  <button onClick={() => handleCalculatorInput("6")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    6
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.PI")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-sm">
                    π
                  </button>
                  <button onClick={() => handleCalculatorInput("+")} className="bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg font-semibold text-lg">
                    +
                  </button>

                  {/* Row 5 - Numbers 1-3 */}
                  <button onClick={() => handleCalculatorInput("1")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    1
                  </button>
                  <button onClick={() => handleCalculatorInput("2")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    2
                  </button>
                  <button onClick={() => handleCalculatorInput("3")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    3
                  </button>
                  <button onClick={() => handleCalculatorInput("Math.E")} className="bg-purple-400 hover:bg-purple-500 text-white py-2 rounded-lg font-semibold text-sm">
                    e
                  </button>
                  <button onClick={() => handleCalculatorInput("=")} className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold text-lg row-span-2">
                    =
                  </button>

                  {/* Row 6 - 0 and special */}
                  <button onClick={() => handleCalculatorInput("(")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    (
                  </button>
                  <button onClick={() => handleCalculatorInput("0")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    0
                  </button>
                  <button onClick={() => handleCalculatorInput(")")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    )
                  </button>
                  <button onClick={() => handleCalculatorInput(".")} className="bg-gray-200 hover:bg-gray-300 text-black py-2 rounded-lg font-semibold text-lg">
                    .
                  </button>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </div>

            {currentQuestion === QUESTIONS.length - 1 ? (
              <button
                onClick={handleFinishTest}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
              >
                Finish Test
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
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