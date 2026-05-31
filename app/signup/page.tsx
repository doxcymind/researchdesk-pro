'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()

  const signupWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-10">
      <div className="bg-zinc-900 border border-amber-900 p-10 rounded-3xl w-full max-w-md">

        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-4">
            Join ResearchDesk
          </h1>

          <p className="text-zinc-400">
            Create your research workspace in seconds.
          </p>
        </div>

        <button
          onClick={signupWithGoogle}
          className="w-full bg-amber-400 text-black p-4 rounded-xl font-bold hover:bg-amber-300 transition"
        >
          Continue with Google
        </button>

        <p className="text-center text-zinc-500 text-sm mt-6">
          Secure • Private • Built for Researchers
        </p>

      </div>
    </main>
  )
}