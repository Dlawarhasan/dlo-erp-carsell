import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Pencil, Trash2, Handshake, Plus, Gauge, Fuel, Cog, Palette, MapPin, Calendar, KeyRound,
  FileText, TrendingUp, Share2, X, Wallet, Check, History, Eye,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { EditInfo, Sheet, Field, MoneyInput, Segmented, useConfirm, Empty, Picker } from '../components/ui'
import { withEdit } from '../lib/edits'
import { DamageMap } from '../components/DamageMap'
import { Img, thumbOf } from '../components/Img'
import { Portal } from '../components/Portal'
import { CAR_STATUS, COLORS, TX_CATEGORY_KU } from '../lib/catalog'
import { fmtDate, kmToMiles, maskVin, money, num, todayISO, uid } from '../lib/format'
import { carMoney } from '../lib/finance'
import { partnerCarLine } from '../lib/partners'
import type { Currency, Tx } from '../lib/types'
import { EXPENSE_CATEGORIES } from '../lib/catalog'

export default function CarDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { cars, txs, contracts, partners, settings, can, save, remove, log, say, user } = useApp()
  const car = cars.find((c) => c.id === id)
  const { ask, node } = useConfirm()
  const [gallery, setGallery] = useState<number | null>(null)
  const [costOpen, setCostOpen] = useState(false)
  /* `id` پڕ بێت واتە دەستکاری تێچوویەکی تۆمارکراوە */
  const [cost, setCost] = useState<{ id?: string; label: string; amount: number; currency: Currency; date: string; tx?: Tx }>({
    label: '', amount: 0, currency: 'USD', date: todayISO(),
  })
  const [copied, setCopied] = useState(false)

  const m = useMemo(
    () => (car ? carMoney(car, txs, contracts, car.buyCurrency || 'USD', settings.usdRate) : null),
    [car, txs, contracts, settings.usdRate],
  )
  const costs = useMemo(() => txs.filter((t) => t.carId === id && t.category === 'car_cost').sort((a, b) => b.date.localeCompare(a.date)), [txs, id])
  const share = useMemo(
    () => (car?.partnerId ? partnerCarLine(car, { cars, txs, contracts, rate: settings.usdRate }) : null),
    [car, cars, txs, contracts, settings.usdRate],
  )
  const partner = partners.find((p) => p.id === car?.partnerId)
  /* تۆمارە کۆنەکانی هەمان ئۆتۆمبێل — کڕدراوەتەوە دوای فرۆشتن */
  const twins = useMemo(
    () => (car?.vin ? cars.filter((x) => x.vin === car.vin && x.id !== car.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : []),
    [cars, car?.vin, car?.id],
  )
  const contract = contracts.find((c) => c.carId === id && c.status !== 'cancelled')

  if (!car) return <Empty icon={<X size={26} />} title="ئۆتۆمبێلەکە نەدۆزرایەوە" />

  const hex = COLORS.find((x) => x.ku === car.color)?.hex
  const st = CAR_STATUS[car.status]
  const cur = car.buyCurrency || 'USD'

  const del = async () => {
    if (contracts.some((c) => c.carId === car.id) || txs.some((t) => t.carId === car.id)) {
      return say('ئەم ئۆتۆمبێلە عەقد یان جوڵەی پارەی هەیە؛ بۆ پاراستنی حسابات ناتوانرێت بسڕدرێتەوە', 'bad')
    }
    if (!(await ask(`دڵنیایت لە سڕینەوەی ${car.brand} ${car.model}؟ هەموو زانیارییەکانی لەناودەچێت.`))) return
    if (await remove('cars', car.id, `${car.brand} ${car.model} — ${car.vin}`)) {
      say('ئۆتۆمبێلەکە سڕایەوە')
      nav('/cars')
    }
  }

  const delCost = async (t: (typeof costs)[number]) => {
    if (!(await ask(`سڕینەوەی تێچووی «${t.title}»؟`))) return
    if (await remove('txs', t.id, t.title)) say('تێچووەکە سڕایەوە')
  }

  const resetCost = () => setCost({ label: '', amount: 0, currency: 'USD', date: todayISO() })

  const editCost = (t: Tx) => {
    setCost({ id: t.id, label: t.title, amount: t.amount, currency: t.currency, date: t.date, tx: t })
    setCostOpen(true)
  }

  const addCost = async () => {
    if (!cost.amount || !cost.label) return
    const prev = cost.tx
    const base: Tx = {
      ...(prev || {}),
      id: cost.id || uid('tx'),
      date: cost.date,
      kind: 'out',
      amount: cost.amount,
      currency: cost.currency,
      rate: prev?.rate || settings.usdRate,
      account: prev?.account || 'cash',
      category: 'car_cost',
      title: cost.label,
      carId: car.id,
      createdAt: prev?.createdAt || Date.now(),
      createdBy: prev?.createdBy || user?.uid,
    }
    await save('txs', prev ? withEdit(base, user) : base)
    await log(prev ? 'گۆڕینی تێچوو' : 'زیادکردنی تێچوو', 'cars', car.id, `${cost.label} — ${money(cost.amount, cost.currency)}`)
    say(prev ? 'تێچووەکە نوێ کرایەوە' : 'تێچووەکە زیادکرا')
    resetCost()
    setCostOpen(false)
  }

  const shareText = `${car.brand} ${car.model} ${car.year}
ڕەنگ: ${car.color}
${car.odoUnit === 'mi' ? 'مایل' : 'کیلۆمەتر'}: ${num(car.odoUnit === 'mi' ? Math.round(kmToMiles(car.km)) : Math.round(car.km || 0))}
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

        {/* مێژووی هەمان ئۆتۆمبێل لای ئێمە */}
        {twins.length > 0 && (
          <div className="card p-4 sm:p-5">
            <h2 className="font-bold flex items-center gap-2">
              <History size={17} className="text-info" /> مێژووی ئەم ئۆتۆمبێلە لای ئێمە
            </h2>
            <p className="text-[12.5px] text-muted mt-1 mb-3">
              هەمان VIN — <span className="num">{twins.length}</span> تۆماری تر
            </p>
            <div className="space-y-2">
              {twins.map((t) => {
                const sale = contracts.find((x) => x.carId === t.id && x.type === 'sale' && x.status !== 'cancelled')
                const st = CAR_STATUS[t.status]
                return (
                  <button
                    key={t.id}
                    onClick={() => nav(`/cars/${t.id}`)}
                    className="w-full flex items-center gap-3 rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-start hover:border-brand/50"
                  >
                    <div className="grow min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.brand} {t.model} <span className="num text-muted">{t.year}</span>
                        <span className={`chip !text-[10px] !py-0 ms-2 ${st.cls}`}>{st.ku}</span>
                      </p>
                      <p className="text-[12px] text-muted">
                        کڕدراوە <span className="num">{fmtDate(t.buyDate)}</span>
                        {sale && (
                          <>
                            {' · '}فرۆشراوە <span className="num">{fmtDate(sale.date)}</span>
                            {can('money.view') && <> بە <span className="num">{money(sale.price, sale.currency)}</span></>}
                          </>
                        )}
                      </p>
                    </div>
                    <Eye size={16} className="text-muted shrink-0" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* تایبەتمەندییەکان */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-bold mb-4">زانیاری ئۆتۆمبێل</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Spec icon={<Calendar size={15} />} label="ساڵ" value={<span className="num">{car.year}</span>} />
            <Spec
              icon={<Gauge size={15} />}
              label={car.odoUnit === 'mi' ? 'مایل' : 'کیلۆمەتر'}
              value={
                <span className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="num">{num(car.odoUnit === 'mi' ? Math.round(kmToMiles(car.km)) : Math.round(car.km || 0))}</span>
                  <span className="text-[12px] text-muted">
                    (<span className="num">{num(car.odoUnit === 'mi' ? Math.round(car.km || 0) : Math.round(kmToMiles(car.km)))}</span>{' '}
                    {car.odoUnit === 'mi' ? 'کم' : 'مایل'})
                  </span>
                </span>
              }
            />
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
            <Spec icon={<Cog size={15} />} label="جۆری ئۆتۆمبێل" value={car.bodyType || '—'} />
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
                        <EditInfo edits={t.edits} at={t.editedAt} by={t.editedByName} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="num text-sm font-medium text-bad">{money(t.amount, t.currency)}</span>
                        {can('money.edit') && (
                          <button onClick={() => editCost(t)} className="text-muted hover:text-ink p-1" aria-label="گۆڕینی تێچوو">
                            <Pencil size={14} />
                          </button>
                        )}
                        {can('contract.delete') && (
                          <button onClick={() => delCost(t)} className="text-muted hover:text-bad p-1" aria-label="سڕینەوەی تێچوو">
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

        {/* شەریک */}
        {share && can('money.view') && (
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-bold flex items-center gap-2">
                <Handshake size={17} className="text-info" />
                {share.capital ? 'شەریکی ئەم ئۆتۆمبێلە' : 'ئەمانەت'}
              </h2>
              <span className="chip bg-info/12 text-info border-info/30 num">{share.pct}٪</span>
            </div>

            <button
              onClick={() => nav(`/cars?partner=${car.partnerId}`)}
              className="w-full flex items-center gap-3 rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-start hover:border-brand/50 mb-3"
            >
              <span className="w-9 h-9 rounded-xl bg-info/15 text-info grid place-items-center font-bold shrink-0">
                {(partner?.name || '؟').charAt(0)}
              </span>
              <span className="grow min-w-0">
                <span className="block font-medium truncate">{partner?.name || 'شەریکی نەناسراو'}</span>
                {partner?.phone && <span className="block text-[12px] text-muted num" dir="ltr">{partner.phone}</span>}
              </span>
            </button>

            {!share.capital ? (
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="پشکی قازانج" value={share.profitShare === null ? '—' : money(share.profitShare, 'USD')} tone={(share.profitShare || 0) >= 0 ? 'ok' : 'bad'} />
                <MiniStat label="سەرمایە" value="بێ سەرمایە" />
              </div>
            ) : share.sold ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MiniStat label="پشکی قازانج" value={money(share.profitShare || 0, 'USD')} tone={(share.profitShare || 0) >= 0 ? 'ok' : 'bad'} />
                <MiniStat label="سەرمایەی گەڕاوە" value={money(share.funded, 'USD')} />
                <MiniStat label="بۆی دەدرێتەوە" value={money(share.payable, 'USD')} tone="brand" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="کۆی تێچوو" value={money(share.cost, 'USD')} />
                <MiniStat label="پشکی لە تێچوو" value={money(share.costShare, 'USD')} />
                <MiniStat label="خۆی داویەتی" value={money(share.funded, 'USD')} tone="ok" />
                <MiniStat label="قەرز لەسەری" value={money(share.debt, 'USD')} tone={share.debt > 0.01 ? 'warn' : 'ok'} />
              </div>
            )}

            <p className="text-[12.5px] text-muted mt-3 leading-6">
              {share.capital
                ? 'پشکی شەریک بەپێی ڕێژەکەی لە کۆی تێچوو (کڕین + خەرجی) دەردەچێت. ئەوەی ئێمە بۆی داوە قەرزە لەسەری و لە کاتی فرۆشتن لە پشکەکەی کەم دەکرێتەوە.'
                : 'ئەمانەت — هیچ سەرمایەیەکی لەسەر نەدراوە، تەنها ڕێژەیەک لە قازانج بۆی هەیە.'}
            </p>
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
        onClose={() => {
          setCostOpen(false)
          resetCost()
        }}
        title={cost.id ? 'گۆڕینی تێچوو' : 'زیادکردنی تێچوو'}
        footer={
          <>
            <button
              className="btn-ghost"
              onClick={() => {
                setCostOpen(false)
                resetCost()
              }}
            >
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={addCost} disabled={!cost.amount || !cost.label}>
              <Wallet size={16} /> {cost.id ? 'نوێکردنەوە' : 'زیادکردن'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {cost.tx && <EditInfo edits={cost.tx.edits} at={cost.tx.editedAt} by={cost.tx.editedByName} />}
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
