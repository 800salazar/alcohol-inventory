import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { bottleCategorySchema, type BottleCategoryForm } from './schema'
import {
  useBottleCategoriesAdmin,
  useCreateBottleCategory,
  useDeleteBottleCategory,
  useUpdateBottleCategory,
} from './queries'
import { useAuth } from '@/features/auth/auth-provider'
import type { BottleCategory } from '@/types'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/data-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const SIMPLE_AUTH_ENABLED =
  String(import.meta.env.VITE_SIMPLE_AUTH_ENABLED ?? '').trim() === 'true'

export function BottleCategoriesPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading, error } = useBottleCategoriesAdmin()
  const createMut = useCreateBottleCategory()
  const updateMut = useUpdateBottleCategory()
  const deleteMut = useDeleteBottleCategory()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BottleCategory | null>(null)

  const form = useForm<BottleCategoryForm>({
    resolver: zodResolver(bottleCategorySchema),
    defaultValues: { name: '', active: true },
  })

  const openCreate = () => {
    setEditing(null)
    form.reset({ name: '', active: true })
    setOpen(true)
  }

  const openEdit = (category: BottleCategory) => {
    setEditing(category)
    form.reset({ name: category.name, active: category.active })
    setOpen(true)
  }

  const onSubmit = async (values: BottleCategoryForm) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload: values })
        toast.success('Categoría de licor actualizada')
      } else {
        await createMut.mutateAsync(values)
        toast.success('Categoría de licor creada')
      }
      setOpen(false)
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo guardar')
      toast.error(
        SIMPLE_AUTH_ENABLED
          ? `${message}. En modo simple local no existe una sesión real de Supabase para guardar cambios.`
          : message,
      )
    }
  }

  const onDelete = async (category: BottleCategory) => {
    if (!confirm(`¿Eliminar la categoría de licor "${category.name}"?`)) return
    try {
      await deleteMut.mutateAsync(category.id)
      toast.success('Categoría de licor eliminada')
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo eliminar')
      toast.error(
        SIMPLE_AUTH_ENABLED
          ? `${message}. En modo simple local no existe una sesión real de Supabase para borrar cambios.`
          : message,
      )
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorías de licor"
        description="Catálogo maestro de licor: TEQUILA, VODKA, RON, etc."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva categoría de licor
          </Button>
        }
      />

      {SIMPLE_AUTH_ENABLED && (
        <Card className="mb-4 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Este entorno usa acceso simple local. Puedes navegar la app, pero para
          guardar cambios reales en Supabase necesitas iniciar con auth real
          (`VITE_SIMPLE_AUTH_ENABLED=false`) o usar un proyecto pensado para
          preproducción sin este bypass.
        </Card>
      )}

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-6">
            <ErrorState error={error} />
          </div>
        ) : !data?.length ? (
          <div className="p-6">
            <EmptyState label="Aún no hay categorías de licor." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant={category.active ? 'success' : 'secondary'}>
                      {category.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(category.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(category)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar categoría de licor' : 'Nueva categoría de licor'}
            </DialogTitle>
            <DialogDescription>
              El nombre se guarda en MAYÚSCULAS y debe ser único.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="TEQUILA" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...form.register('active')}
              />
              Activa
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
