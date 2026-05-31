import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from './api'
import type { ProductInsert, ProductUpdate } from '@/types'

export const productKeys = {
  all: ['products'] as const,
}

export function useProducts() {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: listProducts,
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductInsert) => createProduct(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductUpdate }) =>
      updateProduct(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  })
}
