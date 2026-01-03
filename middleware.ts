import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/rides", "/messages", "/profile"]

// Routes that are only for unauthenticated users
const authRoutes = ["/login"]

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Allow all API routes (including auth callbacks) to pass through
  if (nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
