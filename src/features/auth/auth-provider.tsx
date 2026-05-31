import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  isAdmin: boolean
  loading: boolean
  /** Envía un código de un solo uso (OTP) al correo. */
  sendOtp: (email: string) => Promise<void>
  /** Verifica el código OTP y abre la sesión. */
  verifyOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error cargando perfil:', error.message)
    return null
  }
  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // Sesión inicial.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) {
        setProfile(await fetchProfile(data.session.user.id))
      }
      setLoading(false)
    })

    // Cambios de auth (login, logout, refresh de token).
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return
      setSession(newSession)
      setProfile(
        newSession?.user ? await fetchProfile(newSession.user.id) : null,
      )
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const sendOtp = useCallback(async (email: string) => {
    // shouldCreateUser: false → solo pueden entrar usuarios ya dados de alta
    // por un administrador.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })
    if (error) throw error
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }, [])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'ADMIN',
    loading,
    sendOtp,
    verifyOtp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
