import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  // Refresh the session cookie if it exists, but never redirect.
  // Auth redirects are handled client-side in each page.
  const response = NextResponse.next()

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    // Refresh session (renews cookie if needed), but don't gate on result
    await supabase.auth.getUser()
  } catch {}

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/projects/:path*', '/new-project/:path*', '/workspace/:path*'],
}
