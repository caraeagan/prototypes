"use client"

import { useState, useEffect } from "react"

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
    id: "value-estimation",
    name: "Value Estimation",
    description: "Assess student's ability to estimate numerical values"
  },
  {
    id: "analogies",
    name: "Analogies",
    description: "Assess student's pattern recognition and logical reasoning"
  },
  {
    id: "pattern-reasoning",
    name: "Visual Pattern Reasoning",
    description: "Assess student's visual pattern recognition with rotating shapes"
  }
]

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTestSelection, setShowTestSelection] = useState(false)
  const [selectedSubtests, setSelectedSubtests] = useState<string[]>([])
  const [completedStudent, setCompletedStudent] = useState<Student | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  
  // Student form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [grade, setGrade] = useState("")
  const [age, setAge] = useState("")

  // Load students from localStorage on mount
  useEffect(() => {
    const savedStudents = localStorage.getItem('students')
    if (savedStudents) {
      const parsedStudents = JSON.parse(savedStudents)
      // Migrate old student data to new structure
      const migratedStudents = parsedStudents.map((student: any) => ({
        ...student,
        assignedSubtests: student.assignedSubtests || student.subtests || [],
        completedSubtests: student.completedSubtests || []
      }))
      setStudents(migratedStudents)
      // Save migrated data back to localStorage
      localStorage.setItem('students', JSON.stringify(migratedStudents))
    }
  }, [])

  // Check for test completions and update student status
  useEffect(() => {
    const checkCompletions = () => {
      let updated = false
      const updatedStudents = students.map((student) => {
        if (student.sessionId && student.testStatus !== 'completed') {
          const completionStatus = localStorage.getItem(`test_completed_${student.sessionId}`)
          if (completionStatus) {
            const completion = JSON.parse(completionStatus)
            
            // Update completed subtests (avoid duplicates)
            const currentCompleted = student.completedSubtests || []
            const updatedCompletedSubtests = currentCompleted.includes(completion.subtest) 
              ? currentCompleted 
              : [...currentCompleted, completion.subtest]
            
            // Check if all assigned subtests are completed
            const allCompleted = student.assignedSubtests.every(subtest => 
              updatedCompletedSubtests.includes(subtest)
            )
            
            updated = true
            const updatedStudent = {
              ...student,
              completedSubtests: updatedCompletedSubtests,
              testStatus: allCompleted ? 'completed' as const : 'in-progress' as const
            }
            
            // Show completion modal if all subtests are completed
            if (allCompleted && student.testStatus !== 'completed') {
              // Add to completion history
              const completionHistory = student.completionHistory || []
              const newCompletionEntry = {
                sessionId: student.sessionId!,
                completedAt: new Date().toISOString(),
                subtests: updatedCompletedSubtests
              }
              
              const updatedStudentWithHistory = {
                ...updatedStudent,
                completionHistory: [...completionHistory, newCompletionEntry]
              }
              
              setCompletedStudent(updatedStudentWithHistory)
              setShowCompletionModal(true)
              // Clear the completion flag to avoid showing modal again
              localStorage.removeItem(`test_completed_${student.sessionId}`)
              
              return updatedStudentWithHistory
            }
            
            return updatedStudent
          }
        }
        return student
      })
      
      if (updated) {
        setStudents(updatedStudents)
        localStorage.setItem('students', JSON.stringify(updatedStudents))
      }
    }

    if (students.length > 0) {
      checkCompletions()
      const interval = setInterval(checkCompletions, 2000)
      return () => clearInterval(interval)
    }
  }, [students])


  // Save students to localStorage
  const saveStudents = (updatedStudents: Student[]) => {
    setStudents(updatedStudents)
    localStorage.setItem('students', JSON.stringify(updatedStudents))
  }

  const handleSubtestToggle = (subtestId: string) => {
    setSelectedSubtests(prev => 
      prev.includes(subtestId) 
        ? prev.filter(id => id !== subtestId)
        : [...prev, subtestId]
    )
  }

  const handleAddStudent = () => {
    if (!firstName.trim() || !lastName.trim() || !grade || !age) {
      alert("Please fill in all student information")
      return
    }

    const newStudent: Student = {
      id: Math.random().toString(36).substring(2, 15),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      grade,
      age,
      createdAt: new Date().toISOString(),
      completedSubtests: [],
      testStatus: 'not-started',
      assignedSubtests: []
    }

    const updatedStudents = [...students, newStudent]
    saveStudents(updatedStudents)

    // Reset form
    setFirstName("")
    setLastName("")
    setGrade("")
    setAge("")
    setShowAddForm(false)
  }

  const generateStudentLink = (student: Student) => {
    if (!student.sessionId) {
      // Generate session ID for student
      const sessionId = Math.random().toString(36).substring(2, 15)
      const updatedStudent = { ...student, sessionId }
      const updatedStudents = students.map(s => s.id === student.id ? updatedStudent : s)
      saveStudents(updatedStudents)
      return `${window.location.origin}/student/${sessionId}`
    }
    return `${window.location.origin}/student/${student.sessionId}`
  }

  const startTestWithSubtests = () => {
    if (!selectedStudent || selectedSubtests.length === 0) {
      alert("Please select at least one subtest")
      return
    }

    const sessionId = selectedStudent.sessionId || Math.random().toString(36).substring(2, 15)
    
    // Update student with session ID and assigned subtests
    const updatedStudents = students.map(s => 
      s.id === selectedStudent.id ? { 
        ...s, 
        sessionId, 
        testStatus: 'in-progress' as const,
        assignedSubtests: selectedSubtests
      } : s
    )
    saveStudents(updatedStudents)

    // Store student info for examiner interface
    localStorage.setItem('examinerStudentInfo', JSON.stringify({
      firstName: selectedStudent.firstName,
      lastName: selectedStudent.lastName,
      grade: selectedStudent.grade,
      age: selectedStudent.age
    }))

    // Navigate to examiner interface
    const tests = selectedSubtests.join(",")
    window.location.href = `/examiner?tests=${tests}&session=${sessionId}`
  }

  const continueTest = (student: Student) => {
    if (student.assignedSubtests.length === 0) {
      alert("No subtests assigned to this student")
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

  const deleteStudent = (studentId: string) => {
    const updatedStudents = students.filter(s => s.id !== studentId)
    saveStudents(updatedStudents)
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Student Queue</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Add Student
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Student List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Students ({students.length})</h2>
          </div>
          
          {students.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p>No students added yet. Click "Add Student" to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {students.map((student) => (
                <div key={student.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => window.location.href = `/profile/${student.id}`}
                          className="text-left hover:text-blue-600"
                        >
                          <h3 className="text-lg font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Grade {student.grade} • Age {student.age} {student.assignedSubtests.length > 0 ? `• ${student.assignedSubtests.length} subtest${student.assignedSubtests.length !== 1 ? 's' : ''} assigned` : ''}
                          </p>
                        </button>
                        
                        {/* Status Badge */}
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          if (student.testStatus === 'in-progress' && student.assignedSubtests.length > 0) {
                            continueTest(student)
                          } else {
                            window.location.href = `/profile/${student.id}`
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        {student.testStatus === 'in-progress' && student.assignedSubtests.length > 0 ? 'Continue' : 'Start Test'}
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Student Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Student</h2>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Student Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <select
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Grade</option>
                    <option value="K">Kindergarten</option>
                    <option value="1">1st Grade</option>
                    <option value="2">2nd Grade</option>
                    <option value="3">3rd Grade</option>
                    <option value="4">4th Grade</option>
                    <option value="5">5th Grade</option>
                    <option value="6">6th Grade</option>
                    <option value="7">7th Grade</option>
                    <option value="8">8th Grade</option>
                    <option value="9">9th Grade</option>
                    <option value="10">10th Grade</option>
                    <option value="11">11th Grade</option>
                    <option value="12">12th Grade</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <select
                    id="age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Age</option>
                    {Array.from({ length: 13 }, (_, i) => i + 5).map(ageOption => (
                      <option key={ageOption} value={ageOption}>{ageOption} years old</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setFirstName("")
                  setLastName("")
                  setGrade("")
                  setAge("")
                  setSelectedSubtests([])
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                disabled={!firstName.trim() || !lastName.trim() || !grade || !age}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && !showTestSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Grade:</span>
                  <p className="font-medium">{selectedStudent.grade}</p>
                </div>
                <div>
                  <span className="text-gray-500">Age:</span>
                  <p className="font-medium">{selectedStudent.age} years old</p>
                </div>
                <div>
                  <span className="text-gray-500">Added:</span>
                  <p className="font-medium">{new Date(selectedStudent.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className={`font-medium ${
                    selectedStudent.testStatus === 'completed' ? 'text-green-600' :
                    selectedStudent.testStatus === 'in-progress' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {selectedStudent.testStatus === 'completed' ? 'Completed' :
                     selectedStudent.testStatus === 'in-progress' ? 'In Progress' :
                     'Not Started'}
                  </p>
                </div>
              </div>

              {/* Student Link */}
              {selectedStudent.sessionId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Student Link</h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={generateStudentLink(selectedStudent)}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generateStudentLink(selectedStudent))
                        alert('Link copied!')
                      }}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Assigned Subtests */}
              {selectedStudent.assignedSubtests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Assigned Subtests</h3>
                  <div className="space-y-2">
                    {selectedStudent.assignedSubtests.map((subtestId) => {
                      const subtest = SUBTESTS.find(s => s.id === subtestId)
                      const isCompleted = selectedStudent.completedSubtests.includes(subtestId)
                      
                      return (
                        <div key={subtestId} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{subtest?.name}</p>
                            <p className="text-xs text-gray-500">{subtest?.description}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isCompleted ? 'Completed' : 'Pending'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Test Controls */}
              <div className="space-y-3">
                {selectedStudent.testStatus === 'in-progress' && selectedStudent.assignedSubtests.length > 0 ? (
                  <button
                    onClick={() => {
                      continueTest(selectedStudent)
                      setSelectedStudent(null)
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Continue Testing
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowTestSelection(true)
                      setSelectedSubtests(selectedStudent.assignedSubtests)
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    {selectedStudent.assignedSubtests.length > 0 ? 'Start New Test' : 'Start Test'}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    deleteStudent(selectedStudent.id)
                    setSelectedStudent(null)
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Selection Modal */}
      {selectedStudent && showTestSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Tests for {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <button
                  onClick={() => {
                    setShowTestSelection(false)
                    setSelectedSubtests([])
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Subtest Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Select Subtests</h3>
                <div className="space-y-3">
                  {SUBTESTS.map((subtest) => (
                    <div key={subtest.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id={`modal-${subtest.id}`}
                        checked={selectedSubtests.includes(subtest.id)}
                        onChange={() => handleSubtestToggle(subtest.id)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label htmlFor={`modal-${subtest.id}`} className="text-sm font-medium text-gray-900 cursor-pointer">
                          {subtest.name}
                        </label>
                        <p className="text-xs text-gray-500">{subtest.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowTestSelection(false)
                  setSelectedSubtests([])
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  startTestWithSubtests()
                  setShowTestSelection(false)
                  setSelectedStudent(null)
                  setSelectedSubtests([])
                }}
                disabled={selectedSubtests.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Completion Modal */}
      {showCompletionModal && completedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Completed!
              </h2>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                {completedStudent.firstName} {completedStudent.lastName} has completed all assigned subtests.
              </p>
              <p className="text-sm text-gray-500">
                What would you like to do next?
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex flex-col space-y-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  setCompletedStudent(null)
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  setCompletedStudent(null)
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
              >
                Stay on Current Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}