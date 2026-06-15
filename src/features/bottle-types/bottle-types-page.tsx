import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  bottleTypeSchema,
  toBottleTypePayload,
  type BottleTypeForm,
} from './schema'
import { uploadBottleImage } from '@/lib/storage'
import {
  useBottleCategories,
  useBottleTypes,
  useCreateBottleType,
  useDeleteBottleType,
  useUpdateBottleType,
} from './queries'
import { useAuth } from '@/features/auth/auth-provider'
import type { BottleTypeWithCategory } from '@/types'
import { formatOunces } from '@/lib/utils'
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

const EMPTY_FORM: BottleTypeForm = {
  bottle_category_id: '',
  name: '',
  barcode: '',
  full_ounces: '',
  empty_weight_oz: '',
  image_url: '',
  active: true,
}

export function BottleTypesPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading, error } = useBottleTypes()
  const { data: bottleCategories } = useBottleCategories()
  const createMut = useCreateBottleType()
  const updateMut = useUpdateBottleType()
  const deleteMut = useDeleteBottleType()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BottleTypeWithCategory | null>(null)
  const [uploading, setUploading] = useState(false)

  const form = useForm<BottleTypeForm>({
    resolver: zodResolver(bottleTypeSchema),
    defaultValues: EMPTY_FORM,
  })

  const imageUrl = form.watch('image_url')

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadBottleImage(file)
      form.setValue('image_url', url, { shouldValidate: true })
      toast.success('Imagen subida')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo subir la imagen',
      )
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const openCreate = () => {
    setEditing(null)
    form.reset(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (bt: BottleTypeWithCategory) => {
    setEditing(bt)
    form.reset({
      bottle_category_id: bt.bottle_category_id,
      name: bt.name,
      barcode: bt.barcode ?? '',
      full_ounces: String(bt.full_ounces),
      empty_weight_oz: bt.empty_weight_oz != null ? String(bt.empty_weight_oz) : '',
      image_url: bt.image_url ?? '',
      active: bt.active,
    })
    setOpen(true)
  }

  const onSubmit = async (values: BottleTypeForm) => {
    const payload = toBottleTypePayload(values)
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload })
        toast.success('Tipo de botella actualizado')
      } else {
        await createMut.mutateAsync(payload)
        toast.success('Tipo de botella creado')
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  const onDelete = async (bt: BottleTypeWithCategory) => {
    if (!confirm(`¿Eliminar "${bt.name}"?`)) return
    try {
      await deleteMut.mutateAsync(bt.id)
      toast.success('Tipo de botella eliminado')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar (¿tiene botellas asociadas?)',
      )
    }
  }

  return (
    <div>
      <PageHeader
        title="Tipos de botella"
        description="Catálogo maestro: define cada marca y su capacidad en onzas."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo tipo
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
            <EmptyState label="Aún no hay tipos de botella." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Código de barras</TableHead>
                <TableHead className="text-right">Capacidad</TableHead>
                <TableHead className="text-right">Peso vacío</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((bt) => (
                <TableRow key={bt.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {bt.bottle_category?.name ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{bt.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {bt.barcode ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatOunces(bt.full_ounces)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatOunces(bt.empty_weight_oz)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={bt.active ? 'success' : 'secondary'}>
                      {bt.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(bt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(bt)}
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
              {editing ? 'Editar tipo de botella' : 'Nuevo tipo de botella'}
            </DialogTitle>
            <DialogDescription>
              Las onzas se usan para calcular consumo y mermas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría de botella</Label>
              <Controller
                control={form.control}
                name="bottle_category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {bottleCategories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.bottle_category_id && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.bottle_category_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Tequila Blanco 750ml"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_ounces">Onzas llenas</Label>
                <Input
                  id="full_ounces"
                  inputMode="decimal"
                  placeholder="25.36"
                  {...form.register('full_ounces')}
                />
                {form.formState.errors.full_ounces && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.full_ounces.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="empty_weight_oz">Peso vacío (oz)</Label>
                <Input
                  id="empty_weight_oz"
                  inputMode="decimal"
                  placeholder="17.6"
                  disabled={editing?.empty_weight_oz != null}
                  {...form.register('empty_weight_oz')}
                />
                {form.formState.errors.empty_weight_oz && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.empty_weight_oz.message}
                  </p>
                )}
                {editing?.empty_weight_oz != null && (
                  <p className="text-xs text-muted-foreground">
                    El peso vacío ya fue establecido y no puede modificarse.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de barras</Label>
              <Input
                id="barcode"
                placeholder="7501000000011"
                {...form.register('barcode')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Imagen</Label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Vista previa"
                    className="h-14 w-14 rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                    <Upload className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    id="image_file"
                    type="file"
                    accept="image/*"
                    onChange={onUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80"
                  />
                  {uploading && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Subiendo…
                    </p>
                  )}
                </div>
              </div>
              <Input
                placeholder="…o pega una URL"
                {...form.register('image_url')}
              />
              {form.formState.errors.image_url && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.image_url.message}
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
