/**
 * یاریدەدەری ناوخۆیی — مێشکی چات بۆتەکە.
 *
 * هەموو شتێک لێرە لە ناو ئامێرەکەی خۆتدا ڕوودەدات: نە ئینتەرنێت پێویستە،
 * نە کلیلی API، نە پارە. یاریدەدەرەکە هەم سیستەمەکە دەناسێت (چۆن چی بکەیت،
 * کوا بەشەکان) و هەم داتاکانی خۆت دەخوێنێتەوە (چەند سەیارە، چەند قازانج،
 * کێ قەرزارە) — و لە کۆتاییدا دوگمەیەکت پێدەدات کە ڕاستەوخۆ دەتباتە شوێنەکە.
 */

import type {
  BrokerDeal, Car, Contract, Currency, Customer, Exchanger, Hawala, Partner,
  RawAccount, Settings, Tx,
} from './types'
import { balances, cashBalance, carMoney, openInstallments, profitInRange } from './finance'
import { balanceOf, toAccounts } from './ledger'
import { convert, money, num, todayISO } from './format'

/* ═══════════════ ئامرازی دەق ═══════════════ */

/** ڕێکخستنی پیتەکان — ی/ك/ه‌ی عەرەبی و کوردی وەک یەک هەژمار دەکرێن */
export function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[ىیي]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[ۆو]/g, 'و')
    .replace(/[ةه]/g, 'ه')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ڕر]/g, 'ر')
    .replace(/[ێې]/g, 'ێ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const has = (n: string, ...words: string[]) => words.some((w) => n.includes(norm(w)))

/* ═══════════════ جۆرەکان ═══════════════ */

export interface AskCtx {
  cars: Car[]
  customers: Customer[]
  contracts: Contract[]
  brokers: BrokerDeal[]
  txs: Tx[]
  debts: RawAccount[]
  partners: Partner[]
  exchangers: Exchanger[]
  hawalas: Hawala[]
  settings: Settings
}

export interface Action {
  label: string
  to: string
}

export interface Answer {
  /** وەڵامی سەرەکی */
  text: string
  /** ڕیزی وردەکاری */
  lines?: string[]
  /** دوگمەکانی «بمبە بۆ ئەوێ» */
  actions?: Action[]
  /** پێشنیاری پرسیاری دواتر */
  chips?: string[]
  /** ڕەنگی کارتەکە */
  tone?: 'ok' | 'bad' | 'info'
}

/* ═══════════════ یاریدەدەری ماوە ═══════════════ */

const ymNow = () => todayISO().slice(0, 7)
const yNow = () => todayISO().slice(0, 4)

const shiftYm = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type Range = { from: string; to: string; label: string }

/** ماوەکە لە پرسیارەکەوە دەردەهێنێت — ئەم مانگ، ئەمساڵ، ڕابردوو، هەمووکات */
function rangeOf(n: string): Range {
  const ym = ymNow()
  if (has(n, 'ئەمرو', 'ئەمڕۆ', 'today')) return { from: todayISO(), to: todayISO(), label: 'ئەمڕۆ' }
  if (has(n, 'مانگی رابردو', 'مانگی پێشو', 'مانگی چوو')) {
    const p = shiftYm(ym, -1)
    return { from: `${p}-01`, to: `${p}-31`, label: 'مانگی ڕابردوو' }
  }
  if (has(n, 'ساڵی رابردو', 'ساڵی پێشو')) {
    const y = Number(yNow()) - 1
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `ساڵی ${y}` }
  }
  if (has(n, 'ئەمساڵ', 'ئەم ساڵ', 'ساڵانە')) return { from: `${yNow()}-01-01`, to: `${yNow()}-12-31`, label: `ساڵی ${yNow()}` }
  if (has(n, 'هەمو کات', 'گشتی', 'سەرجەم', 'لە سەرەتاوە')) return { from: '2000-01-01', to: '2999-12-31', label: 'لە سەرەتاوە' }
  return { from: `${ym}-01`, to: `${ym}-31`, label: 'ئەم مانگە' }
}

const CAR_STATUS: Record<string, string> = {
  available: 'بەردەست', reserved: 'حیجزکراو', sold: 'فرۆشراو', workshop: 'لە وۆرکشۆپ',
}

/* ═══════════════ ناساندنی بەشەکان ═══════════════ */

interface Topic {
  to: string
  label: string
  keys: string[]
  how?: string[]
}

const TOPICS: Topic[] = [
  { to: '/cars', label: 'ئۆتۆمبێلەکان', keys: ['سەیارە', 'ئۆتۆمبێل', 'ماشێن', 'car'] },
  { to: '/cars/new', label: 'زیادکردنی ئۆتۆمبێل', keys: ['سەیارە زیاد', 'ئۆتۆمبێل نوێ', 'سەیارەی نوێ', 'تۆمارکردنی سەیارە'],
    how: ['بڕۆ بۆ **ئۆتۆمبێلەکان** و دوگمەی **+** دابگرە',
      'یان ڕاستەوخۆ **سکانی VIN** بکە — براند و مۆدێل و ساڵ خۆکارانە پڕ دەبنەوە',
      'نرخی کڕین و بەرواری کڕین دابنێ — ئەمە بۆ ژماردنی قازانج پێویستە',
      'وێنە و دۆخی جەستە زیاد بکە، پاشان **پاشەکەوت**'] },
  { to: '/scan', label: 'سکانی VIN', keys: ['vin', 'سکان', 'شاسی', 'ژمارەی شانسی'],
    how: ['بڕۆ بۆ **سکانی VIN** (دوگمە گەورەکەی ناوەڕاست لە مۆبایل)',
      'کامێراکە بگرە بەرامبەر ژمارەی شاسی، یان بە دەست بینووسە',
      'سیستەم براند، مۆدێل، ساڵ، ماتۆڕ و ڕەگەزەکەی دەردەهێنێت'] },
  { to: '/contracts', label: 'عەقدەکان', keys: ['عەقد', 'گرێبەست', 'contract'] },
  { to: '/brokers', label: 'عەقدی دەرەکی', keys: ['عەقدی دەرەکی', 'دەلاڵی', 'ناوبژیوان', 'عمولە', 'دەرەکی'],
    how: ['بڕۆ بۆ **عەقدی دەرەکی** و دوگمەی **+** دابگرە',
      'ناوی فرۆشیار و کڕیاری دەرەکی بنووسە',
      'زانیاری ئۆتۆمبێلەکە و نرخی ڕێککەوتنیان دابنێ',
      'لە خانەی **عمولە** ئەو بڕە بنووسە کە وەرتگرتووە — یەکسەر دەچێتە سندوق وەک **قازانجی ساف**',
      'دوای پاشەکەوت دەتوانیت عەقدەکە **پرینت** بکەیت'] },
  { to: '/accounting', label: 'حسابات', keys: ['حساب', 'سندوق', 'پارە', 'باڵانس', 'کاش', 'بانک'] },
  { to: '/expenses', label: 'مەسروفات', keys: ['مەسروفات', 'خەرجی', 'مەسرەف'],
    how: ['بڕۆ بۆ **مەسروفات** و دوگمەی **+** دابگرە',
      'جۆری خەرجییەکە هەڵبژێرە (کرێ، مووچە، کارەبا…)',
      'بڕ و دراو و لە کوێوە (سندوق/بانک) دیاری بکە',
      'بۆ خەرجی مانگانەی دووبارەبووەوە، لە **ڕێکخستن** قاڵبێک دروست بکە و هەموو مانگێک بە یەک دەستلێدان تۆماری بکە'] },
  { to: '/reports', label: 'ڕاپۆرت و کەشف حساب', keys: ['راپۆرت', 'کەشف حساب', 'report'] },
  { to: '/debts', label: 'دەفتەری قەرز', keys: ['قەرز', 'دەفتەر', 'debt'],
    how: ['بڕۆ بۆ **دەفتەری قەرز** و **حسابی نوێ** دروست بکە',
      'ناوی کەسەکە هەڵبژێرە یان بنووسە',
      'لە کشف حسابەکەیدا: **پارەم لێ وەرگرت** یان **پارەم دایێ**',
      'هەموو هاتوچۆیەک بە بەروار و کاتژمێرەوە تۆمار دەبێت و باڵانسەکە خۆکارانە دەگۆڕێت'] },
  { to: '/customers', label: 'کڕیارەکان', keys: ['کریار', 'موشتەری', 'customer'] },
  { to: '/partners', label: 'شەریکەکان', keys: ['شەریک', 'partner'] },
  { to: '/exchangers', label: 'سندووقی سەراف', keys: ['سەراف', 'exchange'] },
  { to: '/hawalas', label: 'حەواڵەکان', keys: ['حەواڵە', 'hawala'] },
  { to: '/security', label: 'ئاسایش و پاڵپشت', keys: ['ئاسایش', 'پاڵپشت', 'باکئەپ', 'backup', 'خەزنکردن'],
    how: ['بڕۆ بۆ **ئاسایش**',
      '**دروستکردنی پاڵپشت** فایلێکی تەواوی هەموو داتاکانت داگیر دەکات',
      'ئەو فایلە لە شوێنێکی پارێزراو هەڵبگرە (گووگڵ درایڤ، ئیمەیڵ…)',
      'بۆ گەڕاندنەوە، هەمان فایل لە **گەڕاندنەوە** هەڵبژێرە'] },
  { to: '/users', label: 'بەکارهێنەران', keys: ['بەکارهێنەر', 'یوزەر', 'کارمەند زیاد', 'دەسەڵات'],
    how: ['بڕۆ بۆ **بەکارهێنەران**',
      'دوگمەی **+** — ئیمەیڵ و ناو و ڕۆڵەکەی بنووسە',
      'ڕۆڵەکە دیاری دەکات چی ببینێت و چی بگۆڕێت'] },
  { to: '/audit', label: 'چالاکییەکان', keys: ['چالاکی', 'مێژوو', 'کێ چی کرد', 'audit'] },
  { to: '/settings', label: 'ڕێکخستن', keys: ['ڕێکخستن', 'سێتینگ', 'نرخی دۆلار بگۆڕم', 'ناوی پێشانگا', 'لۆگۆ'],
    how: ['بڕۆ بۆ **ڕێکخستن**',
      'لەوێ ناوی پێشانگا، لۆگۆ، تەلەفۆن، **نرخی دۆلار** و مەرجەکانی عەقد دەگۆڕیت'] },
  { to: '/', label: 'داشبۆرد', keys: ['داشبۆرد', 'سەرەکی', 'ماڵەوە'] },
]

/** بەشەکە دەدۆزێتەوە — درێژترین وشەی گونجاو دەبات، تا «عەقدی دەرەکی»
 *  بە «عەقد» تێکەڵ نەبێت */
function findTopic(n: string): Topic | undefined {
  let best: Topic | undefined
  let bestLen = 0
  for (const t of TOPICS) {
    for (const k of t.keys) {
      const kk = norm(k)
      if (kk && n.includes(kk) && kk.length > bestLen) {
        best = t
        bestLen = kk.length
      }
    }
  }
  return best
}

/* ═══════════════ وەڵامدانەوە ═══════════════ */

export const SUGGESTIONS = [
  'چەند سەیارەم هەیە؟',
  'قازانجی ئەم مانگ چەندە؟',
  'باڵانسی سندوق چەندە؟',
  'کێ قەرزارمە؟',
  'خەرجی ئەم مانگ چەندە؟',
  'قیستی دواکەوتوو هەیە؟',
  'چۆن خەرجی تۆمار بکەم؟',
  'چۆن عەقدی دەرەکی دروست بکەم؟',
  'ئەمڕۆ چیم لەبەردەستە؟',
]

export function ask(raw: string, c: AskCtx): Answer {
  const n = norm(raw)
  if (!n) return help()

  const rate = c.settings.usdRate
  const cur: Currency = has(n, 'دینار', 'iqd') ? 'IQD' : 'USD'
  const m = (v: number, k: Currency = cur) => money(v, k)

  /* ── سڵاو و گفتوگۆ ── */
  if (has(n, 'سڵاو', 'سلاو', 'بەخێربێی', 'چۆنی', 'hi', 'hello')) {
    return {
      text: `سڵاو! من یاریدەدەری ${c.settings.showroomName || 'پێشانگاکەت'}ـم.`,
      lines: ['هەرچی پرسیارت هەیە دەربارەی سەیارە، پارە، قەرز، خەرجی یان عەقدەکان، لێم بپرسە.',
        'دەشتوانم فێرت بکەم چۆن هەر کارێک بکەیت و ڕاستەوخۆ بتبەمە شوێنەکەی.'],
      chips: SUGGESTIONS.slice(0, 4),
    }
  }
  if (has(n, 'سوپاس', 'زۆر سوپاس', 'دەستخۆش', 'thanks')) {
    return { text: 'شادم بەوەی یارمەتیم دایت 🙂', chips: SUGGESTIONS.slice(0, 3) }
  }
  if (has(n, 'تۆ کێی', 'کێی', 'چیت پێدەکرێت', 'چی دەزانی', 'یارمەتی', 'help')) return help()

  /* ── «بمبە بۆ…» — بردن، پێش هەموو شتێک ── */
  if (has(n, 'بمبە', 'بمبه', 'بیکەرەوە', 'بمگەیەنە', 'بردنم بۆ', 'بمبەرە')) {
    const t = findTopic(n)
    if (t) return { text: `بەڵێ، دەتبەم بۆ **${t.label}**.`, actions: [{ label: t.label, to: t.to }] }
  }

  /* ── «چۆن…؟» — فێرکردن هەمیشە پێش وەڵامی ژمارە دێت ── */
  if (has(n, 'چۆن', 'چون', 'چطور')) {
    const t = findTopic(n)
    if (t) return howTo(t.to, c)
  }

  /* ── بریفینگی ڕۆژانە ── */
  if (has(n, 'ئەمرو چیم', 'ئەمڕۆ چیم', 'چی بکەم', 'دۆخی پێشانگا', 'پوختە', 'کورتە', 'بریفینگ', 'چۆنە کارەکان')) {
    return briefing(c, cur, rate)
  }

  /* ── ژمارەی سەیارەکان ── */
  if (has(n, 'چەند سەیارە', 'چەند ئۆتۆمبێل', 'ژمارەی سەیارە', 'سەیارەکان چەند', 'ئۆتۆمبێلەکان چەند')) {
    const by: Record<string, number> = {}
    for (const car of c.cars) by[car.status] = (by[car.status] || 0) + 1
    return {
      text: `${num(c.cars.length)} ئۆتۆمبێلت هەیە.`,
      lines: Object.entries(by).map(([k, v]) => `${CAR_STATUS[k] || k}: ${num(v)}`),
      actions: [{ label: 'بینینی ئۆتۆمبێلەکان', to: '/cars' }],
      chips: ['چی بەردەستە؟', 'گرانترین سەیارە کامەیە؟'],
    }
  }

  /* ── سەیارە بەردەستەکان ── */
  if (has(n, 'چی بەردەستە', 'بەردەست', 'ماوە بۆ فرۆشتن', 'نەفرۆشراو')) {
    const av = c.cars.filter((x) => x.status === 'available')
    return {
      text: av.length ? `${num(av.length)} ئۆتۆمبێل بەردەستە بۆ فرۆشتن.` : 'هیچ ئۆتۆمبێلێکی بەردەست نییە.',
      lines: av.slice(0, 8).map((x) => `${x.brand} ${x.model} ${x.year} — داوا: ${money(x.askPrice, x.askCurrency)}`),
      actions: [{ label: 'ئۆتۆمبێلە بەردەستەکان', to: '/cars' }],
    }
  }

  /* ── فرۆشراوەکان ── */
  if (has(n, 'چەند فرۆشتوم', 'چەند فرۆشراوە', 'فرۆشتنەکان', 'چەندم فرۆشتوە')) {
    const r = rangeOf(n)
    const sold = c.contracts.filter((x) => x.type === 'sale' && x.status !== 'cancelled' && x.date >= r.from && x.date <= r.to)
    const total = sold.reduce((s, x) => s + convert(x.price, x.currency, cur, x.rate || rate), 0)
    return {
      text: `لە ${r.label} ${num(sold.length)} ئۆتۆمبێل فرۆشراوە.`,
      lines: [`کۆی بەهای فرۆشتن: ${m(total)}`],
      actions: [{ label: 'عەقدەکان', to: '/contracts' }],
      chips: ['قازانجی ئەم مانگ چەندە؟'],
    }
  }

  /* ── قازانج ── */
  if (has(n, 'قازانج', 'سود', 'ربح', 'profit')) {
    const r = rangeOf(n)
    const p = profitInRange(c.cars, c.txs, c.contracts, cur, rate, r.from, r.to)
    const brokerFee = c.brokers
      .filter((d) => d.status !== 'cancelled' && d.date >= r.from && d.date <= r.to)
      .reduce((s, d) => s + convert(d.fee, d.feeCurrency, cur, d.rate || rate), 0)
    const lines = [`لە فرۆشتنی ${num(p.count)} ئۆتۆمبێل: ${m(p.profit)}`]
    if (brokerFee > 0) lines.push(`عمولەی عەقدی دەرەکی (قازانجی ساف): ${m(brokerFee)}`)
    return {
      text: `قازانجی ${r.label}: ${m(p.profit + brokerFee)}`,
      lines,
      tone: p.profit + brokerFee >= 0 ? 'ok' : 'bad',
      actions: [{ label: 'ڕاپۆرتەکان', to: '/reports' }, { label: 'حسابات', to: '/accounting' }],
      chips: ['قازانجی ئەمساڵ چەندە؟', 'خەرجی ئەم مانگ چەندە؟'],
    }
  }

  /* ── باڵانس ── */
  if (has(n, 'باڵانس', 'سندوق', 'کاش', 'چەند پارەم', 'پارەم چەندە', 'بانک', 'نەختینە')) {
    const b = balances(c.txs, cur, rate)
    return {
      text: `باڵانسی گشتی: ${m(b.total)}`,
      lines: [
        `سندوق: ${m(b.cash)}`,
        `بانک: ${m(b.bank)}`,
        `بە دراوی خۆیان — دۆلار: ${money(cashBalance(c.txs, 'USD'), 'USD')} · دینار: ${money(cashBalance(c.txs, 'IQD'), 'IQD')}`,
      ],
      tone: b.total >= 0 ? 'ok' : 'bad',
      actions: [{ label: 'حسابات', to: '/accounting' }],
    }
  }

  /* ── خەرجی ── */
  if (has(n, 'خەرجی', 'مەسروفات', 'مەسرەف', 'expense')) {
    const r = rangeOf(n)
    const rows = c.txs.filter((t) => t.kind === 'out' && t.category === 'expense' && t.date >= r.from && t.date <= r.to)
    const total = rows.reduce((s, t) => s + convert(t.amount, t.currency, cur, t.rate || rate), 0)
    const by: Record<string, number> = {}
    for (const t of rows) by[t.title] = (by[t.title] || 0) + convert(t.amount, t.currency, cur, t.rate || rate)
    const top = Object.entries(by).sort((a, b2) => b2[1] - a[1]).slice(0, 5)
    return {
      text: `خەرجی ${r.label}: ${m(total)}`,
      lines: top.length ? top.map(([k, v]) => `${k}: ${m(v)}`) : ['هیچ خەرجییەک تۆمار نەکراوە.'],
      tone: 'bad',
      actions: [{ label: 'بەشی مەسروفات', to: '/expenses' }],
      chips: ['چۆن خەرجی تۆمار بکەم؟'],
    }
  }

  /* ── داهات ── */
  if (has(n, 'داهات', 'هاتوە', 'وەرگیراو', 'income')) {
    const r = rangeOf(n)
    const b = balances(c.txs, cur, rate, r.from, r.to)
    return {
      text: `داهاتی ${r.label}: ${m(b.in)}`,
      lines: [`خەرجی هەمان ماوە: ${m(b.out)}`, `جیاوازی: ${m(b.in - b.out)}`],
      tone: b.in - b.out >= 0 ? 'ok' : 'bad',
      actions: [{ label: 'حسابات', to: '/accounting' }],
    }
  }

  /* ── قەرز ── */
  if (has(n, 'قەرزار', 'قەرز', 'دەفتەری قەرز', 'کێ قەرزارمە', 'قەرزم')) {
    const accounts = toAccounts(c.debts)
    let owedToMe = 0
    let iOwe = 0
    const theyOwe: string[] = []
    const iOweList: string[] = []
    for (const a of accounts) {
      const b = balanceOf(a)
      const v = convert(b.USD, 'USD', cur, rate) + convert(b.IQD, 'IQD', cur, rate)
      if (Math.abs(v) < 0.01) continue
      if (v > 0) { owedToMe += v; theyOwe.push(`${a.name}: ${m(v)}`) }
      else { iOwe += -v; iOweList.push(`${a.name}: ${m(-v)}`) }
    }
    /* «کێ قەرزارمە» = خەڵک قەرزارن · «من قەرزاری کێم» = قەرزی خۆم */
    const theyOweQ = has(n, 'کێ قەرزار', 'قەرزارمن', 'قەرزارمە', 'قەرزارتن', 'خەڵک قەرزار')
    const iOweQ = !theyOweQ && has(n, 'من قەرزار', 'قەرزاری کێم', 'قەرزارم بۆ', 'قەرزی خۆم', 'قەرزەکانم')
    if (iOweQ) {
      return {
        text: iOwe > 0 ? `تۆ ${m(iOwe)} قەرزاریت بۆ ${num(iOweList.length)} کەس.` : 'هیچ قەرزێکت لەسەر نییە.',
        lines: iOweList.slice(0, 8),
        tone: iOwe > 0 ? 'bad' : 'ok',
        actions: [{ label: 'دەفتەری قەرز', to: '/debts' }],
      }
    }
    return {
      text: owedToMe > 0 ? `${num(theyOwe.length)} کەس ${m(owedToMe)} قەرزارتن.` : 'کەس قەرزارت نییە.',
      lines: [...theyOwe.slice(0, 8), ...(iOwe > 0 ? [`— تۆش ${m(iOwe)} قەرزاریت بۆ خەڵکی تر`] : [])],
      tone: owedToMe > 0 ? 'info' : 'ok',
      actions: [{ label: 'دەفتەری قەرز', to: '/debts' }],
      chips: ['من قەرزاری کێم؟'],
    }
  }

  /* ── قیستەکان ── */
  if (has(n, 'قیست', 'دواکەوتو', 'installment')) {
    const dues = openInstallments(c.contracts)
    const late = dues.filter((d) => d.overdue)
    if (has(n, 'دواکەوتو', 'تاخیر') || late.length) {
      return {
        text: late.length ? `${num(late.length)} قیست دواکەوتوون.` : 'هیچ قیستێک دوانەکەوتووە 👍',
        lines: late.slice(0, 8).map((d) => `${d.contract.buyer?.name || '—'} — ${money(d.rest, d.contract.currency)} (${d.dueDate})`),
        tone: late.length ? 'bad' : 'ok',
        actions: [{ label: 'عەقدەکان', to: '/contracts' }],
      }
    }
    return {
      text: `${num(dues.length)} قیستی کراوە ماوە.`,
      lines: dues.slice(0, 8).map((d) => `${d.contract.buyer?.name || '—'} — ${money(d.rest, d.contract.currency)} (${d.dueDate})`),
      actions: [{ label: 'عەقدەکان', to: '/contracts' }],
    }
  }

  /* ── عمولەی عەقدی دەرەکی ── */
  if (has(n, 'عمولە', 'دەلاڵی', 'ناوبژیوان', 'عەقدی دەرەکی')) {
    const r = rangeOf(n)
    const list = c.brokers.filter((d) => d.status !== 'cancelled' && d.date >= r.from && d.date <= r.to)
    const total = list.reduce((s, d) => s + convert(d.fee, d.feeCurrency, cur, d.rate || rate), 0)
    if (has(n, 'چۆن')) return howTo('/brokers', c)
    return {
      text: `لە ${r.label} ${num(list.length)} عەقدی دەرەکی کراوە و ${m(total)} عمولەت وەرگرتووە.`,
      lines: ['ئەم بڕە **قازانجی ساف**ە — هیچ تێچوویەکی لەسەر نییە.',
        ...list.slice(0, 6).map((d) => `${d.seller.name} ← ${d.buyer.name}: ${money(d.fee, d.feeCurrency)}`)],
      tone: 'ok',
      actions: [{ label: 'عەقدی دەرەکی', to: '/brokers' }],
    }
  }

  /* ── نرخی دۆلار ── */
  if (has(n, 'نرخی دۆلار', 'دۆلار چەندە', 'نرخی دراو', 'سعر الدولار')) {
    return {
      text: `نرخی دۆلاری ڕێکخراو: ١ $ = ${money(rate, 'IQD')}`,
      lines: ['ئەمە لە **ڕێکخستن** دەگۆڕدرێت و لە هەموو ژماردنەکاندا بەکاردێت.'],
      actions: [{ label: 'ڕێکخستن', to: '/settings' }],
    }
  }

  /* ── کڕیارەکان ── */
  if (has(n, 'چەند کریار', 'ژمارەی کریار', 'کریارەکان چەند')) {
    return {
      text: `${num(c.customers.length)} کڕیارت تۆمار کردووە.`,
      actions: [{ label: 'کڕیارەکان', to: '/customers' }],
    }
  }

  /* ── گرانترین / هەرزانترین ── */
  if (has(n, 'گرانترین', 'بەنرختری', 'گەورەترین نرخ')) {
    const top = [...c.cars].sort((a, b) => convert(b.askPrice, b.askCurrency, 'USD', rate) - convert(a.askPrice, a.askCurrency, 'USD', rate))[0]
    return top
      ? { text: `گرانترین: ${top.brand} ${top.model} ${top.year} — ${money(top.askPrice, top.askCurrency)}`,
          actions: [{ label: 'بینینی ئۆتۆمبێلەکە', to: `/cars/${top.id}` }] }
      : { text: 'هیچ ئۆتۆمبێلێک نییە.' }
  }
  if (has(n, 'هەرزانترین', 'کەمترین نرخ')) {
    const low = [...c.cars].sort((a, b) => convert(a.askPrice, a.askCurrency, 'USD', rate) - convert(b.askPrice, b.askCurrency, 'USD', rate))[0]
    return low
      ? { text: `هەرزانترین: ${low.brand} ${low.model} ${low.year} — ${money(low.askPrice, low.askCurrency)}`,
          actions: [{ label: 'بینینی ئۆتۆمبێلەکە', to: `/cars/${low.id}` }] }
      : { text: 'هیچ ئۆتۆمبێلێک نییە.' }
  }

  /* ── سەرمایەی بەندکراو ── */
  if (has(n, 'سەرمایە', 'چەند پارەم لە سەیارە', 'بەندکراو')) {
    const stock = c.cars.filter((x) => x.status !== 'sold')
    const total = stock.reduce((s, x) => s + carMoney(x, c.txs, c.contracts, cur, rate).total, 0)
    return {
      text: `${m(total)} سەرمایەت لە ${num(stock.length)} ئۆتۆمبێلدا بەندە.`,
      lines: ['ئەمە نرخی کڕین + تێچووەکانیانە.'],
      actions: [{ label: 'ئۆتۆمبێلەکان', to: '/cars' }],
    }
  }

  /* ── چۆن…؟ / کوا…؟ ── */
  const wantsHow = has(n, 'چۆن', 'چون', 'کوا', 'لەکوێ', 'له کوێ', 'بمبە', 'بمبه', 'بیکەرەوە', 'بردنم')
  const topic = findTopic(n)
  if (topic && (wantsHow || n.split(' ').length <= 3)) {
    if (has(n, 'بمبە', 'بمبه', 'بیکەرەوە', 'بردنم') && !has(n, 'چۆن'))
      return { text: `بەڵێ، دەتبەم بۆ **${topic.label}**.`, actions: [{ label: topic.label, to: topic.to }] }
    return howTo(topic.to, c)
  }

  /* ── گەڕان بەدوای کەس/سەیارە ── */
  const found = search(n, c)
  if (found) return found

  /* ── نەدۆزرایەوە ── */
  if (topic) return howTo(topic.to, c)
  return {
    text: 'ئەوەم تێنەگەیشت 🤔',
    lines: ['هەوڵ بدە بە شێوەیەکی تر بینووسیت، یان یەکێک لەمانە هەڵبژێرە:'],
    chips: SUGGESTIONS,
  }
}

/* ═══════════════ یارمەتی ═══════════════ */

function help(): Answer {
  return {
    text: 'دەتوانم لەم شتانە یارمەتیت بدەم:',
    lines: [
      '**پرسیاری داتا** — چەند سەیارەم هەیە؟ قازانجی ئەم مانگ چەندە؟ کێ قەرزارمە؟',
      '**فێرکردن** — چۆن سەیارە زیاد بکەم؟ چۆن خەرجی تۆمار بکەم؟ چۆن پاڵپشت بگرم؟',
      '**گەڕان** — ناوی کڕیارێک یان سەیارەیەک بنووسە، دەتدۆزمەوە',
      '**بردن** — «بمبە بۆ مەسروفات» و ڕاستەوخۆ دەتبەم',
    ],
    chips: SUGGESTIONS,
  }
}

function howTo(to: string, c: AskCtx): Answer {
  const t = TOPICS.find((x) => x.to === to)
  if (!t) return help()
  if (t.how) {
    return {
      text: `چۆن؟ — **${t.label}**`,
      lines: t.how,
      actions: [{ label: `بمبە بۆ ${t.label}`, to: t.to }],
    }
  }
  void c
  return {
    text: `**${t.label}** لە لیستی بەشەکاندایە.`,
    lines: ['لە کۆمپیوتەر لای ڕاست، لە مۆبایل لە دوگمەی **زیاتر**.'],
    actions: [{ label: `بمبە بۆ ${t.label}`, to: t.to }],
  }
}

/* ═══════════════ بریفینگی ڕۆژانە ═══════════════ */

function briefing(c: AskCtx, cur: Currency, rate: number): Answer {
  const lines: string[] = []
  const b = balances(c.txs, cur, rate)
  const av = c.cars.filter((x) => x.status === 'available').length
  const shop = c.cars.filter((x) => x.status === 'workshop').length
  const late = openInstallments(c.contracts).filter((d) => d.overdue)
  const ym = ymNow()
  const exp = c.txs
    .filter((t) => t.kind === 'out' && t.category === 'expense' && t.date.startsWith(ym))
    .reduce((s, t) => s + convert(t.amount, t.currency, cur, t.rate || rate), 0)
  const p = profitInRange(c.cars, c.txs, c.contracts, cur, rate, `${ym}-01`, `${ym}-31`)

  lines.push(`باڵانسی گشتی: ${money(b.total, cur)}`)
  lines.push(`${num(av)} ئۆتۆمبێل بەردەستە${shop ? ` · ${num(shop)} لە وۆرکشۆپ` : ''}`)
  lines.push(`قازانجی ئەم مانگە: ${money(p.profit, cur)} · خەرجی: ${money(exp, cur)}`)

  const accounts = toAccounts(c.debts)
  let owed = 0
  for (const a of accounts) {
    const bal = balanceOf(a)
    const v = convert(bal.USD, 'USD', cur, rate) + convert(bal.IQD, 'IQD', cur, rate)
    if (v > 0) owed += v
  }
  if (owed > 0) lines.push(`خەڵک ${money(owed, cur)} قەرزارتن`)

  /* خەرجی مانگانەی نەدراو */
  const tpls = c.settings.expenseTemplates || []
  const paid = new Set(c.txs.filter((t) => t.category === 'expense' && t.date.startsWith(ym)).map((t) => t.title))
  const pending = tpls.filter((t) => !paid.has(t.title))

  const actions: Action[] = []
  if (late.length) actions.push({ label: `${num(late.length)} قیستی دواکەوتوو`, to: '/contracts' })
  if (pending.length) actions.push({ label: `${num(pending.length)} خەرجیی مانگانە ماوە`, to: '/expenses' })
  actions.push({ label: 'داشبۆرد', to: '/' })

  return {
    text: late.length
      ? `⚠ ${num(late.length)} قیست دواکەوتوون — گرنگترین شتی ئەمڕۆ.`
      : 'هەموو شتێک ڕێکە 👍',
    lines,
    tone: late.length ? 'bad' : 'ok',
    actions,
    chips: ['کێ قەرزارمە؟', 'قازانجی ئەم مانگ چەندە؟'],
  }
}

/* ═══════════════ گەڕان ═══════════════ */

function search(n: string, c: AskCtx): Answer | null {
  if (n.length < 3) return null

  const car = c.cars.find((x) => norm(`${x.brand} ${x.model} ${x.plate || ''} ${x.vin}`).includes(n))
  if (car) {
    return {
      text: `${car.brand} ${car.model} ${car.year} — ${CAR_STATUS[car.status] || car.status}`,
      lines: [
        `ڕەنگ: ${car.color} · کیلۆمەتر: ${num(car.km)}`,
        `نرخی داواکراو: ${money(car.askPrice, car.askCurrency)}`,
        car.plate ? `پلێت: ${car.plate}` : '',
      ].filter(Boolean),
      actions: [{ label: 'بینینی ئۆتۆمبێلەکە', to: `/cars/${car.id}` }],
    }
  }

  const acc = toAccounts(c.debts).find((a) => norm(`${a.name} ${a.phone || ''}`).includes(n))
  if (acc) {
    const b = balanceOf(acc)
    const v = b.USD !== 0 ? b.USD : b.IQD
    const k: Currency = b.USD !== 0 ? 'USD' : 'IQD'
    return {
      text: Math.abs(v) < 0.01
        ? `حسابی ${acc.name} پاکە.`
        : v > 0 ? `${acc.name} ${money(v, k)} قەرزارتە.` : `تۆ ${money(-v, k)} قەرزاری ${acc.name}ی.`,
      lines: [`${num(acc.entries.length)} جوڵەی تۆمارکراو`],
      tone: v > 0 ? 'info' : v < 0 ? 'bad' : 'ok',
      actions: [{ label: 'کشف حساب', to: `/debts/${acc.id}` }],
    }
  }

  const cus = c.customers.find((x) => norm(`${x.name} ${x.phone}`).includes(n))
  if (cus) {
    return {
      text: `${cus.name} — ${cus.phone}`,
      lines: [cus.city, cus.address].filter(Boolean) as string[],
      actions: [{ label: 'کڕیارەکان', to: '/customers' }],
    }
  }

  return null
}
