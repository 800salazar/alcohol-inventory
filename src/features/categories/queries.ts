import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from './api'
import type { CategoryInsert, CategoryUpdate } from '@/types'

export const categoryKeys = {
  all: ['categories'] as const,
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: listCategories,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CategoryInsert) => createCategory(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdate }) =>
      updateCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  })
}
