import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserPlus, Handshake, Loader2, ChevronLeft, Check, CalendarClock, Trash2, Plus } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Field, MoneyInput, Picker, Segmented, Empty } from '../components/ui'
import { CITIES } from '../lib/catalog'
import { addMonths, fmtDate, money, num, todayISO, uid } from '../lib/format'
import { amountWordsKu } from '../lib/numwords'
import { fx } from '../lib/feedback'
import type { Contract, Currency, Customer, Installment } from '../lib/types'

export default function Sell() {
  const { carId } = useParams()
  const nav = useNavigate()
  const { cars, customers, settings, save, log, say, user, nextContractNo } = useApp()
  const car = cars.find((c) => c.id === carId)

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'existing' | 'new'>(customers.length ? 'existing' : 'new')
  const [pickedId, setPickedId] = useState('')
  const [nb, setNb] = useState<Partial<Customer>>({ name: '', phone: '', idNumber: '', idIssuer: '', address: '', city: settings.city })

  const [price, setPrice] = useState(car?.askPrice || 0)
  const [currency, setCurrency] = useState<Currency>(car?.askCurrency || 'USD')
  const [payment, setPayment] = useState<'cash' | 'installment'>('cash')
  const [down, setDown] = useState(0)
  const [count, setCount] = useState(6)
  const [firstDue, setFirstDue] = useState(addMonths(todayISO(), 1))
  const [gap, setGap] = useState(1)
  const [schedule, setSchedule] = useState<Installment[]>([])
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [w1, setW1] = useState('')
  const [w2, setW2] = useState('')

  const buyer = useMemo(() => (mode === 'existing' ? customers.find((c) => c.id === pickedId) : null), [mode, pickedId, customers])

  const buildSchedule = () => {
    const rest = Math.max(0, price - down)
    const per = count > 0 ? Math.round((rest / count) * 100) / 100 : 0
    const arr: Installment[] = []
    let acc = 0
    for (let i = 0; i < count; i++) {
      const amount = i === count - 1 ? Math.round((rest - acc) * 100) / 100 : per
      acc += amount
      arr.push({ no: i + 1, dueDate: addMonths(firstDue, i * gap), amount, paid: 0 })
    }
    setSchedule(arr)
  }

  const buyerOk = mode === 'existing' ? !!pickedId : !!(nb.name && nb.phone)
  const priceOk = price > 0 && (payment === 'cash' || (schedule.length > 0 && Math.abs(schedule.reduce((s, i) => s + i.amount, 0) + down - price) < 1))

  if (!car) return <Empty title="ئۆتۆمبێلەکە نەدۆزرایەوە" />

  const confirm = async () => {
    setBusy(true)
    try {
      let cust: Customer
      if (mode === 'existing' && buyer) cust = buyer
      else {
        cust = {
          id: uid('cus'),
          name: nb.name!,
          phone: nb.phone!,
          idNumber: nb.idNumber,
          idIssuer: nb.idIssuer,
          address: nb.address,
          city: nb.city,
          createdAt: Date.now(),
        }
        await save('customers', cust)
      }

      const no = await nextContractNo()
      const contract: Contract = {
        id: uid('con'),
        no,
        type: 'sale',
        date,
        carId: car.id,
        car: {
          vin: car.vin,
          brand: car.brand,
          model: car.model,
          year: car.year,
          color: car.color,
          km: car.km,
          plate: car.plate,
          bodyType: car.bodyType,
          fuel: car.fuel,
          transmission: car.transmission,
          cylinders: car.cylinders,
          origin: car.origin,
          keys: car.keys,
          body: car.body,
        },
        buyerId: cust.id,
        buyer: { name: cust.name, phone: cust.phone, idNumber: cust.idNumber, idIssuer: cust.idIssuer, address: [cust.city, cust.address].filter(Boolean).join(' — ') },
        seller: {
          name: settings.ownerName || settings.showroomName,
          phone: settings.phone,
          address: [settings.city, settings.address].filter(Boolean).join(' — '),
        },
        price,
        currency,
        rate: settings.usdRate,
        payment,
        down: payment === 'cash' ? price : down,
        installments: payment === 'installment' ? schedule : [],
        terms: settings.terms,
        note,
        witness1: w1,
        witness2: w2,
        status: 'active',
        createdAt: Date.now(),
        createdBy: user?.uid,
        createdByName: user?.name,
      }
      await save('contracts', contract)
      await save('cars', { ...car, status: 'sold', updatedAt: Date.now() })

      const paidNow = payment === 'cash' ? price : down
      if (paidNow > 0) {
        await save('txs', {
          id: uid('tx'),
          date,
          kind: 'in',
          amount: paidNow,
          currency,
          rate: settings.usdRate,
          account: 'cash',
          category: 'car_sell',
          title: `فرۆشتنی ${car.brand} ${car.model} ${car.year}`,
          carId: car.id,
          contractId: contract.id,
          customerId: cust.id,
          note: payment === 'installment' ? 'پێشەکی' : '',
          createdAt: Date.now(),
          createdBy: user?.uid,
        })
      }
      await log('فرۆشتنی ئۆتۆمبێل', 'contracts', contract.id, `${no} — ${car.brand} ${car.model} بۆ ${cust.name}`)
      fx('money')
      say('عەقدەکە دروستکرا')
      nav(`/contracts/${contract.id}`, { replace: true })
    } catch (e) {
      console.error(e)
      say('هەڵەیەک ڕوویدا', 'bad')
    } finally {
      setBusy(false)
    }
  }

  const steps = ['کریار', 'نرخ و شێوازی پارەدان', 'پێداچوونەوە']

  return (
    <>
      <PageHead title="فرۆشتنی ئۆتۆمبێل" sub={`${car.brand} ${car.model} ${car.year}`} back={() => nav(-1)} />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        {/* هەنگاوەکان */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 grow">
              <div className={`flex items-center gap-2 ${i <= step ? 'text-brand' : 'text-muted'}`}>
                <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold border-2 ${i < step ? 'bg-brand border-brand text-brandInk' : i === step ? 'border-brand' : 'border-line'}`}>
                  {i < step ? <Check size={14} /> : <span className="num">{i + 1}</span>}
                </span>
                <span className="text-[13px] font-medium hidden sm:inline">{s}</span>
              </div>
              {i < steps.length - 1 && <span className={`h-0.5 grow rounded ${i < step ? 'bg-brand' : 'bg-line'}`} />}
            </div>
          ))}
        </div>

        {/* ---------- هەنگاوی ١ ---------- */}
        {step === 0 && (
          <div className="card p-4 sm:p-5 space-y-4 animate-in">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { v: 'existing' as const, label: `کریاری تۆمارکراو (${customers.length})` },
                { v: 'new' as const, label: 'کریاری نوێ' },
              ]}
            />

            {mode === 'existing' ? (
              customers.length ? (
                <Field label="کریار هەڵبژێرە">
                  <Picker
                    value={buyer ? `${buyer.name} — ${buyer.phone}` : ''}
                    onChange={(v) => setPickedId(customers.find((c) => `${c.name} — ${c.phone}` === v)?.id || '')}
                    options={customers.map((c) => `${c.name} — ${c.phone}`)}
                    placeholder="بگەڕێ بە ناو یان ژمارە"
                  />
                </Field>
              ) : (
                <p className="text-sm text-muted text-center py-4">هێشتا هیچ کریارێک تۆمار نەکراوە</p>
              )
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="ناوی سیانی *">
                  <input value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} className="field" placeholder="ناوی تەواو وەک لە ناسنامە" />
                </Field>
                <Field label="ژمارەی تەلەفۆن *">
                  <input dir="ltr" value={nb.phone} onChange={(e) => setNb({ ...nb, phone: e.target.value })} className="field text-start num" placeholder="0750 000 0000" />
                </Field>
                <Field label="ژمارەی ناسنامە / کارتی نیشتمانی">
                  <input dir="ltr" value={nb.idNumber} onChange={(e) => setNb({ ...nb, idNumber: e.target.value })} className="field text-start num" />
                </Field>
                <Field label="دەرکراوە لە">
                  <input value={nb.idIssuer} onChange={(e) => setNb({ ...nb, idIssuer: e.target.value })} className="field" placeholder="نموونە: هەولێر" />
                </Field>
                <Field label="شار">
                  <Picker value={nb.city || ''} onChange={(v) => setNb({ ...nb, city: v })} options={CITIES} />
                </Field>
                <Field label="ناونیشان">
                  <input value={nb.address} onChange={(e) => setNb({ ...nb, address: e.target.value })} className="field" placeholder="گەڕەک، کۆڵان..." />
                </Field>
              </div>
            )}

            <button disabled={!buyerOk} onClick={() => setStep(1)} className="btn-brand w-full">
              بەردەوامبە <ChevronLeft size={17} />
            </button>
          </div>
        )}

        {/* ---------- هەنگاوی ٢ ---------- */}
        {step === 1 && (
          <div className="card p-4 sm:p-5 space-y-4 animate-in">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="نرخی فرۆشتن *">
                <div className="flex gap-2">
                  <MoneyInput value={price} onChange={setPrice} />
                  <Segmented value={currency} onChange={setCurrency} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
                </div>
              </Field>
              <Field label="بەرواری عەقد">
                <input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className="field num text-start" />
              </Field>
            </div>

            {price > 0 && <p className="text-[13px] text-muted -mt-1">بە نووسین: {amountWordsKu(price, currency)}</p>}

            <Field label="شێوازی پارەدان">
              <Segmented
                value={payment}
                onChange={setPayment}
                options={[
                  { v: 'cash' as const, label: 'نەقد (تەواو)' },
                  { v: 'installment' as const, label: 'قیست' },
                ]}
              />
            </Field>

            {payment === 'installment' && (
              <div className="space-y-4 border-t border-line pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="پێشەکی">
                    <MoneyInput value={down} onChange={setDown} />
                  </Field>
                  <Field label="ژمارەی قیست">
                    <MoneyInput value={count} onChange={(n) => setCount(Math.max(1, Math.min(120, Math.round(n))))} />
                  </Field>
                  <Field label="یەکەم قیست">
                    <input type="date" dir="ltr" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className="field num text-start !px-2" />
                  </Field>
                  <Field label="هەر چەند مانگ">
                    <Picker value={String(gap)} onChange={(v) => setGap(Number(v))} options={['1', '2', '3', '6', '12']} />
                  </Field>
                </div>
                <button onClick={buildSchedule} className="btn-ghost w-full">
                  <CalendarClock size={17} /> دروستکردنی خشتەی قیستەکان
                </button>

                {schedule.length > 0 && (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {schedule.map((i, idx) => (
                      <div key={i.no} className="flex items-center gap-2 bg-surface2 border border-line rounded-xl px-3 py-2">
                        <span className="w-7 h-7 rounded-lg bg-brand/15 text-brand grid place-items-center text-xs font-bold num shrink-0">{i.no}</span>
                        <input
                          type="date"
                          dir="ltr"
                          value={i.dueDate}
                          onChange={(e) => setSchedule(schedule.map((x, j) => (j === idx ? { ...x, dueDate: e.target.value } : x)))}
                          className="field field-sm num !bg-transparent !border-0 !px-1 grow"
                        />
                        <div className="w-32">
                          <MoneyInput value={i.amount} onChange={(n) => setSchedule(schedule.map((x, j) => (j === idx ? { ...x, amount: n } : x)))} className="!py-1.5 !text-sm" />
                        </div>
                        <button onClick={() => setSchedule(schedule.filter((_, j) => j !== idx).map((x, k) => ({ ...x, no: k + 1 })))} className="text-muted hover:text-bad p-1 shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setSchedule([...schedule, { no: schedule.length + 1, dueDate: addMonths(schedule[schedule.length - 1]?.dueDate || firstDue, gap), amount: 0, paid: 0 }])}
                      className="btn-quiet w-full !py-2 !text-[13px]"
                    >
                      <Plus size={14} /> قیستێکی تر
                    </button>
                    <div className={`flex justify-between text-sm px-1 pt-2 font-medium ${priceOk ? 'text-ok' : 'text-bad'}`}>
                      <span>کۆی قیستەکان + پێشەکی</span>
                      <span className="num">
                        {money(schedule.reduce((s, i) => s + i.amount, 0) + down, currency)} / {money(price, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 border-t border-line pt-4">
              <Field label="شایەتی یەکەم">
                <input value={w1} onChange={(e) => setW1(e.target.value)} className="field" placeholder="ناو (ئارەزوومەندانە)" />
              </Field>
              <Field label="شایەتی دووەم">
                <input value={w2} onChange={(e) => setW2(e.target.value)} className="field" placeholder="ناو (ئارەزوومەندانە)" />
              </Field>
              <Field label="تێبینی زیادە لەسەر عەقد" className="sm:col-span-2">
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder="نموونە: پلێت لەگەڵ ئۆتۆمبێلەکەدایە..." />
              </Field>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="btn-ghost flex-1">
                گەڕانەوە
              </button>
              <button disabled={!priceOk} onClick={() => setStep(2)} className="btn-brand flex-[2]">
                بەردەوامبە <ChevronLeft size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ---------- هەنگاوی ٣ ---------- */}
        {step === 2 && (
          <div className="card p-4 sm:p-5 space-y-4 animate-in">
            <h2 className="font-bold">پێداچوونەوەی کۆتایی</h2>
            <Row k="ئۆتۆمبێل" v={`${car.brand} ${car.model} ${car.year} — ${car.color}`} />
            <Row k="VIN" v={<span className="num" dir="ltr">{car.vin}</span>} />
            <Row k="کیلۆمەتر" v={<span className="num">{num(car.km)}</span>} />
            <Row k="کریار" v={mode === 'existing' ? `${buyer?.name} — ${buyer?.phone}` : `${nb.name} — ${nb.phone}`} />
            <Row k="نرخ" v={<span className="num font-bold text-brand">{money(price, currency)}</span>} />
            <Row k="شێوازی پارەدان" v={payment === 'cash' ? 'نەقد' : `قیست — پێشەکی ${money(down, currency)} + ${schedule.length} قیست`} />
            <Row k="بەروار" v={<span className="num">{fmtDate(date)}</span>} />

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">
                گەڕانەوە
              </button>
              <button disabled={busy} onClick={confirm} className="btn-brand flex-[2]">
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Handshake size={17} />}
                دروستکردنی عەقد
              </button>
            </div>
          </div>
        )}

        {mode === 'new' && step === 0 && (
          <p className="text-xs text-muted flex items-center gap-1.5">
            <UserPlus size={14} /> کریارە نوێکە خۆکارانە لە لیستی کریارەکان تۆمار دەکرێت.
          </p>
        )}
      </div>
    </>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-line last:border-0">
      <span className="text-[13px] text-muted shrink-0">{k}</span>
      <span className="text-[15px] font-medium text-end">{v}</span>
    </div>
  )
}
