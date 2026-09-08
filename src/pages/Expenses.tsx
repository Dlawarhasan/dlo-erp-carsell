/**
 * بەشی مەسروفات — خەرجی ڕۆژانەی پێشانگا.
 *
 * جیاوازی نێوان ئەم بەشە و «تێچووی ئۆتۆمبێل»:
 *   • مەسروفات = خەرجی گشتیی پێشانگا (کرێ، مووچە، کارەبا…) — لە قازانجی گشتی کەم دەبێتەوە
 *   • تێچوو    = خەرجی تایبەت بە سەیارەیەک — لە قازانجی هەر سەیارەیەک کەم دەبێتەوە
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Receipt, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, Minus,
  Building2, Users, Zap, Wifi, Megaphone, Fuel, UtensilsCrossed, Sparkles, Printer,
  Landmark, Wrench, Repeat, Check, Car, Pencil, Loader2, Banknote,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { EditInfo, Empty, Field, MoneyInput, Picker, Segmented, Sheet, useConfirm } from '../components/ui'
import { withEdit } from '../lib/edits'
import { accountBalance } from '../lib/finance'
import { EXPENSE_CATEGORIES } from '../lib/catalog'
import { convert, fmtDateShort, money, num, todayISO, uid } from '../lib/format'
import { fx } from '../lib/feedback'
import type { Currency, ExpenseTemplate, Tx, TxCategory } from '../lib/types'

/* ═══════════════ ناوی مانگەکان و ئامرازی بەروار ═══════════════ */

const KU_MONTHS = [
  'کانوونی دووەم', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
  'تەمووز', 'ئاب', 'ئەیلوول', 'تشرینی یەکەم', 'تشرینی دووەم', 'کانوونی یەکەم',
]

const thisYm = () => todayISO().slice(0, 7)

const shiftYm = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const ymLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return `${KU_MONTHS[m - 1]} ${y}`
}

/* ═══════════════ ڕەنگ و ئایکۆنی جۆرەکان ═══════════════ */

/* ڕەنگەکان تێکەڵکراون تا دوو جۆری تەنیشت یەک لە یەک نەچن */
const PALETTE = [
  '#e11d48', '#0891b2', '#f97316', '#4f46e5', '#059669', '#c026d3',
  '#2563eb', '#d97706', '#7c3aed', '#65a30d', '#db2777', '#64748b',
]

const ICONS: Record<string, typeof Receipt> = {
  'کرێی پێشانگا': Building2,
  'مووچەی کارمەند': Users,
  'کارەبا و ئاو': Zap,
  'ئینتەرنێت و تەلەفۆن': Wifi,
  'ڕیکلام و بانگەشە': Megaphone,
  'سووتەمەنی و گواستنەوە': Fuel,
  'خواردن و چێشتخانە': UtensilsCrossed,
  'پاککردنەوە': Sparkles,
  'مەکتەبی و پرینت': Printer,
  'باج و ڕەسم': Landmark,
  'چاککردنەوەی گشتی': Wrench,
}

/** ڕەنگی جێگیر بۆ هەر جۆرێک — تەنانەت بۆ جۆری دەستکردیش */
const hueOf = (title: string) => {
  const i = EXPENSE_CATEGORIES.indexOf(title)
  if (i >= 0) return PALETTE[i % PALETTE.length]
  let h = 0
  for (let k = 0; k < title.length; k++) h = (h * 31 + title.charCodeAt(k)) >>> 0
  return PALETTE[h % PALETTE.length]
}

const IconOf = ({ title, size = 18 }: { title: string; size?: number }) => {
  const I = ICONS[title] || Receipt
  return <I size={size} />
}

/* ═══════════════ لاپەڕە ═══════════════ */

export default function Expenses() {
  const nav = useNavigate()
  const { txs, users, settings, save, remove, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()

  const [ym, setYm] = useState(thisYm)
  const [cur, setCur] = useState<Currency>('USD')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [tpl, setTpl] = useState<ExpenseTemplate | null>(null)
  const rate = settings.usdRate
  const editable = can('money.edit')

  const [f, setF] = useState<Partial<Tx>>({
    date: todayISO(), amount: 0, currency: 'USD', account: 'cash', title: EXPENSE_CATEGORIES[0], note: '',
  })

  const conv = (t: { amount: number; currency: Currency; rate?: number }) =>
    convert(t.amount, t.currency, cur, t.rate || rate)

  /** ناسنامەی بەکارهێنەر → ناو، بۆ پیشاندانی «کێ تۆماری کردووە» */
  const userName = useMemo(() => {
    const m: Record<string, string> = {}
    for (const u of users) m[u.id] = u.name
    return m
  }, [users])

  /* ── خەرجییەکانی ئەم مانگە ── */
  const rows = useMemo(
    () =>
      txs
        .filter((t) => t.kind === 'out' && t.category === 'expense' && t.date.startsWith(ym))
        .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)),
    [txs, ym],
  )

  const total = useMemo(() => rows.reduce((s, t) => s + conv(t), 0), [rows, cur, rate])

  /* ── بەراورد لەگەڵ مانگی ڕابردوو ── */
  const prevTotal = useMemo(() => {
    const p = shiftYm(ym, -1)
    return txs
      .filter((t) => t.kind === 'out' && t.category === 'expense' && t.date.startsWith(p))
      .reduce((s, t) => s + conv(t), 0)
  }, [txs, ym, cur, rate])

  const diffPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null

  /* ── تێچووی ئۆتۆمبێلەکان — جیا، بۆ ڕوونکردنەوە ── */
  const carCost = useMemo(
    () =>
      txs
        .filter((t) => t.kind === 'out' && t.category === 'car_cost' && t.date.startsWith(ym))
        .reduce((s, t) => s + conv(t), 0),
    [txs, ym, cur, rate],
  )

  /* ── دابەشکردن بەپێی جۆر ── */
  const byCat = useMemo(() => {
    const map: Record<string, { sum: number; n: number }> = {}
    for (const t of rows) {
      const k = t.title || 'خەرجی تر'
      if (!map[k]) map[k] = { sum: 0, n: 0 }
      map[k].sum += conv(t)
      map[k].n++
    }
    return Object.entries(map)
      .map(([title, v]) => ({ title, ...v }))
      .sort((a, b) => b.sum - a.sum)
  }, [rows, cur, rate])

  const maxCat = byCat[0]?.sum || 1

  /* ── گرووپکردن بەپێی ڕۆژ ── */
  const byDay = useMemo(() => {
    const map: Record<string, Tx[]> = {}
    for (const t of rows) (map[t.date] ||= []).push(t)
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [rows])

  /* ── قاڵبەکانی خەرجی مانگانە ── */
  const templates = settings.expenseTemplates || []
  const paidTitles = useMemo(() => new Set(rows.map((t) => t.title)), [rows])
  const pendingCount = templates.filter((t) => !paidTitles.has(t.title)).length

  /* ═══════════════ کردارەکان ═══════════════ */

  const record = async (data: {
    date: string; title: string; amount: number; currency: Currency; account: 'cash' | 'bank'; note?: string
    /** ئەگەر دەستکاری خەرجییەکی تۆمارکراو بێت */
    prev?: Tx
  }) => {
    if (!data.amount || !data.title) {
      say('بڕ و ناونیشان پێویستە', 'bad')
      return false
    }
    const tolerance = data.currency === 'USD' ? 0.011 : 1
    /* لە دەستکاریدا تەنها ئەو گۆڕانکارییە ڕێگری لێدەکرێت کە باڵانس نەرێنی و خراپتر بکات */
    const others = data.prev ? txs.filter((t) => t.id !== data.prev!.id) : txs
    const now = accountBalance(txs, data.account, data.currency)
    const next = accountBalance(others, data.account, data.currency) - data.amount
    if (next < -tolerance && next < now) {
      say(`باڵانسی ${data.account === 'cash' ? 'سندوق' : 'بانک'} بەس نییە`, 'bad')
      return false
    }
    const base: Tx = {
      ...(data.prev || {}),
      id: data.prev?.id || uid('tx'),
      date: data.date,
      kind: 'out' as const,
      amount: data.amount,
      currency: data.currency,
      rate: data.prev?.rate || rate,
      account: data.account,
      category: 'expense' as TxCategory,
      title: data.title,
      note: data.note,
      createdAt: data.prev?.createdAt || Date.now(),
      createdBy: data.prev?.createdBy || user?.uid,
    }
    await save('txs', data.prev ? withEdit(base, user) : base)
    await log(data.prev ? 'گۆڕینی خەرجی' : 'تۆمارکردنی خەرجی', 'txs', base.id, `${data.title} — ${money(data.amount, data.currency)}`)
    fx('money')
    return true
  }

  const addExpense = async () => {
    if (saving) return
    setSaving(true)
    try {
      const prev = f.id ? txs.find((t) => t.id === f.id) : undefined
      const ok = await record({
        date: f.date || todayISO(),
        title: f.title || '',
        amount: f.amount || 0,
        currency: f.currency as Currency,
        account: f.account as 'cash' | 'bank',
        note: f.note,
        prev,
      })
      if (!ok) return
      say(prev ? 'خەرجییەکە نوێ کرایەوە' : 'خەرجی تۆمارکرا')
      /* بەرواری تۆمارکراو دەمێنێتەوە بۆ خێراکردنی تۆمارێکی تر */
      setF({ date: f.date, amount: 0, currency: f.currency, account: f.account, title: f.title, note: '' })
      setOpen(false)
    } catch {
      say('نەتوانرا تۆمار بکرێت', 'bad')
    } finally {
      setSaving(false)
    }
  }

  const payTemplate = async (t: ExpenseTemplate) => {
    if (saving) return
    setSaving(true)
    try {
      const day = Math.min(t.day || Number(todayISO().slice(8)), 28)
      const date = ym === thisYm() ? todayISO() : `${ym}-${String(day).padStart(2, '0')}`
      const ok = await record({ date, title: t.title, amount: t.amount, currency: t.currency, account: t.account })
      if (ok) say(`${t.title} تۆمارکرا`)
    } catch {
      say('نەتوانرا تۆمار بکرێت', 'bad')
    } finally {
      setSaving(false)
    }
  }

  const saveTemplate = async () => {
    if (!tpl || saving) return
    if (!tpl.title || !tpl.amount) return say('ناو و بڕ پێویستە', 'bad')
    setSaving(true)
    try {
      const list = templates.some((x) => x.id === tpl.id)
        ? templates.map((x) => (x.id === tpl.id ? tpl : x))
        : [...templates, tpl]
      await save('settings', { ...settings, expenseTemplates: list })
      say('پاشەکەوتکرا')
      setTpl(null)
    } catch {
      say('نەتوانرا پاشەکەوت بکرێت', 'bad')
    } finally {
      setSaving(false)
    }
  }

  const delTemplate = async (id: string) => {
    if (!(await ask('ئەم قاڵبە بسڕدرێتەوە؟ تۆمارە کۆنەکان دەمێننەوە.'))) return
    await save('settings', { ...settings, expenseTemplates: templates.filter((x) => x.id !== id) })
    say('سڕایەوە')
    setTpl(null)
  }

  const delTx = async (t: Tx) => {
    if (!(await ask(`«${t.title}» بە بڕی ${money(t.amount, t.currency)} بسڕدرێتەوە؟`))) return
    if (await remove('txs', t.id, t.title)) say('سڕایەوە')
  }

  /* ═══════════════ ڕەندەر ═══════════════ */

  const atNow = ym >= thisYm()

  return (
    <>
      <PageHead
        title="مەسروفات"
        sub={<span>خەرجیی گشتیی پێشانگا</span>}
        action={
          editable ? (
            <button onClick={() => setOpen(true)} className="btn-brand shrink-0">
              <Plus size={17} /> <span className="hidden sm:inline">خەرجی</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        {/* ── گۆڕینی مانگ ── */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-line rounded-xl grow overflow-hidden">
            {/* لە ڕاست‌بەچەپدا: تیری ڕاست = دواوە · تیری چەپ = پێشەوە */}
            <button onClick={() => setYm(shiftYm(ym, -1))} aria-label="مانگی پێشوو"
              className="p-2.5 text-muted hover:text-ink">
              <ChevronRight size={19} />
            </button>
            <div className="grow text-center py-2">
              <p className="font-bold text-[15px] leading-tight">{ymLabel(ym)}</p>
              {!atNow && (
                <button onClick={() => setYm(thisYm())} className="text-[11px] text-brand font-medium mt-0.5">
                  گەڕانەوە بۆ ئەم مانگە
                </button>
              )}
            </div>
            <button onClick={() => setYm(shiftYm(ym, 1))} disabled={atNow} aria-label="مانگی داهاتوو"
              className="p-2.5 text-muted hover:text-ink disabled:opacity-30 disabled:pointer-events-none">
              <ChevronLeft size={19} />
            </button>
          </div>
          <div className="w-32 shrink-0">
            <Segmented value={cur} onChange={setCur} size="sm"
              options={[{ v: 'USD' as Currency, label: 'دۆلار' }, { v: 'IQD' as Currency, label: 'دینار' }]} />
          </div>
        </div>

        {/* ── کارتی سەرەکی ── */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute -top-10 -start-10 w-40 h-40 rounded-full bg-bad/10 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] text-muted font-medium">کۆی مەسروفات</p>
                <p className="text-[30px] sm:text-[34px] font-bold text-bad leading-tight mt-1 num">{money(total, cur)}</p>
              </div>
              <span className="w-11 h-11 rounded-2xl bg-bad/10 text-bad grid place-items-center shrink-0">
                <Receipt size={22} />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[12.5px]">
              {diffPct === null ? (
                <span className="text-muted">مانگی ڕابردوو تۆمارێکی نەبووە</span>
              ) : (
                <span className={`inline-flex items-center gap-1 font-medium ${
                  diffPct > 0 ? 'text-bad' : diffPct < 0 ? 'text-ok' : 'text-muted'}`}>
                  {diffPct > 0 ? <TrendingUp size={14} /> : diffPct < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                  <span className="num">{Math.abs(diffPct)}%</span>
                  {diffPct > 0 ? 'زیاتر لە مانگی ڕابردوو' : diffPct < 0 ? 'کەمتر لە مانگی ڕابردوو' : 'وەک مانگی ڕابردوو'}
                </span>
              )}
              <span className="text-muted">
                مانگی ڕابردوو: <span className="num text-ink font-medium">{money(prevTotal, cur)}</span>
              </span>
              <span className="text-muted">
                <span className="num text-ink font-medium">{num(rows.length)}</span> تۆمار
              </span>
            </div>
          </div>
        </div>

        {/* ── خەرجی مانگانە ── */}
        {(templates.length > 0 || editable) && (
          <div className="card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Repeat size={17} className="text-brand" /> خەرجی مانگانە
                {pendingCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bad/12 text-bad num">{pendingCount}</span>
                )}
              </h3>
              {editable && (
                <button onClick={() => setTplOpen(true)} className="text-[13px] text-brand font-medium">
                  ڕێکخستن
                </button>
              )}
            </div>

            {templates.length === 0 ? (
              <p className="text-[13px] text-muted leading-6">
                خەرجییە دووبارەبووەکانت زیاد بکە — وەک کرێی پێشانگا و مووچە — دواتر بە یەک دەستلێدان هەموو مانگێک تۆماریان دەکەیت.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {templates.map((t) => {
                  const paid = paidTitles.has(t.title)
                  return (
                    <div key={t.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                        paid ? 'border-ok/30 bg-ok/[0.06]' : 'border-line bg-surface2'}`}>
                      <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                        style={{ background: hueOf(t.category) + '1f', color: hueOf(t.category) }}>
                        <IconOf title={t.category} size={17} />
                      </span>
                      <div className="min-w-0 grow">
                        <p className="font-medium text-[14px] truncate">{t.title}</p>
                        <p className="text-[12px] text-muted num">
                          {money(t.amount, t.currency)}
                          {t.day ? ` · ڕۆژی ${t.day}` : ''}
                        </p>
                      </div>
                      {paid ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-ok font-medium shrink-0">
                          <Check size={15} /> دراوە
                        </span>
                      ) : editable ? (
                        <button onClick={() => payTemplate(t)} disabled={saving}
                          className="btn-quiet !py-1.5 !px-3 !text-[12.5px] shrink-0">
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Banknote size={14} />} بیدە
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── دابەشکردن بەپێی جۆر ── */}
        {byCat.length > 0 && (
          <div className="card p-4">
            <h3 className="font-bold mb-4">دابەشکردن بەپێی جۆر</h3>
            <div className="space-y-3.5">
              {byCat.map((c) => {
                const pct = total > 0 ? (c.sum / total) * 100 : 0
                const col = hueOf(c.title)
                return (
                  <div key={c.title}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
                        style={{ background: col + '1f', color: col }}>
                        <IconOf title={c.title} size={15} />
                      </span>
                      <span className="text-[13.5px] font-medium grow min-w-0 truncate">{c.title}</span>
                      <span className="text-[12px] text-muted num shrink-0">{Math.round(pct)}%</span>
                      <span className="text-[13.5px] font-bold num shrink-0">{money(c.sum, cur)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(3, (c.sum / maxCat) * 100)}%`, background: col }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── تێچووی ئۆتۆمبێل — جیاواز ── */}
        {carCost > 0 && (
          <button onClick={() => nav('/cars')} className="card p-4 w-full text-start flex items-center gap-3 hover:border-brand/40 transition">
            <span className="w-10 h-10 rounded-xl bg-info/12 text-info grid place-items-center shrink-0">
              <Car size={19} />
            </span>
            <div className="grow min-w-0">
              <p className="font-medium text-[14px]">تێچووی ئۆتۆمبێلەکان لەم مانگە</p>
              <p className="text-[12px] text-muted leading-5 mt-0.5">
                لە مەسروفاتی گشتی نەژمێردراوە — لە قازانجی هەر سەیارەیەک کەم دەبێتەوە
              </p>
            </div>
            <span className="font-bold num shrink-0">{money(carCost, cur)}</span>
          </button>
        )}

        {/* ── لیستی خەرجییەکان ── */}
        {rows.length === 0 ? (
          <Empty
            icon={<Receipt size={26} />}
            title="هیچ خەرجییەک نییە"
            sub={`لە ${ymLabel(ym)} دا هیچ مەسروفاتێک تۆمار نەکراوە.`}
            action={editable ? <button onClick={() => setOpen(true)} className="btn-brand"><Plus size={17} /> خەرجی تۆمار بکە</button> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {byDay.map(([date, list]) => (
              <div key={date} className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface2 border-b border-line">
                  <span className="text-[12.5px] font-medium text-muted num">{fmtDateShort(date)}</span>
                  <span className="text-[12.5px] font-bold num">
                    {money(list.reduce((s, t) => s + conv(t), 0), cur)}
                  </span>
                </div>
                <div className="divide-y divide-line">
                  {list.map((t) => {
                    const col = hueOf(t.title)
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                          style={{ background: col + '1f', color: col }}>
                          <IconOf title={t.title} size={17} />
                        </span>
                        <div className="min-w-0 grow">
                          <p className="font-medium text-[14px] truncate">{t.title}</p>
                          <p className="text-[12px] text-muted truncate">
                            {t.account === 'bank' ? 'بانک' : 'سندوق'}
                            {t.note ? ` · ${t.note}` : ''}
                            {t.createdBy && userName[t.createdBy] ? ` · ${userName[t.createdBy]}` : ''}
                          </p>
                          <EditInfo edits={t.edits} at={t.editedAt} by={t.editedByName} />
                        </div>
                        <span className="font-bold text-bad num shrink-0">{money(t.amount, t.currency)}</span>
                        {editable && (
                          <button
                            onClick={() => { setF({ ...t }); setOpen(true) }}
                            className="p-1.5 text-muted hover:text-ink shrink-0"
                            aria-label="گۆڕینی خەرجی"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {editable && (
                          <button onClick={() => delTx(t)} className="p-1.5 -me-1.5 text-muted hover:text-bad shrink-0" aria-label="سڕینەوەی خەرجی">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* کۆی کۆتایی */}
            <div className="card p-4 flex items-center justify-between bg-surface2">
              <span className="font-bold">کۆی گشتیی {ymLabel(ym)}</span>
              <span className="text-[19px] font-bold text-bad num">{money(total, cur)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ زیادکردنی خەرجی ═══ */}
      <Sheet
        open={open}
        onClose={() => { setOpen(false); setF((p) => ({ ...p, id: undefined })) }}
        title={f.id ? 'گۆڕینی خەرجی' : 'خەرجی نوێ'}
        footer={
          <>
            <button onClick={() => { setOpen(false); setF((p) => ({ ...p, id: undefined })) }} className="btn-quiet">پاشگەزبوونەوە</button>
            <button onClick={addExpense} disabled={saving} className="btn-brand">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {f.id ? 'نوێکردنەوە' : 'تۆمارکردن'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {f.id && <EditInfo edits={f.edits} at={f.editedAt} by={f.editedByName} />}
          {/* جۆرەکان وەک دوگمە — خێراترین ڕێگە */}
          <Field label="جۆری خەرجی">
            <div className="flex flex-wrap gap-1.5">
              {EXPENSE_CATEGORIES.map((c) => {
                const on = f.title === c
                const col = hueOf(c)
                return (
                  <button key={c} type="button" onClick={() => setF({ ...f, title: c })}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12.5px] font-medium transition ${
                      on ? 'text-white border-transparent' : 'border-line bg-surface2 text-muted hover:text-ink'}`}
                    style={on ? { background: col } : undefined}>
                    <IconOf title={c} size={14} /> {c}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="ناونیشان" hint="دەتوانیت بیگۆڕیت بۆ وردەکاریی زیاتر">
            <Picker value={f.title || ''} onChange={(v) => setF({ ...f, title: v })} options={EXPENSE_CATEGORIES} allowCustom />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="بڕ">
              <MoneyInput value={f.amount || 0} onChange={(n) => setF({ ...f, amount: n })} placeholder="0" />
            </Field>
            <Field label="دراو">
              <Segmented value={f.currency as Currency} onChange={(v) => setF({ ...f, currency: v })}
                options={[{ v: 'USD' as Currency, label: 'دۆلار' }, { v: 'IQD' as Currency, label: 'دینار' }]} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="بەروار">
              <input type="date" dir="ltr" value={f.date || todayISO()}
                onChange={(e) => setF({ ...f, date: e.target.value })} className="field num text-start" />
            </Field>
            <Field label="لە کوێوە">
              <Segmented value={f.account as 'cash' | 'bank'} onChange={(v) => setF({ ...f, account: v })}
                options={[{ v: 'cash' as const, label: 'سندوق' }, { v: 'bank' as const, label: 'بانک' }]} />
            </Field>
          </div>

          <Field label="تێبینی">
            <input value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })}
              className="field" placeholder="ئارەزوومەندانە" />
          </Field>

          <p className="text-[12px] text-muted bg-surface2 border border-line rounded-xl p-3 leading-6">
            باڵانسی ئێستا:{' '}
            <span className="num font-medium text-ink">
              {money(accountBalance(txs, (f.account as 'cash' | 'bank') || 'cash', (f.currency as Currency) || 'USD'), (f.currency as Currency) || 'USD')}
            </span>
          </p>
        </div>
      </Sheet>

      {/* ═══ ڕێکخستنی قاڵبەکان ═══ */}
      <Sheet
        open={tplOpen}
        onClose={() => { setTplOpen(false); setTpl(null) }}
        title="خەرجی مانگانە"
        footer={
          tpl ? (
            <>
              {templates.some((x) => x.id === tpl.id) && (
                <button onClick={() => delTemplate(tpl.id)} className="btn-quiet !text-bad me-auto">
                  <Trash2 size={16} /> سڕینەوە
                </button>
              )}
              <button onClick={() => setTpl(null)} className="btn-quiet">پاشگەزبوونەوە</button>
              <button onClick={saveTemplate} disabled={saving} className="btn-brand">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} پاشەکەوت
              </button>
            </>
          ) : (
            <button
              onClick={() => setTpl({ id: uid('etpl'), title: EXPENSE_CATEGORIES[0], category: EXPENSE_CATEGORIES[0], amount: 0, currency: 'USD', account: 'cash', day: 1 })}
              className="btn-brand">
              <Plus size={16} /> قاڵبی نوێ
            </button>
          )
        }
      >
        {tpl ? (
          <div className="space-y-4">
            <Field label="جۆر">
              <Picker value={tpl.category} options={EXPENSE_CATEGORIES}
                onChange={(v) => setTpl({ ...tpl, category: v, title: tpl.title === tpl.category ? v : tpl.title })} />
            </Field>
            <Field label="ناونیشان" hint="ئەم ناوە بەکاردێت بۆ زانینی ئەوەی دراوە یان نا">
              <input value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} className="field" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="بڕ">
                <MoneyInput value={tpl.amount} onChange={(n) => setTpl({ ...tpl, amount: n })} placeholder="0" />
              </Field>
              <Field label="دراو">
                <Segmented value={tpl.currency} onChange={(v) => setTpl({ ...tpl, currency: v })}
                  options={[{ v: 'USD' as Currency, label: 'دۆلار' }, { v: 'IQD' as Currency, label: 'دینار' }]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ڕۆژی مانگ" hint="١ — ٢٨">
                <input type="number" min={1} max={28} dir="ltr" value={tpl.day || 1}
                  onChange={(e) => setTpl({ ...tpl, day: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })}
                  className="field num text-start" />
              </Field>
              <Field label="لە کوێوە">
                <Segmented value={tpl.account} onChange={(v) => setTpl({ ...tpl, account: v })}
                  options={[{ v: 'cash' as const, label: 'سندوق' }, { v: 'bank' as const, label: 'بانک' }]} />
              </Field>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <Empty icon={<Repeat size={24} />} title="هێشتا قاڵبێک نییە"
            sub="خەرجییە دووبارەبووەکان زیاد بکە تا هەموو مانگێک بە یەک دەستلێدان تۆماریان بکەیت." />
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <button key={t.id} onClick={() => setTpl(t)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-line bg-surface2 text-start">
                <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{ background: hueOf(t.category) + '1f', color: hueOf(t.category) }}>
                  <IconOf title={t.category} size={17} />
                </span>
                <div className="min-w-0 grow">
                  <p className="font-medium text-[14px] truncate">{t.title}</p>
                  <p className="text-[12px] text-muted num">{money(t.amount, t.currency)}{t.day ? ` · ڕۆژی ${t.day}` : ''}</p>
                </div>
                <Pencil size={15} className="text-muted shrink-0" />
              </button>
            ))}
          </div>
        )}
      </Sheet>

      {node}
    </>
  )
}
