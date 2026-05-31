interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

/** Encabezado de página reutilizable: título, descripción y acción a la derecha. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
