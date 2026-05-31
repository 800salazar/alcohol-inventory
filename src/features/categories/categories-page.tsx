import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { categorySchema, type CategoryForm } from './schema'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from './queries'
import { useAuth } from '@/features/auth/auth-provider'
import type { Category } from '@/types'
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

export function CategoriesPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading, error } = useCategories()
  const createMut = useCreateCategory()
  const updateMut = useUpdateCategory()
  const deleteMut = useDeleteCategory()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', active: true },
  })

  const openCreate = () => {
    setEditing(null)
    form.reset({ name: '', active: true })
    setOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    form.reset({ name: category.name, active: category.active })
    setOpen(true)
  }

  const onSubmit = async (values: CategoryForm) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload: values })
        toast.success('Categoría actualizada')
      } else {
        await createMut.mutateAsync(values)
        toast.success('Categoría creada')
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  const onDelete = async (category: Category) => {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return
    try {
      await deleteMut.mutateAsync(category.id)
      toast.success('Categoría eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Categorías de producto vendible (DRINK, SHOT, BEER…)."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva categoría
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-6">
            <ErrorState error={error} />
          </div>
        ) : !data?.length ? (
          <div className="p-6">
            <EmptyState label="Aún no hay categorías." />
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
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </DialogTitle>
            <DialogDescription>
              El nombre se guarda en MAYÚSCULAS y debe ser único.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="DRINK" {...form.register('name')} />
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
