import { useMemo, useState } from 'react'
import {
  Plus,
  NotebookPen,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Trash2,
  CalendarClock,
  Check,
  Wallet,
  Loader2,
  AlertTriangle,
  CircleCheckBig,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Field, MoneyInput, Picker, Segmented, SearchBar, Empty, Sheet, Stat, Switch, useConfirm } from '../components/ui'
import { addMonths, fmtDateShort, fold, money, num, todayISO, uid } from '../lib/format'
import { fx } from '../lib/feedback'
import type { Currency, Debt, DebtKind, DebtPayment, Installment, Tx } from '../lib/types'

/* ═════════════ یارمەتیدەرەکان ═════════════ */

export const debtPaid = (d: Debt) => (d.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
export const debtLeft = (d: Debt) => Math.max(0, (d.amount || 0) - debtPaid(d))

/** کۆی ماوە بە دراوێکی دیاریکراو */
function totalLeft(list: Debt[], to: Currency, rate: number) {
  return list.reduce((s, d) => {
    const left = debtLeft(d)
    if (!left) return s
    if (d.currency === to) return s + left
    const r = d.rate || rate
    return s + (to === 'USD' ? left / r : left * r)
  }, 0)
}

const isOverdue = (d: Debt) => {
  if (d.status === 'closed' || !debtLeft(d)) return false
  const today = todayISO()
  if (d.installments?.length) return d.installments.some((i) => i.paid < i.amount && i.dueDate < today)
  return !!d.dueDate && d.dueDate < today
}

const KIND_KU: Record<DebtKind, string> = {
  receivable: 'خەڵک قەرزارمە',
  payable: 'من قەرزارم',
}

const REASONS = [
  'فرۆشتنی ئۆتۆمبێل (پێش سیستەم)',
  'قەرزی کەسی',
  'سلف',
  'کڕینی ئۆتۆمبێل',
  'چاککردنەوە و تێچوو',
  'کرێ',
  'شتی تر',
]

/* ═════════════ لاپەڕە ═════════════ */

export default function Debts() {
  const { debts, customers, settings, save, remove, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()

  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'receivable' | 'payable'>('all')
  const [onlyOpen, setOnlyOpen] = useState(true)
  const [cur, setCur] = useState<Currency>('USD')
  const [edit, setEdit] = useState<Debt | null>(null)
  const [payFor, setPayFor] = useState<Debt | null>(null)

  const editable = can('money.edit')

  const list = useMemo(() => {
    const needle = fold(q)
    return (debts || [])
      .filter((d) => (tab === 'all' ? true : d.kind === tab))
      .filter((d) => (onlyOpen ? d.status !== 'closed' && debtLeft(d) > 0 : true))
      .filter((d) =>
        !needle
          ? true
          : fold(`${d.personName} ${d.phone || ''} ${d.reason || ''} ${d.carInfo || ''} ${d.note || ''}`).includes(needle),
      )
      .sort((a, b) => {
        const ao = isOverdue(a) ? 0 : 1
        const bo = isOverdue(b) ? 0 : 1
        if (ao !== bo) return ao - bo
        return (b.date || '').localeCompare(a.date || '')
      })
  }, [debts, q, tab, onlyOpen])

  const open = (debts || []).filter((d) => d.status !== 'closed' && debtLeft(d) > 0)
  const inSum = totalLeft(open.filter((d) => d.kind === 'receivable'), cur, settings.usdRate)
  const outSum = totalLeft(open.filter((d) => d.kind === 'payable'), cur, settings.usdRate)
  const overdue = open.filter(isOverdue)
  /** قەرز هەیە بەڵام هەموویان تەواو بوون */
  const allDone = (debts || []).length > 0 && open.length === 0 && !q

  /* ── سڕینەوە ── */
  const del = async (d: Debt) => {
    if (!(await ask(`قەرزی «${d.personName}» بسڕدرێتەوە؟ ئەم کردارە ناگەڕێتەوە.`))) return
    await remove('debts', d.id, d.personName)
    say('سڕایەوە', 'info')
  }

  /* ── داخستن/کردنەوە بە دەست ── */
  const toggleClose = async (d: Debt) => {
    const next: Debt = { ...d, status: d.status === 'closed' ? 'open' : 'closed', updatedAt: Date.now() }
    await save('debts', next)
    await log(next.status === 'closed' ? 'داخستنی قەرز' : 'کردنەوەی قەرز', 'debts', d.id, d.personName)
    say(next.status === 'closed' ? 'وەک تەواوبوو نیشانە کرا' : 'کرایەوە')
  }

  return (
    <>
      <PageHead
        title="دەفتەری قەرز"
        sub="قەرزە کۆنەکانی پێش سیستەم"
        action={
          editable && (
            <button onClick={() => setEdit(blank(user?.uid, user?.name))} className="btn-brand">
              <Plus size={17} />
              <span className="hidden sm:inline">قەرزی نوێ</span>
            </button>
          )
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* ── پوختە ── */}
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="خەڵک قەرزارمە"
            value={<span className="num">{money(inSum, cur)}</span>}
            sub={`${open.filter((d) => d.kind === 'receivable').length} کەس`}
            tone="ok"
            icon={<ArrowDownLeft size={17} />}
          />
          <Stat
            label="من قەرزارم"
            value={<span className="num">{money(outSum, cur)}</span>}
            sub={`${open.filter((d) => d.kind === 'payable').length} کەس`}
            tone="bad"
            icon={<ArrowUpRight size={17} />}
          />
        </div>

        <div className="card p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">جیاوازی</p>
            <p className={`text-lg font-bold num ${inSum - outSum >= 0 ? 'text-ok' : 'text-bad'}`}>
              {money(inSum - outSum, cur)}
            </p>
          </div>
          <div className="w-32 shrink-0">
            <Segmented
              size="sm"
              value={cur}
              onChange={setCur}
              options={[
                { v: 'USD' as Currency, label: '$' },
                { v: 'IQD' as Currency, label: 'د.ع' },
              ]}
            />
          </div>
        </div>

        {overdue.length > 0 && (
          <div className="card p-3.5 border-warn/40 bg-warn/10 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-warn shrink-0 mt-0.5" />
            <p className="text-sm leading-6">
              <b className="num">{overdue.length}</b> قەرز بەرواری دیاریکراوی تێپەڕاندووە
            </p>
          </div>
        )}

        {/* ── پاڵاوتن ── */}
        <div className="space-y-3">
          <SearchBar value={q} onChange={setQ} placeholder="بگەڕێ بە ناو، ژمارە، هۆکار..." />
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { v: 'all' as const, label: 'هەموو' },
              { v: 'receivable' as const, label: 'بۆم' },
              { v: 'payable' as const, label: 'لەسەرم' },
            ]}
          />
          <label className="flex items-center gap-2.5 text-sm text-muted cursor-pointer w-fit">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="w-4 h-4 accent-brand" />
            تەنها ئەوانەی ماونەتەوە
          </label>
        </div>

        {/* ── لیست ── */}
        {list.length === 0 ? (
          <Empty
            icon={allDone ? <CircleCheckBig size={26} /> : <NotebookPen size={26} />}
            title={
              (debts || []).length === 0
                ? 'دەفتەرەکە بەتاڵە'
                : allDone
                  ? 'هیچ قەرزێک نەماوە 🎉'
                  : 'هیچ نەدۆزرایەوە'
            }
            sub={
              (debts || []).length === 0
                ? 'قەرزە کۆنەکانی پێش سیستەم لێرە تۆمار بکە — ئەوانەی خەڵک بۆت هەیانە و ئەوانەی لەسەرتن.'
                : allDone
                  ? 'هەموو قەرزەکان تەواو بوون. بۆ بینینی ئەوانەی کۆتاییان هات، نیشانەی «تەنها ئەوانەی ماونەتەوە» لابدە.'
                  : 'گەڕانەکەت یان پاڵاوتنەکە بگۆڕە.'
            }
            action={
              editable && (
                <button onClick={() => setEdit(blank(user?.uid, user?.name))} className="btn-brand">
                  <Plus size={17} /> {(debts || []).length === 0 ? 'یەکەم قەرز' : 'قەرزی نوێ'}
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-2.5">
            {list.map((d) => (
              <DebtRow
                key={d.id}
                d={d}
                editable={editable}
                onEdit={() => setEdit(d)}
                onPay={() => setPayFor(d)}
                onDelete={() => del(d)}
                onToggle={() => toggleClose(d)}
              />
            ))}
          </div>
        )}
      </div>

      {edit && <DebtForm debt={edit} customers={customers} onClose={() => setEdit(null)} />}
      {payFor && <PayForm debt={payFor} onClose={() => setPayFor(null)} />}
      {node}
    </>
  )
}

function blank(uidStr?: string, name?: string): Debt {
  return {
    id: uid('d'),
    kind: 'receivable',
    personName: '',
    amount: 0,
    currency: 'USD',
    rate: 0,
    date: todayISO(),
    payments: [],
    status: 'open',
    createdAt: Date.now(),
    createdBy: uidStr,
    createdByName: name,
  }
}

/* ═════════════ ڕیزێکی لیست ═════════════ */

function DebtRow({
  d,
  editable,
  onEdit,
  onPay,
  onDelete,
  onToggle,
}: {
  d: Debt
  editable: boolean
  onEdit: () => void
  onPay: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const [open, setOpen] = useState(false)
  const left = debtLeft(d)
  const paid = debtPaid(d)
  const done = d.status === 'closed' || left <= 0
  const over = isOverdue(d)
  const inbound = d.kind === 'receivable'
  const pct = d.amount > 0 ? Math.min(100, (paid / d.amount) * 100) : 0

  return (
    <div className={`card overflow-hidden ${over ? 'border-warn/45' : ''} ${done ? 'opacity-70' : ''}`}>
      <button onClick={() => setOpen(!open)} className="w-full text-start p-3.5 flex items-center gap-3">
        <span
          className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
            done ? 'bg-surface2 text-muted' : inbound ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'
          }`}
        >
          {done ? <CircleCheckBig size={18} /> : inbound ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
        </span>

        <span className="grow min-w-0">
          <span className="flex items-center gap-2">
            <b className="truncate">{d.personName || 'بێ ناو'}</b>
            {over && <span className="text-[10px] bg-warn/20 text-warn px-1.5 py-0.5 rounded-md shrink-0">دواکەوتوو</span>}
            {done && <span className="text-[10px] bg-surface2 text-muted px-1.5 py-0.5 rounded-md shrink-0">تەواو</span>}
          </span>
          <span className="block text-xs text-muted mt-0.5 truncate">
            {d.reason || KIND_KU[d.kind]} · <span className="num">{fmtDateShort(d.date)}</span>
          </span>
        </span>

        <span className="text-end shrink-0">
          <span className={`block font-bold num ${done ? 'text-muted' : inbound ? 'text-ok' : 'text-bad'}`}>
            {money(left || d.amount, d.currency)}
          </span>
          {paid > 0 && !done && <span className="block text-[11px] text-muted num">دراوە {money(paid, d.currency)}</span>}
        </span>
      </button>

      {paid > 0 && !done && (
        <div className="h-1 bg-surface2 mx-3.5 rounded-full overflow-hidden">
          <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {open && (
        <div className="px-3.5 pb-3.5 pt-3 border-t border-line mt-3 space-y-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
            <Row k="جۆر" v={KIND_KU[d.kind]} />
            <Row k="بڕی سەرەتایی" v={<span className="num">{money(d.amount, d.currency)}</span>} />
            {paid > 0 && <Row k="دراوە" v={<span className="num text-ok">{money(paid, d.currency)}</span>} />}
            {!!left && <Row k="ماوە" v={<span className="num font-bold">{money(left, d.currency)}</span>} />}
            {d.dueDate && <Row k="بەرواری دیاریکراو" v={<span className={`num ${over ? 'text-warn' : ''}`}>{fmtDateShort(d.dueDate)}</span>} />}
            {d.phone && (
              <Row
                k="ژمارە"
                v={
                  <a href={`tel:${d.phone}`} className="num text-brand inline-flex items-center gap-1">
                    <Phone size={12} /> {d.phone}
                  </a>
                }
              />
            )}
            {d.carInfo && <Row k="ئۆتۆمبێل" v={d.carInfo} />}
            {d.note && <Row k="تێبینی" v={d.note} full />}
          </dl>

          {/* قیستەکان */}
          {!!d.installments?.length && (
            <div>
              <p className="text-xs text-muted mb-1.5">خشتەی قیست</p>
              <div className="space-y-1">
                {d.installments.map((i) => {
                  const late = i.paid < i.amount && i.dueDate < todayISO()
                  return (
                    <div
                      key={i.no}
                      className={`flex items-center gap-2 text-[13px] rounded-lg px-2.5 py-1.5 ${
                        i.paid >= i.amount ? 'bg-ok/10 text-ok' : late ? 'bg-warn/10 text-warn' : 'bg-surface2'
                      }`}
                    >
                      <span className="num w-5">{i.no}</span>
                      <span className="num grow">{fmtDateShort(i.dueDate)}</span>
                      <span className="num">{money(i.amount, d.currency)}</span>
                      {i.paid >= i.amount && <Check size={14} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* پارەدانەکان */}
          {!!d.payments?.length && (
            <div>
              <p className="text-xs text-muted mb-1.5">پارەدانەکان</p>
              <div className="space-y-1">
                {[...d.payments]
                  .sort((a, b) => b.at - a.at)
                  .map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-[13px] bg-surface2 rounded-lg px-2.5 py-1.5">
                      <span className="num grow">{fmtDateShort(p.date)}</span>
                      {p.toCashbox && <Wallet size={13} className="text-muted" />}
                      <span className="num font-medium">{money(p.amount, d.currency)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {editable && (
            <div className="flex flex-wrap gap-2 pt-1">
              {!done && (
                <button onClick={onPay} className="btn-brand !py-1.5 !px-3 text-[13px]">
                  <Wallet size={15} /> تۆمارکردنی پارەدان
                </button>
              )}
              <button onClick={onEdit} className="btn-ghost !py-1.5 !px-3 text-[13px]">
                گۆڕین
              </button>
              <button onClick={onToggle} className="btn-ghost !py-1.5 !px-3 text-[13px]">
                {done ? 'کردنەوە' : 'وەک تەواوبوو'}
              </button>
              <button onClick={onDelete} className="btn-ghost !py-1.5 !px-3 text-[13px] text-bad">
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ k, v, full }: { k: string; v: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-muted text-[11px]">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  )
}

/* ═════════════ فۆرمی قەرز ═════════════ */

function DebtForm({ debt, customers, onClose }: { debt: Debt; customers: { id: string; name: string; phone?: string }[]; onClose: () => void }) {
  const { save, log, say, settings } = useApp()
  const [d, setD] = useState<Debt>({ ...debt, rate: debt.rate || settings.usdRate })
  const [busy, setBusy] = useState(false)
  const [useInst, setUseInst] = useState(!!debt.installments?.length)
  const [instCount, setInstCount] = useState(debt.installments?.length || 6)
  const [instStart, setInstStart] = useState(debt.installments?.[0]?.dueDate || addMonths(todayISO(), 1))

  const set = <K extends keyof Debt>(k: K, v: Debt[K]) => setD((p) => ({ ...p, [k]: v }))
  const isNew = !debt.personName

  const names = customers.map((c) => c.name)

  const pickCustomer = (name: string) => {
    const c = customers.find((x) => x.name === name)
    setD((p) => ({ ...p, personName: name, customerId: c?.id, phone: c?.phone || p.phone }))
  }

  const buildInstallments = (): Installment[] | undefined => {
    if (!useInst || instCount < 1 || d.amount <= 0) return undefined
    const each = Math.round((d.amount / instCount) * 100) / 100
    return Array.from({ length: instCount }, (_, i) => ({
      no: i + 1,
      dueDate: addMonths(instStart, i),
      amount: i === instCount - 1 ? Math.round((d.amount - each * (instCount - 1)) * 100) / 100 : each,
      paid: 0,
    }))
  }

  const submit = async () => {
    if (!d.personName.trim()) return say('ناوی کەسەکە بنووسە', 'bad')
    if (!(d.amount > 0)) return say('بڕی پارە بنووسە', 'bad')
    setBusy(true)
    try {
      const next: Debt = {
        ...d,
        personName: d.personName.trim(),
        installments: buildInstallments(),
        updatedAt: Date.now(),
      }
      await save('debts', next)
      await log(isNew ? 'زیادکردنی قەرز' : 'گۆڕینی قەرز', 'debts', next.id, `${next.personName} — ${money(next.amount, next.currency)}`)
      say(isNew ? 'قەرزەکە تۆمار کرا' : 'پاشەکەوت کرا')
      onClose()
    } catch {
      say('نەتوانرا پاشەکەوت بکرێت', 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? 'قەرزی نوێ' : 'گۆڕینی قەرز'}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">
            پاشگەزبوونەوە
          </button>
          <button onClick={submit} disabled={busy} className="btn-brand">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
            پاشەکەوت
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="جۆری قەرز">
          <Segmented
            value={d.kind}
            onChange={(v) => set('kind', v)}
            options={[
              { v: 'receivable' as DebtKind, label: 'خەڵک قەرزارمە' },
              { v: 'payable' as DebtKind, label: 'من قەرزارم' },
            ]}
          />
        </Field>

        <Field label="ناوی کەس" hint="لە کریارە تۆمارکراوەکان هەڵبژێرە یان ناوێکی نوێ بنووسە">
          <Picker value={d.personName} onChange={pickCustomer} options={names} allowCustom placeholder="ناو بنووسە یان هەڵبژێرە" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ژمارەی تەلەفۆن">
            <input
              dir="ltr"
              inputMode="tel"
              value={d.phone || ''}
              onChange={(e) => set('phone', e.target.value)}
              className="field num text-start"
              placeholder="0750..."
            />
          </Field>
          <Field label="بەرواری قەرزەکە" hint="بەرواری ڕاستەقینەی کۆن">
            <input type="date" value={d.date} onChange={(e) => set('date', e.target.value)} className="field num" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="بڕی پارە">
            <MoneyInput value={d.amount} onChange={(n) => set('amount', n)} />
          </Field>
          <Field label="دراو">
            <Segmented
              value={d.currency}
              onChange={(v) => set('currency', v)}
              options={[
                { v: 'USD' as Currency, label: 'دۆلار $' },
                { v: 'IQD' as Currency, label: 'دینار' },
              ]}
            />
          </Field>
        </div>

        <Field label="هۆکار">
          <Picker value={d.reason || ''} onChange={(v) => set('reason', v)} options={REASONS} allowCustom placeholder="هەڵبژێرە یان بنووسە" />
        </Field>

        <Field label="ئۆتۆمبێلی پەیوەندیدار" hint="ئارەزوومەندانە — نموونە: تویۆتا کەمری ٢٠١٨ سپی">
          <input value={d.carInfo || ''} onChange={(e) => set('carInfo', e.target.value)} className="field" placeholder="..." />
        </Field>

        {/* قیست */}
        <div className="card p-3.5 space-y-3">
          <Switch
            checked={useInst}
            onChange={setUseInst}
            label="خشتەی قیست"
            hint="ئەگەر کوژاوە بێت، پارەدانی ئازادە — هەر کاتێک پارە دێت تۆماری دەکەیت"
            icon={<CalendarClock size={17} />}
          />
          {useInst && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="ژمارەی قیست">
                <MoneyInput value={instCount} onChange={(n) => setInstCount(Math.max(1, Math.min(120, Math.round(n))))} />
              </Field>
              <Field label="یەکەم قیست">
                <input type="date" value={instStart} onChange={(e) => setInstStart(e.target.value)} className="field num" />
              </Field>
              {d.amount > 0 && instCount > 0 && (
                <p className="col-span-2 text-xs text-muted">
                  هەر قیستێک نزیکەی <b className="num">{money(d.amount / instCount, d.currency)}</b>
                </p>
              )}
            </div>
          )}
        </div>

        {!useInst && (
          <Field label="بەرواری دیاریکراو بۆ دانەوە" hint="ئارەزوومەندانە — ئاگادارت دەکاتەوە ئەگەر تێپەڕی">
            <input type="date" value={d.dueDate || ''} onChange={(e) => set('dueDate', e.target.value)} className="field num" />
          </Field>
        )}

        <Field label="تێبینی">
          <textarea value={d.note || ''} onChange={(e) => set('note', e.target.value)} rows={2} className="field resize-none" />
        </Field>
      </div>
    </Sheet>
  )
}

/* ═════════════ فۆرمی پارەدان ═════════════ */

function PayForm({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { save, log, say, settings, user } = useApp()
  const left = debtLeft(debt)
  const [amount, setAmount] = useState(left)
  const [date, setDate] = useState(todayISO())
  const [toCashbox, setToCashbox] = useState(true)
  const [account, setAccount] = useState<'cash' | 'bank'>('cash')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const inbound = debt.kind === 'receivable'

  const submit = async () => {
    if (!(amount > 0)) return say('بڕی پارە بنووسە', 'bad')
    if (amount > left + 0.01) return say('بڕەکە لە ماوەکە زیاترە', 'bad')
    setBusy(true)
    try {
      const pid = uid('dp')
      let txId: string | undefined

      // ١) ئەگەر بچێتە سندوق — مامەڵەیەک دروست دەکەین
      if (toCashbox) {
        txId = uid('tx')
        const tx: Tx = {
          id: txId,
          date,
          kind: inbound ? 'in' : 'out',
          amount,
          currency: debt.currency,
          rate: debt.rate || settings.usdRate,
          account,
          category: inbound ? 'debt_in' : 'debt_out',
          title: `${inbound ? 'وەرگرتنی' : 'دانەوەی'} قەرزی کۆن — ${debt.personName}`,
          customerId: debt.customerId,
          note: note || debt.reason,
          createdAt: Date.now(),
          createdBy: user?.uid,
        }
        await save('txs', tx)
      }

      // ٢) پارەدانەکە
      const pay: DebtPayment = {
        id: pid,
        date,
        amount,
        toCashbox,
        account: toCashbox ? account : undefined,
        txId,
        note: note || undefined,
        at: Date.now(),
        by: user?.uid,
        byName: user?.name,
      }

      // ٣) داخستنی قیستەکان بە ڕیزبەندی
      let rest = amount
      const insts = debt.installments?.map((i) => {
        if (rest <= 0) return i
        const need = i.amount - i.paid
        if (need <= 0) return i
        const put = Math.min(need, rest)
        rest -= put
        return { ...i, paid: i.paid + put, paidDate: i.paid + put >= i.amount ? date : i.paidDate }
      })

      const payments = [...(debt.payments || []), pay]
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
      const next: Debt = {
        ...debt,
        payments,
        installments: insts,
        status: totalPaid >= debt.amount - 0.01 ? 'closed' : 'open',
        updatedAt: Date.now(),
      }

      await save('debts', next)
      await log('پارەدانی قەرز', 'debts', debt.id, `${debt.personName} — ${money(amount, debt.currency)}`)

      if (next.status === 'closed') {
        fx('money')
        say('قەرزەکە تەواو بوو 🎉')
      } else {
        say('پارەدانەکە تۆمار کرا')
      }
      onClose()
    } catch {
      say('نەتوانرا تۆمار بکرێت', 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={inbound ? 'وەرگرتنی پارە' : 'دانەوەی پارە'}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">
            پاشگەزبوونەوە
          </button>
          <button onClick={submit} disabled={busy} className="btn-brand">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
            تۆمارکردن
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="card p-3.5 bg-surface2">
          <p className="text-[13px] text-muted">{debt.personName}</p>
          <p className="text-lg font-bold num mt-0.5">ماوە: {money(left, debt.currency)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="بڕی پارە">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="بەروار">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field num" />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {[0.25, 0.5, 1].map((f) => (
            <button key={f} type="button" onClick={() => setAmount(Math.round(left * f * 100) / 100)} className="btn-ghost !py-1.5 !px-3 text-[13px]">
              {f === 1 ? 'هەمووی' : `${f * 100}٪`} <span className="num">({num(Math.round(left * f))})</span>
            </button>
          ))}
        </div>

        <div className="card p-3.5 space-y-3">
          <Switch
            checked={toCashbox}
            onChange={setToCashbox}
            label="بچێتە سندوقەوە"
            hint={
              inbound
                ? 'وەک داهاتێک لە حسابات تۆمار دەکرێت و باڵانسی سندوق زیاد دەکات'
                : 'وەک خەرجییەک لە حسابات تۆمار دەکرێت و باڵانسی سندوق کەم دەکات'
            }
            icon={<Wallet size={17} />}
          />
          {toCashbox && (
            <Segmented
              value={account}
              onChange={setAccount}
              options={[
                { v: 'cash' as const, label: 'کاش' },
                { v: 'bank' as const, label: 'بانک' },
              ]}
            />
          )}
        </div>

        <Field label="تێبینی">
          <input value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder="ئارەزوومەندانە" />
        </Field>
      </div>
    </Sheet>
  )
}
