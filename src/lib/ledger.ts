/**
 * حسابی کەسی — وەک دەفتەری صەرافی
 *
 * هەر کەسێک **یەک حسابی** هەیە، و هەموو هاتوچووەکانی پارە
 * (وەرگرتن و دان) بە بەروار و کاتژمێرەوە تێیدا تۆمار دەکرێن.
 * باڵانس بۆ هەر دراوێک بە جیا دەژمێردرێت — وەک هەموو صەرافێک،
 * دۆلار و دینار تێکەڵ ناکرێن.
 *
 * واتای باڵانس (لە ڕوانگەی پێشانگاوە):
 *   + ← ئەو کەسە قەرزارمە
 *   − ← من قەرزاری ئەوم
 */

import type { Account, Currency, EntryKind, LedgerEntry, RawAccount } from './types'
import { convert, uid } from './format'

export type { Account, EntryKind, LedgerEntry, RawAccount }

/* ═══════════ گواستنەوەی داتای کۆن ═══════════ */

const isNew = (x: RawAccount): x is Account => (x as Account).v === 2

/**
 * تۆماری کۆنی `Debt` دەگۆڕێت بۆ حسابی نوێ.
 * هیچ داتایەک نافەوتێت — بڕی سەرەتایی دەبێتە یەکەم تۆمار،
 * و هەموو پارەدانەکان دەبنە تۆماری دواتر.
 */
export function toAccount(raw: RawAccount): Account {
  if (isNew(raw)) return raw

  const d = raw
  const t = (ms?: number) => {
    if (!ms) return '00:00'
    const x = new Date(ms)
    return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
  }

  /* قەرزی کۆن: ئەگەر «خەڵک قەرزارمە» واتە من دامە → give
     ئەگەر «من قەرزارم» واتە ئەو داویەتی بە من → take */
  const opening: LedgerEntry = {
    id: `${d.id}-open`,
    date: d.date,
    time: t(d.createdAt),
    kind: d.kind === 'receivable' ? 'give' : 'take',
    amount: d.amount || 0,
    currency: d.currency,
    rate: d.rate || 0,
    cash: false,
    note: d.reason || (d.carInfo ? `ئۆتۆمبێل: ${d.carInfo}` : undefined),
    at: d.createdAt || 0,
    by: d.createdBy,
    byName: d.createdByName,
  }

  const pays: LedgerEntry[] = (d.payments || []).map((p) => ({
    id: p.id,
    date: p.date,
    time: t(p.at),
    /* پارەدان هەمیشە پێچەوانەی ئاراستەی قەرزەکەیە */
    kind: d.kind === 'receivable' ? 'take' : 'give',
    amount: p.amount || 0,
    currency: d.currency,
    rate: d.rate || 0,
    cash: !!p.toCashbox,
    account: p.account,
    txId: p.txId,
    note: p.note,
    at: p.at || 0,
    by: p.by,
    byName: p.byName,
  }))

  return {
    id: d.id,
    v: 2,
    name: d.personName || 'بێ ناو',
    customerId: d.customerId,
    phone: d.phone,
    note: d.note,
    entries: [opening, ...pays].filter((e) => e.amount > 0),
    archived: d.status === 'closed' && d.amount > 0 && false,
    createdAt: d.createdAt || Date.now(),
    updatedAt: d.updatedAt,
    createdBy: d.createdBy,
    createdByName: d.createdByName,
  }
}

/** هەموو تۆمارەکان دەگۆڕێت و ئەوانەی هەمان کەسن تێکەڵ دەکات */
export function toAccounts(rows: RawAccount[]): Account[] {
  const list = (rows || []).map(toAccount)

  /* تێکەڵکردنی حسابە کۆنەکانی هەمان کەس (تەنها ئەوانەی هێشتا نەگۆڕدراون) */
  const key = (a: Account) => `${a.name.trim().toLowerCase()}|${(a.phone || '').replace(/\D/g, '')}`
  const merged = new Map<string, Account>()
  for (const a of list) {
    const k = key(a)
    const prev = merged.get(k)
    if (!prev) {
      merged.set(k, a)
      continue
    }
    /* ئەوەی نوێترە دەمێنێتەوە وەک بنەما، تۆمارەکان کۆدەکرێنەوە */
    const base = prev.createdAt <= a.createdAt ? prev : a
    const other = base === prev ? a : prev
    merged.set(k, {
      ...base,
      phone: base.phone || other.phone,
      customerId: base.customerId || other.customerId,
      note: [base.note, other.note].filter(Boolean).join(' · ') || undefined,
      entries: [...base.entries, ...other.entries],
      mergedIds: [...(base.mergedIds || [base.id]), other.id],
    })
  }
  return [...merged.values()]
}

/* ═══════════ ژماردن ═══════════ */

export interface Balance {
  USD: number
  IQD: number
}

const ZERO: Balance = { USD: 0, IQD: 0 }

/** باڵانسی هەر دراوێک بە جیا */
export function balanceOf(a: Account): Balance {
  const b = { ...ZERO }
  for (const e of a.entries || []) {
    const v = (e.kind === 'give' ? 1 : -1) * (e.amount || 0)
    b[e.currency] += v
  }
  return b
}

/** باڵانسی گشتی وەک یەک ژمارە — بۆ ڕیزکردن و کۆی گشتی */
export function netIn(a: Account, cur: Currency, rate: number): number {
  const b = balanceOf(a)
  return convert(b.USD, 'USD', cur, rate) + convert(b.IQD, 'IQD', cur, rate)
}

export const isEmpty = (b: Balance) => Math.abs(b.USD) < 0.01 && Math.abs(b.IQD) < 0.01

export interface Row extends LedgerEntry {
  /** باڵانسی هەمان دراو دوای ئەم تۆمارە */
  running: number
}

/**
 * تۆمارەکان بە ڕیزی کاتی (کۆنترین سەرەوە) لەگەڵ باڵانسی جوڵاو.
 * ئەگەر `cur` دیاری بکرێت تەنها ئەو دراوە دەگەڕێتەوە.
 */
export function statement(a: Account, cur?: Currency): Row[] {
  const rows = [...(a.entries || [])]
    .filter((e) => !cur || e.currency === cur)
    .sort((x, y) => `${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`) || x.at - y.at)

  const run: Balance = { ...ZERO }
  return rows.map((e) => {
    run[e.currency] += (e.kind === 'give' ? 1 : -1) * (e.amount || 0)
    return { ...e, running: run[e.currency] }
  })
}

/** کام دراوەکان لەم حسابەدا بەکارهاتوون */
export function currenciesUsed(a: Account): Currency[] {
  const s = new Set<Currency>()
  for (const e of a.entries || []) s.add(e.currency)
  return s.size ? [...s] : ['USD']
}

/** کۆی وەرگیراو و دراو لە ماوەیەکدا */
export function totals(a: Account, cur: Currency, from?: string, to?: string) {
  let took = 0
  let gave = 0
  for (const e of a.entries || []) {
    if (e.currency !== cur) continue
    if (from && e.date < from) continue
    if (to && e.date > to) continue
    if (e.kind === 'take') took += e.amount
    else gave += e.amount
  }
  return { took, gave, net: gave - took }
}

/** دوایین جوڵە */
export function lastMove(a: Account): LedgerEntry | null {
  const rows = statement(a)
  return rows.length ? rows[rows.length - 1] : null
}

/* ═══════════ دروستکردن ═══════════ */

export function blankAccount(by?: string, byName?: string): Account {
  return {
    id: uid('ac'),
    v: 2,
    name: '',
    entries: [],
    createdAt: Date.now(),
    createdBy: by,
    createdByName: byName,
  }
}

export function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
