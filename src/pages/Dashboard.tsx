import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Plus, Car, FileText, TrendingUp, AlertTriangle, Wallet, ArrowLeft, Clock, NotebookPen } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Stat } from '../components/ui'
import { balances, carMoney, openInstallments, profitInRange } from '../lib/finance'
import { fmtDateShort, money, num, todayISO } from '../lib/format'
import { CAR_STATUS } from '../lib/catalog'
import { thumbOf } from '../components/Img'

const firstOfMonth = () => todayISO().slice(0, 8) + '01'

export default function Dashboard() {
  const nav = useNavigate()
  const { cars, contracts, txs, debts, settings, user, can } = useApp()
  const rate = settings.usdRate

  const stats = useMemo(() => {
    const avail = cars.filter((c) => c.status === 'available')
    const b = balances(txs, 'USD', rate)
    const p = profitInRange(cars, txs, contracts, 'USD', rate, firstOfMonth(), todayISO())
    const stock = cars.filter((c) => c.status !== 'sold').reduce((s, c) => s + carMoney(c, txs, contracts, 'USD', rate).total, 0)
    const monthSales = contracts.filter((c) => c.status !== 'cancelled' && c.date >= firstOfMonth())
    return { avail: avail.length, balance: b.total, profit: p.profit, stock, monthSales: monthSales.length }
  }, [cars, contracts, txs, rate])

  const dues = useMemo(() => openInstallments(contracts), [contracts])

  /* دەفتەری قەرز — قەرزی پێش سیستەم */
  const debtSum = useMemo(() => {
    const open = (debts || []).filter((d) => d.status !== 'closed')
    const left = (d: (typeof open)[number]) =>
      Math.max(0, (d.amount || 0) - (d.payments || []).reduce((s, p) => s + (p.amount || 0), 0))
    const usd = (d: (typeof open)[number]) => {
      const v = left(d)
      return d.currency === 'USD' ? v : v / (d.rate || rate)
    }
    const inn = open.filter((d) => d.kind === 'receivable').reduce((s, d) => s + usd(d), 0)
    const out = open.filter((d) => d.kind === 'payable').reduce((s, d) => s + usd(d), 0)
    const today = todayISO()
    const late = open.filter((d) => {
      if (left(d) <= 0) return false
      if (d.installments?.length) return d.installments.some((i) => i.paid < i.amount && i.dueDate < today)
      return !!d.dueDate && d.dueDate < today
    }).length
    return { inn, out, late, count: open.filter((d) => left(d) > 0).length }
  }, [debts, rate])
  const overdue = dues.filter((d) => d.overdue)
  const soon = dues.filter((d) => !d.overdue && d.daysLeft <= 14).slice(0, 4)
  const recentCars = useMemo(() => [...cars].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6), [cars])
  const recentContracts = useMemo(() => [...contracts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4), [contracts])

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'بەیانیت باش' : hour < 17 ? 'ڕۆژباش' : 'ئێوارەت باش'

  return (
    <>
      <PageHead title={`${greet}${user?.name ? '، ' + user.name.split(' ')[0] : ''}`} sub={settings.showroomName} />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
        {/* کردارە خێراکان */}
        <div className="grid grid-cols-3 gap-2.5">
          <button onClick={() => nav('/scan')} className="card p-4 flex flex-col items-center gap-2 hover:border-brand/60 transition">
            <span className="w-11 h-11 rounded-xl bg-brand/15 text-brand grid place-items-center">
              <ScanLine size={21} />
            </span>
            <span className="text-[13px] font-medium">سکانی VIN</span>
          </button>
          <button onClick={() => nav('/cars/new')} className="card p-4 flex flex-col items-center gap-2 hover:border-brand/60 transition">
            <span className="w-11 h-11 rounded-xl bg-ok/15 text-ok grid place-items-center">
              <Plus size={21} />
            </span>
            <span className="text-[13px] font-medium">ئۆتۆمبێلی نوێ</span>
          </button>
          <button onClick={() => nav('/cars')} className="card p-4 flex flex-col items-center gap-2 hover:border-brand/60 transition">
            <span className="w-11 h-11 rounded-xl bg-info/15 text-info grid place-items-center">
              <Car size={21} />
            </span>
            <span className="text-[13px] font-medium">کۆگا</span>
          </button>
        </div>

        {/* ئامارەکان */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="بەردەست بۆ فرۆشتن" value={<span className="num">{stats.avail}</span>} sub={<>لە کۆی <span className="num">{cars.length}</span></>} icon={<Car size={16} />} />
          <Stat label="فرۆشتنی ئەم مانگە" value={<span className="num">{stats.monthSales}</span>} sub="عەقد" tone="brand" icon={<FileText size={16} />} />
          {can('money.view') && <Stat label="قازانجی ئەم مانگە" value={<span className="num">{money(stats.profit, 'USD')}</span>} tone="ok" icon={<TrendingUp size={16} />} />}
          {can('money.view') && <Stat label="باڵانسی سندوق" value={<span className="num">{money(stats.balance, 'USD')}</span>} tone={stats.balance >= 0 ? 'ink' : 'bad'} icon={<Wallet size={16} />} />}
        </div>

        {/* ئاگاداری */}
        {overdue.length > 0 && (
          <button onClick={() => nav('/accounting')} className="card w-full p-4 flex items-center gap-3 border-bad/40 bg-bad/5 text-start">
            <span className="w-10 h-10 rounded-xl bg-bad/15 text-bad grid place-items-center shrink-0">
              <AlertTriangle size={20} />
            </span>
            <div className="grow min-w-0">
              <p className="font-medium text-sm">
                <span className="num">{overdue.length}</span> قیستی دواکەوتوو هەیە
              </p>
              <p className="text-xs text-muted truncate">
                {overdue
                  .slice(0, 2)
                  .map((d) => d.contract.buyer.name)
                  .join('، ')}
                {overdue.length > 2 ? ' و کەسانی تر' : ''}
              </p>
            </div>
            <ArrowLeft size={18} className="text-muted shrink-0" />
          </button>
        )}

        {/* دەفتەری قەرز */}
        {can('money.view') && debtSum.count > 0 && (
          <button onClick={() => nav('/debts')} className="card w-full p-4 flex items-center gap-3 text-start">
            <span className="w-10 h-10 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0">
              <NotebookPen size={20} />
            </span>
            <div className="grow min-w-0">
              <p className="font-medium text-sm flex items-center gap-2">
                دەفتەری قەرز
                {debtSum.late > 0 && (
                  <span className="text-[10px] bg-warn/20 text-warn px-1.5 py-0.5 rounded-md">
                    <span className="num">{debtSum.late}</span> دواکەوتوو
                  </span>
                )}
              </p>
              <p className="text-xs text-muted mt-0.5">
                بۆم <b className="num text-ok">{money(debtSum.inn, 'USD')}</b>
                {debtSum.out > 0 && (
                  <>
                    {' · '}لەسەرم <b className="num text-bad">{money(debtSum.out, 'USD')}</b>
                  </>
                )}
              </p>
            </div>
            <ArrowLeft size={18} className="text-muted shrink-0" />
          </button>
        )}

        {soon.length > 0 && (
          <div className="card p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Clock size={16} className="text-warn" /> قیستەکانی نزیک
            </h3>
            <div className="space-y-2">
              {soon.map((d) => (
                <button key={d.contract.id + d.no} onClick={() => nav(`/contracts/${d.contract.id}`)} className="flex items-center gap-3 w-full text-start bg-surface2 border border-line rounded-xl px-3 py-2.5 hover:border-brand/50">
                  <div className="grow min-w-0">
                    <p className="text-sm truncate">{d.contract.buyer.name}</p>
                    <p className="text-xs text-muted">
                      <span className="num">{fmtDateShort(d.dueDate)}</span> · دوای <span className="num">{d.daysLeft}</span> ڕۆژ
                    </p>
                  </div>
                  <span className="num text-sm font-medium text-warn shrink-0">{money(d.rest, d.contract.currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* دوایین ئۆتۆمبێلەکان */}
        {recentCars.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">دوایین ئۆتۆمبێلەکان</h3>
              <button onClick={() => nav('/cars')} className="text-[13px] text-brand flex items-center gap-1">
                هەموو <ArrowLeft size={14} />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scroll -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
              {recentCars.map((c) => {
                const cover = c.photos?.find((p) => p.cover) || c.photos?.[0]
                return (
                  <button key={c.id} onClick={() => nav(`/cars/${c.id}`)} className="card overflow-hidden w-44 shrink-0 text-start hover:border-brand/50">
                    <div className="aspect-[16/10] bg-surface2">
                      {cover ? <img src={thumbOf(cover)} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full grid place-items-center text-muted/40"><Car size={24} /></div>}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[13px] font-medium truncate">
                        {c.brand} {c.model}
                      </p>
                      <p className="text-[11px] text-muted"><span className="num">{c.year}</span> · <span className="num">{num(c.km)}</span> کم</p>
                      <span className={`chip mt-1.5 !text-[10px] !py-0 ${CAR_STATUS[c.status].cls}`}>{CAR_STATUS[c.status].ku}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* دوایین عەقدەکان */}
        {recentContracts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">دوایین عەقدەکان</h3>
              <button onClick={() => nav('/contracts')} className="text-[13px] text-brand flex items-center gap-1">
                هەموو <ArrowLeft size={14} />
              </button>
            </div>
            <div className="card divide-y divide-line overflow-hidden">
              {recentContracts.map((c) => (
                <button key={c.id} onClick={() => nav(`/contracts/${c.id}`)} className="flex items-center gap-3 px-4 py-3 w-full text-start hover:bg-surface2">
                  <span className="w-9 h-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0">
                    <FileText size={17} />
                  </span>
                  <div className="grow min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.car.brand} {c.car.model} — {c.buyer.name}
                    </p>
                    <p className="text-xs text-muted"><span className="num">{c.no}</span> · <span className="num">{fmtDateShort(c.date)}</span></p>
                  </div>
                  <span className="num text-sm font-bold text-brand shrink-0">{money(c.price, c.currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {cars.length === 0 && (
          <div className="card p-8 text-center">
            <h3 className="font-bold mb-2">دەستپێبکە</h3>
            <p className="text-sm text-muted mb-5 leading-7">
              یەکەم ئۆتۆمبێل تۆمار بکە، دواتر دەتوانیت بیفرۆشیت و عەقدی فەرمی بۆ دەربکەیت.
            </p>
            <button onClick={() => nav('/cars/new')} className="btn-brand mx-auto">
              <Plus size={17} /> تۆمارکردنی ئۆتۆمبێل
            </button>
          </div>
        )}
      </div>
    </>
  )
}
