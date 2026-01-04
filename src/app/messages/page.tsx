import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { LocalTime } from "@/components/local-time"

export default async function MessagesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Get all unique conversations (users we've messaged with)
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: session.user.id },
        { receiverId: session.user.id },
      ],
    },
    include: {
      sender: {
        select: { id: true, name: true, image: true },
      },
      receiver: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by conversation partner
  const conversationsMap = new Map<string, {
    partner: { id: string; name: string | null; image: string | null }
    lastMessage: typeof messages[0]
    unreadCount: number
  }>()

  for (const message of messages) {
    const partnerId = message.senderId === session.user.id
      ? message.receiverId
      : message.senderId
    const partner = message.senderId === session.user.id
      ? message.receiver
      : message.sender

    if (!conversationsMap.has(partnerId)) {
      // Count unread messages from this partner
      const unreadCount = messages.filter(
        m => m.senderId === partnerId && m.receiverId === session.user.id && !m.read
      ).length

      conversationsMap.set(partnerId, {
        partner,
        lastMessage: message,
        unreadCount,
      })
    }
  }

  const conversations = Array.from(conversationsMap.values())

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Dashboard
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No messages yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Messages will appear here when you coordinate with other users.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {conversations.map(({ partner, lastMessage, unreadCount }) => (
              <Link
                key={partner.id}
                href={`/messages/${partner.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                {partner.image ? (
                  <img
                    src={partner.image}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {partner.name?.[0] || "?"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 truncate">
                      {partner.name || "Anonymous"}
                    </p>
                    <LocalTime
                      date={lastMessage.createdAt.toISOString()}
                      format="date"
                      className="text-xs text-gray-500"
                    />
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {lastMessage.senderId === session.user.id && "You: "}
                    {lastMessage.content}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
