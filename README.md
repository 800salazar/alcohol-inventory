# Inventario Licor — Fases 1 y 2

Sistema de control de inventario para un bar.

- **Fase 1 — Fundación técnica:** autenticación, roles, catálogos y CRUDs base.
- **Fase 2 — Catálogos y operación base:** login por **OTP**, CRUD completo de
  usuarios, recepción de botellas, **inventario inicial** y auditoría básica.

Todavía **no** incluye: conciliaciones, KPIs, dashboards, cálculo de diferencias,
mermas automáticas ni reportes avanzados (eso es Fase 3 en adelante).

### Entregables Fase 2

✅ Login OTP · ✅ Roles · ✅ CRUD usuarios · ✅ CRUD tipos de botella (con imagen)
· ✅ CRUD botellas físicas + recepción · ✅ CRUD categorías (activables) ·
✅ CRUD productos · ✅ CRUD recetas · ✅ Carga de inventario inicial ·
✅ Auditoría básica (vía triggers + evento `INITIAL_INVENTORY`).

## Stack

| Capa      | Tecnología                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React 18 · TypeScript · Vite · TailwindCSS · shadcn/ui            |
| Datos UI  | TanStack Query · React Hook Form · Zod                            |
| Backend   | **Supabase** (PostgreSQL · Auth · Storage · Row Level Security)   |
| Hosting   | Vercel (frontend) · Supabase (backend)                           |

> No hay backend propio (FastAPI, etc.). Auth, API de datos, almacenamiento y
> autorización los resuelve Supabase. El frontend habla con Supabase mediante
> la `anon key`; la seguridad real la imponen las **RLS Policies**.

## Arquitectura

```
React (Vercel)
   │  @supabase/supabase-js (anon key)
   ▼
Supabase Auth ──► Supabase PostgreSQL (RLS) ──► Supabase Storage
                         ▲
                         └── Triggers: auditoría, updated_at, alta de perfil
```

## Modelo de datos

Catálogo y operaciones (ver `supabase/migrations/`):

- **profiles** — extiende `auth.users` con `role` (`ADMIN`/`OPERATOR`).
- **bottle_types** — catálogo maestro (capacidad en onzas, código de barras).
- **bottles** — botellas físicas con código único, estado y onzas actuales.
- **categories / products** — catálogo de producto vendible.
- **recipes / recipe_details** — receta de cada producto (tipo de botella + onzas).
- **inventory_movements / inventory_snapshots(+details)** — operación de stock.
- **sales_periods / sales_details** — captura de ventas.
- **audit_logs** — bitácora inmutable (se llena por trigger).

Diseño orientado a **escalabilidad, auditoría y seguridad**: PKs `uuid`,
`updated_at` por trigger, claves foráneas indexadas, `ON DELETE RESTRICT` donde
perder datos rompería historial, y auditoría automática en las tablas maestras.

## Roles y permisos (RLS)

| Acción  | OPERATOR | ADMIN |
| ------- | :------: | :---: |
| SELECT  |    ✅    |  ✅   |
| INSERT  |    ✅    |  ✅   |
| UPDATE  |    ✅    |  ✅   |
| DELETE  |    ❌    |  ✅   |
| Gestión de usuarios/roles | ❌ | ✅ |

`audit_logs` solo es legible por `ADMIN`. Los movimientos solo los puede
editar/borrar un `ADMIN` (la bitácora se preserva).

## Puesta en marcha (local)

Requisitos: Node 18+, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# 1. Dependencias
pnpm install        # o npm install

# 2. Variables de entorno
cp .env.example .env.local
#   completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3a. Opción local: levantar Supabase y aplicar migraciones + seed
supabase start
supabase db reset          # aplica migrations/ y supabase/seed.sql

# 3b. Opción nube: enlazar y empujar migraciones
supabase link --project-ref <tu-ref>
supabase db push

# 4. Edge Function para alta de usuarios (admin-create-user)
supabase functions deploy admin-create-user
#   (en local: supabase functions serve admin-create-user)

# 5. Tipos TypeScript desde la BD (opcional pero recomendado)
pnpm gen:types

# 6. Arrancar la app
pnpm dev                   # http://localhost:5173
```

### Login por OTP

No hay contraseñas. El usuario escribe su correo, recibe un **código de 8
dígitos** y lo introduce para entrar (`signInWithOtp` + `verifyOtp`). Solo pueden
entrar usuarios **ya dados de alta por un administrador** (`shouldCreateUser:
false`).

> En **local**, el código llega al buzón de pruebas (Inbucket):
> http://localhost:54324. En **producción**, asegúrate de que la plantilla de
> correo "Magic Link" incluya `{{ .Token }}` para mostrar el código.

### Crear el primer administrador

Como el alta de usuarios requiere un admin existente, crea el primero a mano:

1. Crea el usuario (Dashboard → Authentication → Add user → marca *Auto Confirm*).
2. Promuévelo en SQL (Studio → SQL Editor):

```sql
update public.profiles set role = 'ADMIN' where email = 'tu@correo.com';
```

Ese admin ya puede entrar por OTP y dar de alta al resto desde **Usuarios**
(usa la Edge Function `admin-create-user`, que crea el usuario con su rol).

### Usuarios desactivados

Desactivar un usuario pone `profiles.active = false`; el frontend bloquea el
acceso (pantalla "Cuenta desactivada"). **Nota de seguridad:** esto se aplica en
el cliente. Para un bloqueo a nivel de datos, el siguiente endurecimiento es
banear también al usuario en Auth (vía service_role) al desactivarlo.

## Despliegue en Vercel

1. Importa el repo en Vercel (framework detectado: **Vite**).
2. Variables de entorno del proyecto: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. `vercel.json` ya incluye el rewrite SPA (todo a `index.html`).
4. Las migraciones se aplican al proyecto Supabase con `supabase db push` y la
   Edge Function con `supabase functions deploy admin-create-user`
   (idealmente desde CI).

## Storage

Buckets creados por migración:

- `bottle-images` — público (lectura), escritura autenticada. Imágenes de catálogo.
- `evidence-images` — privado. Evidencias de operaciones.

## Scripts

| Script            | Acción                                              |
| ----------------- | --------------------------------------------------- |
| `pnpm dev`        | Servidor de desarrollo                              |
| `pnpm build`      | Typecheck + build de producción                     |
| `pnpm preview`    | Previsualiza el build                               |
| `pnpm lint`       | ESLint                                              |
| `pnpm typecheck`  | `tsc --noEmit`                                      |
| `pnpm gen:types`  | Regenera `src/types/database.types.ts`              |
| `pnpm db:reset`   | Reaplica migraciones + seed (local)                 |
| `pnpm db:push`    | Empuja migraciones a la nube                        |

## Funciones de base de datos (RPC)

| Función                       | Uso                                                        |
| ----------------------------- | ---------------------------------------------------------- |
| `receive_bottles(type, n)`    | Recepción: genera `n` botellas con código correlativo (`bottle_code_seq`). |
| `capture_initial_inventory()` | Inventario inicial: snapshot + ajuste de botellas (atómico). |
| `log_event()`                 | Evento de auditoría manual (p. ej. `INITIAL_INVENTORY`).   |
| `is_admin()` / `current_user_role()` | Helpers de RLS.                                     |

La **auditoría básica** se cubre con triggers `audit_trigger` sobre las tablas
maestras (usuario/botella/producto/receta creados o modificados) más el evento
`INITIAL_INVENTORY`. Todo queda en `audit_logs` (legible solo por ADMIN).

## Estructura del proyecto

Ver [`CONVENTIONS.md`](./CONVENTIONS.md) para la organización de carpetas,
las capas (api → queries → página) y las convenciones de código.

## Roadmap — Fase 3 (operación diaria)

1. Movimiento Bodega → Barra.
2. Movimiento Barra → Bodega.
3. Venta de botella completa.
4. Captura manual de ventas por período.
5. Inventarios periódicos.

A partir de ahí existirá la información para construir el motor de conciliación
y diferencias. El esquema ya contempla las tablas (`inventory_movements`,
`sales_*`, `*_snapshots`) para soportarlo.
```
