import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBottleCategory,
  deleteBottleCategory,
  listBottleCategories,
  updateBottleCategory,
} from './api'
import type { BottleCategoryInsert, BottleCategoryUpdate } from '@/types'

export const bottleCategoryKeys = {
  all: ['bottle_categories_admin'] as const,
}

export function useBottleCategoriesAdmin() {
  return useQuery({
    queryKey: bottleCategoryKeys.all,
    queryFn: listBottleCategories,
  })
}

export function useCreateBottleCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BottleCategoryInsert) => createBottleCategory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleCategoryKeys.all }),
  })
}

export function useUpdateBottleCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BottleCategoryUpdate }) =>
      updateBottleCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleCategoryKeys.all }),
  })
}

export function useDeleteBottleCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBottleCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleCategoryKeys.all }),
  })
}
