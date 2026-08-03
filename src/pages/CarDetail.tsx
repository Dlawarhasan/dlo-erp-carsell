import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Pencil, Trash2, Handshake, Plus, Gauge, Fuel, Cog, Palette, MapPin, Calendar, KeyRound,
  FileText, TrendingUp, Share2, X, Wallet, Check,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Sheet, Field, MoneyInput, Segmented, useConfirm, Empty, Picker } from '../components/ui'
import { DamageMap } from '../components/DamageMap'
import { Img, thumbOf } from '../components/Img'
import { Portal } from '../components/Portal'
import { CAR_STATUS, COLORS, TX_CATEGORY_KU } from '../lib/catalog'
import { fmtDate, maskVin, money, num, todayISO, uid } from '../lib/format'
import { carMoney } from '../lib/finance'
import type { Currency } from '../lib/types'
import { EXPENSE_CATEGORIES } from '../lib/catalog'

export default function CarDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { cars, txs, contracts, settings, can, save, remove, log, say, user } = useApp()
  const car = cars.find((c) => c.id === id)
  const { ask, node } = useConfirm()
  const [gallery, setGallery] = useState<number | null>(null)
  const [costOpen, setCostOpen] = useState(false)
  const [cost, setCost] = useState({ label: '', amount: 0, currency: 'USD' as Currency, date: todayISO() })
  const [copied, setCopied] = useState(false)

  const m = useMemo(
    () => (car ? carMoney(car, txs, contracts, car.buyCurrency || 'USD', settings.usdRate) : null),
    [car, txs, contracts, settings.usdRate],
  )
  const costs = useMemo(() => txs.filter((t) => t.carId === id && t.category === 'car_cost').sort((a, b) => b.date.localeCompare(a.date)), [txs, id])
  const contract = contracts.find((c) => c.carId === id && c.status !== 'cancelled')

  if (!car) return <Empty icon={<X size={26} />} title="ئۆتۆمبێلەکە نەدۆزرایەوە" />

  const hex = COLORS.find((x) => x.ku === car.color)?.hex
  const st = CAR_STATUS[car.status]
  const cur = car.buyCurrency || 'USD'

  const del = async () => {
    if (!(await ask(`دڵنیایت لە سڕینەوەی ${car.brand} ${car.model}؟ هەموو زانیارییەکانی لەناودەچێت.`))) return
    await remove('cars', car.id, `${car.brand} ${car.model} — ${car.vin}`)
    say('ئۆتۆمبێلەکە سڕایەوە')
    nav('/cars')
  }

  const addCost = async () => {
    if (!cost.amount || !cost.label) return
    await save('txs', {
      id: uid('tx'),
      date: cost.date,
      kind: 'out',
      amount: cost.amount,
      currency: cost.currency,
      rate: settings.usdRate,
      account: 'cash',
      category: 'car_cost',
      title: cost.label,
      carId: car.id,
      createdAt: Date.now(),
      createdBy: user?.uid,
    })
    await log('زیادکردنی تێچوو', 'cars', car.id, `${cost.label} — ${money(cost.amount, cost.currency)}`)
    say('تێچووەکە زیادکرا')
    setCost({ label: '', amount: 0, currency: 'USD', date: todayISO() })
    setCostOpen(false)
  }

  const shareText = `${car.brand} ${car.model} ${car.year}
ڕەنگ: ${car.color}
کیلۆمەتر: ${num(car.km)}
VIN: ${car.vin}
نرخ: ${car.askPrice ? money(car.askPrice, car.askCurrency) : 'پرسیار بکە'}
${settings.showroomName} ${settings.phone ? '— ' + settings.phone : ''}`

  const doShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${car.brand} ${car.model}`, text: shareText }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      say('زانیارییەکان کۆپی کران')
    }
  }

  const photos = car.photos || []

  return (
    <>
      <PageHead
        title={`${car.brand} ${car.model}`}
        sub={
          <span className="flex items-center gap-2 flex-wrap">
            <span className={`chip ${st.cls}`}>{st.ku}</span>
            <span className="num" dir="ltr">{maskVin(car.vin)}</span>
          </span>
        }
        back={() => nav(-1)}
        action={
          <div className="flex gap-2 shrink-0">
            <button onClick={doShare} className="btn-ghost !px-3">{copied ? <Check size={17} className="text-ok" /> : <Share2 size={17} />}</button>
            {can('car.edit') && (
              <button onClick={() => nav(`/cars/${car.id}/edit`)} className="btn-ghost !px-3">
                <Pencil size={17} />
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* گەلەری */}
        {photos.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden">
            <button onClick={() => setGallery(0)} className={`${photos.length > 1 ? 'col-span-3' : 'col-span-4'} aspect-[16/10] bg-surface2`}>
              <img src={thumbOf(photos.find((p) => p.cover) || photos[0])} alt="" className="w-full h-full object-cover" />
            </button>
            {photos.length > 1 && (
              <div className="flex flex-col gap-2">
                {photos.slice(0, 3).map((p, i) => (
                  <button key={p.id} onClick={() => setGallery(i)} className="grow bg-surface2 relative overflow-hidden rounded-lg">
                    <img src={thumbOf(p)} alt="" className="w-full h-full object-cover" />
                    {i === 2 && photos.length > 3 && (
                      <span className="absolute inset-0 bg-black/60 grid place-items-center text-white font-bold num">+{photos.length - 3}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card aspect-[16/7] grid place-items-center text-muted">هیچ وێنەیەک نییە</div>
        )}

        {/* کردارە خێراکان */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {car.status !== 'sold' && can('contract.create') && (
            <button onClick={() => nav(`/sell/${car.id}`)} className="btn-brand">
              <Handshake size={17} /> فرۆشتن
            </button>
          )}
          {contract && (
            <button onClick={() => nav(`/contracts/${contract.id}`)} className="btn-ghost">
              <FileText size={17} /> عەقد
            </button>
          )}
          {can('money.edit') && (
            <button onClick={() => setCostOpen(true)} className="btn-ghost">
              <Plus size={17} /> تێچوو
            </button>
          )}
          {can('car.delete') && (
            <button onClick={del} className="btn-bad">
              <Trash2 size={17} /> سڕینەوە
            </button>
          )}
        </div>

        {/* تایبەتمەندییەکان */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-bold mb-4">زانیاری ئۆتۆمبێل</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Spec icon={<Calendar size={15} />} label="ساڵ" value={<span className="num">{car.year}</span>} />
            <Spec icon={<Gauge size={15} />} label="کیلۆمەتر" value={<span className="num">{num(car.km)}</span>} />
            <Spec
              icon={<Palette size={15} />}
              label="ڕەنگ"
              value={
                <span className="flex items-center gap-2">
                  {hex && <span className="w-4 h-4 rounded-full border border-line" style={{ background: hex }} />}
                  {car.color}
                </span>
              }
            />
            <Spec icon={<Cog size={15} />} label="گێڕ" value={car.transmission} />
            <Spec icon={<Fuel size={15} />} label="سووتەمەنی" value={car.fuel} />
            <Spec icon={<Cog size={15} />} label="ماتۆڕ" value={car.cylinders || '—'} />
            <Spec icon={<Cog size={15} />} label="شێواز" value={car.bodyType || '—'} />
            <Spec icon={<Cog size={15} />} label="کش" value={car.drive || '—'} />
            <Spec icon={<MapPin size={15} />} label="ڕەگەز" value={car.origin || '—'} />
            <Spec icon={<KeyRound size={15} />} label="کلیل" value={car.keys ? <span className="num">{car.keys}</span> : '—'} />
            <Spec icon={<MapPin size={15} />} label="شوێن" value={car.location || '—'} />
            <Spec icon={<FileText size={15} />} label="پلێت" value={<span className="num" dir="ltr">{car.plate || '—'}</span>} />
          </div>
          <div className="mt-4 pt-4 border-t border-line">
            <p className="text-[13px] text-muted mb-1">ژمارەی شانس (VIN)</p>
            <p className="num text-[15px] tracking-widest" dir="ltr">{car.vin}</p>
          </div>
          {car.note && <p className="mt-4 pt-4 border-t border-line text-sm leading-7 text-muted">{car.note}</p>}
        </div>

        {/* پارچەکان */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-bold mb-4">دۆخی پارچەکان</h2>
          <DamageMap value={car.body} readOnly />
          {car.bodyNote && <p className="mt-4 pt-4 border-t border-line text-sm leading-7 text-muted">{car.bodyNote}</p>}
        </div>

        {/* حسابات */}
        {can('money.view') && m && (
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">حساباتی ئەم ئۆتۆمبێلە</h2>
              <span className="text-xs text-muted">بە {cur === 'USD' ? 'دۆلار' : 'دینار'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MiniStat label="نرخی کڕین" value={money(m.buy, cur)} />
              <MiniStat label="تێچووەکان" value={money(m.costs, cur)} />
              <MiniStat label="کۆی تێچوو" value={money(m.total, cur)} tone="warn" />
              {m.sold !== null ? (
                <MiniStat label="قازانج" value={money(m.profit || 0, cur)} tone={(m.profit || 0) >= 0 ? 'ok' : 'bad'} />
              ) : (
                <MiniStat label="نرخی داواکراو" value={car.askPrice ? money(car.askPrice, car.askCurrency) : '—'} tone="brand" />
              )}
            </div>
            {m.sold === null && car.askPrice > 0 && (
              <p className="text-[13px] text-muted mt-3 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-ok" />
                قازانجی چاوەڕوانکراو: <b className="text-ok num">{money(car.askPrice - m.total, cur)}</b>
              </p>
            )}

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted">تێچووەکان</h3>
                {can('money.edit') && (
                  <button onClick={() => setCostOpen(true)} className="text-xs text-brand flex items-center gap-1">
                    <Plus size={13} /> زیادکردن
                  </button>
                )}
              </div>
              {costs.length === 0 ? (
                <p className="text-sm text-muted py-3">هیچ تێچوویەک تۆمار نەکراوە</p>
              ) : (
                <div className="space-y-1.5">
                  {costs.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 bg-surface2 border border-line rounded-xl px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{t.title}</p>
                        <p className="text-xs text-muted num">{fmtDate(t.date)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="num text-sm font-medium text-bad">{money(t.amount, t.currency)}</span>
                        {can('money.edit') && (
                          <button onClick={() => remove('txs', t.id, t.title)} className="text-muted hover:text-bad p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* عەقد */}
        {contract && (
          <button onClick={() => nav(`/contracts/${contract.id}`)} className="card p-4 flex items-center gap-3 w-full text-start hover:border-brand/50">
            <span className="w-10 h-10 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0">
              <FileText size={19} />
            </span>
            <div className="grow min-w-0">
              <p className="font-medium">
                عەقدی فرۆشتن — <span className="num">{contract.no}</span>
              </p>
              <p className="text-[13px] text-muted truncate">
                {contract.buyer.name} · <span className="num">{fmtDate(contract.date)}</span>
              </p>
            </div>
            <span className="num font-bold text-brand shrink-0">{money(contract.price, contract.currency)}</span>
          </button>
        )}

        <p className="text-xs text-muted text-center pb-6">
          تۆمارکراوە: <span className="num">{fmtDate(car.createdAt)}</span> · نوێکراوەتەوە: <span className="num">{fmtDate(car.updatedAt)}</span>
        </p>
      </div>

      {/* گەلەری فوول */}
      {gallery !== null && (
        <Portal>
        <div className="fixed inset-0 z-[95] bg-black/95 no-print flex flex-col">
          <div className="flex justify-between items-center p-4 text-white safe-t">
            <span className="num text-sm">
              {gallery + 1} / {photos.length}
            </span>
            <button onClick={() => setGallery(null)} className="w-11 h-11 rounded-full bg-white/12 grid place-items-center">
              <X size={22} />
            </button>
          </div>
          <div className="grow grid place-items-center p-4 overflow-hidden">
            <Img photo={photos[gallery]} full fit="contain" className="w-full h-full rounded-xl" />
          </div>
          <div className="flex gap-2 overflow-x-auto p-4 hide-scroll">
            {photos.map((p, i) => (
              <button key={p.id} onClick={() => setGallery(i)} className={`w-20 h-14 shrink-0 rounded-lg overflow-hidden border-2 ${i === gallery ? 'border-brand' : 'border-transparent opacity-60'}`}>
                <img src={thumbOf(p)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        </Portal>
      )}

      {/* زیادکردنی تێچوو */}
      <Sheet
        open={costOpen}
        onClose={() => setCostOpen(false)}
        title="زیادکردنی تێچوو"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setCostOpen(false)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={addCost} disabled={!cost.amount || !cost.label}>
              <Wallet size={16} /> زیادکردن
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="جۆری تێچوو">
            <Picker
              value={cost.label}
              onChange={(v) => setCost({ ...cost, label: v })}
              options={['بۆیاغ', 'سمکەری', 'ماتۆڕ', 'گێڕ', 'بریک', 'تایە', 'بەتری', 'شووشە', 'کەشێن', 'پاککردنەوە (تنظیف)', 'گومرگ و ڕەسم', 'گواستنەوە', ...EXPENSE_CATEGORIES]}
              allowCustom
              placeholder="هەڵبژێرە یان بنووسە"
            />
          </Field>
          <Field label="بڕی پارە">
            <div className="flex gap-2">
              <MoneyInput value={cost.amount} onChange={(n) => setCost({ ...cost, amount: n })} />
              <Segmented value={cost.currency} onChange={(v: Currency) => setCost({ ...cost, currency: v })} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
            </div>
          </Field>
          <Field label="بەروار">
            <input type="date" dir="ltr" value={cost.date} onChange={(e) => setCost({ ...cost, date: e.target.value })} className="field num text-start" />
          </Field>
          <p className="text-xs text-muted">ئەم بڕە خۆکارانە لە سندوقی پێشانگا کەم دەکرێتەوە ({TX_CATEGORY_KU.car_cost}).</p>
        </div>
      </Sheet>

      {node}
    </>
  )
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] text-muted flex items-center gap-1.5 mb-1">
        {icon} {label}
      </p>
      <p className="text-[15px] font-medium">{value}</p>
    </div>
  )
}

function MiniStat({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'ok' | 'bad' | 'warn' | 'brand' }) {
  const c = { ink: 'text-ink', ok: 'text-ok', bad: 'text-bad', warn: 'text-warn', brand: 'text-brand' }[tone]
  return (
    <div className="bg-surface2 border border-line rounded-xl p-3">
      <p className="text-[12px] text-muted mb-1">{label}</p>
      <p className={`font-bold num ${c}`}>{value}</p>
    </div>
  )
}
