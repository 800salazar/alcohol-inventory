import { supabase } from '@/lib/supabase'
import type {
  BottleCategory,
  BottleType,
  BottleTypeInsert,
  BottleTypeUpdate,
  BottleTypeWithCategory,
} from '@/types'

export async function listBottleTypes(): Promise<BottleTypeWithCategory[]> {
  const { data, error } = await supabase
    .from('bottle_types')
    .select('*, bottle_category:bottle_categories(*)')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function listBottleCategories(): Promise<BottleCategory[]> {
  const { data, error } = await supabase
    .from('bottle_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createBottleType(
  payload: BottleTypeInsert,
): Promise<BottleType> {
  const { data, error } = await supabase
    .from('bottle_types')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBottleType(
  id: string,
  payload: BottleTypeUpdate,
): Promise<BottleType> {
  const { data, error } = await supabase
    .from('bottle_types')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBottleType(id: string): Promise<void> {
  const { error } = await supabase.from('bottle_types').delete().eq('id', id)
  if (error) throw error
}
