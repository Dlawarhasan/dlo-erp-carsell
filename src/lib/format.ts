import type { Currency } from './types'

export const KU_MONTHS = ['کانوونی دووەم','شوبات','ئازار','نیسان','ئایار','حوزەیران','تەمووز','ئاب','ئەیلوول','تشرینی یەکەم','تشرینی دووەم','کانوونی یەکەم']
export const KU_DAYS = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە']

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function fmtDate(iso?: string | number) {
  if (!iso) return '—'
  const d = typeof iso === 'number' ? new Date(iso) : new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${KU_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtDateShort(iso?: string | number) {
  if (!iso) return '—'
  const d = typeof iso === 'number' ? new Date(iso) : new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`
}

export function fmtDateTime(ms?: number) {
  if (!ms) return '—'
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${fmtDateShort(d.toISOString().slice(0, 10))} — ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function num(n: number | undefined | null, digits = 0) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export const CUR_SYM: Record<Currency, string> = { USD: '$', IQD: 'د.ع' }

export function money(n: number, c: Currency = 'USD') {
  const v = c === 'IQD' ? Math.round(n) : Math.round(n * 100) / 100
  return `${num(v, 0)} ${CUR_SYM[c]}`
}

/** گۆڕینی دراو بەپێی نرخی ئاڵوگۆڕ */
export function convert(amount: number, from: Currency, to: Currency, rate: number) {
  if (from === to) return amount
  if (!rate || rate <= 0) return amount
  return from === 'USD' ? amount * rate : amount / rate
}

/** کۆکردنەوەی بڕەکان بۆ یەک دراو */
export function sumIn(list: { amount: number; currency: Currency; rate?: number }[], to: Currency, fallbackRate: number) {
  return list.reduce((s, x) => s + convert(x.amount, x.currency, to, x.rate || fallbackRate), 0)
}

/* ================= VIN ================= */
export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/i

export function cleanVin(s: string) {
  return (s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/I/g, '1')
    .replace(/O/g, '0')
    .replace(/Q/g, '0')
}

const VIN_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4,
  N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
}
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

/** پشکنینی check-digit — تەنها بۆ ئاگادارکردنەوە (زۆر ئۆتۆمبێلی ئەوروپی/یابانی ئەمە بەکارناهێنن) */
export function vinChecksumOk(vin: string) {
  const v = vin.toUpperCase()
  if (!VIN_RE.test(v)) return false
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const ch = v[i]
    const val = /\d/.test(ch) ? Number(ch) : VIN_VALUES[ch]
    if (val === undefined) return false
    sum += val * VIN_WEIGHTS[i]
  }
  const rem = sum % 11
  const expect = rem === 10 ? 'X' : String(rem)
  return v[8] === expect
}

/** ساڵی مۆدێل لە VIN (پێگەی ١٠) */
export function vinYear(vin: string): number | null {
  const map = 'ABCDEFGHJKLMNPRSTVWXY123456789'
  const v = (vin || '').toUpperCase()
  const ch = v[9]
  if (!ch) return null
  const i = map.indexOf(ch)
  if (i < 0) return null
  const y1 = 1980 + i
  const y2 = y1 + 30
  const now = new Date().getFullYear() + 1

  /**
   * پیتی ١٠ هەر ٣٠ ساڵ دووبارە دەبێتەوە، بۆیە دوو ئەگەر هەیە.
   * لە ستانداردی ئەمریکا، پیتی ٧ جیایان دەکاتەوە:
   *   ژمارە → ١٩٨٠–٢٠٠٩ · پیت → ٢٠١٠ بەرەوژوور
   * ئەم یاسایە تەنها بۆ ئۆتۆمبێلی بازاڕی باکووری ئەمریکا ڕاستە
   * (پیتی یەکەم: 1–5)، بۆیە بۆ ئەوانی تر نوێترین ئەگەر هەڵدەبژێرین.
   */
  const northAmerica = '12345'.includes(v[0])
  const p7 = v[6]
  if (northAmerica && p7 && p7 >= '0' && p7 <= '9') return y1 <= now ? y1 : y2

  return y2 <= now ? y2 : y1
}

export const maskVin = (v: string) => (v && v.length === 17 ? `${v.slice(0, 3)} ${v.slice(3, 9)} ${v.slice(9)}` : v)

/* ================= یارمەتیدەر ================= */
export function uid(prefix = '') {
  const s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-5)
  return prefix ? `${prefix}_${s}` : s
}

export function fmtBytes(b: number) {
  if (!b || b < 1024) return `${Math.round(b || 0)} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1048576).toFixed(1)} MB`
  return `${(b / 1073741824).toFixed(2)} GB`
}

export function normalizePhone(p: string) {
  return (p || '').replace(/[^\d+]/g, '')
}

export function digitsOnly(s: string) {
  return (s || '').replace(/[^\d]/g, '')
}

/** گەڕان بە کوردی/عەرەبی — لابردنی جیاوازییەکانی پیتەکان */
export function fold(s: string) {
  return (s || '')
    .toString()
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ىیي]/g, 'ی')
    .replace(/[ةه]/g, 'ه')
    .replace(/[كک]/g, 'ک')
    .replace(/[ؤو]/g, 'و')
    .trim()
}

export function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime()
  const d2 = new Date(b).getTime()
  return Math.round((d2 - d1) / 86400000)
}

export function addMonths(iso: string, m: number) {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDate()
  d.setMonth(d.getMonth() + m)
  if (d.getDate() < day) d.setDate(0)
  return d.toISOString().slice(0, 10)
}
