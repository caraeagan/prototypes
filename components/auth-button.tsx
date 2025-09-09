"use client"

import { useSession, signIn, signOut } from "next-auth/react"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {session.user?.image && (
            <img
              src={session.user.image}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          )}
          <span>Welcome, {session.user?.name}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
    >
      Sign in with Google
    </button>
  )
}