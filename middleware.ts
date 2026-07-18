import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal middleware — passes through all requests.
 * Auth protection is handled client-side by useAuth() + useRouter().
 * JWT tokens are stored in localStorage (not readable from server-side).
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/create", "/jobs/:path*", "/login", "/register"],
};
