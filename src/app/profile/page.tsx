import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          ridesPosted: true,
          rideRequests: { where: { status: "ACCEPTED" } },
        },
      },
    },
  })

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#821019] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#821019]">Gate Rides</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>

        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#821019] flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.name || "Anonymous"}
              </h2>
              <p className="text-gray-500">{user.email}</p>
              <p className="text-sm text-gray-400 mt-1">
                Member since {user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[#821019]">{user._count.ridesPosted}</p>
              <p className="text-sm text-gray-500">Rides Posted</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#821019]">{user._count.rideRequests}</p>
              <p className="text-sm text-gray-500">Rides Joined</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>
          <ProfileForm
            initialData={{
              name: user.name || "",
              phone: user.phone || "",
              bio: user.bio || "",
            }}
          />
        </div>
      </div>
    </div>
  )
}
