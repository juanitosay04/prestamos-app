import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { decrypt } from "@/lib/session"

const publicRoutes = ["/login"]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublicRoute = publicRoutes.includes(path)

  const cookie = request.cookies.get("session")?.value
  const session = cookie ? await decrypt(cookie) : null

  if (!isPublicRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // RBAC: Secretarias no pueden entrar a gastos ni configuracion
  if (session && session.role !== "ADMIN") {
    if (path.startsWith("/gastos") || path.startsWith("/configuracion")) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // Inject session data into headers for the app
  const response = NextResponse.next()
  if (session) {
    response.headers.set("x-user-role", session.role)
    response.headers.set("x-user-email", session.email)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
