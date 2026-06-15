import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Boxes,
  ClipboardList,
  Grape,
  FlaskConical,
  LayoutDashboard,
  ListTree,
  LogOut,
  Menu,
  Package,
  Users,
  Wine,
  Wine as BottleIcon,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-provider'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/bottle-types', label: 'Tipos de botella', icon: BottleIcon },
  { to: '/bottles', label: 'Botellas', icon: Boxes },
  { to: '/bottle-categories', label: 'Categorías de licor', icon: Grape },
  { to: '/categories', label: 'Categorías', icon: ListTree },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/recipes', label: 'Recetas', icon: FlaskConical },
  { to: '/initial-inventory', label: 'Inventario inicial', icon: ClipboardList },
  { to: '/users', label: 'Usuarios', icon: Users, adminOnly: true },
]

export function AppLayout() {
  const { profile, role, isAdmin, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      toast.error('No se pudo cerrar sesión')
    }
  }

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="flex min-h-screen bg-muted/30">
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="flex items-center gap-2 font-semibold">
                <Wine className="h-5 w-5 text-primary" />
                Inventario Licor
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="border-t p-3">
              <div className="mb-2 px-2">
                <p className="truncate text-sm font-medium">
                  {profile?.full_name || profile?.email}
                </p>
                {role && (
                  <Badge variant="secondary" className="mt-1">
                    {USER_ROLE_LABELS[role]}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  setMobileMenuOpen(false)
                  void handleSignOut()
                }}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r bg-background md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
          <Wine className="h-5 w-5 text-primary" />
          Inventario Licor
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium">
              {profile?.full_name || profile?.email}
            </p>
            {role && (
              <Badge variant="secondary" className="mt-1">
                {USER_ROLE_LABELS[role]}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        {/* Topbar (móvil) */}
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Wine className="h-5 w-5 text-primary" />
            Inventario Licor
          </span>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
