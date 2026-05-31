import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addRecipeDetail,
  createRecipe,
  deleteRecipe,
  deleteRecipeDetail,
  listRecipes,
  setRecipeActive,
} from './api'
import type { RecipeDetailInsert } from '@/types'

export const recipeKeys = {
  all: ['recipes'] as const,
}

export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.all,
    queryFn: listRecipes,
  })
}

export function useCreateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => createRecipe(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.all }),
  })
}

export function useSetRecipeActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setRecipeActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.all }),
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.all }),
  })
}

export function useAddRecipeDetail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RecipeDetailInsert) => addRecipeDetail(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.all }),
  })
}

export function useDeleteRecipeDetail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRecipeDetail(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: recipeKeys.all }),
  })
}
