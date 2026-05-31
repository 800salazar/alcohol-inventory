import { supabase } from './supabase'
import { STORAGE_BUCKETS } from './constants'

/** Sube una imagen al bucket `bottle-images` y devuelve su URL pública. */
export async function uploadBottleImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.bottleImages)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error

  const { data } = supabase.storage
    .from(STORAGE_BUCKETS.bottleImages)
    .getPublicUrl(path)
  return data.publicUrl
}
