"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function MessageInput({ recipientId }: { recipientId: string }) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSending) return

    setIsSending(true)

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, content: content.trim() }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      setContent("")
      router.refresh()
    } catch (error) {
      alert("Failed to send message")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-t p-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? "..." : "Send"}
        </button>
      </div>
    </form>
  )
}
