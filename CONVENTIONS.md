# Convenciones de código — Inventario Licor

## Estructura

```
src/
  components/
    ui/            # Primitivos shadcn/ui (Button, Input, Dialog, Table…)
    layout/        # Layout de la app (sidebar, topbar)
    *.tsx          # Componentes compartidos (PageHeader, DataState…)
  features/
    <feature>/
      api.ts       # Acceso a datos (funciones que hablan con Supabase)
      queries.ts   # Hooks de TanStack Query (use<X>, useCreate<X>…)
      schema.ts    # Esquemas Zod + helpers toXPayload()
      <feature>-page.tsx
  lib/             # supabase, query-client, utils, constants
  types/           # database.types.ts (generado) + index.ts (alias de dominio)
```

**Regla de oro:** la lógica de datos vive en `features/<x>/api.ts`. Los componentes
nunca llaman a `supabase` directamente; usan los hooks de `queries.ts`.

## Capas

1. **api.ts** — funciones `async` puras. Lanzan el `error` de Supabase (no lo tragan).
2. **queries.ts** — envuelven la api con `useQuery`/`useMutation`. Las mutaciones
   invalidan el `queryKey` correspondiente en `onSuccess`.
3. **Página** — consume hooks, maneja estado de UI (diálogos) y muestra toasts.

## Nomenclatura

- Archivos: `kebab-case.ts(x)`.
- Componentes/Tipos: `PascalCase`. Hooks: `useCamelCase`.
- Tablas y columnas SQL: `snake_case` (plural para tablas).
- Claves de query: `xKeys.all = ['x'] as const`.

## Tipos

- Importa SIEMPRE desde `@/types` (no desde `database.types.ts`).
- Regenera tipos tras cambiar el esquema: `pnpm gen:types`.
- `Row` para lectura, `Insert`/`Update` para escritura.

## Formularios

- `react-hook-form` + `zodResolver`.
- Inputs numéricos se manejan como `string` en el form y se convierten en
  `toXPayload()` (evita `NaN` y problemas de tipado con `coerce`).
- Campos opcionales vacíos → `null` antes de enviar a la BD.

## Estilos

- Tailwind + shadcn/ui. Combinar clases con `cn()` (de `@/lib/utils`).
- No CSS suelto: todo via utilidades de Tailwind o variantes `cva`.

## Seguridad

- La autorización real es de la **base de datos** (RLS), no del frontend.
- El frontend solo oculta acciones (ej. botón Eliminar para no-admin) por UX.
- Nunca usar la `service_role` key en el cliente. Solo `anon` key.

## Commits (sugerencia)

`tipo(scope): descripción` — ej. `feat(bottles): alta de botella física`.
Tipos: `feat`, `fix`, `refactor`, `chore`, `docs`, `db`.
