import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina clases de Tailwind resolviendo conflictos (patrón shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatea onzas con dos decimales y sufijo "oz". */
export function formatOunces(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${value.toFixed(2)} oz`
}

/** Formatea una fecha ISO a formato local corto (es-MX). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}
