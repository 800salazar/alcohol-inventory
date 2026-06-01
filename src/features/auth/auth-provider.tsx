import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

const SIMPLE_AUTH_ENABLED =
  import.meta.env.VITE_SIMPLE_AUTH_ENABLED === 'true'
const SIMPLE_AUTH_CODE =
  String(import.meta.env.VITE_SIMPLE_AUTH_CODE ?? '12345678').trim()
const SIMPLE_AUTH_ROLE: UserRole =
  import.meta.env.VITE_SIMPLE_AUTH_ROLE === 'OPERATOR' ? 'OPERATOR' : 'ADMIN'
const SIMPLE_AUTH_STORAGE_KEY = 'inventario.simple-auth.v1'

interface SimpleAuthState {
  email: string
}

function createSimpleProfile(email: string): Profile {
  const now = new Date().toISOString()
  return {
    id: 'simple-auth-user',
    email,
    full_name: 'Preproduccion',
    role: SIMPLE_AUTH_ROLE,
    active: true,
    created_at: now,
    updated_at: now,
  }
}

function createSimpleSession(email: string): Session {
  return {
    user: {
      id: 'simple-auth-user',
      email,
    },
  } as Session
}

function readSimpleAuthState(): SimpleAuthState | null {
  if (!SIMPLE_AUTH_ENABLED) return null
  try {
    const raw = localStorage.getItem(SIMPLE_AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SimpleAuthState>
    if (!parsed.email || typeof parsed.email !== 'string') return null
    return { email: parsed.email }
  } catch {
    return null
  }
}

function writeSimpleAuthState(state: SimpleAuthState) {
  localStorage.setItem(SIMPLE_AUTH_STORAGE_KEY, JSON.stringify(state))
}

function clearSimpleAuthState() {
  localStorage.removeItem(SIMPLE_AUTH_STORAGE_KEY)
}

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
    if (SIMPLE_AUTH_ENABLED) {
      const simpleState = readSimpleAuthState()
      if (simpleState) {
        setSession(createSimpleSession(simpleState.email))
        setProfile(createSimpleProfile(simpleState.email))
      } else {
        setSession(null)
        setProfile(null)
      }
      setLoading(false)
      return
    }

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
    if (SIMPLE_AUTH_ENABLED) {
      if (!email.trim()) {
        throw new Error('Ingresa un correo para continuar')
      }
      return
    }

    // shouldCreateUser: false → solo pueden entrar usuarios ya dados de alta
    // por un administrador.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    })
    if (error) throw error
  }, [])

  const verifyOtp = useCallback(async (email: string, token: string) => {
    if (SIMPLE_AUTH_ENABLED) {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedToken = token.trim()

      if (normalizedToken !== SIMPLE_AUTH_CODE) {
        throw new Error('Codigo incorrecto (modo preproduccion)')
      }

      writeSimpleAuthState({ email: normalizedEmail })
      setSession(createSimpleSession(normalizedEmail))
      setProfile(createSimpleProfile(normalizedEmail))
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (SIMPLE_AUTH_ENABLED) {
      clearSimpleAuthState()
      setSession(null)
      setProfile(null)
      return
    }

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
