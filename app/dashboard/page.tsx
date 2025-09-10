"use client"

import { useState } from "react"

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
  const [selectedSubtests, setSelectedSubtests] = useState<string[]>([])
  
  // Student information state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [grade, setGrade] = useState("")
  const [age, setAge] = useState("")


  const handleSubtestToggle = (subtestId: string) => {
    setSelectedSubtests(prev => 
      prev.includes(subtestId) 
        ? prev.filter(id => id !== subtestId)
        : [...prev, subtestId]
    )
  }

  const handleStartTest = () => {
    try {
      console.log('handleStartTest called')
      if (selectedSubtests.length === 0) {
        alert("Please select at least one subtest")
        return
      }
      
      if (!firstName.trim() || !lastName.trim() || !grade || !age) {
        alert("Please fill in all student information")
        return
      }
      
      console.log('Form validation passed')
      
      // Store student info and navigate to examiner interface
      const studentInfo = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        grade,
        age
      }
      
      console.log('Student info created:', studentInfo)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('examinerStudentInfo', JSON.stringify(studentInfo))
        console.log('About to navigate to examiner')
        console.log('Current location:', window.location.href)
        console.log('Current origin:', window.location.origin)
        
        // Force the correct URL with explicit port
        const examinerUrl = `${window.location.origin}/examiner?tests=${selectedSubtests.join(",")}`
        console.log('Full examiner URL:', examinerUrl)
        
        window.location.href = examinerUrl
      }
    } catch (error) {
      console.error('Error in handleStartTest:', error)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Marker Method</h1>
            <div className="text-sm text-gray-600">Dashboard</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Student Information Form */}
        <div className="bg-stone-100 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Student's First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                placeholder="Enter student's first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Student's Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                placeholder="Enter student's last name"
              />
            </div>

            {/* Grade */}
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                Grade
              </label>
              <select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
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

            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <select
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                <option value="">Select Age</option>
                {Array.from({ length: 13 }, (_, i) => i + 5).map(ageOption => (
                  <option key={ageOption} value={ageOption}>{ageOption} years old</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-stone-100 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Select Subtests to Administer</h2>
          
          <div className="space-y-4 mb-8">
            {SUBTESTS.map((subtest) => (
              <div key={subtest.id} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={subtest.id}
                  checked={selectedSubtests.includes(subtest.id)}
                  onChange={() => handleSubtestToggle(subtest.id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor={subtest.id} className="text-sm font-medium text-gray-900 cursor-pointer">
                    {subtest.name}
                  </label>
                  <p className="text-sm text-gray-500">{subtest.description}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartTest}
            disabled={selectedSubtests.length === 0 || !firstName.trim() || !lastName.trim() || !grade || !age}
            className="px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Start Test
          </button>
        </div>
      </main>
    </div>
  )
}