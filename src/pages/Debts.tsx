import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, NotebookPen, ArrowDownLeft, ArrowUpRight, Phone, ChevronLeft,
  CircleCheckBig, Loader2, Check,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Field, Picker, Segmented, SearchBar, Empty, Sheet, Stat, useConfirm } from '../components/ui'
import { fmtDateShort, fmtRate, fold, money, todayISO, uid } from '../lib/format'
import {
  toAccounts, balanceOf, isEmpty, lastMove, blankAccount, netIn, nowTime,
  type Account,
} from '../lib/ledger'
import type { Currency } from '../lib/types'

export default function Debts() {
  const nav = useNavigate()
  const { debts, customers, settings, save, log, say, can, user } = useApp()
  const { node } = useConfirm()

  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | 'owe' | 'owed' | 'clear'>('all')
  /* `ALL` = دۆلار و دینار پێکەوە، بە نرخی ڕۆژ */
  const [cur, setCur] = useState<Currency | 'ALL'>('ALL')
  /* دراوی کۆی گشتی لە دۆخی «هەردوو» */
  const [allCur, setAllCur] = useState<Currency>('IQD')
  const [edit, setEdit] = useState<Account | null>(null)

  const editable = can('money.edit')
  const rate = settings.usdRate
  const accounts = useMemo(() => toAccounts(debts), [debts])
  /* دراوی کۆی گشتی کاتێک هەردووکیان پێکەوە پیشان دەدرێن */
  const totalCur: Currency = cur === 'ALL' ? allCur : cur
  /** باڵانسی کۆی یەک کەس بە یەک دراو */
  const netOf = (a: Account) => netIn(a, totalCur, rate)

  const list = useMemo(() => {
    const needle = fold(q)
    return accounts
      .map((a) => ({ a, b: balanceOf(a) }))
      .filter(({ a, b }) => {
        if (tab === 'all') return true
        if (tab === 'clear') return isEmpty(b)
        const n = netOf(a)
        return tab === 'owe' ? n > 0 : n < 0
      })
      .filter(({ a }) => (!needle ? true : fold(`${a.name} ${a.phone || ''} ${a.note || ''}`).includes(needle)))
      .sort((x, y) => {
        const ax = Math.abs(netOf(x.a))
        const ay = Math.abs(netOf(y.a))
        if (ax !== ay) return ay - ax
        return x.a.name.localeCompare(y.a.name)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, q, tab, totalCur, rate])

  /*
   * کۆی گشتی — هەر دراوێک بە جیا (وەک صەراف)، لەگەڵ کۆیەکی هاوبەش
   * کە دۆلارەکە بە نرخی ڕۆژ دەگۆڕێت تا هەردووکیان یەک ژمارە بدەن.
   */
  const totals = useMemo(() => {
    const t = { oweUSD: 0, oweIQD: 0, owedUSD: 0, owedIQD: 0, oweAll: 0, owedAll: 0, people: 0 }
    for (const a of accounts) {
      const b = balanceOf(a)
      if (b.USD > 0) t.oweUSD += b.USD
      else t.owedUSD += -b.USD
      if (b.IQD > 0) t.oweIQD += b.IQD
      else t.owedIQD += -b.IQD
      const n = netIn(a, totalCur, rate)
      if (Math.abs(n) < 0.01) continue
      t.people++
      if (n > 0) t.oweAll += n
      else t.owedAll += -n
    }
    return t
  }, [accounts, totalCur, rate])

  const all = cur === 'ALL'
  const owe = all ? totals.oweAll : cur === 'USD' ? totals.oweUSD : totals.oweIQD
  const owed = all ? totals.owedAll : cur === 'USD' ? totals.owedUSD : totals.owedIQD
  const m = (n: number) => money(n, totalCur)

  return (
    <>
      <PageHead
        title="دەفتەری قەرز"
        sub="حسابی هەر کەسێک بە تەواوی"
        action={
          editable && (
            <button onClick={() => setEdit(blankAccount(user?.uid, user?.name))} className="btn-brand">
              <Plus size={17} />
              <span className="hidden sm:inline">حسابی نوێ</span>
            </button>
          )
        }
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        {/* ── پوختە ── */}
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="خەڵک قەرزارمە"
            value={<span className="num">{m(owe)}</span>}
            sub={
              all ? (
                <>
                  <span className="num">{money(totals.oweUSD, 'USD')}</span> ·{' '}
                  <span className="num">{money(totals.oweIQD, 'IQD')}</span>
                </>
              ) : (
                `${accounts.filter((a) => netOf(a) > 0).length} کەس`
              )
            }
            tone="ok"
            icon={<ArrowDownLeft size={17} />}
          />
          <Stat
            label="من قەرزارم"
            value={<span className="num">{m(owed)}</span>}
            sub={
              all ? (
                <>
                  <span className="num">{money(totals.owedUSD, 'USD')}</span> ·{' '}
                  <span className="num">{money(totals.owedIQD, 'IQD')}</span>
                </>
              ) : (
                `${accounts.filter((a) => netOf(a) < 0).length} کەس`
              )
            }
            tone="bad"
            icon={<ArrowUpRight size={17} />}
          />
        </div>

        <div className="card p-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">جیاوازی</p>
            <p className={`text-lg font-bold num ${owe - owed >= 0 ? 'text-ok' : 'text-bad'}`}>{m(owe - owed)}</p>
            {all && (
              <p className="text-[11px] text-muted mt-0.5">
                هەردوو دراو پێکەوە بە نرخی <span className="num">{fmtRate(rate)}</span>
              </p>
            )}
          </div>
          {all && (
            <div className="w-40 shrink-0">
              <Segmented
                size="sm"
                value={allCur}
                onChange={setAllCur}
                options={[
                  { v: 'IQD' as Currency, label: 'کۆ بە دینار' },
                  { v: 'USD' as Currency, label: 'کۆ بە دۆلار' },
                ]}
              />
            </div>
          )}
          <div className="w-48 shrink-0">
            <Segmented
              size="sm"
              value={cur}
              onChange={setCur}
              options={[
                { v: 'ALL' as const, label: 'هەردوو' },
                { v: 'USD' as const, label: '$' },
                { v: 'IQD' as const, label: 'د.ع' },
              ]}
            />
          </div>
        </div>

        {/* ── پاڵاوتن ── */}
        <div className="space-y-3">
          <SearchBar value={q} onChange={setQ} placeholder="بگەڕێ بە ناو یان ژمارە..." />
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { v: 'all' as const, label: 'هەموو' },
              { v: 'owe' as const, label: 'قەرزارمن' },
              { v: 'owed' as const, label: 'قەرزارم' },
              { v: 'clear' as const, label: 'پاک' },
            ]}
          />
        </div>

        {/* ── لیست ── */}
        {list.length === 0 ? (
          <Empty
            icon={<NotebookPen size={26} />}
            title={accounts.length === 0 ? 'دەفتەرەکە بەتاڵە' : 'هیچ نەدۆزرایەوە'}
            sub={
              accounts.length === 0
                ? 'بۆ هەر کەسێک حسابێک دروست بکە — دواتر هەموو وەرگرتن و دانی پارە بە بەروار و کاتژمێرەوە تۆمار دەکەیت.'
                : 'گەڕان یان پاڵاوتنەکە بگۆڕە.'
            }
            action={
              editable && (
                <button onClick={() => setEdit(blankAccount(user?.uid, user?.name))} className="btn-brand">
                  <Plus size={17} /> حسابی نوێ
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-2.5">
            {list.map(({ a, b }) => {
              const last = lastMove(a)
              const zero = isEmpty(b)
              const n = netOf(a)
              const pos = n > 0
              /* هەردوو دراوی هەیە → کۆیەکی هاوبەشیشی پیشان دەدەین */
              const mixed = Math.abs(b.USD) >= 0.01 && Math.abs(b.IQD) >= 0.01
              return (
                <button
                  key={a.id}
                  onClick={() => nav(`/debts/${a.id}`)}
                  className="card w-full p-3.5 flex items-center gap-3 text-start hover:bg-surface2 transition"
                >
                  <span
                    className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                      zero ? 'bg-surface2 text-muted' : pos ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'
                    }`}
                  >
                    {zero ? <CircleCheckBig size={18} /> : pos ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </span>

                  <span className="grow min-w-0">
                    <b className="block truncate">{a.name || 'بێ ناو'}</b>
                    <span className="block text-xs text-muted mt-0.5 truncate">
                      {a.phone && (
                        <>
                          <Phone size={11} className="inline align-[-1px]" /> <span className="num">{a.phone}</span> ·{' '}
                        </>
                      )}
                      {last ? (
                        <>
                          دوایین جوڵە <span className="num">{fmtDateShort(last.date)}</span>
                        </>
                      ) : (
                        'هێشتا هیچ جوڵەیەک نییە'
                      )}
                    </span>
                  </span>

                  <span className="text-end shrink-0">
                    {zero ? (
                      <span className="text-[13px] text-muted">پاک</span>
                    ) : (
                      <>
                        {Math.abs(b.USD) >= 0.01 && (
                          <span className={`block font-bold num ${b.USD > 0 ? 'text-ok' : 'text-bad'}`}>
                            {money(Math.abs(b.USD), 'USD')}
                          </span>
                        )}
                        {Math.abs(b.IQD) >= 0.01 && (
                          <span className={`block font-bold num text-[13px] ${b.IQD > 0 ? 'text-ok' : 'text-bad'}`}>
                            {money(Math.abs(b.IQD), 'IQD')}
                          </span>
                        )}
                        {mixed && (
                          <span className={`block text-[11px] num ${pos ? 'text-ok' : 'text-bad'}`}>
                            کۆ: {money(Math.abs(n), totalCur)}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <ChevronLeft size={17} className="text-muted shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {edit && (
        <AccountForm
          acc={edit}
          customers={customers}
          onClose={() => setEdit(null)}
          onSaved={(a) => {
            setEdit(null)
            nav(`/debts/${a.id}`)
          }}
          save={save}
          log={log}
          say={say}
          rate={settings.usdRate}
        />
      )}
      {node}
    </>
  )
}

/* ═════════════ فۆرمی حساب ═════════════ */

export function AccountForm({
  acc, customers, onClose, onSaved, save, log, say, rate,
}: {
  acc: Account
  customers: { id: string; name: string; phone?: string }[]
  onClose: () => void
  onSaved: (a: Account) => void
  save: (coll: 'debts', obj: Account) => Promise<void>
  log: (a: string, e: string, id?: string, d?: string) => Promise<void>
  say: (m: string, k?: 'ok' | 'bad' | 'info') => void
  rate: number
}) {
  const [a, setA] = useState<Account>(acc)
  const [busy, setBusy] = useState(false)
  /* بڕی سەرەتایی — تەنها بۆ حسابی نوێ */
  const isNew = !acc.name
  const [opening, setOpening] = useState(0)
  const [openKind, setOpenKind] = useState<'give' | 'take'>('give')
  const [openCur, setOpenCur] = useState<Currency>('USD')

  const pickCustomer = (name: string) => {
    const c = customers.find((x) => x.name === name)
    setA((p) => ({ ...p, name, customerId: c?.id, phone: c?.phone || p.phone }))
  }

  const submit = async () => {
    if (!a.name.trim()) return say('ناوی کەسەکە بنووسە', 'bad')
    setBusy(true)
    try {
      const next: Account = { ...a, name: a.name.trim(), updatedAt: Date.now() }
      if (isNew && opening > 0) {
        next.entries = [
          {
            id: uid('e'),
            date: todayISO(),
            time: nowTime(),
            kind: openKind,
            amount: opening,
            currency: openCur,
            rate,
            cash: false,
            note: 'باڵانسی سەرەتایی',
            at: Date.now(),
          },
        ]
      }
      await save('debts', next)
      await log(isNew ? 'دروستکردنی حساب' : 'گۆڕینی حساب', 'debts', next.id, next.name)
      say(isNew ? 'حسابەکە دروستکرا' : 'پاشەکەوت کرا')
      onSaved(next)
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
      title={isNew ? 'حسابی نوێ' : 'گۆڕینی حساب'}
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
        <Field label="ناوی کەس" hint="لە کریارە تۆمارکراوەکان هەڵبژێرە یان ناوێکی نوێ بنووسە">
          <Picker
            value={a.name}
            onChange={pickCustomer}
            options={customers.map((c) => c.name)}
            allowCustom
            placeholder="ناو بنووسە یان هەڵبژێرە"
          />
        </Field>

        <Field label="ژمارەی تەلەفۆن">
          <input
            dir="ltr"
            inputMode="tel"
            value={a.phone || ''}
            onChange={(e) => setA((p) => ({ ...p, phone: e.target.value }))}
            className="field num text-start"
            placeholder="0750..."
          />
        </Field>

        {isNew && (
          <div className="card p-3.5 space-y-3">
            <p className="text-[13px] font-medium">باڵانسی سەرەتایی</p>
            <p className="text-xs text-muted leading-5">
              ئەگەر ئەم کەسە پێشتر قەرزاری تۆ بووە (یان تۆ قەرزاری ئەو بوویت)، بڕەکە لێرە بنووسە.
              ئەگەرنا بەتاڵی بهێڵەوە و دواتر جوڵەکان تۆمار بکە.
            </p>
            <Segmented
              value={openKind}
              onChange={setOpenKind}
              options={[
                { v: 'give' as const, label: 'ئەو قەرزارمە' },
                { v: 'take' as const, label: 'من قەرزارم' },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="بڕ">
                <input
                  dir="ltr"
                  inputMode="decimal"
                  value={opening || ''}
                  onChange={(e) => setOpening(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                  className="field num text-start"
                  placeholder="0"
                />
              </Field>
              <Field label="دراو">
                <Segmented
                  value={openCur}
                  onChange={setOpenCur}
                  options={[
                    { v: 'USD' as Currency, label: '$' },
                    { v: 'IQD' as Currency, label: 'د.ع' },
                  ]}
                />
              </Field>
            </div>
          </div>
        )}

        <Field label="تێبینی">
          <textarea
            value={a.note || ''}
            onChange={(e) => setA((p) => ({ ...p, note: e.target.value }))}
            rows={2}
            className="field resize-none"
          />
        </Field>
      </div>
    </Sheet>
  )
}
