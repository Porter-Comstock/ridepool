"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function AcceptTermsPage() {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { update } = useSession()

  const handleAccept = async () => {
    if (!accepted) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/legal/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to accept terms")
      }

      // Update the session to reflect the new termsAcceptedAt value
      await update()

      // Use hard navigation to ensure the fresh JWT cookie is sent to middleware
      window.location.href = "/dashboard"
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <img
              src="/icons/icon-192x192.png"
              alt="Gate Rides"
              className="w-10 h-10"
            />
          </Link>
          <h1 className="text-2xl font-bold text-[#821019]">
            Welcome to Gate Rides
          </h1>
          <p className="mt-2 text-gray-600">
            Before continuing, please review and accept our terms.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 max-h-64 overflow-y-auto">
          <p className="mb-4">
            By using Gate Rides, you agree to be bound by our:
          </p>
          <ul className="space-y-2">
            <li>
              <Link
                href="/legal/terms"
                target="_blank"
                className="text-[#821019] hover:underline font-medium"
              >
                Terms of Service &rarr;
              </Link>
              <p className="text-gray-500 mt-1">
                Governs your use of the Gate Rides platform, including eligibility, pricing guidelines, and dispute resolution.
              </p>
            </li>
            <li className="mt-4">
              <Link
                href="/legal/privacy"
                target="_blank"
                className="text-[#821019] hover:underline font-medium"
              >
                Privacy Policy &rarr;
              </Link>
              <p className="text-gray-500 mt-1">
                Explains how we collect, use, and protect your personal information.
              </p>
            </li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 text-[#821019] border-gray-300 rounded focus:ring-[#821019]"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the{" "}
              <Link
                href="/legal/terms"
                target="_blank"
                className="text-[#821019] hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                className="text-[#821019] hover:underline"
              >
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              accepted && !loading
                ? "bg-[#821019] text-white hover:bg-[#6a0d14]"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? "Processing..." : "Continue to Gate Rides"}
          </button>
        </div>
      </div>
    </div>
  )
}
