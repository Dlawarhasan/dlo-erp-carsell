import { useRef, useState } from 'react'
import { ImagePlus, Star, Trash2, Loader2, X } from 'lucide-react'
import type { Photo } from '../lib/types'
import { getRepo } from '../lib/repo'
import { uid } from '../lib/format'

/** بچووککردنەوەی وێنە پێش بارکردن — بۆ خێرایی و کەمکردنی خەرجی */
export async function compress(file: File, max = 1600, quality = 0.72): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return file
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  return new Promise((res) => canvas.toBlob((b) => res(b || file), 'image/jpeg', quality))
}

export function PhotoUploader({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const inp = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(0)
  const [view, setView] = useState<string | null>(null)
  const list = photos || []

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const repo = await getRepo()
    setBusy(files.length)
    const next: Photo[] = [...list]
    for (const f of Array.from(files)) {
      try {
        const blob = await compress(f)
        const { url, path } = await repo.uploadImage(blob, f.name.replace(/[^\w.]/g, '_'))
        next.push({ id: uid('p'), url, path, cover: next.length === 0 })
      } catch (e) {
        console.warn('upload failed', e)
      } finally {
        setBusy((b) => b - 1)
      }
    }
    onChange(next)
    if (inp.current) inp.current.value = ''
  }

  const del = async (p: Photo) => {
    const repo = await getRepo()
    await repo.deleteImage(p.path)
    const next = list.filter((x) => x.id !== p.id)
    if (p.cover && next.length) next[0].cover = true
    onChange(next)
  }

  const cover = (p: Photo) => onChange(list.map((x) => ({ ...x, cover: x.id === p.id })))

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {list.map((p) => (
          <div key={p.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line group bg-surface2">
            <img src={p.url} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setView(p.url)} loading="lazy" />
            {p.cover && (
              <span className="absolute top-1.5 start-1.5 chip bg-brand text-brandInk border-brand !px-1.5 !py-0.5 !text-[10px]">
                <Star size={10} /> سەرەکی
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition sm:opacity-0 max-sm:opacity-100">
              {!p.cover && (
                <button type="button" onClick={() => cover(p)} className="flex-1 bg-black/65 text-white py-1.5 text-[11px] backdrop-blur">
                  سەرەکی
                </button>
              )}
              <button type="button" onClick={() => del(p)} className="flex-1 bg-bad/80 text-white py-1.5 grid place-items-center backdrop-blur">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {busy > 0 &&
          Array.from({ length: busy }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl border border-line bg-surface2 grid place-items-center">
              <Loader2 className="animate-spin text-muted" size={20} />
            </div>
          ))}
        <button
          type="button"
          onClick={() => inp.current?.click()}
          className="aspect-[4/3] rounded-xl border-2 border-dashed border-line hover:border-brand/60 text-muted hover:text-brand grid place-items-center gap-1 transition"
        >
          <ImagePlus size={22} />
          <span className="text-[11px]">وێنە زیادبکە</span>
        </button>
      </div>
      <input ref={inp} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      <p className="text-xs text-muted mt-2">وێنەکان خۆکارانە بچووک دەکرێنەوە بۆ خێرایی زیاتر.</p>

      {view && (
        <div className="fixed inset-0 z-[80] bg-black/92 grid place-items-center p-4 no-print" onClick={() => setView(null)}>
          <button className="absolute top-4 end-4 w-11 h-11 rounded-full bg-white/12 text-white grid place-items-center">
            <X size={22} />
          </button>
          <img src={view} alt="" className="max-h-full max-w-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  )
}
