import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { MessageInput } from "./message-input"
import { LocalTime } from "@/components/local-time"

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ recipientId: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const { recipientId } = await params

  // Get the other user
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, name: true, image: true, email: true },
  })

  if (!recipient) {
    notFound()
  }

  // Get messages between the two users
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: recipientId },
        { senderId: recipientId, receiverId: session.user.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  })

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: {
      senderId: recipientId,
      receiverId: session.user.id,
      read: false,
    },
    data: { read: true },
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <Link
          href="/messages"
          className="text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          {recipient.image ? (
            <img
              src={recipient.image}
              alt=""
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {recipient.name?.[0] || "?"}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">
              {recipient.name || "Anonymous"}
            </p>
            <p className="text-xs text-gray-500">{recipient.email}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet.</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === session.user.id

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? "bg-blue-600 text-white"
                      : "bg-white border text-gray-900"
                  }`}
                >
                  <p>{message.content}</p>
                  <LocalTime
                    date={message.createdAt.toISOString()}
                    format="time"
                    className={`text-xs mt-1 block ${
                      isOwn ? "text-blue-200" : "text-gray-400"
                    }`}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <MessageInput recipientId={recipientId} />
    </div>
  )
}
