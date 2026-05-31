import type { BottleStatus, MovementType, UserRole } from '@/types'

/** Etiquetas legibles (es) para los enums del dominio. */
export const BOTTLE_STATUS_LABELS: Record<BottleStatus, string> = {
  IN_WAREHOUSE: 'En bodega',
  IN_BAR: 'En barra',
  SOLD: 'Vendida',
  EMPTY: 'Vacía',
  RETURNED: 'Devuelta',
  LOST: 'Perdida',
}

export const BOTTLE_STATUS_OPTIONS = Object.entries(BOTTLE_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as BottleStatus, label }),
)

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  WAREHOUSE_TO_BAR: 'Bodega → Barra',
  BAR_TO_WAREHOUSE: 'Barra → Bodega',
  CUSTOMER_SALE: 'Venta a cliente',
  WASTE: 'Merma',
  ADJUSTMENT: 'Ajuste',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
}

/** Buckets de Storage. */
export const STORAGE_BUCKETS = {
  bottleImages: 'bottle-images',
  evidenceImages: 'evidence-images',
} as const
