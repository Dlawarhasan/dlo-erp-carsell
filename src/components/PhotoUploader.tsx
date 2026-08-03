import { useRef, useState } from 'react'
import { ImagePlus, Star, Trash2, Loader2, X } from 'lucide-react'
import type { Photo } from '../lib/types'
import { getRepo } from '../lib/repo'
import { uid } from '../lib/format'
import { Img, resolvePhoto, thumbOf } from './Img'

async function draw(bmp: ImageBitmap, max: number, quality: number, type = 'image/jpeg'): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  return new Promise((res) => canvas.toBlob((b) => res(b!), type, quality))
}

const toDataUrl = (b: Blob): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(b)
  })

/** بچووککردنەوەی وێنە — بۆ لۆگۆش بەکاردێت */
export async function compress(file: File | Blob, max = 1500, quality = 0.7): Promise<Blob> {
  const bmp = await createImageBitmap(file as File).catch(() => null)
  if (!bmp) return file
  const out = await draw(bmp, max, quality)
  bmp.close?.()
  return out
}

/**
 * دوو وەشان دروست دەکات:
 *  thumb — بچووک (data URL) کە لەگەڵ ئۆتۆمبێلەکەدا خەزن دەکرێت (لیستەکان خێرا دەکات)
 *  full  — وێنەی تەواو، بچووککراوە تاکو لە سنووری Firestore (١ مێگا) کەمتر بێت
 */
async function variants(file: File): Promise<{ full: Blob; thumb: string }> {
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) return { full: file, thumb: '' }
  const thumbBlob = await draw(bmp, 360, 0.55)
  const thumb = await toDataUrl(thumbBlob)

  let full = await draw(bmp, 1500, 0.7)
  const steps: [number, number][] = [
    [1300, 0.62],
    [1100, 0.55],
    [900, 0.5],
    [720, 0.45],
  ]
  for (const [m, q] of steps) {
    if (full.size * 1.37 < 700_000) break
    full = await draw(bmp, m, q)
  }
  bmp.close?.()
  return { full, thumb }
}

export function PhotoUploader({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const inp = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(0)
  const [err, setErr] = useState('')
  const [view, setView] = useState<Photo | null>(null)
  const [viewSrc, setViewSrc] = useState('')
  const list = photos || []

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setErr('')
    const repo = await getRepo()
    setBusy(files.length)
    const next: Photo[] = [...list]
    for (const f of Array.from(files)) {
      try {
        const { full, thumb } = await variants(f)
        const { url, path } = await repo.uploadImage(full, f.name.replace(/[^\w.]/g, '_'))
        next.push({ id: uid('p'), thumb, url, path, cover: next.length === 0 })
      } catch (e) {
        console.warn('upload failed', e)
        setErr('نەتوانرا وێنەیەک بارببرێت — دووبارە هەوڵبدە')
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

  const open = async (p: Photo) => {
    setView(p)
    setViewSrc(thumbOf(p))
    const d = await resolvePhoto(p)
    if (d) setViewSrc(d)
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {list.map((p) => (
          <div key={p.id} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-line group bg-surface2">
            <Img photo={p} className="w-full h-full cursor-zoom-in" onClick={() => open(p)} />
            {p.cover && (
              <span className="absolute top-1.5 start-1.5 chip bg-brand text-brandInk border-brand !px-1.5 !py-0.5 !text-[10px]">
                <Star size={10} /> سەرەکی
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition max-sm:opacity-100">
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
      {err ? <p className="text-xs text-bad mt-2">{err}</p> : <p className="text-xs text-muted mt-2">وێنەکان خۆکارانە بچووک دەکرێنەوە بۆ خێرایی زیاتر.</p>}

      {view && (
        <div
          className="fixed inset-0 z-[80] bg-black/92 grid place-items-center p-4 no-print"
          onClick={() => {
            setView(null)
            setViewSrc('')
          }}
        >
          <button className="absolute top-4 end-4 w-11 h-11 rounded-full bg-white/12 text-white grid place-items-center">
            <X size={22} />
          </button>
          {viewSrc ? <img src={viewSrc} alt="" className="max-h-full max-w-full object-contain rounded-xl" /> : <Loader2 className="animate-spin text-white" />}
        </div>
      )}
    </div>
  )
}
