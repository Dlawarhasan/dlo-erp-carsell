import { useEffect, useRef, useState } from 'react'
import { X, Zap, ZapOff, Keyboard, ScanLine, Camera, Loader2, RefreshCw } from 'lucide-react'
import { cleanVin, ocrVinCandidates, strictVinCandidates, VIN_RE, vinChecksumOk } from '../lib/format'
import { fx } from '../lib/feedback'
import { Portal } from './Portal'

type Mode = 'barcode' | 'ocr'
type OcrWorker = {
  setParameters: (params: Record<string, string>) => Promise<unknown>
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string; words?: Array<{ text: string }> } }>
  terminate: () => Promise<unknown>
}

export function VinScanner({ onResult, onClose }: { onResult: (vin: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [err, setErr] = useState('')
  const [torch, setTorch] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [manual, setManual] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [mode, setMode] = useState<Mode>('barcode')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('تەنها ڕیزی VIN ـی ١٧ پیت بخەرە ناو چوارچێوەکە')
  const [ocrSuggestions, setOcrSuggestions] = useState<string[]>([])
  const [manualConfirmed, setManualConfirmed] = useState(false)
  const doneRef = useRef(false)
  const ocrBusyRef = useRef(false)
  const reviewRef = useRef(false)
  const barcodeHitsRef = useRef(new Map<string, { count: number; at: number }>())

  const finish = (raw: string) => {
    const v = cleanVin(raw)
    if (!VIN_RE.test(v)) return false
    if (doneRef.current) return true
    doneRef.current = true
    fx('scan')
    stopAll()
    onResult(v)
    return true
  }

  /** بارکۆد تەنها کاتێک پەسند دەکرێت کە لە دوو فریمدا یەکسان بێت. */
  const handleBarcode = (raw: string) => {
    if (doneRef.current || ocrBusyRef.current || reviewRef.current) return
    const candidates = strictVinCandidates(raw)
    if (candidates.length !== 1) return
    const vin = candidates[0]

    // بۆ VIN ـی بازاڕی ئەمریکا check digit یاسایەکی پێویستە.
    if ('12345'.includes(vin[0]) && !vinChecksumOk(vin)) {
      reviewRef.current = true
      setManual(vin)
      setShowManual(true)
      setHint('بارکۆد خوێندرایەوە، بەڵام check digit نەگونجا — تکایە بەدەست پشتڕاستی بکە')
      return
    }

    const now = Date.now()
    const previous = barcodeHitsRef.current.get(vin)
    const count = previous && now - previous.at < 2500 ? previous.count + 1 : 1
    barcodeHitsRef.current.clear()
    barcodeHitsRef.current.set(vin, { count, at: now })
    if (count >= 2) {
      finish(vin)
    } else {
      setHint('VIN یەکجار خوێندرایەوە — بۆ دڵنیایی دووجار پشکنین دەکرێت')
    }
  }

  const stopAll = () => {
    stopRef.current?.()
    stopRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      setErr('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setErr('کامێرا لەم وێبگەڕەدا بەردەست نییە. تکایە بەدەست VIN بنووسە.')
        setShowManual(true)
        return
      }
      if (!window.isSecureContext) {
        setErr('بۆ بەکارهێنانی کامێرا پێویستە سایتەکە بە HTTPS بێت (یان localhost).')
        setShowManual(true)
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        const track = stream.getVideoTracks()[0]
        const caps = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { torch?: boolean }
        setHasTorch(!!caps.torch)
        try {
          const focusModes = (caps as MediaTrackCapabilities & { focusMode?: string[] }).focusMode
          if (focusModes?.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as unknown as MediaTrackConstraints)
          }
        } catch {
          /* هەموو کامێرایەک focusMode پشتگیری ناکات */
        }
        startBarcode()
      } catch (e: unknown) {
        const m = (e as Error)?.name === 'NotAllowedError' ? 'ڕێگەت نەداوە بە کامێرا. لە ڕێکخستنی وێبگەڕ ڕێگەی پێبدە.' : 'نەتوانرا کامێرا بکرێتەوە.'
        setErr(m)
        setShowManual(true)
      }
    }

    const startBarcode = async () => {
      // ١) API ی ناوەکی وێبگەڕ (خێراترین لەسەر ئەندرۆید)
      const BD = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector
      if (BD) {
        try {
          const supported: string[] = await BD.getSupportedFormats()
          const want = ['code_39', 'code_128', 'data_matrix', 'qr_code', 'pdf417', 'itf'].filter((f) => supported.includes(f))
          if (want.length) {
            const det = new BD({ formats: want })
            let raf = 0
            const loop = async () => {
              if (doneRef.current || cancelled) return
              const v = videoRef.current
              if (v && v.readyState >= 2) {
                try {
                  const codes = await det.detect(v)
                  for (const c of codes) handleBarcode(c.rawValue || '')
                } catch {
                  /* ignore frame errors */
                }
              }
              raf = requestAnimationFrame(loop)
            }
            raf = requestAnimationFrame(loop)
            stopRef.current = () => cancelAnimationFrame(raf)
            return
          }
        } catch {
          /* fall through to zxing */
        }
      }
      // ٢) ZXing
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library')
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_128,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.PDF_417,
          BarcodeFormat.ITF,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
        const controls = await reader.decodeFromVideoElement(videoRef.current!, (res) => {
          if (res) handleBarcode(res.getText())
        })
        stopRef.current = () => controls.stop()
      } catch (e) {
        console.warn('zxing failed', e)
        setHint('بارکۆد نەدۆزرایەوە — تاقی «خوێندنەوەی نووسین» بکەرەوە')
      }
    }

    start()
    return () => {
      cancelled = true
      stopAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] } as unknown as MediaTrackConstraints)
      setTorch(!torch)
    } catch {
      setHasTorch(false)
    }
  }

  /** خوێندنەوەی نووسینی VIN بە OCR */
  const runOcr = async () => {
    const video = videoRef.current
    if (!video || busy) return
    setBusy(true)
    ocrBusyRef.current = true
    reviewRef.current = true
    setMode('ocr')
    setHint('خوێندنەوەی نووسین... چاوەڕێ بکە')
    let worker: OcrWorker | null = null
    try {
      const vw = video.videoWidth
      const vh = video.videoHeight
      if (!vw || !vh) throw new Error('Camera frame is not ready')
      // video بە object-cover پیشان دەدرێت. بۆیە پێویستە چوارچێوەی دیارکراو
      // لەسەر شاشە بگەڕێنینەوە بۆ شوێنی ڕاستی وێنەی کامێرا. پێشتر لە وێنەی
      // پاندا نزیکەی هەموو کارتەكە دەخوێندرایەوە، نەک تەنها ڕیزی VIN.
      const rect = video.getBoundingClientRect()
      const coverScale = Math.max(rect.width / vw, rect.height / vh)
      const renderedWidth = vw * coverScale
      const renderedHeight = vh * coverScale
      const offsetX = (rect.width - renderedWidth) / 2
      const offsetY = (rect.height - renderedHeight) / 2
      const guideWidth = rect.width * 0.92
      const guideHeight = rect.height * 0.18
      const guideX = (rect.width - guideWidth) / 2
      const guideY = (rect.height - guideHeight) / 2
      const cx = Math.max(0, Math.round((guideX - offsetX) / coverScale))
      const cy = Math.max(0, Math.round((guideY - offsetY) / coverScale))
      const cw = Math.min(vw - cx, Math.round(guideWidth / coverScale))
      const ch = Math.min(vh - cy, Math.round(guideHeight / coverScale))
      // بۆ نووسینی بچووک لەسەر سەنەد، ڕەنگە وێنەی 1080p بەس نەبێت.
      // تا 3000px فراوان دەیکەین؛ ئەوە بۆ پیتە بچووکەکانی کارت زۆر گرنگە.
      const scale = Math.max(1, Math.min(5, 3000 / cw))
      const canvas = document.createElement('canvas')
      canvas.width = cw * scale
      canvas.height = ch * scale
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height)
      const contrast = document.createElement('canvas')
      contrast.width = canvas.width
      contrast.height = canvas.height
      const contrastCtx = contrast.getContext('2d')!
      contrastCtx.drawImage(canvas, 0, 0)
      const img = contrastCtx.getImageData(0, 0, contrast.width, contrast.height)
      const d = img.data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
      const mean = sum / (d.length / 4)
      for (let i = 0; i < d.length; i += 4) {
        const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
        // بۆ کارتە سەوزەکان، ڕەنگی پاشبنەما و هێڵی ئاسایی لادەبەین و پیتی ڕەش دەهێڵینەوە.
        const val = Math.max(0, Math.min(255, (g - mean) * 2.5 + 185))
        d[i] = d[i + 1] = d[i + 2] = val
      }
      contrastCtx.putImageData(img, 0, 0)

      const threshold = document.createElement('canvas')
      threshold.width = canvas.width
      threshold.height = canvas.height
      const thresholdCtx = threshold.getContext('2d')!
      thresholdCtx.drawImage(contrast, 0, 0)
      const thresholdImage = thresholdCtx.getImageData(0, 0, threshold.width, threshold.height)
      const td = thresholdImage.data
      for (let i = 0; i < td.length; i += 4) {
        const val = td[i] > 125 ? 255 : 0
        td[i] = td[i + 1] = td[i + 2] = val
      }
      thresholdCtx.putImageData(thresholdImage, 0, 0)

      const Tesseract = (await import('tesseract.js')).default
      worker = await Tesseract.createWorker('eng') as OcrWorker
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789',
        // sparse text: ڕیزی VIN لەگەڵ ناوی کوردی/عەرەبیی سەر کارت دەبینێت،
        // بەڵام تەنها پیت و ژمارەی VIN وەردەگرین.
        tessedit_pageseg_mode: '12',
        user_defined_dpi: '300',
      })
      const first = await worker.recognize(canvas)
      setHint('پشکنینی وردی ژمارەی شاسی...')
      const second = await worker.recognize(contrast)
      const third = await worker.recognize(threshold)
      const readText = (result: { data: { text: string; words?: Array<{ text: string }> } }) => [
        result.data.text || '',
        ...(result.data.words || []).map((word) => word.text),
      ].join('\n')
      const suggestions = [...new Set([
        ...ocrVinCandidates(readText(first)),
        ...ocrVinCandidates(readText(second)),
        ...ocrVinCandidates(readText(third)),
      ])]

      if (suggestions.length) {
        setOcrSuggestions(suggestions)
        // هیچ پێشنیارێک خۆکارانە مەخە ناو خانەکە. کاربەر دەبێت بە چاو
        // بە VIN ـی سەر سەنەد/داشبۆرد/دەرگا بەراوردی بکات و خۆی هەڵیبژێرێت.
        setManual('')
        setManualConfirmed(false)
        setShowManual(true)
        setHint('پێشنیاری OCR دۆزرایەوە — پێش بەردەوامبوون پیتەکان بە VIN ـەکە بەراورد بکە')
        return
      }
      setOcrSuggestions([])
      setHint('نووسینەکە بە ڕوونی نەخوێندرایەوە — دووبارە هەوڵبدە یان بەدەست بینووسە')
      setShowManual(true)
    } catch (e) {
      console.warn(e)
      setHint('نەتوانرا نووسین بخوێنرێتەوە. تکایە بەدەست بینووسە.')
      setShowManual(true)
    } finally {
      await worker?.terminate().catch(() => {})
      setBusy(false)
      ocrBusyRef.current = false
      setMode('barcode')
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] bg-black no-print flex flex-col">
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/35" />

      {/* چوارچێوەی سکان */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="relative w-[92%] h-[18%] max-w-2xl">
            <div className="absolute inset-0 rounded-2xl ring-[3px] ring-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]" />
            <div className="absolute inset-x-3 h-0.5 bg-[#E8A838] animate-scanline shadow-[0_0_14px_2px_rgba(232,168,56,.8)]" />
            <span className="absolute -top-8 start-0 text-white/90 text-[13px] font-medium">{hint}</span>
            <span className="absolute -bottom-8 inset-x-0 text-center text-white/75 text-[12px]">سەنەد • داشبۆرد • دەرگا — تەنها ژمارەی شاسی بخەرە ناو چوارچێوەکە</span>
        </div>
      </div>

      {/* سەرەوە */}
      <div className="relative flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={() => { stopAll(); onClose() }} className="w-11 h-11 rounded-full bg-black/45 backdrop-blur text-white grid place-items-center">
          <X size={22} />
        </button>
        <span className="text-white font-bold text-[15px] flex items-center gap-2">
          <ScanLine size={18} /> سکانی VIN
        </span>
        {hasTorch ? (
          <button onClick={toggleTorch} className="w-11 h-11 rounded-full bg-black/45 backdrop-blur text-white grid place-items-center">
            {torch ? <ZapOff size={20} /> : <Zap size={20} />}
          </button>
        ) : (
          <span className="w-11" />
        )}
      </div>

      <div className="grow" />

      {/* خوارەوە */}
      <div className="relative p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
        {err && <p className="text-center text-white bg-bad/85 rounded-xl px-4 py-2.5 text-sm">{err}</p>}

        {showManual && (
          <div className="bg-surface border border-line rounded-2xl p-3.5 space-y-3 animate-in">
            <label className="label !mb-1">VIN بەدەست بنووسە (١٧ پیت)</label>
            {ocrSuggestions.length > 0 && (
              <div className="rounded-xl border border-warn/35 bg-warn/10 px-3 py-2.5 text-[12px] leading-5 text-ink">
                <p className="font-bold">ئەمانە تەنها پێشنیاری OCR ـن؛ پێش بەردەوامبوون، پیت بە پیت بە VIN ـەکە بەراوردیان بکە.</p>
                <div className="mt-2 flex flex-wrap gap-1.5" dir="ltr">
                  {ocrSuggestions.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => {
                        setManual(candidate)
                        setManualConfirmed(true)
                      }}
                      className={`rounded-lg border px-2 py-1 font-mono text-[11px] tracking-wider ${manual === candidate ? 'border-brand bg-brand/10 text-brand' : 'border-line bg-surface text-ink'}`}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <input
              dir="ltr"
              autoFocus
              value={manual}
              onChange={(e) => {
                setManual(cleanVin(e.target.value).slice(0, 17))
                setOcrSuggestions([])
                setManualConfirmed(true)
              }}
              placeholder="1HGCM82633A004352"
              className="field num tracking-[0.14em] text-center !text-lg"
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs num ${VIN_RE.test(manual) ? 'text-ok' : 'text-muted'}`}>{manual.length}/17</span>
              <button disabled={!VIN_RE.test(manual) || !manualConfirmed} onClick={() => finish(manual)} className="btn-brand !py-2">
                پشتڕاستکردنەوە
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={runOcr} disabled={busy} className="btn flex-1 bg-white/12 text-white backdrop-blur border border-white/25">
            {busy && mode === 'ocr' ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
            خوێندنەوەی ژمارەی شاسی
          </button>
          <button onClick={() => {
            reviewRef.current = true
            setManualConfirmed(false)
            setShowManual((s) => !s)
          }} className="btn flex-1 bg-white/12 text-white backdrop-blur border border-white/25">
            <Keyboard size={17} /> بەدەست بنووسە
          </button>
        </div>
        <button
          onClick={() => {
            doneRef.current = false
            reviewRef.current = false
            barcodeHitsRef.current.clear()
            setOcrSuggestions([])
            setManual('')
            setManualConfirmed(false)
            setHint('تەنها ڕیزی VIN ـی ١٧ پیت بخەرە ناو چوارچێوەکە')
            setShowManual(false)
          }}
          className="btn w-full text-white/70 text-sm"
        >
          <RefreshCw size={15} /> دووبارە سکان بکە
        </button>
      </div>
    </div>
    </Portal>
  )
}
