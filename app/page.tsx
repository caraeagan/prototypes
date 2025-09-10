import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-900 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marker Method</h1>
          <p className="text-gray-600">Math assessment administration platform</p>
        </div>

        <div className="bg-stone-100 rounded-xl shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Welcome</h2>
            <Link 
              href="/dashboard" 
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
            >
              Enter Dashboard
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Access the platform features
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
