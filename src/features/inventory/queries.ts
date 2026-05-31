import { useMutation, useQueryClient } from '@tanstack/react-query'
import { captureInitialInventory, type InitialInventoryLine } from './api'
import { bottleKeys } from '@/features/bottles/queries'

export function useCaptureInitialInventory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      notes,
      lines,
    }: {
      notes: string
      lines: InitialInventoryLine[]
    }) => captureInitialInventory(notes, lines),
    onSuccess: () => qc.invalidateQueries({ queryKey: bottleKeys.all }),
  })
}
