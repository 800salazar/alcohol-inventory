import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBottle,
  deleteBottle,
  listBottles,
  receiveBottles,
  receiveBottlesManual,
  updateBottle,
} from './api'
import type { BottleInsert, BottleUpdate } from '@/types'

export const bottleKeys = {
  all: ['bottles'] as const,
}

export function useBottles() {
  return useQuery({
    queryKey: bottleKeys.all,
    queryFn: listBottles,
  })
}

export function useCreateBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BottleInsert) => createBottle(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleKeys.all }),
  })
}

export function useUpdateBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BottleUpdate }) =>
      updateBottle(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleKeys.all }),
  })
}

export function useDeleteBottle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBottle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleKeys.all }),
  })
}

export function useReceiveBottles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bottleTypeId,
      count,
    }: {
      bottleTypeId: string
      count: number
    }) => receiveBottles(bottleTypeId, count),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleKeys.all }),
  })
}

export function useReceiveBottlesManual() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bottleTypeId,
      codes,
      fullOunces,
    }: {
      bottleTypeId: string
      codes: string[]
      fullOunces: number
    }) => receiveBottlesManual(bottleTypeId, codes, fullOunces),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleKeys.all }),
  })
}
