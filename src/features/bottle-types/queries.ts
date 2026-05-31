import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBottleType,
  deleteBottleType,
  listBottleTypes,
  updateBottleType,
} from './api'
import type { BottleTypeInsert, BottleTypeUpdate } from '@/types'

export const bottleTypeKeys = {
  all: ['bottle_types'] as const,
}

export function useBottleTypes() {
  return useQuery({
    queryKey: bottleTypeKeys.all,
    queryFn: listBottleTypes,
  })
}

export function useCreateBottleType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BottleTypeInsert) => createBottleType(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleTypeKeys.all }),
  })
}

export function useUpdateBottleType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BottleTypeUpdate }) =>
      updateBottleType(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleTypeKeys.all }),
  })
}

export function useDeleteBottleType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBottleType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleTypeKeys.all }),
  })
}
