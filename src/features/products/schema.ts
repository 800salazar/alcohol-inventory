import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  category_id: z.string().uuid('Selecciona una categoría'),
  active: z.boolean(),
})

export type ProductForm = z.infer<typeof productSchema>

export function toProductPayload(values: ProductForm) {
  return {
    name: values.name.trim(),
    category_id: values.category_id,
    active: values.active,
  }
}
