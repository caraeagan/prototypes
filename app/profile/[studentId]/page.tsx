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
  languageType: 'multilingual' | 'monolingual'
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
    id: "associative-learning",
    name: "Associative Learning",
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
    id: "visual-recognition-memory",
    name: "Visual Recognition Memory",
    description: "Assess student's ability to recognize and recall visual patterns",
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
  },
  {
    id: "figure-reproduction",
    name: "Figure Reproduction",
    description: "Student completes figure drawings in a physical booklet",
    phase: "Pilot: Phase 2"
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
  const [searchTerm, setSearchTerm] = useState('')
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

  const selectAllSubtests = () => {
    const filteredSubtests = SUBTESTS.filter(subtest => 
      !searchTerm || 
      subtest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subtest.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subtest.phase.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const allIds = filteredSubtests.map(s => s.id)
    setSelectedSubtests(prev => [...new Set([...prev, ...allIds])])
  }

  const deselectAllSubtests = () => {
    const filteredSubtests = SUBTESTS.filter(subtest => 
      !searchTerm || 
      subtest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subtest.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subtest.phase.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const filteredIds = filteredSubtests.map(s => s.id)
    setSelectedSubtests(prev => prev.filter(id => !filteredIds.includes(id)))
  }

  const getAvailablePhases = () => {
    if (!student) return []

    const grade = student.grade.toLowerCase()
    const isPreschoolOrNoSchool = grade === 'k' || grade === 'ps' || grade === 'no school'
    const studentLanguageType = student.languageType

    // Filter logic based on requirements
    if (studentLanguageType === 'multilingual') {
      // Multilingual: pp1 and pp2
      return ['Pilot: Phase 1', 'Pilot: Phase 2']
    } else if (studentLanguageType === 'monolingual') {
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
    return ['Pilot: Phase 1', 'Pilot: Phase 2', 'Pilot: Phase 3']
  }

  const getFilteredSubtests = (phase: string) => {
    const phaseSubtests = getSubtestsByPhase(phase)
    if (!searchTerm) return phaseSubtests
    
    return phaseSubtests.filter(subtest => 
      subtest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subtest.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
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

  const initializeAssessmentModal = () => {
    // Reset all fields
    setSelectedSubtests([])
    setSelectedPhases([])
    setExpandedPhases([])
    setSearchTerm('')
    setRespondent('')
    setEnglishLearningStart('')
    setSchoolStart('')
    setUsSchoolStart('')
    setEnglishLearningGaps('')
    
    // Set step based on student's language type
    if (student?.languageType === 'monolingual') {
      setAssessmentStep(5) // Skip to phase selection for monolingual
      setTimeout(autoSelectPhases, 0)
    } else {
      setAssessmentStep(2) // Start MUL questionnaire for multilingual
    }
  }

  const resetAssessmentModal = () => {
    setShowStartAssessmentModal(false)
    initializeAssessmentModal()
  }

  const handleNextStep = () => {
    if (assessmentStep === 2 && respondent) {
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

    // Store student info for student interface
    localStorage.setItem(`session_${newSessionId}_studentInfo`, JSON.stringify({
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      age: student.age
    }))

    // Store student info for examiner interface
    localStorage.setItem('examinerStudentInfo', JSON.stringify({
      firstName: student.firstName,
      lastName: student.lastName,
      grade: student.grade,
      age: student.age
    }))

    const tests = selectedSubtests.join(",")

    // For student-only tests like associative learning, go directly to the test
    if (selectedSubtests.length === 1 && selectedSubtests[0] === 'associative-learning') {
      // Set up student connection
      localStorage.setItem(`student_${newSessionId}`, JSON.stringify({
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        grade: student.grade,
        age: student.age,
        joinedAt: new Date().toISOString(),
        sessionId: newSessionId
      }))
      // Navigate directly to the test
      window.location.href = `/student/${newSessionId}/associative-learning`
    } else {
      // Navigate to examiner interface for other tests
      window.location.href = `/examiner?tests=${tests}&session=${newSessionId}`
    }
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
                onClick={() => {
                  initializeAssessmentModal()
                  setShowStartAssessmentModal(true)
                }}
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
              <>
                <p className="text-gray-600 mb-4">No assessments started yet. Click "Start Assessment" to begin.</p>

                {/* Score Review button - always show for all students */}
                <button
                  onClick={() => {
                    // Use existing session or create a temporary one for score review
                    const sessionToUse = student.sessionId || `temp_${student.id}`
                    router.push(`/score-review/${sessionToUse}`)
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Score Review
                </button>
              </>
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
                      className="px-3 py-2 bg-blue-900 text-white text-sm rounded hover:bg-blue-800"
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
                      const isNonsenseWordDecoding = subtestId === 'nonsense-word-decoding'

                      return (
                        <div key={subtestId} className="space-y-2">
                          <div className="flex items-center justify-between py-2 px-3 rounded bg-green-50 border border-green-200">
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

                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons for Current Session */}
              <div className="space-y-3">
                {student.testStatus === 'in-progress' && (
                  <button
                    onClick={continueCurrentSession}
                    className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800"
                  >
                    Continue Current Session
                  </button>
                )}

                {/* Score Review button - always show for all students */}
                <button
                  onClick={() => {
                    // Use existing session or create a temporary one for score review
                    const sessionToUse = student.sessionId || `temp_${student.id}`
                    router.push(`/score-review/${sessionToUse}`)
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Score Review
                </button>
              </div>
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
        <div className="fixed inset-0 bg-blue-100 bg-opacity-90 flex items-center justify-center p-4 z-50">
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Subtests</h3>
                  
                  {/* Search functionality */}
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search for a subtest..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">
                    Based on your selections, some subtests have been automatically selected for {student?.firstName}. You can check or uncheck any subtest below.
                  </p>

                  {/* Select/Deselect All Controls */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={selectAllSubtests}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Select All{searchTerm ? ' (filtered)' : ''}
                      </button>
                      <button
                        onClick={deselectAllSubtests}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Deselect All{searchTerm ? ' (filtered)' : ''}
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedSubtests.length} selected
                    </div>
                  </div>

                  {/* Simple flat list of all subtests - Fixed height to leave room for button */}
                  <div className="space-y-2 h-64 overflow-y-auto border border-gray-200 rounded-lg mb-4">
                    {SUBTESTS
                      .filter(subtest =>
                        !searchTerm ||
                        subtest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        subtest.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        subtest.phase.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .sort((a, b) => {
                        // Extract phase numbers for sorting
                        const getPhaseValue = (phase: string) => {
                          if (phase.includes('Phase 3')) return 3
                          if (phase.includes('Phase 2')) return 2
                          if (phase.includes('Phase 1')) return 1
                          if (phase.includes('Pre Pilot')) return 0
                          return -1
                        }
                        return getPhaseValue(b.phase) - getPhaseValue(a.phase)
                      })
                      .map((subtest) => (
                        <div key={subtest.id} className="flex items-center space-x-3 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                          <input
                            type="checkbox"
                            id={`subtest-${subtest.id}`}
                            checked={selectedSubtests.includes(subtest.id)}
                            onChange={() => handleSubtestToggle(subtest.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <label htmlFor={`subtest-${subtest.id}`} className="text-sm font-medium text-gray-900 cursor-pointer">
                                {subtest.name}
                              </label>
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                {subtest.phase}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{subtest.description}</p>
                          </div>
                        </div>
                      ))
                    }
                    {SUBTESTS.filter(subtest => 
                        !searchTerm || 
                        subtest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        subtest.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        subtest.phase.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        No subtests match your search.
                      </div>
                    )}
                  </div>

                  {/* Selection summary - always visible */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedSubtests.length} subtest{selectedSubtests.length !== 1 ? 's' : ''}</strong> selected for assessment
                    </p>
                  </div>
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
                {assessmentStep > 2 && assessmentStep < 5 && (
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
                      (assessmentStep === 2 && !respondent) ||
                      (assessmentStep === 3 && !englishLearningStart) ||
                      (assessmentStep === 4 && (!schoolStart || !usSchoolStart || !englishLearningGaps))
                    }
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
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