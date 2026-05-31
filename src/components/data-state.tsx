import { Loader2 } from 'lucide-react'

/** Fila/placeholder de carga para tablas y listados. */
export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

/** Estado de error genérico. */
export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Ocurrió un error'
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  )
}

/** Estado vacío. */
export function EmptyState({ label = 'Sin registros aún.' }: { label?: string }) {
  return (
    <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}
