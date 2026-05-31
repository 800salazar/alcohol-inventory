import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { bottleSchema, toBottlePayload, type BottleForm } from './schema'
import { ReceptionDialog } from './reception-dialog'
import {
  useBottles,
  useCreateBottle,
  useDeleteBottle,
  useUpdateBottle,
} from './queries'
import { useBottleTypes } from '@/features/bottle-types/queries'
import { useAuth } from '@/features/auth/auth-provider'
import type { BottleStatus, BottleWithType } from '@/types'
import { BOTTLE_STATUS_LABELS, BOTTLE_STATUS_OPTIONS } from '@/lib/constants'
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

const EMPTY_FORM: BottleForm = {
  unique_code: '',
  bottle_type_id: '',
  status: 'IN_WAREHOUSE',
  current_ounces: '',
}

export function BottlesPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading, error } = useBottles()
  const { data: bottleTypes } = useBottleTypes()
  const createMut = useCreateBottle()
  const updateMut = useUpdateBottle()
  const deleteMut = useDeleteBottle()

  const [open, setOpen] = useState(false)
  const [receptionOpen, setReceptionOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<BottleStatus | 'ALL'>('ALL')
  const [editing, setEditing] = useState<BottleWithType | null>(null)

  const form = useForm<BottleForm>({
    resolver: zodResolver(bottleSchema),
    defaultValues: EMPTY_FORM,
  })

  const filtered =
    statusFilter === 'ALL'
      ? data
      : data?.filter((b) => b.status === statusFilter)

  const openCreate = () => {
    setEditing(null)
    form.reset(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (bottle: BottleWithType) => {
    setEditing(bottle)
    form.reset({
      unique_code: bottle.unique_code,
      bottle_type_id: bottle.bottle_type_id,
      status: bottle.status,
      current_ounces: String(bottle.current_ounces),
    })
    setOpen(true)
  }

  const onSubmit = async (values: BottleForm) => {
    const payload = toBottlePayload(values)
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload })
        toast.success('Botella actualizada')
      } else {
        await createMut.mutateAsync(payload)
        toast.success('Botella creada')
      }
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  const onDelete = async (bottle: BottleWithType) => {
    if (!confirm(`¿Eliminar la botella ${bottle.unique_code}?`)) return
    try {
      await deleteMut.mutateAsync(bottle.id)
      toast.success('Botella eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  return (
    <div>
      <PageHeader
        title="Botellas"
        description="Botellas físicas individuales con código único y estado."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReceptionOpen(true)}>
              <PackagePlus className="h-4 w-4" />
              Recibir botellas
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nueva botella
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar:</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as BottleStatus | 'ALL')}
        >
          <SelectTrigger className="h-8 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {BOTTLE_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <div className="p-6">
            <ErrorState error={error} />
          </div>
        ) : !filtered?.length ? (
          <div className="p-6">
            <EmptyState label="No hay botellas para este filtro." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Onzas actuales</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bottle) => (
                <TableRow key={bottle.id}>
                  <TableCell className="font-mono text-sm">
                    {bottle.unique_code}
                  </TableCell>
                  <TableCell>{bottle.bottle_type?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {BOTTLE_STATUS_LABELS[bottle.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatOunces(bottle.current_ounces)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(bottle)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(bottle)}
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
              {editing ? 'Editar botella' : 'Nueva botella'}
            </DialogTitle>
            <DialogDescription>
              El código único identifica físicamente la botella.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unique_code">Código único</Label>
              <Input
                id="unique_code"
                placeholder="BTL-TEQ-0001"
                {...form.register('unique_code')}
              />
              {form.formState.errors.unique_code && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.unique_code.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de botella</Label>
              <Controller
                control={form.control}
                name="bottle_type_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {bottleTypes?.map((bt) => (
                        <SelectItem key={bt.id} value={bt.id}>
                          {bt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.bottle_type_id && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.bottle_type_id.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOTTLE_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_ounces">Onzas actuales</Label>
                <Input
                  id="current_ounces"
                  inputMode="decimal"
                  placeholder="25.36"
                  {...form.register('current_ounces')}
                />
                {form.formState.errors.current_ounces && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.current_ounces.message}
                  </p>
                )}
              </div>
            </div>

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

      <ReceptionDialog open={receptionOpen} onOpenChange={setReceptionOpen} />
    </div>
  )
}
