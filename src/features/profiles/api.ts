import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export interface CreateUserInput {
  email: string
  full_name: string
  role: UserRole
}

/** Crea un usuario vía Edge Function (requiere service_role; solo ADMIN). */
export async function createUser(input: CreateUserInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: input,
  })
  if (error) throw error
  if (!data?.ok) {
    throw new Error(data?.error ?? 'No se pudo crear el usuario')
  }
}

export interface UpdateProfileInput {
  full_name?: string | null
  role?: UserRole
  active?: boolean
}

/** Actualiza nombre, rol y/o estado de un profile (RLS: solo ADMIN o el propio). */
export async function updateProfile(
  id: string,
  payload: UpdateProfileInput,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
