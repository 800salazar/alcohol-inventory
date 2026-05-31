import { z } from 'zod'

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(40, 'Máximo 40 caracteres')
    .transform((v) => v.trim().toUpperCase()),
  active: z.boolean(),
})

export type CategoryForm = z.infer<typeof categorySchema>
