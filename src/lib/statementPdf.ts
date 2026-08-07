/**
 * کێشانی کشف حساب لەسەر Canvas و گۆڕینی بۆ PDF.
 *
 * Canvas خۆی پیتی کوردی/عەرەبی پێکەوە دەلکێنێت (شەیپینگ)، بۆیە
 * پێویستمان بە فۆنتی تێخراوی PDF نییە — ئەمە قورسترین بەشی
 * دروستکردنی PDFی عەرەبییە و بەم ڕێگەیە بە تەواوی لادەبرێت.
 */

import { A4, canvasToJpeg, jpegPagesToPdf, savePdf } from './pdf'
import { fmtDateShort, money, todayISO } from './format'
import type { Currency } from './types'
import type { Account, Row } from './ledger'

/* ٢× بۆ ڕوونی — ١٢٤٠×١٧٥٤ پیکسل */
const S = 2.1
const W = Math.round(A4.w * S)
const H = Math.round(A4.h * S)
const PAD = Math.round(34 * S)

const FONT = "'Speda', 'Noto Naskh Arabic', 'Noto Kufi Arabic', system-ui, sans-serif"

const C = {
  ink: '#111827',
  soft: '#6b7280',
  line: '#d7dde5',
  band: '#f3f5f8',
  ok: '#15803d',
  bad: '#b91c1c',
  gold: '#a8720d',
}

interface Ctx2 extends CanvasRenderingContext2D {}

function newPage(): { cv: HTMLCanvasElement; g: Ctx2 } {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d') as Ctx2
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  g.textBaseline = 'middle'
  g.direction = 'rtl'
  return { cv, g }
}

const f = (g: Ctx2, size: number, bold = false) => {
  g.font = `${bold ? '700' : '400'} ${Math.round(size * S)}px ${FONT}`
}

/** نووسین لە ڕاستەوە (RTL) */
const tr = (g: Ctx2, s: string, x: number, y: number) => {
  g.textAlign = 'right'
  g.direction = 'rtl'
  g.fillText(s, x, y)
}
/** نووسین لە چەپەوە */
const tl = (g: Ctx2, s: string, x: number, y: number) => {
  g.textAlign = 'left'
  g.direction = 'rtl'
  g.fillText(s, x, y)
}
/** ژمارە — هەمیشە LTR */
const tnum = (g: Ctx2, s: string, x: number, y: number, align: 'left' | 'right' = 'left') => {
  g.textAlign = align
  g.direction = 'ltr'
  g.fillText(s, x, y)
  g.direction = 'rtl'
}

const line = (g: Ctx2, x1: number, y: number, x2: number, color = C.line, w = 1) => {
  g.strokeStyle = color
  g.lineWidth = w * S
  g.beginPath()
  g.moveTo(x1, y)
  g.lineTo(x2, y)
  g.stroke()
}

const clip = (g: Ctx2, s: string, max: number) => {
  if (!s) return ''
  if (g.measureText(s).width <= max) return s
  let out = s
  while (out.length > 1 && g.measureText(out + '…').width > max) out = out.slice(0, -1)
  return out + '…'
}

export interface StatementMeta {
  showroom: string
  phone?: string
  address?: string
}

/**
 * کشف حسابێک دەکێشێت و وەک PDF داگیری دەکات.
 * ئەگەر ڕیزەکان زۆر بوون، خۆکارانە دەبنە چەند لاپەڕە.
 */
export async function downloadStatementPdf(
  acc: Account,
  rows: Row[],
  cur: Currency,
  totals: { took: number; gave: number },
  balance: number,
  meta: StatementMeta,
) {
  const m = (n: number) => money(n, cur)
  const pages: { jpeg: Uint8Array; w: number; h: number }[] = []

  /* پانی ستوونەکان — لە ڕاستەوە بۆ چەپ */
  const right = W - PAD
  const left = PAD
  const colDate = right
  const colNote = right - 104 * S
  const colIn = left + 262 * S
  const colOut = left + 168 * S
  const colBal = left + 8 * S

  const rowH = 30 * S
  let page = newPage()
  let y = 0
  let pageNo = 1
  let totalPages = 1

  const header = (g: Ctx2) => {
    y = PAD + 14 * S

    /* ناوی پێشانگا */
    g.fillStyle = C.ink
    f(g, 17, true)
    tr(g, meta.showroom || 'پێشانگا', right, y)

    f(g, 9)
    g.fillStyle = C.soft
    const sub = [meta.address, meta.phone].filter(Boolean).join(' · ')
    if (sub) tr(g, sub, right, y + 19 * S)

    /* ناونیشانی بەڵگە */
    g.fillStyle = C.gold
    f(g, 15, true)
    tl(g, 'کشف حساب', left, y)
    g.fillStyle = C.soft
    f(g, 9)
    tnum(g, fmtDateShort(todayISO()), left, y + 19 * S)

    y += 40 * S
    line(g, left, y, right, C.ink, 1.6)
    y += 26 * S

    /* کەسەکە */
    g.fillStyle = C.ink
    f(g, 14, true)
    tr(g, acc.name || 'بێ ناو', right, y)
    if (acc.phone) {
      g.fillStyle = C.soft
      f(g, 10)
      tnum(g, acc.phone, right - Math.min(g.measureText(acc.name).width, 400 * S) - 220 * S, y)
    }

    /* باڵانس */
    const label = Math.abs(balance) < 0.01 ? 'حساب پاکە' : balance > 0 ? 'ئەم کەسە قەرزارمە' : 'من قەرزاری ئەم کەسەم'
    g.fillStyle = C.soft
    f(g, 9)
    tl(g, label, left, y - 9 * S)
    g.fillStyle = Math.abs(balance) < 0.01 ? C.soft : balance > 0 ? C.ok : C.bad
    f(g, 17, true)
    tnum(g, m(Math.abs(balance)), left, y + 12 * S)

    y += 34 * S

    /* سەردێڕی خشتە */
    g.fillStyle = C.band
    g.fillRect(left, y, right - left, 26 * S)
    g.fillStyle = C.soft
    f(g, 9, true)
    tr(g, 'بەروار و کات', colDate, y + 13 * S)
    tr(g, 'تێبینی', colNote, y + 13 * S)
    tnum(g, 'هاتووە', colIn, y + 13 * S, 'right')
    tnum(g, 'ڕۆیشتووە', colOut, y + 13 * S, 'right')
    tnum(g, 'باڵانس', colBal + 92 * S, y + 13 * S, 'right')
    y += 26 * S
  }

  const footer = (g: Ctx2) => {
    g.fillStyle = C.soft
    f(g, 8)
    tl(g, `${pageNo} / ${totalPages}`, left, H - PAD)
    tr(g, `${meta.showroom} — کشف حسابی ${acc.name}`, right, H - PAD)
  }

  /* ژماردنی لاپەڕەکان */
  {
    const probe = newPage()
    header(probe.g)
    const firstFit = Math.floor((H - PAD - 60 * S - y) / rowH)
    const restFit = Math.floor((H - PAD * 2 - 60 * S) / rowH)
    totalPages = rows.length <= firstFit ? 1 : 1 + Math.ceil((rows.length - firstFit) / Math.max(1, restFit))
  }

  page = newPage()
  header(page.g)

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]

    if (y + rowH > H - PAD - 62 * S) {
      footer(page.g)
      pages.push({ jpeg: await canvasToJpeg(page.cv), w: W, h: H })
      pageNo++
      page = newPage()
      y = PAD + 10 * S
      /* سەردێڕی خشتە لە لاپەڕەکانی دواتریش */
      const g2 = page.g
      g2.fillStyle = C.band
      g2.fillRect(left, y, right - left, 26 * S)
      g2.fillStyle = C.soft
      f(g2, 9, true)
      tr(g2, 'بەروار و کات', colDate, y + 13 * S)
      tr(g2, 'تێبینی', colNote, y + 13 * S)
      tnum(g2, 'هاتووە', colIn, y + 13 * S, 'right')
      tnum(g2, 'ڕۆیشتووە', colOut, y + 13 * S, 'right')
      tnum(g2, 'باڵانس', colBal + 92 * S, y + 13 * S, 'right')
      y += 26 * S
    }

    const g = page.g
    const mid = y + rowH / 2

    if (i % 2 === 1) {
      g.fillStyle = '#fafbfc'
      g.fillRect(left, y, right - left, rowH)
    }

    /* ئاراستە — تیرێکی ڕەنگین */
    g.fillStyle = r.kind === 'take' ? C.ok : C.bad
    f(g, 12, true)
    tnum(g, r.kind === 'take' ? '↙' : '↗', colDate + 4 * S, mid, 'right')

    g.fillStyle = C.ink
    f(g, 9.5)
    tnum(g, fmtDateShort(r.date), colDate - 16 * S, mid - 6 * S, 'right')
    g.fillStyle = C.soft
    f(g, 8)
    tnum(g, r.time + (r.cash ? (r.account === 'bank' ? ' · بانک' : ' · کاش') : ''), colDate - 16 * S, mid + 8 * S, 'right')

    g.fillStyle = C.ink
    f(g, 9.5)
    tr(g, clip(g, r.note || '—', colNote - colIn - 8 * S), colNote, mid)

    f(g, 10, true)
    if (r.kind === 'take') {
      g.fillStyle = C.ok
      tnum(g, m(r.amount), colIn, mid, 'right')
    } else {
      g.fillStyle = C.bad
      tnum(g, m(r.amount), colOut, mid, 'right')
    }

    g.fillStyle = r.running > 0 ? C.ok : r.running < 0 ? C.bad : C.soft
    f(g, 10, true)
    tnum(g, m(Math.abs(r.running)), colBal + 92 * S, mid, 'right')

    y += rowH
    line(g, left, y, right)
  }

  /* کۆی گشتی */
  {
    const g = page.g
    y += 6 * S
    g.fillStyle = C.band
    g.fillRect(left, y, right - left, 32 * S)
    const mid = y + 16 * S
    g.fillStyle = C.ink
    f(g, 10.5, true)
    tr(g, 'کۆی گشتی', colDate, mid)
    g.fillStyle = C.ok
    tnum(g, m(totals.took), colIn, mid, 'right')
    g.fillStyle = C.bad
    tnum(g, m(totals.gave), colOut, mid, 'right')
    g.fillStyle = balance > 0 ? C.ok : balance < 0 ? C.bad : C.soft
    tnum(g, m(Math.abs(balance)), colBal + 92 * S, mid, 'right')
    y += 32 * S
  }

  footer(page.g)
  pages.push({ jpeg: await canvasToJpeg(page.cv), w: W, h: H })

  const safe = (acc.name || 'حساب').replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 40)
  savePdf(jpegPagesToPdf(pages), `کشف-حساب-${safe}-${todayISO()}`)
}
