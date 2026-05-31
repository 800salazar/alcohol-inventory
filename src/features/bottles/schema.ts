import { z } from 'zod'

const BOTTLE_STATUS = [
  'IN_WAREHOUSE',
  'IN_BAR',
  'SOLD',
  'EMPTY',
  'RETURNED',
  'LOST',
] as const

export const bottleSchema = z.object({
  unique_code: z.string().min(2, 'Mínimo 2 caracteres').max(60),
  bottle_type_id: z.string().uuid('Selecciona un tipo de botella'),
  status: z.enum(BOTTLE_STATUS),
  current_ounces: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'Debe ser un número ≥ 0'),
})

export type BottleForm = z.infer<typeof bottleSchema>

export function toBottlePayload(values: BottleForm) {
  return {
    unique_code: values.unique_code.trim(),
    bottle_type_id: values.bottle_type_id,
    status: values.status,
    current_ounces: values.current_ounces ? Number(values.current_ounces) : 0,
  }
}
