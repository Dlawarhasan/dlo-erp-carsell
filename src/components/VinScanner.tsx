import { useEffect, useRef, useState } from 'react'
import { X, Zap, ZapOff, Keyboard, ScanLine, Camera, Loader2, RefreshCw } from 'lucide-react'
import { cleanVin, VIN_RE } from '../lib/format'
import { fx } from '../lib/feedback'
import { Portal } from './Portal'

type Mode = 'barcode' | 'ocr'

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
  const [hint, setHint] = useState('بارکۆدی VIN بخەرە ناو چوارچێوەکە')
  const doneRef = useRef(false)

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
                  for (const c of codes) if (finish(c.rawValue || '')) return
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
          if (res) finish(res.getText())
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
    setMode('ocr')
    setHint('خوێندنەوەی نووسین... چاوەڕێ بکە')
    try {
      const vw = video.videoWidth
      const vh = video.videoHeight
      const cw = Math.round(vw * 0.86)
      const ch = Math.round(vh * 0.22)
      const cx = Math.round((vw - cw) / 2)
      const cy = Math.round((vh - ch) / 2)
      const scale = 2.5
      const canvas = document.createElement('canvas')
      canvas.width = cw * scale
      canvas.height = ch * scale
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height)
      // ڕەش‌وسپی کردن بۆ ئەنجامی باشتر
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = img.data
      let sum = 0
      for (let i = 0; i < d.length; i += 4) sum += (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)
      const mean = sum / (d.length / 4)
      for (let i = 0; i < d.length; i += 4) {
        const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
        const val = g > mean * 0.92 ? 255 : 0
        d[i] = d[i + 1] = d[i + 2] = val
      }
      ctx.putImageData(img, 0, 0)

      const Tesseract = (await import('tesseract.js')).default
      const worker = await Tesseract.createWorker('eng')
      await worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789' })
      const { data } = await worker.recognize(canvas)
      await worker.terminate()
      const text = (data.text || '').toUpperCase().replace(/\s+/g, ' ')
      const compact = text.replace(/[^A-Z0-9]/g, '')
      let found = ''
      const m = compact.match(/[A-HJ-NPR-Z0-9]{17}/)
      if (m) found = m[0]
      if (!found && compact.length >= 17) found = compact.slice(0, 17)
      if (found && finish(found)) return
      setHint('نووسینەکە بە ڕوونی نەخوێندرایەوە — دووبارە هەوڵبدە یان بەدەست بینووسە')
      setManual(cleanVin(found).slice(0, 17))
      setShowManual(true)
    } catch (e) {
      console.warn(e)
      setHint('نەتوانرا نووسین بخوێنرێتەوە. تکایە بەدەست بینووسە.')
      setShowManual(true)
    } finally {
      setBusy(false)
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
        <div className="relative w-[86%] h-[22%] max-w-2xl">
          <div className="absolute inset-0 rounded-2xl ring-[3px] ring-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]" />
          <div className="absolute inset-x-3 h-0.5 bg-[#E8A838] animate-scanline shadow-[0_0_14px_2px_rgba(232,168,56,.8)]" />
          <span className="absolute -top-8 start-0 text-white/90 text-[13px] font-medium">{hint}</span>
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
            <input
              dir="ltr"
              autoFocus
              value={manual}
              onChange={(e) => setManual(cleanVin(e.target.value).slice(0, 17))}
              placeholder="1HGCM82633A004352"
              className="field num tracking-[0.14em] text-center !text-lg"
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs num ${manual.length === 17 ? 'text-ok' : 'text-muted'}`}>{manual.length}/17</span>
              <button disabled={manual.length !== 17} onClick={() => finish(manual)} className="btn-brand !py-2">
                بەردەوامبە
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={runOcr} disabled={busy} className="btn flex-1 bg-white/12 text-white backdrop-blur border border-white/25">
            {busy && mode === 'ocr' ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
            خوێندنەوەی نووسین
          </button>
          <button onClick={() => setShowManual((s) => !s)} className="btn flex-1 bg-white/12 text-white backdrop-blur border border-white/25">
            <Keyboard size={17} /> بەدەست بنووسە
          </button>
        </div>
        <button
          onClick={() => {
            doneRef.current = false
            setHint('بارکۆدی VIN بخەرە ناو چوارچێوەکە')
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
