import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Seguridad: evitar que la `service_role` esté disponible en el cliente.
const clientEnvKeys = Object.keys(import.meta.env)
if (clientEnvKeys.some((k) => /SERVICE_ROLE/i.test(k))) {
  throw new Error(
    'Clave de servicio detectada en variables de cliente. No expongas SUPABASE_SERVICE_ROLE_KEY en archivos .env para el frontend.',
  )
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Copia .env.example a .env.local y completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
  )
}

/**
 * Cliente Supabase tipado y único para toda la app.
 * La seguridad real la imponen las RLS Policies en la base de datos.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
