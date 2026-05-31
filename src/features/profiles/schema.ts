import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Correo inválido'),
  full_name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  role: z.enum(['ADMIN', 'OPERATOR']),
})

export const editUserSchema = z.object({
  full_name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  role: z.enum(['ADMIN', 'OPERATOR']),
  active: z.boolean(),
})

export type CreateUserForm = z.infer<typeof createUserSchema>
export type EditUserForm = z.infer<typeof editUserSchema>
