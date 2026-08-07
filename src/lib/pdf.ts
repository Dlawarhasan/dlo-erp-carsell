/**
 * دروستکردنی PDF لەناو خودی ئەپەکەدا — بەبێ پەنجەرەی پرینت.
 *
 * بۆچی؟ لەسەر ئایفۆن، `window.print()` لە ئەپی دانراودا (PWA) هیچ ناکات،
 * و لە Safari ـیشدا زۆر خاوە. بۆیە:
 *   ١) ناوەڕۆکەکە لەسەر Canvas دەکێشین — Canvas خۆی پیتی کوردی/عەرەبی
 *      بە دروستی پێکەوە دەلکێنێت، بۆیە پێویستمان بە فۆنتی تێخراو نییە.
 *   ٢) وێنەکە دەکەینە JPEG و بە دەست فایلێکی PDF ی سادە دروست دەکەین.
 *
 * ئەنجام: یەک دەستلێدان → فایلێکی PDF داگیراو. خێرا، ئۆفلاین، لە هەموو شوێنێک.
 */

/* A4 بە پۆینت */
export const A4 = { w: 595.28, h: 841.89 }

const enc = (s: string) => {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

/** چەند وێنەی JPEG → فایلێکی PDF (هەر وێنەیەک یەک لاپەڕە) */
export function jpegPagesToPdf(pages: { jpeg: Uint8Array; w: number; h: number }[]): Blob {
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let len = 0

  const push = (u: Uint8Array) => {
    chunks.push(u)
    len += u.length
  }
  const obj = (n: number, body: string) => {
    offsets[n] = len
    push(enc(`${n} 0 obj\n${body}\nendobj\n`))
  }

  push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'))

  const n = pages.length
  /* ژمارەی ئۆبجێکتەکان: ١ کاتالۆگ · ٢ لاپەڕەکان · دواتر بۆ هەر لاپەڕەیەک ٣ ئۆبجێکت */
  const pageId = (i: number) => 3 + i * 3
  const imgId = (i: number) => 4 + i * 3
  const contId = (i: number) => 5 + i * 3

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] /Count ${n} >>`)

  pages.forEach((p, i) => {
    obj(
      pageId(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w.toFixed(2)} ${A4.h.toFixed(2)}] ` +
        `/Resources << /XObject << /I0 ${imgId(i)} 0 R >> >> /Contents ${contId(i)} 0 R >>`,
    )

    /* وێنەکە */
    offsets[imgId(i)] = len
    push(
      enc(
        `${imgId(i)} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      ),
    )
    push(p.jpeg)
    push(enc('\nendstream\nendobj\n'))

    /* ناوەڕۆکی لاپەڕە — وێنەکە بە تەواوی لاپەڕەکە دادەنێین */
    const content = `q ${A4.w.toFixed(2)} 0 0 ${A4.h.toFixed(2)} 0 0 cm /I0 Do Q`
    obj(contId(i), `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  const xref = len
  const total = 3 + n * 3
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`
  for (let i = 1; i < total; i++) x += `${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`
  x += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  push(enc(x))

  const out = new Uint8Array(len)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return new Blob([out], { type: 'application/pdf' })
}

/** Canvas → بایتەکانی JPEG */
export function canvasToJpeg(cv: HTMLCanvasElement, quality = 0.86): Promise<Uint8Array> {
  return new Promise((res, rej) => {
    cv.toBlob(
      (b) => {
        if (!b) return rej(new Error('canvas'))
        b.arrayBuffer().then((a) => res(new Uint8Array(a)), rej)
      },
      'image/jpeg',
      quality,
    )
  })
}

/** داگرتنی فایل — لە ئایفۆنیش کاردەکات */
export function savePdf(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name.endsWith('.pdf') ? name : `${name}.pdf`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 4000)
}
