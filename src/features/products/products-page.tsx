import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { productSchema, toProductPayload, type ProductForm } from './schema'
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from './queries'
import { useCategories } from '@/features/categories/queries'
import { useAuth } from '@/features/auth/auth-provider'
import type { ProductWithCategory } from '@/types'
import { PageHeader } from '@/components/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/data-state'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EMPTY_FORM: ProductForm = {
  name: '',
  category_id: '',
  active: true,
}

export function ProductsPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading, error } = useProducts()
  const { data: categories } = useCategories()
  const createMut = useCreateProduct()
  const updateMut = useUpdateProduct()
  const deleteMut = useDeleteProduct()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProductWithCategory | null>(null)

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_FORM,
  })

  const openCreate = () => {
    setEditing(null)
    form.reset(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (product: ProductWithCategory) => {
    setEditing(product)
    form.reset({
      name: product.name,
      category_id: product.category_id,
      active: product.active,
    })
    setOpen(true)
  }

  const onSubmit = async (values: ProductForm) => {
    const payload = toProductPayload(values)
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload })
        toast.success('Producto actualizado')
      } else {
        await createMut.mutateAsync(payload)
        toast.success('Producto creado')
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  const onDelete = async (product: ProductWithCategory) => {
    if (!confirm(`¿Eliminar el producto "${product.name}"?`)) return
    try {
      await deleteMut.mutateAsync(product.id)
      toast.success('Producto eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Productos vendibles asociados a una categoría."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo producto
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
            <EmptyState label="Aún no hay productos." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {product.category?.name ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.active ? 'success' : 'secondary'}>
                      {product.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(product)}
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
              {editing ? 'Editar producto' : 'Nuevo producto'}
            </DialogTitle>
            <DialogDescription>
              El nombre debe ser único dentro de su categoría.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Margarita"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Controller
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.category_id && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.category_id.message}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...form.register('active')}
              />
              Activo
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
