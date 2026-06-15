import { supabase } from '@/lib/supabase'
import type {
  BottleCategory,
  BottleCategoryInsert,
  BottleCategoryUpdate,
} from '@/types'

export async function listBottleCategories(): Promise<BottleCategory[]> {
  const { data, error } = await supabase
    .from('bottle_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function createBottleCategory(
  payload: BottleCategoryInsert,
): Promise<BottleCategory> {
  const { data, error } = await supabase
    .from('bottle_categories')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBottleCategory(
  id: string,
  payload: BottleCategoryUpdate,
): Promise<BottleCategory> {
  const { data, error } = await supabase
    .from('bottle_categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBottleCategory(id: string): Promise<void> {
  const { error } = await supabase.from('bottle_categories').delete().eq('id', id)
  if (error) throw error
}
