import { supabase } from '@/lib/supabase'
import type {
  Recipe,
  RecipeDetail,
  RecipeDetailInsert,
  RecipeWithDetails,
} from '@/types'

/** Recetas con su producto y el detalle de ingredientes (tipo de botella + onzas). */
export async function listRecipes(): Promise<RecipeWithDetails[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(
      '*, product:products(*), recipe_details(*, bottle_type:bottle_types(*))',
    )
    .order('created_at', { ascending: false })
    .returns<RecipeWithDetails[]>()
  if (error) throw error
  return data
}

export async function createRecipe(productId: string): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .insert({ product_id: productId, active: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setRecipeActive(
  id: string,
  active: boolean,
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update({ active })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

// --- recipe_details ----------------------------------------------------------
export async function addRecipeDetail(
  payload: RecipeDetailInsert,
): Promise<RecipeDetail> {
  const { data, error } = await supabase
    .from('recipe_details')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecipeDetail(id: string): Promise<void> {
  const { error } = await supabase.from('recipe_details').delete().eq('id', id)
  if (error) throw error
}
