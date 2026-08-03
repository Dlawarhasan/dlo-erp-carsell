import { useEffect, useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import type { Photo } from '../lib/types'
import { getRepo } from '../lib/repo'

/** کاشی ناوەڕۆکی وێنە بۆ ئەم سێشنە — نەهێشتنی داواکاری دووبارە */
const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

export async function resolvePhoto(p?: Photo | null): Promise<string> {
  if (!p) return ''
  if (p.url) return p.url
  if (!p.path) return p.thumb || ''
  const hit = cache.get(p.path)
  if (hit) return hit
  const inflight = pending.get(p.path)
  if (inflight) return inflight
  const job = (async () => {
    const repo = await getRepo()
    const data = await repo.loadImage(p.path!).catch(() => '')
    if (data) cache.set(p.path!, data)
    pending.delete(p.path!)
    return data
  })()
  pending.set(p.path, job)
  return job
}

/** وێنەی بچووک — هەمیشە خێرا، لەگەڵ داتای ئۆتۆمبێلەکە دێت */
export const thumbOf = (p?: Photo | null) => p?.thumb || p?.url || ''

/**
 * وێنە بە شێوەی lazy.
 * full=false → وێنەی بچووک (بۆ لیست و کارتەکان)
 * full=true  → وێنەی تەواو (بۆ گەلەری) — لە Firestore/Storage دەهێنرێت
 */
export function Img({
  photo,
  full,
  fit = 'cover',
  className = '',
  alt = '',
  onClick,
}: {
  photo?: Photo | null
  full?: boolean
  fit?: 'cover' | 'contain'
  className?: string
  alt?: string
  onClick?: () => void
}) {
  const thumb = thumbOf(photo)
  const [src, setSrc] = useState(full ? photo?.url || '' : thumb)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let dead = false
    if (!full) {
      setSrc(thumb)
      return
    }
    if (photo?.url) {
      setSrc(photo.url)
      return
    }
    setSrc(thumb)
    if (!photo?.path) return
    setBusy(true)
    resolvePhoto(photo)
      .then((d) => {
        if (dead) return
        if (d) setSrc(d)
        else setFailed(!thumb)
      })
      .finally(() => !dead && setBusy(false))
    return () => {
      dead = true
    }
  }, [photo?.id, photo?.path, photo?.url, thumb, full])

  if (!src && !busy)
    return (
      <div className={`grid place-items-center text-muted/40 bg-surface2 ${className}`}>
        <ImageOff size={22} />
      </div>
    )

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={onClick}>
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${busy ? 'blur-[2px]' : ''} transition duration-300`}
        />
      )}
      {busy && (
        <span className="absolute inset-0 grid place-items-center bg-black/10">
          <Loader2 size={18} className="animate-spin text-white/90" />
        </span>
      )}
      {failed && (
        <span className="absolute inset-0 grid place-items-center bg-surface2 text-muted/50">
          <ImageOff size={22} />
        </span>
      )}
    </div>
  )
}
