import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, ArrowDownLeft, ArrowUpRight, Banknote,
  Landmark, CalendarClock, PieChart, Receipt, AlertTriangle,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, Field, MoneyInput, Picker, Segmented, Sheet, Stat, useConfirm } from '../components/ui'
import { balances, carMoney, openInstallments, profitInRange } from '../lib/finance'
import { EXPENSE_CATEGORIES, TX_CATEGORY_KU } from '../lib/catalog'
import { fmtDateShort, money, num, todayISO, uid } from '../lib/format'
import type { Currency, Tx, TxCategory } from '../lib/types'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export default function Accounting() {
  const nav = useNavigate()
  const { txs, cars, contracts, settings, save, remove, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()
  const [tab, setTab] = useState<'sum' | 'cash' | 'debt' | 'profit'>('sum')
  const [cur, setCur] = useState<Currency>('USD')
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(todayISO())
  const [open, setOpen] = useState(false)
  const rate = settings.usdRate

  const [f, setF] = useState<Partial<Tx>>({
    date: todayISO(), kind: 'out', amount: 0, currency: 'USD', account: 'cash', category: 'expense', title: '',
  })

  const inRange = useMemo(() => txs.filter((t) => t.date >= from && t.date <= to), [txs, from, to])
  const bAll = useMemo(() => balances(txs, cur, rate), [txs, cur, rate])
  const bRange = useMemo(() => balances(inRange, cur, rate), [inRange, cur, rate])
  const prof = useMemo(() => profitInRange(cars, txs, contracts, cur, rate, from, to), [cars, txs, contracts, cur, rate, from, to])
  const dues = useMemo(() => openInstallments(contracts), [contracts])
  const overdue = dues.filter((d) => d.overdue)

  const soldCars = useMemo(
    () =>
      cars
        .filter((c) => c.status === 'sold')
        .map((c) => ({ car: c, m: carMoney(c, txs, contracts, cur, rate) }))
        .filter((x) => x.m.sold !== null)
        .sort((a, b) => (b.m.contract?.date || '').localeCompare(a.m.contract?.date || '')),
    [cars, txs, contracts, cur, rate],
  )

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of inRange.filter((x) => x.kind === 'out')) {
      const v = t.currency === cur ? t.amount : t.currency === 'USD' ? t.amount * (t.rate || rate) : t.amount / (t.rate || rate)
      map[t.category] = (map[t.category] || 0) + v
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [inRange, cur, rate])

  const addTx = async () => {
    if (!f.amount || !f.title) return say('بڕ و ناونیشان پێویستە', 'bad')
    await save('txs', {
      id: uid('tx'),
      date: f.date || todayISO(),
      kind: f.kind as 'in' | 'out',
      amount: f.amount!,
      currency: f.currency as Currency,
      rate,
      account: f.account as 'cash' | 'bank',
      category: f.category as TxCategory,
      title: f.title!,
      note: f.note,
      createdAt: Date.now(),
      createdBy: user?.uid,
    })
    await log('تۆمارکردنی جوڵەی پارە', 'txs', undefined, `${f.title} — ${money(f.amount!, f.currency as Currency)}`)
    say('تۆمارکرا')
    setF({ ...f, amount: 0, title: '', note: '' })
    setOpen(false)
  }

  const delTx = async (t: Tx) => {
    if (!(await ask(`سڕینەوەی «${t.title}»؟`))) return
    await remove('txs', t.id, t.title)
    say('سڕایەوە')
  }

  if (!can('money.view')) return <Empty icon={<Wallet size={26} />} title="دەسەڵاتت نییە" sub="تەنها خاوەن و ژمێریار دەتوانن حسابات ببینن" />

  return (
    <>
      <PageHead
        title="حسابات"
        sub={
          <span className="num">
            {fmtDateShort(from)} — {fmtDateShort(to)}
          </span>
        }
        action={
          can('money.edit') ? (
            <button onClick={() => setOpen(true)} className="btn-brand shrink-0">
              <Plus size={17} /> <span className="hidden sm:inline">جوڵە</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* کۆنترۆڵ */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="grid grid-cols-2 gap-2 grow">
            <input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="field num text-start field-sm" />
            <input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="field num text-start field-sm" />
          </div>
          <div className="sm:w-40">
            <Segmented value={cur} onChange={setCur} options={[{ v: 'USD' as Currency, label: 'دۆلار' }, { v: 'IQD' as Currency, label: 'دینار' }]} size="sm" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { k: 'sum', ku: 'پوختە', icon: PieChart },
            { k: 'cash', ku: 'سندوق', icon: Wallet },
            { k: 'debt', ku: 'قەرز و قیست', icon: CalendarClock },
            { k: 'profit', ku: 'قازانج', icon: TrendingUp },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`tab flex items-center gap-1.5 ${tab === t.k ? 'tab-on' : 'bg-surface2 border border-line'}`}>
              <t.icon size={15} /> {t.ku}
              {t.k === 'debt' && overdue.length > 0 && <span className="w-4 h-4 rounded-full bg-bad text-white text-[10px] grid place-items-center num">{overdue.length}</span>}
            </button>
          ))}
        </div>

        {/* ============ پوختە ============ */}
        {tab === 'sum' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="داهاتی ماوەکە" value={<span className="num">{money(bRange.in, cur)}</span>} tone="ok" icon={<ArrowDownLeft size={16} />} />
              <Stat label="خەرجی ماوەکە" value={<span className="num">{money(bRange.out, cur)}</span>} tone="bad" icon={<ArrowUpRight size={16} />} />
              <Stat label="قازانجی فرۆشراوەکان" value={<span className="num">{money(prof.profit, cur)}</span>} sub={<><span className="num">{prof.count}</span> ئۆتۆمبێل</>} tone="brand" icon={<TrendingUp size={16} />} />
              <Stat label="باڵانسی گشتی" value={<span className="num">{money(bAll.total, cur)}</span>} sub={<>کاش <span className="num">{money(bAll.cash, cur)}</span> · بانک <span className="num">{money(bAll.bank, cur)}</span></>} tone={bAll.total >= 0 ? 'ink' : 'bad'} icon={<Banknote size={16} />} />
            </div>

            {overdue.length > 0 && (
              <button onClick={() => setTab('debt')} className="card p-4 w-full flex items-center gap-3 border-bad/40 bg-bad/5 text-start">
                <AlertTriangle className="text-bad shrink-0" size={20} />
                <p className="text-sm grow">
                  <b className="num">{overdue.length}</b> قیست دواکەوتوون — کۆی <b className="num">{money(overdue.reduce((s, d) => s + d.rest, 0), overdue[0]?.contract.currency || cur)}</b>
                </p>
              </button>
            )}

            <div className="card p-4 sm:p-5">
              <h3 className="font-bold mb-4">خەرجییەکان بەپێی جۆر</h3>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted py-3">هیچ خەرجییەک نییە لەم ماوەیەدا</p>
              ) : (
                <div className="space-y-2.5">
                  {byCategory.map(([k, v]) => {
                    const max = byCategory[0][1] || 1
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-[13px] mb-1">
                          <span>{TX_CATEGORY_KU[k] || k}</span>
                          <span className="num font-medium">{money(v, cur)}</span>
                        </div>
                        <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                          <div className="h-full bg-brand/70 rounded-full" style={{ width: `${(v / max) * 100}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card p-4 sm:p-5">
              <h3 className="font-bold mb-3">کۆگای ئۆتۆمبێل</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { l: 'بەردەست', v: cars.filter((c) => c.status === 'available').length },
                  { l: 'حیجزکراو', v: cars.filter((c) => c.status === 'reserved').length },
                  { l: 'وۆرکشۆپ', v: cars.filter((c) => c.status === 'workshop').length },
                  { l: 'فرۆشراو', v: cars.filter((c) => c.status === 'sold').length },
                ].map((x) => (
                  <div key={x.l} className="bg-surface2 border border-line rounded-xl p-3">
                    <p className="text-2xl font-bold num">{x.v}</p>
                    <p className="text-xs text-muted mt-1">{x.l}</p>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-muted mt-4">
                بەهای کۆگا (تێچووی ئۆتۆمبێلە نەفرۆشراوەکان):{' '}
                <b className="text-ink num">
                  {money(
                    cars.filter((c) => c.status !== 'sold').reduce((s, c) => s + carMoney(c, txs, contracts, cur, rate).total, 0),
                    cur,
                  )}
                </b>
              </p>
            </div>
          </div>
        )}

        {/* ============ سندوق ============ */}
        {tab === 'cash' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="کاش" value={<span className="num">{money(bAll.cash, cur)}</span>} icon={<Banknote size={16} />} />
              <Stat label="بانک" value={<span className="num">{money(bAll.bank, cur)}</span>} icon={<Landmark size={16} />} />
            </div>
            {inRange.length === 0 ? (
              <Empty icon={<Receipt size={24} />} title="هیچ جوڵەیەک نییە" sub="لەم ماوەیەدا هیچ داهات و خەرجییەک تۆمار نەکراوە" />
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {[...inRange]
                  .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
                  .map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${t.kind === 'in' ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'}`}>
                        {t.kind === 'in' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                      </span>
                      <div className="grow min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted truncate">
                          {TX_CATEGORY_KU[t.category]} · <span className="num">{fmtDateShort(t.date)}</span> · {t.account === 'bank' ? 'بانک' : 'کاش'}
                        </p>
                      </div>
                      <span className={`num text-sm font-bold shrink-0 ${t.kind === 'in' ? 'text-ok' : 'text-bad'}`}>
                        {t.kind === 'in' ? '+' : '−'}
                        {money(t.amount, t.currency)}
                      </span>
                      {can('money.edit') && (
                        <button onClick={() => delTx(t)} className="text-muted hover:text-bad p-1 shrink-0">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ============ قەرز ============ */}
        {tab === 'debt' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="کۆی قەرز" value={<span className="num">{money(dues.reduce((s, d) => s + d.rest, 0), dues[0]?.contract.currency || cur)}</span>} tone="brand" icon={<CalendarClock size={16} />} />
              <Stat label="دواکەوتوو" value={<span className="num">{money(overdue.reduce((s, d) => s + d.rest, 0), overdue[0]?.contract.currency || cur)}</span>} sub={<><span className="num">{overdue.length}</span> قیست</>} tone="bad" icon={<AlertTriangle size={16} />} />
            </div>
            {dues.length === 0 ? (
              <Empty icon={<TrendingDown size={24} />} title="هیچ قەرزێک نەماوە" sub="هەموو قیستەکان وەرگیراون" />
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {dues.map((d) => (
                  <button key={d.contract.id + d.no} onClick={() => nav(`/contracts/${d.contract.id}`)} className="flex items-center gap-3 px-4 py-3 w-full text-start hover:bg-surface2">
                    <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 text-xs font-bold num ${d.overdue ? 'bg-bad/15 text-bad' : 'bg-warn/15 text-warn'}`}>{d.no}</span>
                    <div className="grow min-w-0">
                      <p className="text-sm font-medium truncate">{d.contract.buyer.name}</p>
                      <p className="text-xs text-muted truncate">
                        <span className="num">{d.contract.no}</span> · {d.contract.car.brand} {d.contract.car.model} ·{' '}
                        <span className={`num ${d.overdue ? 'text-bad' : ''}`}>{fmtDateShort(d.dueDate)}</span>
                        {d.overdue ? ` (${Math.abs(d.daysLeft)} ڕۆژ دواکەوتوو)` : ''}
                      </p>
                    </div>
                    <span className="num text-sm font-bold text-warn shrink-0">{money(d.rest, d.contract.currency)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ قازانج ============ */}
        {tab === 'profit' && (
          <div className="space-y-3">
            {soldCars.length === 0 ? (
              <Empty icon={<TrendingUp size={24} />} title="هێشتا هیچ ئۆتۆمبێلێک نەفرۆشراوە" />
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-muted text-[13px]">
                    <tr>
                      <th className="text-start px-4 py-3 font-medium">ئۆتۆمبێل</th>
                      <th className="text-start px-3 py-3 font-medium">کڕین</th>
                      <th className="text-start px-3 py-3 font-medium">تێچوو</th>
                      <th className="text-start px-3 py-3 font-medium">فرۆشتن</th>
                      <th className="text-start px-3 py-3 font-medium">قازانج</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {soldCars.map(({ car, m }) => (
                      <tr key={car.id} className="hover:bg-surface2 cursor-pointer" onClick={() => nav(`/cars/${car.id}`)}>
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-[160px]">
                            {car.brand} {car.model}
                          </p>
                          <p className="text-xs text-muted num">{m.contract ? fmtDateShort(m.contract.date) : ''}</p>
                        </td>
                        <td className="px-3 py-3 num text-muted">{money(m.buy, cur)}</td>
                        <td className="px-3 py-3 num text-muted">{money(m.costs, cur)}</td>
                        <td className="px-3 py-3 num">{money(m.sold || 0, cur)}</td>
                        <td className={`px-3 py-3 num font-bold ${(m.profit || 0) >= 0 ? 'text-ok' : 'text-bad'}`}>{money(m.profit || 0, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-line font-bold">
                    <tr>
                      <td className="px-4 py-3">کۆی گشتی</td>
                      <td className="px-3 py-3 num">{money(soldCars.reduce((s, x) => s + x.m.buy, 0), cur)}</td>
                      <td className="px-3 py-3 num">{money(soldCars.reduce((s, x) => s + x.m.costs, 0), cur)}</td>
                      <td className="px-3 py-3 num">{money(soldCars.reduce((s, x) => s + (x.m.sold || 0), 0), cur)}</td>
                      <td className="px-3 py-3 num text-ok">{money(soldCars.reduce((s, x) => s + (x.m.profit || 0), 0), cur)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* زیادکردنی جوڵە */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="تۆمارکردنی جوڵەی پارە"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={addTx}>
              <Plus size={16} /> تۆمارکردن
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Segmented
            value={f.kind as 'in' | 'out'}
            onChange={(v) => setF({ ...f, kind: v, category: v === 'in' ? 'capital' : 'expense' })}
            options={[
              { v: 'in' as const, label: '⬇ داهات' },
              { v: 'out' as const, label: '⬆ خەرجی' },
            ]}
          />
          <Field label="جۆر">
            <Picker
              value={TX_CATEGORY_KU[f.category as string] || ''}
              onChange={(v) => setF({ ...f, category: (Object.keys(TX_CATEGORY_KU).find((k) => TX_CATEGORY_KU[k] === v) || 'other') as TxCategory })}
              options={(f.kind === 'in' ? ['capital', 'installment', 'car_sell', 'other'] : ['expense', 'car_cost', 'withdraw', 'commission', 'partner', 'other']).map((k) => TX_CATEGORY_KU[k])}
            />
          </Field>
          <Field label="ناونیشان">
            {f.category === 'expense' ? (
              <Picker value={f.title || ''} onChange={(v) => setF({ ...f, title: v })} options={EXPENSE_CATEGORIES} allowCustom placeholder="هەڵبژێرە یان بنووسە" />
            ) : (
              <input value={f.title || ''} onChange={(e) => setF({ ...f, title: e.target.value })} className="field" placeholder="وەسفێکی کورت" />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="بڕ">
              <MoneyInput value={f.amount || 0} onChange={(n) => setF({ ...f, amount: n })} />
            </Field>
            <Field label="دراو">
              <Segmented value={f.currency as Currency} onChange={(v: Currency) => setF({ ...f, currency: v })} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
            </Field>
            <Field label="حساب">
              <Segmented value={f.account as 'cash' | 'bank'} onChange={(v) => setF({ ...f, account: v })} options={[{ v: 'cash' as const, label: 'کاش' }, { v: 'bank' as const, label: 'بانک' }]} size="sm" />
            </Field>
            <Field label="بەروار">
              <input type="date" dir="ltr" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="field num text-start" />
            </Field>
          </div>
          <Field label="تێبینی">
            <input value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} className="field" />
          </Field>
          <p className="text-xs text-muted">
            نرخی ئاڵوگۆڕ: <span className="num">1 $ = {num(rate)}</span> د.ع (لە ڕێکخستن دەیگۆڕیت)
          </p>
        </div>
      </Sheet>

      {node}
    </>
  )
}
