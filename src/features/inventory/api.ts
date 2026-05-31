import { supabase } from '@/lib/supabase'
import type { Json } from '@/types'

export interface InitialInventoryLine {
  bottle_id: string
  location: 'WAREHOUSE' | 'BAR'
  current_ounces: number
}

/**
 * Carga única del inventario inicial. Crea un snapshot, ajusta el estado y las
 * onzas de cada botella y registra el evento de auditoría (vía RPC atómica).
 * Devuelve el id del snapshot creado.
 */
export async function captureInitialInventory(
  notes: string,
  lines: InitialInventoryLine[],
): Promise<string> {
  const { data, error } = await supabase.rpc('capture_initial_inventory', {
    p_notes: notes,
    p_lines: lines as unknown as Json,
  })
  if (error) throw error
  return data as string
}
