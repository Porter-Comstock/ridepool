import Link from "next/link"

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-[#821019] hover:underline text-sm"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-gray-600 mt-2">
              Have a question, issue, or feedback? Reach out and we&apos;ll get back to you.
            </p>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#821019]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#821019]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-700 mb-2">Email us at</p>
            <a
              href="mailto:porter.comstock@gmail.com"
              className="text-lg font-semibold text-[#821019] hover:underline"
            >
              porter.comstock@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
