"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

type Category = "general" | "ride_issue" | "payment" | "account" | "bug" | "feature"

const categories: { value: Category; label: string }[] = [
  { value: "general", label: "General Question" },
  { value: "ride_issue", label: "Ride Issue" },
  { value: "payment", label: "Payment Problem" },
  { value: "account", label: "Account Help" },
  { value: "bug", label: "Report a Bug" },
  { value: "feature", label: "Feature Request" },
]

export default function SupportPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "general" as Category,
    subject: "",
    message: "",
  })

  // Pre-fill form with session data when available
  const name = session?.user?.name || form.name
  const email = session?.user?.email || form.email

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: session?.user?.name || form.name,
          email: session?.user?.email || form.email,
          category: form.category,
          subject: form.subject,
          message: form.message,
          userId: session?.user?.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send message")
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h1>
            <p className="text-gray-600 mb-6">
              Thanks for reaching out. We&apos;ll get back to you as soon as possible.
            </p>
            <Link
              href={session ? "/dashboard" : "/"}
              className="inline-block bg-[#821019] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#6a0d14] transition-colors"
            >
              {session ? "Back to Dashboard" : "Back to Home"}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href={session ? "/dashboard" : "/"}
            className="text-[#821019] hover:underline text-sm"
          >
            &larr; {session ? "Back to Dashboard" : "Back to Home"}
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-gray-600 mt-2">
              Have a question or need help? Send us a message.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!session && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            )}

            {session && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="text-gray-600">
                  Sending as <span className="font-medium text-gray-900">{session.user?.name}</span>{" "}
                  ({session.user?.email})
                </p>
              </div>
            )}

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-transparent"
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-transparent resize-none"
                placeholder="Please describe your question or issue in detail..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[#821019] text-white hover:bg-[#6a0d14]"
              }`}
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>
              You can also email us directly at{" "}
              <a href="mailto:porter.comstock@gmail.com" className="text-[#821019] hover:underline">
                porter.comstock@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
