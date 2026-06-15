import { z } from 'zod'

export const bottleCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(120, 'Máximo 120')
    .transform((v) => v.trim().toUpperCase()),
  active: z.boolean(),
})

export type BottleCategoryForm = z.infer<typeof bottleCategorySchema>
