import { supabase } from '@/lib/supabase'
import type {
  Bottle,
  BottleInsert,
  BottleUpdate,
  BottleWithType,
} from '@/types'

export async function listBottles(): Promise<BottleWithType[]> {
  const { data, error } = await supabase
    .from('bottles')
    .select('*, bottle_type:bottle_types(*)')
    .order('created_at', { ascending: false })
    .returns<BottleWithType[]>()
  if (error) throw error
  return data
}

export async function createBottle(payload: BottleInsert): Promise<Bottle> {
  const { data, error } = await supabase
    .from('bottles')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBottle(
  id: string,
  payload: BottleUpdate,
): Promise<Bottle> {
  const { data, error } = await supabase
    .from('bottles')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBottle(id: string): Promise<void> {
  const { error } = await supabase.from('bottles').delete().eq('id', id)
  if (error) throw error
}

/**
 * Recepción automática: genera `count` botellas con código correlativo
 * (10001, 10002, …) vía RPC. Devuelve las botellas creadas (full, en bodega).
 */
export async function receiveBottles(
  bottleTypeId: string,
  count: number,
): Promise<Bottle[]> {
  const { data, error } = await supabase.rpc('receive_bottles', {
    p_bottle_type_id: bottleTypeId,
    p_count: count,
  })
  if (error) throw error
  return data ?? []
}

/** Recepción con códigos capturados manualmente (bulk insert). */
export async function receiveBottlesManual(
  bottleTypeId: string,
  codes: string[],
  fullOunces: number,
): Promise<Bottle[]> {
  const rows: BottleInsert[] = codes.map((code) => ({
    unique_code: code,
    bottle_type_id: bottleTypeId,
    status: 'IN_WAREHOUSE',
    current_ounces: fullOunces,
  }))
  const { data, error } = await supabase.from('bottles').insert(rows).select()
  if (error) throw error
  return data
}
