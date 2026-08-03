/**
 * لەرزین و دەنگی سیستەم — بۆ ئەوەی وەک ئەپێکی ڕاستەقینە هەست پێبکرێت
 *
 * • لەرزین: Vibration API لەسەر ئەندرۆید.
 *   iOS پشتگیری Vibration API ناکات، بۆیە فێڵی <input type="checkbox" switch>
 *   بەکاردەهێنین — Safari 17.4+ بۆ ئەو جۆرە سویچە لەرزینێکی نەرم دەنێرێت.
 *
 * • دەنگ: هیچ فایلێکی دەنگ زیاد ناکات — هەموو دەنگەکان لە ناو براوسەردا
 *   بە Web Audio دروست دەکرێن (چەند بایتێک کۆد، نەک چەند سەد کیلۆبایت).
 *
 * ڕێکخستنەکان لە localStorage خەزن دەکرێن (بۆ هەر ئامێرێک بە جیا).
 */

export type Fx =
  | 'tap' // دەستلێدانی ئاسایی
  | 'select' // هەڵبژاردن لە لیست
  | 'toggle' // سویچ
  | 'open' // کردنەوەی پەنجەرە
  | 'close' // داخستن
  | 'ok' // سەرکەوتوو
  | 'bad' // هەڵە
  | 'info' // زانیاری
  | 'warn' // ئاگاداری
  | 'scan' // سکانی VIN
  | 'money' // پارە/عەقد

export interface FxPrefs {
  haptics: boolean
  sound: boolean
}

const KEY = 'gm.fx'

function load(): FxPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { haptics: true, sound: true, ...JSON.parse(raw) }
  } catch {
    /* localStorage بەردەست نییە */
  }
  return { haptics: true, sound: true }
}

let prefs: FxPrefs = load()
const listeners = new Set<(p: FxPrefs) => void>()

export function getFx(): FxPrefs {
  return prefs
}

export function setFx(patch: Partial<FxPrefs>) {
  prefs = { ...prefs, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* هیچ */
  }
  listeners.forEach((l) => l(prefs))
}

export function onFxChange(cb: (p: FxPrefs) => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/* ══════════════════════ لەرزین ══════════════════════ */

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

let swEl: HTMLInputElement | null = null

/** سویچێکی شاراوە کە iOS بۆی لەرزین دەنێرێت */
function iosSwitch(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null
  if (swEl?.isConnected) return swEl
  const el = document.createElement('input')
  el.type = 'checkbox'
  el.setAttribute('switch', '') // Safari 17.4+
  el.setAttribute('aria-hidden', 'true')
  el.tabIndex = -1
  // نابێت display:none بێت — دەبێت ڕەندەر بکرێت تا لەرزینەکە بنێردرێت
  el.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;appearance:none;-webkit-appearance:none'
  document.body.appendChild(el)
  swEl = el
  return el
}

/** یەک لەرزینی کورت لەسەر iOS */
function iosTap() {
  const el = iosSwitch()
  if (!el) return
  try {
    el.click()
  } catch {
    /* هیچ */
  }
}

const PATTERN: Record<Fx, number[]> = {
  tap: [8],
  select: [11],
  toggle: [14],
  open: [10],
  close: [8],
  ok: [12, 45, 24],
  bad: [26, 45, 26, 45, 26],
  info: [12],
  warn: [18, 55, 18],
  scan: [16, 40, 30],
  money: [14, 40, 14, 40, 26],
}

export function haptic(kind: Fx = 'tap') {
  if (!prefs.haptics) return
  const pat = PATTERN[kind] || PATTERN.tap
  if (canVibrate) {
    try {
      navigator.vibrate(pat.length === 1 ? pat[0] : pat)
      return
    } catch {
      /* دەکەوێتە خوارەوە بۆ iOS */
    }
  }
  // iOS: تەنها یەک شێوە لەرزین هەیە — دووبارەی دەکەینەوە بۆ نەخشەکان
  const hits = Math.min(Math.ceil(pat.length / 2), 3)
  for (let i = 0; i < hits; i++) setTimeout(iosTap, i * 90)
}

/* ══════════════════════ دەنگ ══════════════════════ */

type Ctor = typeof AudioContext
let ac: AudioContext | null = null
let bus: GainNode | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ac) return ac
  const C: Ctor | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext
  if (!C) return null
  try {
    ac = new C()
    bus = ac.createGain()
    bus.gain.value = 0.5 // نەرم — وەک دەنگی ڕووکاری iOS
    bus.connect(ac.destination)
  } catch {
    return null
  }
  return ac
}

/** دەبێت لە ناو دەستلێدانی بەکارهێنەردا بانگ بکرێت — iOS بەبێ ئەوە دەنگ لێ نادات */
export function unlockAudio() {
  const c = ctx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

interface Note {
  f: number // هێرتز
  d: number // چرکە
  at?: number // دواخستن
  g?: number // بەرزی
  to?: number // سلاید بۆ ئەم هێرتزە
  w?: OscillatorType
}

function play(notes: Note[]) {
  const c = ctx()
  if (!c || !bus) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime
  for (const n of notes) {
    const at = t0 + (n.at || 0)
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = n.w || 'sine'
    osc.frequency.setValueAtTime(n.f, at)
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, at + n.d)

    // ئێنڤێلۆپی نەرم — بەبێ ئەمە «پۆپ» دەکات
    const peak = n.g ?? 0.05
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.008, n.d * 0.3))
    g.gain.exponentialRampToValueAtTime(0.0001, at + n.d)

    osc.connect(g)
    g.connect(bus)
    osc.start(at)
    osc.stop(at + n.d + 0.02)
  }
}

const SOUND: Record<Fx, Note[]> = {
  tap: [{ f: 1750, d: 0.028, g: 0.03 }],
  select: [{ f: 2300, d: 0.024, g: 0.026 }],
  toggle: [{ f: 1250, d: 0.05, g: 0.035, to: 1750 }],
  open: [{ f: 760, d: 0.075, g: 0.032, to: 1180, w: 'triangle' }],
  close: [{ f: 1180, d: 0.07, g: 0.028, to: 720, w: 'triangle' }],
  ok: [
    { f: 987.77, d: 0.075, g: 0.04, w: 'triangle' }, // B5
    { f: 1318.51, d: 0.11, g: 0.038, at: 0.07, w: 'triangle' }, // E6
  ],
  bad: [
    { f: 415.3, d: 0.1, g: 0.042, w: 'triangle' },
    { f: 311.13, d: 0.16, g: 0.04, at: 0.095, w: 'triangle' },
  ],
  info: [{ f: 1046.5, d: 0.07, g: 0.032, w: 'triangle' }],
  warn: [
    { f: 740, d: 0.06, g: 0.036, w: 'triangle' },
    { f: 740, d: 0.09, g: 0.034, at: 0.11, w: 'triangle' },
  ],
  scan: [
    { f: 2100, d: 0.045, g: 0.036 },
    { f: 2800, d: 0.07, g: 0.032, at: 0.05 },
  ],
  money: [
    { f: 880, d: 0.06, g: 0.038, w: 'triangle' },
    { f: 1174.66, d: 0.06, g: 0.036, at: 0.055, w: 'triangle' },
    { f: 1567.98, d: 0.14, g: 0.034, at: 0.11, w: 'triangle' },
  ],
}

export function sound(kind: Fx = 'tap') {
  if (!prefs.sound) return
  play(SOUND[kind] || SOUND.tap)
}

/* ══════════════════════ هەردووکیان ══════════════════════ */

export function fx(kind: Fx = 'tap') {
  haptic(kind)
  sound(kind)
}

/* ══════════════════════ گوێگری گشتی ══════════════════════ */

const SEL = 'button, a[href], [role="button"], summary, label, .tapfx, input[type="checkbox"], input[type="radio"]'

function kindOf(el: Element): Fx {
  const attr = (el as HTMLElement).dataset?.fx
  if (attr) return attr as Fx
  const tag = el.tagName
  if (tag === 'INPUT') {
    const t = (el as HTMLInputElement).type
    if (t === 'checkbox' || t === 'radio') return 'toggle'
  }
  if (el.classList.contains('btn-bad') || el.classList.contains('text-bad')) return 'warn'
  if (el.getAttribute('role') === 'option') return 'select'
  return 'tap'
}

function onDown(e: Event) {
  unlockAudio() // هەر دەستلێدانێک AudioContext چالاک دەکات

  const t = e.target
  if (!(t instanceof Element)) return
  const el = t.closest(SEL)
  if (!el) return
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return
  if (el.closest('[data-nofx]')) return
  if (el === swEl) return // سویچی شاراوەی iOS

  fx(kindOf(el))
}

let installed = false

/** یەک جار لە سەرەتای ئەپەکە بانگ دەکرێت */
export function installFeedback() {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.addEventListener('pointerdown', onDown, { capture: true, passive: true })
}
