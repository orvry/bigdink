import type { User } from '@supabase/supabase-js'
import { adminClient } from '@/lib/supabase/admin'

const FACEBOOK_HOSTS = ['fbcdn.net', 'facebook.com', 'fbsbx.com']

/**
 * After a Facebook sign-in: save the display name, and copy the profile photo into our own storage (the CDN),
 * because Facebook photo addresses expire. Never blocks signing in.
 */
export async function syncProfileFromProvider(user: User) {
  try {
    const meta = user.user_metadata as Record<string, unknown>
    const name = String(meta.full_name ?? meta.name ?? '') || null
    const picture = String(meta.avatar_url ?? meta.picture ?? '')
    const admin = adminClient()
    const { data: p } = await admin.from('profiles').select('display_name,avatar_url').eq('id', user.id).maybeSingle()
    const patch: Record<string, string> = {}
    if (name && !p?.display_name) patch.display_name = name

    if (!p?.avatar_url && picture) {
      const url = new URL(picture)
      if (url.protocol === 'https:' && FACEBOOK_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) {
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        const type = res.headers.get('content-type') ?? ''
        if (res.ok && type.startsWith('image/')) {
          const bytes = Buffer.from(await res.arrayBuffer())
          if (bytes.length <= 2 * 1024 * 1024) {
            const path = `avatars/${user.id}.jpg`
            const { error } = await admin.storage.from('images').upload(path, bytes, { contentType: type, upsert: true, cacheControl: '86400' })
            if (!error) patch.avatar_url = `${admin.storage.from('images').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
          }
        }
      }
    }
    if (Object.keys(patch).length) await admin.from('profiles').update(patch).eq('id', user.id)
  } catch { /* the photo is a nice extra: signing in must still work */ }
}
