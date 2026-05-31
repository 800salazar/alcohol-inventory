import { NavLink, Outlet } from 'react-router-dom'
import {
  Boxes,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  ListTree,
  LogOut,
  Package,
  Users,
  Wine,
  Wine as BottleIcon,
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
  { to: '/categories', label: 'Categorías', icon: ListTree },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/recipes', label: 'Recetas', icon: FlaskConical },
  { to: '/initial-inventory', label: 'Inventario inicial', icon: ClipboardList },
  { to: '/users', label: 'Usuarios', icon: Users, adminOnly: true },
]

export function AppLayout() {
  const { profile, role, isAdmin, signOut } = useAuth()

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
          <span className="flex items-center gap-2 font-semibold">
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
