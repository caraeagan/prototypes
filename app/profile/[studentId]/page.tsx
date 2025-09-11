"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  age: string
  createdAt: string
  sessionId?: string
  completedSubtests: string[]
  currentSubtest?: string
  testStatus: 'not-started' | 'in-progress' | 'completed'
  assignedSubtests: string[]
  completionHistory?: Array<{
    sessionId: string
    completedAt: string
    subtests: string[]
  }>
}

const SUBTESTS = [
  {
    id: "delayed-recall",
    name: "Delayed Recall",
    description: "Assess delayed memory recall abilities",
    phase: "Pilot: Phase 3"
  },
  {
    id: "letter-number-formation",
    name: "Letter & Number Formation",
    description: "Assess formation of letters and numbers",
    phase: "Pilot: Phase 2"
  },
  {
    id: "visual-pattern-reasoning",
    name: "Visual Pattern Reasoning",
    description: "Assess visual pattern recognition with rotating shapes",
    phase: "Pilot: Phase 3"
  },
  {
    id: "sentence-construction",
    name: "Sentence Construction",
    description: "Assess ability to construct sentences",
    phase: "Pilot: Phase 2"
  },
  {
    id: "tracing-test",
    name: "Tracing Test",
    description: "Assess fine motor tracing abilities",
    phase: "Pilot: Phase 3"
  },
  {
    id: "associate-learning",
    name: "Associate Learning",
    description: "Assess associative learning capabilities",
    phase: "Pilot: Phase 3"
  },
  {
    id: "handwritten-alphabetic-fluency",
    name: "Handwritten Alphabetic Fluency",
    description: "Assess handwritten alphabet fluency",
    phase: "Pilot: Phase 2"
  },
  {
    id: "numeric-capacity-forward",
    name: "Numeric Capacity Forward",
    description: "Assess forward numeric span capacity",
    phase: "Pilot: Phase 2"
  },
  {
    id: "essay-handwritten",
    name: "Essay (Handwritten)",
    description: "Assess handwritten essay composition",
    phase: "Pilot: Phase 1"
  },
  {
    id: "handwritten-numeric-fluency",
    name: "Handwritten Numeric Fluency",
    description: "Assess handwritten numeric fluency",
    phase: "Pilot: Phase 2"
  },
  {
    id: "oral-expression-vocabulary",
    name: "Oral Expression & Vocabulary",
    description: "Assess oral expression and vocabulary skills",
    phase: "Pilot: Phase 2"
  },
  {
    id: "division-fluency",
    name: "Division Fluency",
    description: "Assess division calculation fluency",
    phase: "Pilot: Phase 1, Pre Pilot"
  },
  {
    id: "multiplication-fluency",
    name: "Multiplication Fluency",
    description: "Assess multiplication calculation fluency",
    phase: "Pilot: Phase 1, Pre Pilot"
  },
  {
    id: "subtraction-fluency",
    name: "Subtraction Fluency",
    description: "Assess subtraction calculation fluency",
    phase: "Pilot: Phase 1, Pre Pilot"
  },
  {
    id: "addition-fluency",
    name: "Addition Fluency",
    description: "Assess addition calculation fluency",
    phase: "Pilot: Phase 1, Pre Pilot"
  },
  {
    id: "reading-comprehension",
    name: "Reading Comprehension",
    description: "Assess reading comprehension abilities",
    phase: "Pilot: Phase 3"
  },
  {
    id: "oral-reading-fluency",
    name: "Oral Reading Fluency",
    description: "Assess oral reading fluency",
    phase: "Pilot: Phase 2"
  },
  {
    id: "listening-comprehension",
    name: "Listening Comprehension",
    description: "Assess listening comprehension skills",
    phase: "Pilot: Phase 3"
  },
  {
    id: "visual-memory",
    name: "Visual Memory",
    description: "Assess visual memory capabilities",
    phase: "Pilot: Phase 3"
  },
  {
    id: "visual-discrimination",
    name: "Visual Discrimination",
    description: "Assess visual discrimination abilities",
    phase: "Pilot: Phase 3"
  },
  {
    id: "sequencing-planning",
    name: "Sequencing and Planning",
    description: "Assess sequencing and planning skills",
    phase: "Pilot: Phase 2"
  },
  {
    id: "semantic-fluency",
    name: "Semantic Fluency",
    description: "Assess semantic fluency abilities",
    phase: "Pilot: Phase 2"
  },
  {
    id: "analogies-test",
    name: "Analogies Test",
    description: "Assess pattern recognition and logical reasoning",
    phase: "Pilot: Phase 2"
  },
  {
    id: "essay-typed",
    name: "Essay (Typed)",
    description: "Assess typed essay composition",
    phase: "Pilot: Phase 1"
  },
  {
    id: "sentence-editing",
    name: "Sentence Editing",
    description: "Assess sentence editing abilities",
    phase: "Pilot: Phase 3"
  },
  {
    id: "sentence-composition-fluency",
    name: "Sentence Composition Fluency",
    description: "Assess sentence composition fluency",
    phase: "Pilot: Phase 2"
  },
  {
    id: "keyboard-transcription-fluency",
    name: "Keyboard Transcription Fluency",
    description: "Assess keyboard transcription speed and accuracy",
    phase: "Pilot: Phase 2"
  },
  {
    id: "receptive-vocabulary",
    name: "Receptive Vocabulary",
    description: "Assess receptive vocabulary knowledge",
    phase: "Pilot: Phase 1"
  },
  {
    id: "nonsense-word-decoding",
    name: "Nonsense Word Decoding",
    description: "Assess phonetic decoding abilities",
    phase: "Pilot: Phase 1"
  },
  {
    id: "reading-span",
    name: "Reading Span",
    description: "Assess reading span capacity",
    phase: "Pilot: Phase 3"
  },
  {
    id: "orthographic-fluency",
    name: "Orthographic Fluency",
    description: "Assess orthographic processing fluency",
    phase: "Pilot: Phase 2"
  },
  {
    id: "phonological-awareness",
    name: "Phonological Awareness",
    description: "Assess phonological awareness skills",
    phase: "Pilot: Phase 3"
  },
  {
    id: "math-concepts-applications",
    name: "Math Concepts and Applications",
    description: "Assess mathematical concepts and applications",
    phase: "Pilot: Phase 2"
  },
  {
    id: "value-estimation",
    name: "Value Estimation",
    description: "Assess ability to estimate numerical values",
    phase: "Pilot: Phase 3"
  },
  {
    id: "numeric-capacity-backwards",
    name: "Numeric Capacity Backwards",
    description: "Assess backward numeric span capacity",
    phase: "Pilot: Phase 1"
  },
  {
    id: "math-computation",
    name: "Math Computation",
    description: "Assess mathematical computation skills",
    phase: "Pilot: Phase 1"
  },
  {
    id: "spelling",
    name: "Spelling",
    description: "Assess spelling abilities",
    phase: "Pilot: Phase 1, Pre Pilot"
  },
  {
    id: "letter-word-identification",
    name: "Letter and Word Identification",
    description: "Assess letter and word identification skills",
    phase: "Pilot: Phase 1, Pre Pilot"
  }
]

export default function StudentProfile() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.studentId as string
  const [student, setStudent] = useState<Student | null>(null)
  const [selectedSubtests, setSelectedSubtests] = useState<string[]>([])
  const [showStartAssessmentModal, setShowStartAssessmentModal] = useState(false)
  const [assessmentStep, setAssessmentStep] = useState(1)
  const [languageType, setLanguageType] = useState<'MUL' | 'MON' | null>(null)
  const [selectedPhases, setSelectedPhases] = useState<string[]>([])
  const [expandedPhases, setExpandedPhases] = useState<string[]>([])
  const [customSelection, setCustomSelection] = useState(false)
  // MUL questionnaire fields
  const [respondent, setRespondent] = useState('')
  const [englishLearningStart, setEnglishLearningStart] = useState('')
  const [schoolStart, setSchoolStart] = useState('')
  const [usSchoolStart, setUsSchoolStart] = useState('')
  const [englishLearningGaps, setEnglishLearningGaps] = useState('')

  useEffect(() => {
    const savedStudents = localStorage.getItem('students')
    if (savedStudents) {
      const students = JSON.parse(savedStudents)
      const foundStudent = students.find((s: Student) => s.id === studentId)
      if (foundStudent) {
        setStudent(foundStudent)
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }, [studentId, router])

  const handleSubtestToggle = (subtestId: string) => {
    setSelectedSubtests(prev => 
      prev.includes(subtestId) 
        ? prev.filter(id => id !== subtestId)
        : [...prev, subtestId]
    )
  }

  const getAvailablePhases = () => {
    if (!student || !languageType) return []

    const grade = student.grade.toLowerCase()
    const isPreschoolOrNoSchool = grade === 'k' || grade === 'ps' || grade === 'no school'

    // Filter logic based on requirements
    if (languageType === 'MUL') {
      // Multilingual: pp1 and pp2
      return ['Pilot: Phase 1', 'Pilot: Phase 2']
    } else if (languageType === 'MON') {
      if (isPreschoolOrNoSchool) {
        // Monolingual (no school/PS): pp1 and pp2
        return ['Pilot: Phase 1', 'Pilot: Phase 2']
      } else {
        // Monolingual other grades: pp2 only
        return ['Pilot: Phase 2']
      }
    }

    return []
  }

  const getAllPhases = () => {
    const phases = [...new Set(SUBTESTS.map(subtest => {
      if (subtest.phase.includes('Pre Pilot')) return 'Pre Pilot'
      if (subtest.phase.includes('Phase 1')) return 'Pilot: Phase 1'
      if (subtest.phase.includes('Phase 2')) return 'Pilot: Phase 2'
      if (subtest.phase.includes('Phase 3')) return 'Pilot: Phase 3'
      return subtest.phase
    }))]
    return phases.sort()
  }

  const getSubtestsByPhase = (phase: string) => {
    return SUBTESTS.filter(subtest => subtest.phase.includes(phase))
  }

  const getDisplayPhases = () => {
    return customSelection ? getAllPhases() : getAvailablePhases()
  }

  const handlePhaseToggle = (phase: string) => {
    const phaseSubtests = getSubtestsByPhase(phase)
    const phaseSubtestIds = phaseSubtests.map(s => s.id)
    
    if (selectedPhases.includes(phase)) {
      // Remove phase and all its subtests
      setSelectedPhases(prev => prev.filter(p => p !== phase))
      setSelectedSubtests(prev => prev.filter(id => !phaseSubtestIds.includes(id)))
    } else {
      // Add phase and all its subtests
      setSelectedPhases(prev => [...prev, phase])
      setSelectedSubtests(prev => [...new Set([...prev, ...phaseSubtestIds])])
    }
  }

  const togglePhaseExpansion = (phase: string) => {
    setExpandedPhases(prev => 
      prev.includes(phase) 
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    )
  }

  // Auto-select phases when step changes to 4
  const autoSelectPhases = () => {
    const availablePhases = getAvailablePhases()
    setSelectedPhases(availablePhases)
    
    // Auto-select all subtests from available phases
    const allSubtests = availablePhases.flatMap(phase => 
      getSubtestsByPhase(phase).map(s => s.id)
    )
    setSelectedSubtests(allSubtests)
  }

  const toggleCustomSelection = () => {
    setCustomSelection(!customSelection)
    // Clear selections when switching modes
    setSelectedPhases([])
    setSelectedSubtests([])
    setExpandedPhases([])
    
    // If switching back to recommended, auto-select phases
    if (customSelection) {
      setTimeout(autoSelectPhases, 0)
    }
  }

  const resetAssessmentModal = () => {
    setShowStartAssessmentModal(false)
    setAssessmentStep(1)
    setLanguageType(null)
    setSelectedSubtests([])
    setSelectedPhases([])
    setExpandedPhases([])
    setCustomSelection(false)
    // Reset MUL questionnaire fields
    setRespondent('')
    setEnglishLearningStart('')
    setSchoolStart('')
    setUsSchoolStart('')
    setEnglishLearningGaps('')
  }

  const handleNextStep = () => {
    if (assessmentStep === 1 && languageType) {
      if (languageType === 'MON') {
        setAssessmentStep(5) // Skip to phase selection for monolingual
        setTimeout(autoSelectPhases, 0) // Auto-select phases after state updates
      } else {
        setAssessmentStep(2) // Start MUL questionnaire
      }
    } else if (assessmentStep === 2 && respondent) {
      setAssessmentStep(3)
    } else if (assessmentStep === 3 && englishLearningStart) {
      setAssessmentStep(4)
    } else if (assessmentStep === 4 && schoolStart && usSchoolStart && englishLearningGaps) {
      setAssessmentStep(5)
      setTimeout(autoSelectPhases, 0) // Auto-select phases after state updates
    }
  }

  const startNewSession = () => {
    if (selectedSubtests.length === 0) {
      alert("Please select at least one subtest")
      return
    }

    if (!student) return

    const newSessionId = Math.random().toString(36).substring(2, 15)
    
    // Archive current session if it exists and was completed
    let updatedCompletionHistory = student.completionHistory || []
    if (student.sessionId && student.testStatus === 'completed') {
      updatedCompletionHistory.push({
        sessionId: student.sessionId,
        completedAt: new Date().toISOString(),
        subtests: student.completedSubtests
      })
    }

    // Update student with new session
    const updatedStudent: Student = {
      ...student,
      sessionId: newSessionId,
      testStatus: 'in-progress',
      assignedSubtests: selectedSubtests,
      completedSubtests: [],
      completionHistory: updatedCompletionHistory
    }

    // Update localStorage
    const savedStudents = localStorage.getItem('students')
    if (savedStudents) {
      const students = JSON.parse(savedStudents)
      const updatedStudents = students.map((s: Student) => 
        s.id === studentId ? updatedStudent : s
      )
      localStorage.setItem('students', JSON.stringify(updatedStudents))
    }

    // Store student info for examiner interface
    localStorage.setItem('examinerStudentInfo', JSON.stringify({
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      age: student.age
    }))

    // Navigate to examiner interface
    const tests = selectedSubtests.join(",")
    window.location.href = `/examiner?tests=${tests}&session=${newSessionId}`
  }

  const continueCurrentSession = () => {
    if (!student || !student.sessionId || student.assignedSubtests.length === 0) {
      return
    }

    // Store student info for examiner interface
    localStorage.setItem('examinerStudentInfo', JSON.stringify({
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      age: student.age
    }))

    // Navigate to examiner interface
    const tests = student.assignedSubtests.join(",")
    window.location.href = `/examiner?tests=${tests}&session=${student.sessionId}`
  }

  const generateStudentLink = () => {
    if (!student?.sessionId) return ""
    return `${window.location.origin}/student/${student.sessionId}`
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                student.testStatus === 'completed' ? 'bg-green-100 text-green-800' :
                student.testStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {student.testStatus === 'completed' ? 'Completed' :
                 student.testStatus === 'in-progress' ? 'In Progress' :
                 'Not Started'}
              </div>
              <button
                onClick={() => setShowStartAssessmentModal(true)}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700"
              >
                Start Assessment
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Student Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm font-mono text-gray-400 mb-2">ID: {student.id}</p>
          <p className="text-gray-600">Student Profile</p>
        </div>

        {/* Student Information Card */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Student Information</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Grade:</span>
                <p className="font-medium">{student.grade}</p>
              </div>
              <div>
                <span className="text-gray-500">Age:</span>
                <p className="font-medium">{student.age} years old</p>
              </div>
              <div>
                <span className="text-gray-500">Added:</span>
                <p className="font-medium">{new Date(student.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Student ID:</span>
                <p className="font-medium text-xs">{student.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Status Card */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Assessment Status</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                student.testStatus === 'completed' ? 'bg-green-100 text-green-800' :
                student.testStatus === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {student.testStatus === 'completed' ? 'Completed' :
                 student.testStatus === 'in-progress' ? 'In Progress' :
                 'Not Started'}
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            {student.testStatus === 'not-started' ? (
              <p className="text-gray-600">No assessments started yet. Click "Start Assessment" to begin.</p>
            ) : (
              <>
                {/* Student Link */}
                {student.sessionId && (
                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Student Link:</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="text"
                      value={generateStudentLink()}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generateStudentLink())
                        alert('Link copied!')
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Completed Subtests */}
              {student.completedSubtests.length > 0 && (
                <div className="mb-4">
                  <span className="text-gray-500 text-sm">Completed Subtests:</span>
                  <div className="mt-2 space-y-2">
                    {student.completedSubtests.map((subtestId) => {
                      const subtest = SUBTESTS.find(s => s.id === subtestId)
                      
                      return (
                        <div key={subtestId} className="flex items-center justify-between py-2 px-3 rounded bg-green-50 border border-green-200">
                          <div>
                            <p className="font-medium text-sm text-green-800">
                              {subtest?.name}
                            </p>
                            <p className="text-xs text-green-600">
                              {subtest?.description}
                            </p>
                          </div>
                          <div className="px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 bg-green-100 text-green-800">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Completed</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Button for Current Session */}
              {student.testStatus === 'in-progress' && (
                <button
                  onClick={continueCurrentSession}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Continue Current Session
                </button>
              )}
              </>
            )}
          </div>
        </div>

        {/* Completion History */}
        {student.completionHistory && student.completionHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Testing History</h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                {student.completionHistory.map((session, index) => (
                  <div key={session.sessionId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">Session {index + 1}</p>
                        <p className="text-xs text-gray-500 font-mono">{session.sessionId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {new Date(session.completedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(session.completedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Completed Subtests:</p>
                      <div className="flex flex-wrap gap-2">
                        {session.subtests.map((subtestId) => {
                          const subtest = SUBTESTS.find(s => s.id === subtestId)
                          return (
                            <span key={subtestId} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {subtest?.name}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Start Assessment Modal */}
      {showStartAssessmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Start New Assessment for {student?.firstName} {student?.lastName}
                </h2>
                <button
                  onClick={resetAssessmentModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Step 1: Language Type */}
              {assessmentStep === 1 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Language Background</h3>
                  <p className="text-gray-600 mb-4">Is the student multilingual or monolingual?</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="mul"
                        name="languageType"
                        checked={languageType === 'MUL'}
                        onChange={() => setLanguageType('MUL')}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="mul" className="text-sm font-medium text-gray-900">
                        MUL - Multilingual
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="mon"
                        name="languageType"
                        checked={languageType === 'MON'}
                        onChange={() => setLanguageType('MON')}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="mon" className="text-sm font-medium text-gray-900">
                        MON - Monolingual
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Respondent Information (MUL only) */}
              {assessmentStep === 2 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Respondent Information</h3>
                  <p className="text-gray-600 mb-4">Who is responding to this questionnaire?</p>
                  
                  <div className="space-y-3">
                    {['Parent', 'Student', 'Someone else'].map((option) => (
                      <div key={option} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={option}
                          name="respondent"
                          checked={respondent === option}
                          onChange={() => setRespondent(option)}
                          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor={option} className="text-sm font-medium text-gray-900">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: English Learning Start (MUL only) */}
              {assessmentStep === 3 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">English Learning Background</h3>
                  <p className="text-gray-600 mb-4">
                    When did {respondent === 'Student' ? 'you' : 'your student'} start to learn English and under what conditions?
                  </p>
                  
                  <div>
                    <textarea
                      value={englishLearningStart}
                      onChange={(e) => setEnglishLearningStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      rows={4}
                      placeholder="Please describe when and how English learning began..."
                    />
                  </div>
                </div>
              )}

              {/* Step 4: School History (MUL only) */}
              {assessmentStep === 4 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">School History</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        When did {respondent === 'Student' ? 'you' : 'your student'} start school?
                      </label>
                      <input
                        type="text"
                        value={schoolStart}
                        onChange={(e) => setSchoolStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="e.g., Age 5, September 2018, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        When did {respondent === 'Student' ? 'you' : 'your student'} start school in the US?
                      </label>
                      <input
                        type="text"
                        value={usSchoolStart}
                        onChange={(e) => setUsSchoolStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="e.g., Kindergarten, 2nd grade, September 2020, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Were there any significant gaps in English learning from that period?
                      </label>
                      <textarea
                        value={englishLearningGaps}
                        onChange={(e) => setEnglishLearningGaps(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows={3}
                        placeholder="Please describe any gaps or interruptions in English learning..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Phase Selection */}
              {assessmentStep === 5 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Assessment Phases</h3>
                  
                  {/* Custom Selection Toggle */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="customSelection"
                        checked={customSelection}
                        onChange={toggleCustomSelection}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="customSelection" className="text-sm font-medium text-gray-900 cursor-pointer">
                        Ignore recommendations and select from all phases
                      </label>
                    </div>
                    {customSelection && (
                      <p className="text-xs text-gray-600 mt-2 ml-7">
                        You can now select from all available assessment phases regardless of student profile.
                      </p>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4">
                    {customSelection 
                      ? `Select any assessment phases you want for ${student?.firstName}:`
                      : `Based on your selections, the following assessment phases have been automatically selected for ${student?.firstName}:`
                    }
                  </p>

                  <div className="space-y-3">
                    {getDisplayPhases().map((phase) => {
                      const phaseSubtests = getSubtestsByPhase(phase)
                      const isExpanded = expandedPhases.includes(phase)
                      const isSelected = selectedPhases.includes(phase)
                      
                      return (
                        <div key={phase} className="border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id={`phase-${phase}`}
                                checked={isSelected}
                                onChange={() => handlePhaseToggle(phase)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor={`phase-${phase}`} className="text-sm font-medium text-gray-900 cursor-pointer">
                                {phase}
                              </label>
                              <span className="text-xs text-gray-500">
                                ({phaseSubtests.length} subtests)
                              </span>
                            </div>
                            
                            <button
                              onClick={() => togglePhaseExpansion(phase)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <svg 
                                className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                              <div className="mt-3 space-y-2">
                                {phaseSubtests.map((subtest) => (
                                  <div key={subtest.id} className="flex items-center space-x-3 py-2">
                                    <div className="w-4"></div> {/* Indent for hierarchy */}
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{subtest.name}</span>
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                          {subtest.phase}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">{subtest.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Other Section - Individual Subtest Selection */}
                    <div className="border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-4"></div> {/* No checkbox for Other header */}
                          <label className="text-sm font-medium text-gray-900">
                            Other
                          </label>
                          <span className="text-xs text-gray-500">
                            (individual subtest selection)
                          </span>
                        </div>
                        
                        <button
                          onClick={() => togglePhaseExpansion('Other')}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <svg 
                            className={`w-4 h-4 text-gray-500 transition-transform ${expandedPhases.includes('Other') ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      
                      {expandedPhases.includes('Other') && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="mt-3 space-y-2">
                            {SUBTESTS.map((subtest) => (
                              <div key={subtest.id} className="flex items-center space-x-3 py-2">
                                <input
                                  type="checkbox"
                                  id={`subtest-${subtest.id}`}
                                  checked={selectedSubtests.includes(subtest.id)}
                                  onChange={() => handleSubtestToggle(subtest.id)}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <label htmlFor={`subtest-${subtest.id}`} className="text-sm text-gray-700 cursor-pointer">
                                      {subtest.name}
                                    </label>
                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                      {subtest.phase}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{subtest.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSubtests.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>{selectedSubtests.length} subtest{selectedSubtests.length !== 1 ? 's' : ''}</strong> selected
                        {selectedPhases.length > 0 && (
                          <span> across <strong>{selectedPhases.length} phase{selectedPhases.length !== 1 ? 's' : ''}</strong></span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={resetAssessmentModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
              >
                Cancel
              </button>
              
              <div className="flex space-x-3">
                {assessmentStep > 1 && assessmentStep < 5 && (
                  <button
                    onClick={() => setAssessmentStep(assessmentStep - 1)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
                  >
                    Back
                  </button>
                )}
                
                {assessmentStep < 5 ? (
                  <button
                    onClick={handleNextStep}
                    disabled={
                      (assessmentStep === 1 && !languageType) ||
                      (assessmentStep === 2 && !respondent) ||
                      (assessmentStep === 3 && !englishLearningStart) ||
                      (assessmentStep === 4 && (!schoolStart || !usSchoolStart || !englishLearningGaps))
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      startNewSession()
                      resetAssessmentModal()
                    }}
                    disabled={selectedSubtests.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Start Assessment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}