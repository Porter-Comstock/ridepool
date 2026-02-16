import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/rides", "/messages", "/profile", "/requests", "/scheduled"]

// Routes that are only for unauthenticated users
const authRoutes = ["/login"]

// Routes that require auth but not terms acceptance
const termsExemptRoutes = ["/legal/accept"]

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const hasAcceptedTerms = !!req.auth?.user?.termsAcceptedAt

  // Allow all API routes (including auth callbacks) to pass through
  if (nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Allow legal pages (terms, privacy) for everyone
  if (nextUrl.pathname.startsWith("/legal/") && !nextUrl.pathname.startsWith("/legal/accept")) {
    return NextResponse.next()
  }

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isTermsExemptRoute = termsExemptRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // Handle terms acceptance page - requires auth but not terms
  if (isTermsExemptRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    // If user already accepted terms, redirect to dashboard
    if (hasAcceptedTerms) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  // For protected routes, check if user has accepted terms
  if (isProtectedRoute && isLoggedIn && !hasAcceptedTerms) {
    return NextResponse.redirect(new URL("/legal/accept", nextUrl))
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isLoggedIn) {
    // Check if they need to accept terms first
    if (!hasAcceptedTerms) {
      return NextResponse.redirect(new URL("/legal/accept", nextUrl))
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
