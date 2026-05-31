import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUser,
  listProfiles,
  updateProfile,
  type CreateUserInput,
  type UpdateProfileInput,
} from './api'

export const profileKeys = {
  all: ['profiles'] as const,
}

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: listProfiles,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.all }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProfileInput }) =>
      updateProfile(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.all }),
  })
}
