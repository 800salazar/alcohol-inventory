import { z } from 'zod'

/**
 * Schema del formulario (todos los campos como string/boolean para un tipado
 * limpio en react-hook-form). La conversión a número/null se hace al armar el
 * payload en la página (ver toBottleTypePayload).
 */
export const bottleTypeSchema = z.object({
  bottle_category_id: z.string().uuid('Selecciona una categoría'),
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120'),
  barcode: z.string().max(120, 'Máximo 120').optional(),
  full_ounces: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => Number(v) > 0, 'Debe ser un número mayor a 0'),
  empty_weight_oz: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'Debe ser un número ≥ 0'),
  image_url: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), 'Debe ser una URL válida'),
  active: z.boolean(),
})

export type BottleTypeForm = z.infer<typeof bottleTypeSchema>

/** Convierte los valores del formulario al payload de la base de datos. */
export function toBottleTypePayload(values: BottleTypeForm) {
  return {
    bottle_category_id: values.bottle_category_id,
    name: values.name.trim(),
    barcode: values.barcode?.trim() || null,
    full_ounces: Number(values.full_ounces),
    empty_weight_oz: values.empty_weight_oz
      ? Number(values.empty_weight_oz)
      : null,
    image_url: values.image_url?.trim() || null,
    active: values.active,
  }
}
