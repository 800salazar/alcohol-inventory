import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateUser, useProfiles, useUpdateProfile } from './queries'
import {
  createUserSchema,
  editUserSchema,
  type CreateUserForm,
  type EditUserForm,
} from './schema'
import { useAuth } from '@/features/auth/auth-provider'
import type { Profile } from '@/types'
import { USER_ROLE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
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

export function UsersPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useProfiles()
  const createMut = useCreateUser()
  const updateMut = useUpdateProfile()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', full_name: '', role: 'OPERATOR' },
  })

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { full_name: '', role: 'OPERATOR', active: true },
  })

  const openCreate = () => {
    createForm.reset({ email: '', full_name: '', role: 'OPERATOR' })
    setCreateOpen(true)
  }

  const openEdit = (profile: Profile) => {
    setEditing(profile)
    editForm.reset({
      full_name: profile.full_name ?? '',
      role: profile.role,
      active: profile.active,
    })
  }

  const onCreate = async (values: CreateUserForm) => {
    try {
      await createMut.mutateAsync(values)
      toast.success('Usuario creado. Ya puede entrar con su correo (OTP).')
      setCreateOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear')
    }
  }

  const onEdit = async (values: EditUserForm) => {
    if (!editing) return
    try {
      await updateMut.mutateAsync({ id: editing.id, payload: values })
      toast.success('Usuario actualizado')
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar')
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Alta, edición, rol y activación. Solo administradores."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
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
            <EmptyState label="No hay usuarios registrados." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead className="w-16 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.full_name || '—'}
                    {profile.id === user?.id && (
                      <Badge variant="outline" className="ml-2">
                        Tú
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {profile.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {USER_ROLE_LABELS[profile.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.active ? 'success' : 'secondary'}>
                      {profile.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(profile.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Crear usuario */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              El usuario entrará sin contraseña, con un código (OTP) a su correo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre</Label>
              <Input
                id="full_name"
                placeholder="Juan Pérez"
                {...createForm.register('full_name')}
              />
              {createForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.full_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@bar.com"
                {...createForm.register('email')}
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Controller
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATOR">
                        {USER_ROLE_LABELS.OPERATOR}
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        {USER_ROLE_LABELS.ADMIN}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar usuario */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Nombre</Label>
              <Input id="edit_full_name" {...editForm.register('full_name')} />
              {editForm.formState.errors.full_name && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.full_name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Controller
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={editing?.id === user?.id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATOR">
                        {USER_ROLE_LABELS.OPERATOR}
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        {USER_ROLE_LABELS.ADMIN}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={editing?.id === user?.id}
                  />
                )}
              />
              Activo
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
