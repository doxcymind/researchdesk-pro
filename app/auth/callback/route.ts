import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { hmacHex } from '@/lib/verify'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  // Prevent open redirect — only allow relative paths
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  const response = NextResponse.redirect(new URL(next, origin))

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
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login', origin))
  }

  // Send welcome email for new users only
  const user = data?.user
  if (user?.email && user.created_at) {
    const createdAt = new Date(user.created_at).getTime()
    const now = Date.now()
    const isNewUser = now - createdAt < 30000 // within 30 seconds of signup
    if (isNewUser) {
      const welcomeSig = hmacHex(user.email, process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
      fetch(`${origin}/api/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-welcome-signature': welcomeSig,
        },
        body: JSON.stringify({ email: user.email, name: user.user_metadata?.full_name }),
      }).catch(() => {}) // fire and forget
    }
  }

  return response
}
