import { Boxes, ListTree, Package, Wine } from 'lucide-react'
import { useBottleTypes } from '@/features/bottle-types/queries'
import { useBottles } from '@/features/bottles/queries'
import { useCategories } from '@/features/categories/queries'
import { useProducts } from '@/features/products/queries'
import { useAuth } from '@/features/auth/auth-provider'
import { PageHeader } from '@/components/page-header'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | undefined
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value ?? '—'}</div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { profile } = useAuth()
  const bottleTypes = useBottleTypes()
  const bottles = useBottles()
  const products = useProducts()
  const categories = useCategories()

  return (
    <div>
      <PageHeader
        title={`Hola, ${profile?.full_name || profile?.email?.split('@')[0] || ''}`}
        description="Resumen del catálogo. Fase 1 — fundación técnica."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tipos de botella"
          value={bottleTypes.data?.length}
          icon={Wine}
        />
        <StatCard label="Botellas" value={bottles.data?.length} icon={Boxes} />
        <StatCard
          label="Categorías"
          value={categories.data?.length}
          icon={ListTree}
        />
        <StatCard
          label="Productos"
          value={products.data?.length}
          icon={Package}
        />
      </div>
    </div>
  )
}
