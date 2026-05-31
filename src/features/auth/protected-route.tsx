import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2, ShieldX } from 'lucide-react'
import { useAuth } from './auth-provider'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types'

/** Spinner a pantalla completa mientras se resuelve la sesión. */
function FullScreenLoader() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

/** Pantalla para cuentas desactivadas por un administrador. */
function DeactivatedScreen() {
  const { signOut } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldX className="h-10 w-10 text-destructive" />
      <div>
        <h1 className="text-lg font-semibold">Cuenta desactivada</h1>
        <p className="text-sm text-muted-foreground">
          Contacta a un administrador para reactivar tu acceso.
        </p>
      </div>
      <Button variant="outline" onClick={() => signOut()}>
        Cerrar sesión
      </Button>
    </div>
  )
}

/**
 * Bloquea el acceso a usuarios sin sesión. Opcionalmente exige un rol concreto.
 * Se usa como elemento padre en las rutas (renderiza <Outlet/>).
 */
export function ProtectedRoute({ requireRole }: { requireRole?: UserRole }) {
  const { session, profile, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Cuenta desactivada: con sesión pero sin acceso.
  if (profile && !profile.active) {
    return <DeactivatedScreen />
  }

  if (requireRole && role !== requireRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
