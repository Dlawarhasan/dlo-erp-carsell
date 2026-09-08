/**
 * ═══════════ دەستکاری عەقد لە شوێنی خۆیدا ═══════════
 *
 * عەقد بەڵگەنامەیەکی فەرمییە، بۆیە هەر گۆڕانکارییەک لێرە:
 *  · جوڵەکانی پارەی پەیوەندیداریشی نوێ دەکاتەوە (پێشەکی / پارەی نەقد)،
 *  · ژمارەی دەستکاری و کاتی کۆتا دەستکاری تۆمار دەکات،
 *  · دۆخی عەقد (چالاک / تەواوبوو) لە نوێوە دەژمێرێت.
 *
 * ئەوانەی **ناگۆڕدرێن** بۆ پاراستنی ڕاستیی حسابات:
 *  · دراوی عەقد ئەگەر قیستی وەرگیراوی هەبێت
 *  · نرخ ئەگەر بە دوو دراو نەقدی درابێت (لە حسابات ڕاست دەکرێتەوە)
 */

import { useMemo, useState } from 'react'
import { CalendarClock, Check, Info, Loader2, RefreshCw, Trash2, Plus } from 'lucide-react'
import { useApp } from '../store/app'
import { EditInfo, Field, MoneyInput, Segmented, Sheet } from './ui'
import { withEdit } from '../lib/edits'
import { addMonths, money, todayISO, uid } from '../lib/format'
import type { Contract, Currency, Installment, Tx } from '../lib/types'

export function ContractEditor({ c, onClose }: { c: Contract; onClose: () => void }) {
  const { cars, txs, settings, commit, log, say, user } = useApp()
  const car = cars.find((x) => x.id === c.carId)

  /* جوڵەکانی پارەی ئەم عەقدە */
  const saleTxs = useMemo(() => txs.filter((t) => t.contractId === c.id && t.category === 'car_sell'), [txs, c.id])
  const instTxs = useMemo(() => txs.filter((t) => t.contractId === c.id && t.category === 'installment'), [txs, c.id])
  /* پارەدانی نەقدی بە دوو دراو — نرخەکەی لێرە ناگۆڕدرێت */
  const dualCash = (c.cashPayments?.length || 0) > 1
  const canChangeMoney = c.status !== 'cancelled'
  const canChangePrice = canChangeMoney && !dualCash
  const canChangeCurrency = canChangePrice && instTxs.length === 0

  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState(c.date)
  const [note, setNote] = useState(c.note || '')
  const [w1, setW1] = useState(c.witness1 || '')
  const [w2, setW2] = useState(c.witness2 || '')
  const [buyer, setBuyer] = useState({ ...c.buyer })
  const [titleWho, setTitleWho] = useState<'seller' | 'other'>(c.titleHolder?.who || 'seller')
  const [titleName, setTitleName] = useState(c.titleHolder?.name || '')
  const [titlePhone, setTitlePhone] = useState(c.titleHolder?.phone || '')
  const [titleAddress, setTitleAddress] = useState(c.titleHolder?.address || '')
  const [terms, setTerms] = useState((c.terms || []).join('\n'))
  const [refreshCar, setRefreshCar] = useState(false)

  const [price, setPrice] = useState(c.price)
  const [currency, setCurrency] = useState<Currency>(c.currency)
  const [payment, setPayment] = useState<'cash' | 'installment'>(c.payment)
  const [down, setDown] = useState(c.down || 0)
  const [insts, setInsts] = useState<Installment[]>(c.installments || [])

  /* یارمەتیدەری دروستکردنەوەی خشتەی قیست */
  const [count, setCount] = useState(Math.max(1, c.installments?.length || 6))
  const [firstDue, setFirstDue] = useState(c.installments?.[0]?.dueDate || addMonths(todayISO(), 1))
  const [gap, setGap] = useState(1)

  const tol = currency === 'USD' ? 0.011 : 1
  const instSum = insts.reduce((s, i) => s + (i.amount || 0), 0)
  const paidSum = insts.reduce((s, i) => s + (i.paid || 0), 0)
  const balanced = payment === 'cash' ? true : Math.abs(instSum + down - price) <= Math.max(1, tol)
  /* قیستێک ناتوانێت لەوەی وەرگیراوە کەمتر بێت */
  const badRow = insts.find((i) => (i.paid || 0) > i.amount + tol)
  const valid = !!buyer.name?.trim() && price > 0 && balanced && !badRow

  /** خشتەی قیست لە نوێوە دابەش دەکات — ئەوەی وەرگیراوە دەپارێزرێت */
  const rebuild = () => {
    const rest = Math.max(0, price - down)
    const per = count > 0 ? Math.round((rest / count) * 100) / 100 : 0
    const out: Installment[] = []
    let acc = 0
    for (let i = 0; i < count; i++) {
      const amount = i === count - 1 ? Math.round((rest - acc) * 100) / 100 : per
      acc += amount
      const old = insts.find((x) => x.no === i + 1)
      out.push({ no: i + 1, dueDate: addMonths(firstDue, i * gap), amount, paid: old?.paid || 0, paidDate: old?.paidDate })
    }
    setInsts(out)
  }

  const setRow = (no: number, patch: Partial<Installment>) =>
    setInsts((p) => p.map((i) => (i.no === no ? { ...i, ...patch } : i)))

  const submit = async () => {
    if (busy) return
    if (!valid) {
      if (!buyer.name?.trim()) return say('ناوی کریار پێویستە', 'bad')
      if (price <= 0) return say('نرخ پێویستە', 'bad')
      if (badRow) return say(`قیستی ژمارە ${badRow.no} لەوەی وەرگیراوە کەمترە`, 'bad')
      return say('کۆی قیستەکان + پێشەکی دەبێت یەکسانی نرخ بێت', 'bad')
    }
    setBusy(true)
    try {
      const nextInsts = payment === 'installment' ? insts : []
      const allPaid = nextInsts.length > 0 && nextInsts.every((i) => (i.paid || 0) >= i.amount - tol)
      const status: Contract['status'] =
        c.status === 'cancelled' ? 'cancelled' : payment === 'cash' || allPaid ? 'completed' : 'active'

      const next: Contract = withEdit(
        {
          ...c,
          date,
          note: note.trim() || undefined,
          witness1: w1.trim() || undefined,
          witness2: w2.trim() || undefined,
          buyer: { ...buyer, name: buyer.name.trim() },
          titleHolder:
            titleWho === 'seller'
              ? { who: 'seller' }
              : { who: 'other', name: titleName.trim(), phone: titlePhone.trim(), address: titleAddress.trim() || undefined },
          terms: terms.split('\n').map((t) => t.trim()).filter(Boolean),
          price,
          currency,
          payment,
          down: payment === 'cash' ? price : down,
          installments: nextInsts,
          cashPayments: payment === 'cash' ? (dualCash ? c.cashPayments : [{ currency, amount: price }]) : undefined,
          status,
          /* زانیاری ئۆتۆمبێل لە تۆمارەکەیەوە نوێ دەکرێتەوە، ئەگەر داوا بکرێت */
          car:
            refreshCar && car
              ? {
                  vin: car.vin, brand: car.brand, model: car.model, year: car.year, color: car.color,
                  km: car.km, plate: car.plate, bodyType: car.bodyType, fuel: car.fuel,
                  transmission: car.transmission, cylinders: car.cylinders, origin: car.origin,
                  keys: car.keys, body: car.body,
                }
              : c.car,
        },
        user,
      )

      const writes: Parameters<typeof commit>[0] = [{ kind: 'put', coll: 'contracts', value: next }]

      /*
       * جوڵەی پارەی وەرگیراو: لە نەقدیدا تەواوی نرخ، لە قیستیدا پێشەکی.
       * تەنها کاتێک دەگۆڕدرێت کە بڕەکە یان دراوەکە گۆڕابێت.
       */
      if (canChangeMoney && !dualCash) {
        const target = payment === 'cash' ? price : down
        const one = saleTxs[0]
        if (target > 0 && one) {
          if (one.amount !== target || one.currency !== currency || one.date !== date) {
            writes.push({
              kind: 'put',
              coll: 'txs',
              value: withEdit({ ...one, amount: target, currency, date, title: `فرۆشتنی ${c.car.brand || ''} ${c.car.model || ''}`.trim() }, user),
            })
          }
        } else if (target > 0 && !one) {
          writes.push({
            kind: 'put',
            coll: 'txs',
            value: {
              id: uid('tx'), date, kind: 'in', amount: target, currency, rate: c.rate || settings.usdRate,
              account: 'cash', category: 'car_sell',
              title: `فرۆشتنی ${c.car.brand || ''} ${c.car.model || ''}`.trim(),
              carId: c.carId, contractId: c.id, customerId: c.buyerId,
              note: payment === 'installment' ? 'پێشەکی' : undefined,
              createdAt: Date.now(), createdBy: user?.uid,
            } as Tx,
          })
        } else if (target <= 0 && one) {
          writes.push({ kind: 'del', coll: 'txs', id: one.id })
        }
        /* ئەگەر زیاتر لە یەک جوڵەی فرۆشتن هەبێت، ئەوانی تر دەمێننەوە و ئاگادار دەکرێتەوە */
      }

      await commit(writes)
      await log('گۆڕینی عەقد', 'contracts', c.id, `${c.no} — ${money(price, currency)}`)
      say('عەقدەکە نوێ کرایەوە')
      onClose()
    } catch {
      say('نەتوانرا عەقدەکە بگۆڕدرێت؛ پەیوەندی داتا یان دەسەڵات پشکنین بکە', 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={`دەستکاری عەقد ${c.no}`}
      footer={
        <>
          <button className="btn-ghost" disabled={busy} onClick={onClose}>
            پاشگەزبوونەوە
          </button>
          <button className="btn-brand" disabled={busy || !valid} onClick={submit}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} پاشەکەوت
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-[13px] leading-6">
          گۆڕانکاری لێرە یەکسەر لە عەقدی چاپکراو و لە حساباتیشدا دەردەکەوێت.
          <EditInfo edits={c.edits} at={c.editedAt} by={c.editedByName} className="mt-1" />
        </div>

        {/* ═══ زانیاری گشتی ═══ */}
        <section className="space-y-3">
          <h3 className="font-bold text-[14px]">زانیاری گشتی</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="بەرواری عەقد">
              <input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className="field num text-start" />
            </Field>
            <Field label="ژمارەی عەقد">
              <input value={c.no} disabled className="field num text-start opacity-60" />
            </Field>
          </div>
        </section>

        {/* ═══ کریار ═══ */}
        <section className="space-y-3">
          <h3 className="font-bold text-[14px]">کریار</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ناو *">
              <input value={buyer.name || ''} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} className="field" />
            </Field>
            <Field label="ژمارەی تەلەفۆن">
              <input dir="ltr" value={buyer.phone || ''} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} className="field num text-start" />
            </Field>
            <Field label="ژمارەی ناسنامە">
              <input dir="ltr" value={buyer.idNumber || ''} onChange={(e) => setBuyer({ ...buyer, idNumber: e.target.value })} className="field num text-start" />
            </Field>
            <Field label="دەرچووی">
              <input value={buyer.idIssuer || ''} onChange={(e) => setBuyer({ ...buyer, idIssuer: e.target.value })} className="field" />
            </Field>
            <Field label="ناونیشان" className="sm:col-span-2">
              <input value={buyer.address || ''} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} className="field" />
            </Field>
          </div>
        </section>

        {/* ═══ پارە ═══ */}
        <section className="space-y-3">
          <h3 className="font-bold text-[14px]">نرخ و پارەدان</h3>

          {!canChangeMoney && (
            <p className="text-[12.5px] text-muted bg-surface2 border border-line rounded-xl px-3 py-2.5 leading-6">
              ئەم عەقدە هەڵوەشێنراوەتەوە — تەنها زانیاری گشتی دەگۆڕدرێت.
            </p>
          )}
          {dualCash && (
            <p className="text-[12.5px] bg-info/10 border border-info/30 rounded-xl px-3 py-2.5 leading-6 flex gap-2">
              <Info size={16} className="text-info shrink-0 mt-0.5" />
              <span>
                ئەم عەقدە بە <b>دوو دراو</b> نەقدی دراوە، بۆیە نرخەکەی لێرە ناگۆڕدرێت. بۆ ڕاستکردنەوە،
                عەقدەکە هەڵبوەشێنەوە و لە نوێوە دەریبکە.
              </span>
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="نرخی فرۆشتن" hint={canChangePrice ? '' : 'ناگۆڕدرێت'}>
              <div className={canChangePrice ? '' : 'opacity-50 pointer-events-none'}>
                <MoneyInput value={price} onChange={setPrice} />
              </div>
            </Field>
            <Field label="دراو" hint={canChangeCurrency ? '' : 'قیستی وەرگیراو هەیە — دراو ناگۆڕدرێت'}>
              <div className={canChangeCurrency ? '' : 'opacity-50 pointer-events-none'}>
                <Segmented
                  value={currency}
                  onChange={setCurrency}
                  options={[
                    { v: 'USD' as Currency, label: 'دۆلار $' },
                    { v: 'IQD' as Currency, label: 'دینار' },
                  ]}
                  size="sm"
                />
              </div>
            </Field>
          </div>

          <Field label="شێوازی پارەدان">
            <div className={canChangeMoney ? '' : 'opacity-50 pointer-events-none'}>
              <Segmented
                value={payment}
                onChange={(v: 'cash' | 'installment') => {
                  setPayment(v)
                  if (v === 'installment' && insts.length === 0) rebuild()
                }}
                options={[
                  { v: 'cash' as const, label: 'نەقد' },
                  { v: 'installment' as const, label: 'قیست' },
                ]}
              />
            </div>
          </Field>

          {payment === 'installment' && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="پێشەکی">
                  <MoneyInput value={down} onChange={setDown} />
                </Field>
                <Field label="ماوە بۆ قیست">
                  <div className="field !bg-surface2 num flex items-center">{money(Math.max(0, price - down), currency)}</div>
                </Field>
              </div>

              {/* دروستکردنەوەی خشتە */}
              <div className="rounded-xl border border-line bg-surface2/60 p-3 space-y-3">
                <p className="text-[13px] font-medium flex items-center gap-1.5">
                  <CalendarClock size={15} className="text-brand" /> دابەشکردنەوەی خشتەی قیست
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="ژمارە">
                    <input
                      type="number" min={1} max={60} dir="ltr" value={count}
                      onChange={(e) => setCount(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                      className="field num text-start"
                    />
                  </Field>
                  <Field label="یەکەم قیست">
                    <input type="date" dir="ltr" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className="field num text-start" />
                  </Field>
                  <Field label="هەر چەند مانگ">
                    <input
                      type="number" min={1} max={12} dir="ltr" value={gap}
                      onChange={(e) => setGap(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
                      className="field num text-start"
                    />
                  </Field>
                </div>
                <button type="button" onClick={rebuild} className="btn-ghost w-full !py-2 !text-[13px]">
                  <RefreshCw size={15} /> دابەشکردنەوە — ئەوەی وەرگیراوە دەپارێزرێت
                </button>
              </div>

              {/* خشتەکە بە دەست */}
              <div className="space-y-1.5">
                {insts.map((i) => {
                  const over = (i.paid || 0) > i.amount + tol
                  return (
                    <div key={i.no} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${over ? 'border-bad/50 bg-bad/8' : 'border-line bg-surface2/60'}`}>
                      <span className="w-7 h-7 rounded-lg bg-brand/15 text-brand grid place-items-center text-xs font-bold num shrink-0">{i.no}</span>
                      <input
                        type="date" dir="ltr" value={i.dueDate}
                        onChange={(e) => setRow(i.no, { dueDate: e.target.value })}
                        className="field num text-start !py-1.5 !text-[13px] w-36"
                      />
                      <div className="grow min-w-0">
                        <MoneyInput value={i.amount} onChange={(n) => setRow(i.no, { amount: n })} className="!py-1.5 !text-[13px]" />
                      </div>
                      {(i.paid || 0) > 0 && (
                        <span className={`text-[11px] num shrink-0 ${over ? 'text-bad' : 'text-ok'}`}>
                          دراوە {money(i.paid || 0, currency)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setInsts((p) => p.filter((x) => x.no !== i.no).map((x, k) => ({ ...x, no: k + 1 })))}
                        disabled={(i.paid || 0) > 0}
                        className="btn-quiet !p-1.5 shrink-0 hover:!text-bad disabled:opacity-30"
                        title={(i.paid || 0) > 0 ? 'قیستی دراو ناسڕدرێتەوە' : 'سڕینەوە'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() =>
                    setInsts((p) => [
                      ...p,
                      { no: p.length + 1, dueDate: addMonths(p[p.length - 1]?.dueDate || firstDue, 1), amount: 0, paid: 0 },
                    ])
                  }
                  className="btn-ghost w-full !py-2 !text-[13px]"
                >
                  <Plus size={15} /> قیستێکی تر
                </button>
              </div>

              <div className={`rounded-xl px-3 py-2.5 text-[13px] flex items-center justify-between gap-2 ${balanced ? 'bg-ok/10 border border-ok/30' : 'bg-bad/10 border border-bad/30'}`}>
                <span>کۆی قیستەکان + پێشەکی</span>
                <b className="num">
                  {money(instSum + down, currency)} / {money(price, currency)}
                </b>
              </div>
              {paidSum > 0 && (
                <p className="text-[12px] text-muted">
                  وەرگیراوە: <b className="num text-ok">{money(paidSum, currency)}</b> — ئەم بڕە ناگۆڕدرێت،
                  تەنها لە خودی وەرگرتنەکاندا ڕاست دەکرێتەوە.
                </p>
              )}
            </>
          )}

          {payment === 'cash' && saleTxs.length > 1 && (
            <p className="text-[12px] text-muted">
              ئەم عەقدە <span className="num">{saleTxs.length}</span> جوڵەی وەرگرتنی هەیە — تەنها یەکەمیان لێرە نوێ دەکرێتەوە.
            </p>
          )}
        </section>

        {/* ═══ سەنەوی و شایەت ═══ */}
        <section className="space-y-3">
          <h3 className="font-bold text-[14px]">سەنەوی و شایەتەکان</h3>
          <Field label="سەنەوی بەناوی کێوەیە">
            <Segmented
              value={titleWho}
              onChange={setTitleWho}
              options={[
                { v: 'seller' as const, label: 'بەناوی فرۆشیارەوە' },
                { v: 'other' as const, label: 'کەسێکی تر' },
              ]}
              size="sm"
            />
          </Field>
          {titleWho === 'other' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="ناوی خاوەنی سەنەوی">
                <input value={titleName} onChange={(e) => setTitleName(e.target.value)} className="field" />
              </Field>
              <Field label="ژمارەی تەلەفۆن">
                <input dir="ltr" value={titlePhone} onChange={(e) => setTitlePhone(e.target.value)} className="field num text-start" />
              </Field>
              <Field label="ناونیشان" className="sm:col-span-2">
                <input value={titleAddress} onChange={(e) => setTitleAddress(e.target.value)} className="field" />
              </Field>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="شایەتی یەکەم">
              <input value={w1} onChange={(e) => setW1(e.target.value)} className="field" />
            </Field>
            <Field label="شایەتی دووەم">
              <input value={w2} onChange={(e) => setW2(e.target.value)} className="field" />
            </Field>
          </div>
        </section>

        {/* ═══ مەرج و تێبینی ═══ */}
        <section className="space-y-3">
          <h3 className="font-bold text-[14px]">مەرجەکان و تێبینی</h3>
          <Field label="مەرجەکانی عەقد" hint="هەر دێڕێک مەرجێکە">
            <textarea rows={5} value={terms} onChange={(e) => setTerms(e.target.value)} className="field leading-7" />
          </Field>
          <Field label="تێبینی">
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="field" />
          </Field>
          {car && (
            <label className="flex items-center gap-2.5 text-[13px] cursor-pointer">
              <input type="checkbox" checked={refreshCar} onChange={(e) => setRefreshCar(e.target.checked)} className="w-4 h-4 accent-[rgb(var(--c-brand))]" />
              زانیاری ئۆتۆمبێل لە تۆمارەکەیەوە نوێ بکەرەوە (کیلۆمەتر، ڕەنگ، پارچەکان...)
            </label>
          )}
        </section>
      </div>
    </Sheet>
  )
}
