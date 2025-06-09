import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware doesn't need to do anything special for Edge Config
// as it's automatically initialized by the @vercel/edge-config package
// based on the EDGE_CONFIG environment variable

export function middleware(request: NextRequest) {
  // Just pass through all requests
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Skip all internal paths (_next, api, etc)
    '/((?!_next/|_vercel/|api/|favicon.ico).*)',
  ],
}