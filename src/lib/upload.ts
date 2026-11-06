import { randomUUID } from 'node:crypto'
import { adminClient } from '@/lib/supabase/admin'

const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024

/** Saves an image to the public bucket (served through the CDN) and returns its address. Call only after checking permission. */
export async function uploadImage(file: File, folder: string): Promise<{ url: string } | { error: string }> {
  const ext = TYPES[file.type]
  if (!ext) return { error: 'Use a PNG, JPG or WebP image.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'The image is larger than 3 MB. Choose a smaller one.' }
  const path = `${folder}/${randomUUID()}.${ext}`
  const admin = adminClient()
  const { error } = await admin.storage.from('images').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: '31536000' })
  if (error) return { error: error.message }
  return { url: admin.storage.from('images').getPublicUrl(path).data.publicUrl }
}

export const isUpload = (v: FormDataEntryValue | null): v is File => typeof v === 'object' && v !== null && 'size' in v && v.size > 0
