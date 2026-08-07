import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Printer, Languages, Trash2, Ban, CheckCircle2, Loader2, Wallet, Share2, Car as CarIcon } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { ContractSheet } from '../components/ContractSheet'
import { Empty, Field, MoneyInput, Segmented, Sheet, useConfirm } from '../components/ui'
import { contractDebt, contractPaid } from '../lib/finance'
import { fmtDate, fmtDateShort, money, todayISO, uid } from '../lib/format'

export default function ContractView() {
  const { id } = useParams()
  const nav = useNavigate()
  const { contracts, cars, txs, settings, commit, log, say, can, user } = useApp()
  const c = contracts.find((x) => x.id === id)
  const { ask, node } = useConfirm()
  const [lang, setLang] = useState<'ku' | 'ar'>('ku')
  const [pay, setPay] = useState<{ no: number; amount: number } | null>(null)
  const [payBusy, setPayBusy] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)

  if (!c) return <Empty title="عەقدەکە نەدۆزرایەوە" />

  const car = cars.find((x) => x.id === c.carId)
  const debt = contractDebt(c)
  const paid = contractPaid(c)

  const doPay = async () => {
    if (!pay || payBusy || c.status !== 'active' || pay.amount <= 0) return
    const installment = c.installments.find((i) => i.no === pay.no)
    if (!installment) return say('قیستەکە نەدۆزرایەوە', 'bad')
    const rest = Math.max(0, installment.amount - (installment.paid || 0))
    const tolerance = c.currency === 'USD' ? 0.011 : 1
    if (pay.amount > rest + tolerance) return say('ناتوانیت زیاتر لە باقی قیست وەربگریت', 'bad')
    setPayBusy(true)
    try {
      const insts = c.installments.map((i) => (i.no === pay.no ? { ...i, paid: (i.paid || 0) + pay.amount, paidDate: todayISO() } : i))
      const done = insts.every((i) => (i.paid || 0) >= i.amount - tolerance)
      const nextContract = { ...c, installments: insts, status: done ? 'completed' : c.status }
      const tx = {
        id: uid('tx'),
        date: todayISO(),
        kind: 'in',
        amount: pay.amount,
        currency: c.currency,
        rate: c.rate || settings.usdRate,
        account: 'cash',
        category: 'installment',
        title: `قیستی ژمارە ${pay.no} — ${c.no}`,
        carId: c.carId,
        contractId: c.id,
        customerId: c.buyerId,
        createdAt: Date.now(),
        createdBy: user?.uid,
      }
      await commit([
        { kind: 'put', coll: 'contracts', value: nextContract },
        { kind: 'put', coll: 'txs', value: tx },
      ])
      await log('وەرگرتنی قیست', 'contracts', c.id, `${c.no} — قیستی ${pay.no} — ${money(pay.amount, c.currency)}`)
      say('پارەکە وەرگیرا')
      setPay(null)
    } finally {
      setPayBusy(false)
    }
  }

  const cancel = async () => {
    if (cancelBusy) return
    if (!(await ask('دڵنیایت لە هەڵوەشاندنەوەی ئەم عەقدە؟ ئۆتۆمبێلەکە دەگەڕێتەوە بۆ بەردەست.'))) return
    const received = txs.filter((t) => t.contractId === c.id && (t.category === 'car_sell' || t.category === 'installment'))
    if (received.length && !(await ask('پارەی وەرگیراو گەڕاوەتەوە بۆ کریار؟ بەردەوامبوون هەموو پارە وەرگیراوەکان وەک «گەڕاندنەوە» تۆمار دەکات.'))) return
    setCancelBusy(true)
    try {
      const at = Date.now()
      const writes: Parameters<typeof commit>[0] = []
      for (let i = 0; i < received.length; i++) {
        const t = received[i]
        writes.push({ kind: 'put', coll: 'txs', value: {
          id: uid('tx'), date: todayISO(), kind: 'out', amount: t.amount, currency: t.currency,
          rate: t.rate || c.rate || settings.usdRate, account: t.account, category: 'contract_refund',
          title: `گەڕاندنەوەی پارەی عەقد — ${c.no}`, carId: c.carId, contractId: c.id, customerId: c.buyerId,
          note: `بەرامبەر ${t.title}`, createdAt: at + i, createdBy: user?.uid,
        } })
      }
      writes.push({ kind: 'put', coll: 'contracts', value: { ...c, status: 'cancelled' } })
      if (car) writes.push({ kind: 'put', coll: 'cars', value: { ...car, status: 'available', updatedAt: Date.now() } })
      await commit(writes)
      await log('هەڵوەشاندنەوەی عەقد', 'contracts', c.id, received.length ? `${c.no} — پارەکە گەڕایەوە بۆ کریار` : c.no)
      say(received.length ? 'عەقدەکە هەڵوەشایەوە و پارەکەش گەڕایەوە' : 'عەقدەکە هەڵوەشێنرایەوە', 'info')
    } finally {
      setCancelBusy(false)
    }
  }

  const del = async () => {
    if (txs.some((t) => t.contractId === c.id)) return say('عەقدێک کە جوڵەی پارەی هەیە ناتوانرێت بسڕدرێتەوە؛ تەنها هەڵیوەشێنەوە', 'bad')
    if (!(await ask('سڕینەوەی عەقد نەگەڕاوەیە. بەردەوامبم؟'))) return
    await commit([
      { kind: 'del', coll: 'contracts', id: c.id },
      ...(car ? [{ kind: 'put' as const, coll: 'cars' as const, value: { ...car, status: 'available' as const, updatedAt: Date.now() } }] : []),
    ])
    await log('سڕینەوە', 'contracts', c.id, c.no)
    say('عەقدەکە سڕایەوە')
    nav('/contracts')
  }

  const share = async () => {
    const txt = `عەقدی فرۆشتن ${c.no}\n${c.car.brand} ${c.car.model} ${c.car.year}\nVIN: ${c.car.vin}\nکریار: ${c.buyer.name} — ${c.buyer.phone}\nنرخ: ${money(c.price, c.currency)}\nبەروار: ${fmtDateShort(c.date)}\n${settings.showroomName}`
    if (navigator.share) await navigator.share({ title: `عەقد ${c.no}`, text: txt }).catch(() => {})
    else {
      navigator.clipboard?.writeText(txt)
      say('کۆپی کرا')
    }
  }

  return (
    <>
      <PageHead
        title={`عەقد ${c.no}`}
        sub={
          <span className="flex items-center gap-2 flex-wrap">
            <span className={`chip ${c.status === 'cancelled' ? 'bg-bad/15 text-bad border-bad/30' : c.status === 'completed' ? 'bg-ok/15 text-ok border-ok/30' : 'bg-info/15 text-info border-info/30'}`}>
              {c.status === 'cancelled' ? 'هەڵوەشێنراوە' : c.status === 'completed' ? 'تەواوبووە' : 'چالاک'}
            </span>
            <span className="num">{fmtDate(c.date)}</span>
          </span>
        }
        back={() => nav(-1)}
        action={
          <button onClick={() => window.print()} className="btn-brand shrink-0">
            <Printer size={17} /> <span className="hidden sm:inline">پرینت</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        {/* کردارەکان */}
        <div className="flex flex-wrap gap-2 no-print">
          <button onClick={() => setLang(lang === 'ku' ? 'ar' : 'ku')} className="btn-ghost">
            <Languages size={17} /> {lang === 'ku' ? 'گۆڕین بۆ عەرەبی' : 'گۆڕین بۆ کوردی'}
          </button>
          <button onClick={share} className="btn-ghost">
            <Share2 size={17} /> هاوبەشکردن
          </button>
          {car && (
            <button onClick={() => nav(`/cars/${car.id}`)} className="btn-ghost">
              <CarIcon size={17} /> ئۆتۆمبێل
            </button>
          )}
          {c.status === 'active' && can('contract.delete') && (
            <button disabled={cancelBusy} onClick={cancel} className="btn-ghost !text-warn disabled:opacity-45">
              {cancelBusy ? <Loader2 size={17} className="animate-spin" /> : <Ban size={17} />} هەڵوەشاندنەوە
            </button>
          )}
          {can('contract.delete') && (
            <button onClick={del} className="btn-bad">
              <Trash2 size={17} /> سڕینەوە
            </button>
          )}
        </div>

        {/* قیستەکان */}
        {c.payment === 'installment' && (
          <div className="card p-4 sm:p-5 no-print">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">قیستەکان</h2>
              <div className="text-end">
                <p className="text-xs text-muted">ماوە</p>
                <p className={`font-bold num ${debt > 0 ? 'text-warn' : 'text-ok'}`}>{money(debt, c.currency)}</p>
              </div>
            </div>
            <div className="h-2 bg-surface2 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${Math.min(100, (paid / c.price) * 100)}%` }} />
            </div>
            <p className="text-[13px] text-muted mb-3">
              دراوە: <b className="text-ok num">{money(paid, c.currency)}</b> لە <b className="num">{money(c.price, c.currency)}</b>
            </p>
            <div className="space-y-1.5">
              {c.installments.map((i) => {
                const rest = i.amount - (i.paid || 0)
                const done = rest <= 0.01
                const late = !done && i.dueDate < todayISO()
                return (
                  <div key={i.no} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border ${done ? 'bg-ok/8 border-ok/25' : late ? 'bg-bad/8 border-bad/25' : 'bg-surface2 border-line'}`}>
                    <span className={`w-8 h-8 rounded-lg grid place-items-center text-xs font-bold num shrink-0 ${done ? 'bg-ok/20 text-ok' : late ? 'bg-bad/20 text-bad' : 'bg-brand/15 text-brand'}`}>
                      {done ? <CheckCircle2 size={16} /> : i.no}
                    </span>
                    <div className="grow min-w-0">
                      <p className="text-sm num">{fmtDateShort(i.dueDate)}</p>
                      <p className="text-xs text-muted">
                        {done ? `دراوە ${i.paidDate ? '· ' + fmtDateShort(i.paidDate) : ''}` : late ? 'دواکەوتووە' : 'چاوەڕوانە'}
                      </p>
                    </div>
                    <span className="num text-sm font-medium shrink-0">{money(i.amount, c.currency)}</span>
                    {!done && c.status === 'active' && can('money.edit') && (
                      <button onClick={() => setPay({ no: i.no, amount: rest })} className="btn-brand !py-1.5 !px-3 !text-[13px] shrink-0">
                        وەرگرتن
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* پێشاندانی عەقد */}
        <div className="overflow-x-auto print-area">
          <ContractSheet c={c} s={settings} lang={lang} />
        </div>

        <p className="text-xs text-muted text-center no-print pb-6">
          دروستکراوە لەلایەن {c.createdByName || '—'} · <span className="num">{fmtDate(c.createdAt)}</span>
          <br />
          بۆ PDF: لە پەنجەرەی پرینت «Save as PDF» هەڵبژێرە.
        </p>
      </div>

      <Sheet
        open={!!pay}
        onClose={() => setPay(null)}
        title={`وەرگرتنی قیستی ژمارە ${pay?.no ?? ''}`}
        footer={
          <>
            <button className="btn-ghost" disabled={payBusy} onClick={() => setPay(null)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" disabled={payBusy} onClick={doPay}>
              {payBusy ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />} تۆمارکردن
            </button>
          </>
        }
      >
        <Field label="بڕی وەرگیراو" hint="دەتوانیت بەشێکی قیستەکە وەربگریت">
          <div className="flex gap-2">
            <MoneyInput value={pay?.amount || 0} onChange={(n) => setPay(pay ? { ...pay, amount: n } : null)} />
            <Segmented value={c.currency} onChange={() => {}} options={[{ v: c.currency, label: c.currency === 'USD' ? '$' : 'د.ع' }]} size="sm" />
          </div>
        </Field>
      </Sheet>

      {node}
    </>
  )
}
