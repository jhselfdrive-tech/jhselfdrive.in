import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const hasSupabaseSession = request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (!hasSupabaseSession) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}

export const config = {
  // Public rental-paper links under /r/ must remain outside this admin-only matcher.
  matcher: ["/admin/((?!login(?:/|$)).*)"],
};
