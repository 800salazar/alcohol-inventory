import { supabase } from '@/lib/supabase'
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  ProductWithCategory,
} from '@/types'

export async function listProducts(): Promise<ProductWithCategory[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('name', { ascending: true })
    .returns<ProductWithCategory[]>()
  if (error) throw error
  return data
}

export async function createProduct(payload: ProductInsert): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(
  id: string,
  payload: ProductUpdate,
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}
