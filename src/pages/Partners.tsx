import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Handshake, Plus, Pencil, Trash2, Car, Wallet, ChevronDown, ArrowDownLeft, Info } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, Field, MoneyInput, Picker, Segmented, Sheet, Stat, useConfirm } from '../components/ui'
import { cashBalance } from '../lib/finance'
import { partnerAccounts, type PartnerAccount, type PartnerCarLine } from '../lib/partners'
import { money, todayISO, uid } from '../lib/format'
import { CAR_STATUS } from '../lib/catalog'
import type { Currency, Partner } from '../lib/types'

/** ڕیزێکی بچووکی ژمارە لەناو کارتی شەریک */
function Row({ label, value, tone = 'ink', strong }: { label: string; value: string; tone?: 'ink' | 'ok' | 'bad' | 'warn' | 'brand' | 'muted'; strong?: boolean }) {
  const c = { ink: 'text-ink', ok: 'text-ok', bad: 'text-bad', warn: 'text-warn', brand: 'text-brand', muted: 'text-muted' }[tone]
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12.5px] text-muted">{label}</span>
      <b className={`num text-[13.5px] ${c} ${strong ? 'font-bold' : 'font-medium'}`}>{value}</b>
    </div>
  )
}

/** وردەکاری یەک ئۆتۆمبێلی شەریک */
function CarLine({ line, onOpen }: { line: PartnerCarLine; onOpen: () => void }) {
  const { car } = line
  const st = CAR_STATUS[car.status]
  return (
    <button onClick={onOpen} className="w-full text-start rounded-xl border border-line bg-surface2/60 px-3 py-2.5 hover:border-brand/50">
      <div className="flex items-center gap-2">
        <span className="font-medium text-[13.5px] truncate grow">
          {car.brand} {car.model} <span className="num text-muted">{car.year}</span>
        </span>
        <span className="chip !text-[10px] !py-0 bg-info/12 text-info border-info/30 shrink-0 num">{line.pct}٪</span>
        <span className={`chip !text-[10px] !py-0 shrink-0 ${st.cls}`}>{st.ku}</span>
      </div>

      {!line.capital ? (
        <div className="mt-1.5 space-y-0.5">
          <Row label="ئەمانەت — تەنها پشکی قازانج" value={line.profitShare === null ? '—' : money(line.profitShare, 'USD')} tone={(line.profitShare || 0) >= 0 ? 'ok' : 'bad'} />
        </div>
      ) : line.sold ? (
        <div className="mt-1.5 space-y-0.5">
          <Row label="نرخی فرۆشتن" value={money(line.soldPrice || 0, 'USD')} tone="muted" />
          <Row label="پشکی قازانج" value={money(line.profitShare || 0, 'USD')} tone={(line.profitShare || 0) >= 0 ? 'ok' : 'bad'} />
          <Row label="سەرمایەی گەڕاوە" value={money(line.funded, 'USD')} tone="muted" />
          <Row label="بۆی دەدرێتەوە" value={money(line.payable, 'USD')} tone="brand" strong />
        </div>
      ) : (
        <div className="mt-1.5 space-y-0.5">
          <Row label="کۆی تێچوو" value={money(line.cost, 'USD')} tone="muted" />
          <Row label="پشکی لە تێچوو" value={money(line.costShare, 'USD')} />
          <Row label="خۆی داویەتی" value={money(line.funded, 'USD')} tone="ok" />
          <Row label="قەرز لەسەری" value={money(line.debt, 'USD')} tone={line.debt > 0 ? 'warn' : 'muted'} strong={line.debt > 0} />
        </div>
      )}
    </button>
  )
}

export default function PartnersPage() {
  const nav = useNavigate()
  const { partners, cars, txs, contracts, settings, save, remove, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()
  const [edit, setEdit] = useState<Partial<Partner> | null>(null)
  const [payout, setPayout] = useState<{ p: Partner; amount: number; currency: Currency } | null>(null)
  const [receive, setReceive] = useState<{ acc: PartnerAccount; amount: number; currency: Currency; carId: string } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const rate = settings.usdRate
  const managePartners = can('settings.edit')

  const rows = useMemo(
    () => partnerAccounts(partners, { cars, txs, contracts, rate }),
    [partners, cars, txs, contracts, rate],
  )

  const totals = useMemo(
    () =>
      rows.reduce(
        (s, a) => ({ capital: s.capital + a.stockCapital, debt: s.debt + a.debt, rest: s.rest + Math.max(0, a.rest) }),
        { capital: 0, debt: 0, rest: 0 },
      ),
    [rows],
  )

  const submit = async () => {
    if (!edit?.name) return say('ناو پێویستە', 'bad')
    await save('partners', { id: edit.id || uid('prt'), name: edit.name, phone: edit.phone, note: edit.note, createdAt: edit.createdAt || Date.now() })
    say(edit.id ? 'نوێکرایەوە' : 'شەریک زیادکرا')
    setEdit(null)
  }

  const doPayout = async () => {
    if (!payout || payout.amount <= 0) return
    const tolerance = payout.currency === 'USD' ? 0.011 : 1
    if (payout.amount > cashBalance(txs, payout.currency) + tolerance) return say('باڵانسی سندوق بەس نییە', 'bad')
    try {
      await save('txs', {
        id: uid('tx'), date: todayISO(), kind: 'out', amount: payout.amount, currency: payout.currency,
        rate, account: 'cash', category: 'partner', title: `پشکی شەریک — ${payout.p.name}`,
        partnerId: payout.p.id, createdAt: Date.now(), createdBy: user?.uid,
      })
      await log('پارەدان بە شەریک', 'partners', payout.p.id, `${payout.p.name} — ${money(payout.amount, payout.currency)}`)
      say('تۆمارکرا')
      setPayout(null)
    } catch {
      say('نەتوانرا پارەدانەکە تۆمار بکرێت؛ پەیوەندی داتا یان دەسەڵات پشکنین بکە', 'bad')
    }
  }

  /** وەرگرتنی پارە لە شەریک — سەرمایە یان دانەوەی قەرز */
  const doReceive = async () => {
    if (!receive || receive.amount <= 0) return
    const p = receive.acc.partner
    const line = receive.acc.lines.find((l) => l.car.id === receive.carId)
    try {
      await save('txs', {
        id: uid('tx'), date: todayISO(), kind: 'in', amount: receive.amount, currency: receive.currency,
        rate, account: 'cash', category: 'partner_in',
        title: line ? `پارەی شەریک — ${p.name} · ${line.car.brand} ${line.car.model}` : `پارەی شەریک — ${p.name}`,
        partnerId: p.id, carId: receive.carId || undefined,
        note: line ? 'پشکی شەریک / دانەوەی قەرز' : 'سەرمایەی گشتی',
        createdAt: Date.now(), createdBy: user?.uid,
      })
      await log('وەرگرتنی پارە لە شەریک', 'partners', p.id, `${p.name} — ${money(receive.amount, receive.currency)}`)
      say('تۆمارکرا')
      setReceive(null)
    } catch {
      say('نەتوانرا وەرگرتنەکە تۆمار بکرێت؛ پەیوەندی داتا یان دەسەڵات پشکنین بکە', 'bad')
    }
  }

  if (!can('money.view')) return <Empty icon={<Handshake size={26} />} title="دەسەڵاتت نییە" />

  const debtCars = receive?.acc.lines.filter((l) => !l.sold && l.debt > 0.01) || []
  const carLabel = (l: PartnerCarLine) => `${l.car.brand} ${l.car.model} ${l.car.year} — قەرز ${money(l.debt, 'USD')}`
  const GENERAL = 'بەبێ ئۆتۆمبێل (سەرمایەی گشتی)'

  return (
    <>
      <PageHead
        title="شەریکەکان"
        sub={<><span className="num">{partners.length}</span> شەریک</>}
        action={
          managePartners && <button onClick={() => setEdit({})} className="btn-brand shrink-0">
            <Plus size={17} /> <span className="hidden sm:inline">نوێ</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <div className="card p-4 text-[13px] text-muted leading-6 flex gap-2.5">
          <Info size={17} className="text-brand shrink-0 mt-0.5" />
          <span>
            لە فۆرمی ئۆتۆمبێلدا <b className="text-ink">«شەریکی»</b> هەڵبژێرە بۆ ئەوەی سەرمایە هاوبەش بێت (شەریک هەم لە تێچوو هەم لە قازانج بەشدارە)،
            یان <b className="text-ink">«ئەمانەت»</b> ئەگەر هیچ پارەیەکی لەسەر نەدەدرێت. ئەگەر پشکی شەریکمان بۆ دابێت، خۆکارانە دەبێتە قەرز لەسەری.
          </span>
        </div>

        {rows.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="سەرمایەی شەریکان لە کۆگا" value={<span className="num">{money(totals.capital, 'USD')}</span>} icon={<Wallet size={16} />} />
            <Stat label="قەرز لەسەر شەریکان" value={<span className="num">{money(totals.debt, 'USD')}</span>} tone={totals.debt > 0 ? 'bad' : 'ok'} icon={<ArrowDownLeft size={16} />} />
            <Stat label="ماوە بۆ دان" value={<span className="num">{money(totals.rest, 'USD')}</span>} tone="brand" icon={<Handshake size={16} />} />
          </div>
        )}

        {rows.length === 0 ? (
          <Empty icon={<Handshake size={26} />} title="هیچ شەریکێک نییە" sub="شەریک زیادبکە بۆ ئەوەی ئۆتۆمبێلی شەریکی/ئەمانەتی بۆ تۆمار بکەیت" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 items-start">
            {rows.map((a) => {
              const p = a.partner
              const open = openId === p.id
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-11 h-11 rounded-xl bg-info/15 text-info grid place-items-center font-bold shrink-0">{p.name.charAt(0)}</span>
                    <div className="grow min-w-0">
                      <p className="font-bold truncate">{p.name}</p>
                      {p.phone && (
                        <p className="text-[13px] text-muted num" dir="ltr">
                          {p.phone}
                        </p>
                      )}
                    </div>
                    {managePartners && <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEdit(p)} className="btn-quiet !p-2"><Pencil size={15} /></button>
                      <button
                        onClick={async () => {
                          if (cars.some((c) => c.partnerId === p.id) || txs.some((t) => t.partnerId === p.id)) {
                            return say('ئەم شەریکە ئۆتۆمبێل یان جوڵەی پارەی پەیوەندیداری هەیە؛ ناتوانرێت بسڕدرێتەوە', 'bad')
                          }
                          if (await ask(`سڕینەوەی ${p.name}؟`)) {
                            if (await remove('partners', p.id, p.name)) say('سڕایەوە')
                          }
                        }}
                        className="btn-quiet !p-2 hover:!text-bad"
                      ><Trash2 size={15} /></button>
                    </div>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-line text-center">
                    <div>
                      <p className="text-lg font-bold num">{a.cars}</p>
                      <p className="text-[11px] text-muted">ئۆتۆمبێل</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold num text-info">{a.stock}</p>
                      <p className="text-[11px] text-muted">لە کۆگا</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold num text-ok">{a.sold}</p>
                      <p className="text-[11px] text-muted">فرۆشراو</p>
                    </div>
                  </div>

                  {/* ═══ حساباتی شەریک ═══ */}
                  <div className="mt-3 pt-3 border-t border-line space-y-1.5">
                    <Row label="سەرمایەی لە کۆگا" value={money(a.stockCapital, 'USD')} />
                    <Row label={`بەهای پشکی لە کۆگا (${a.stock} ئۆتۆمبێل)`} value={money(a.stockShare, 'USD')} tone="muted" />
                    <Row label="قەرز لەسەری" value={money(a.debt, 'USD')} tone={a.debt > 0.01 ? 'warn' : 'muted'} strong={a.debt > 0.01} />
                    <Row label="پشکی قازانج (فرۆشراوەکان)" value={money(a.profitShare, 'USD')} tone={a.profitShare >= 0 ? 'ok' : 'bad'} />
                    <Row label="دراوە بە شەریک" value={money(a.paidOut, 'USD')} tone="muted" />
                    <div className="pt-1.5 border-t border-line">
                      {a.rest < -0.01 ? (
                        /* زیاتر لەوەی بۆی هەبووە پێمان داوە — دەبێتەوە قەرز لەسەری */
                        <Row label="پێشەکی دراوە (لەسەری)" value={money(-a.rest, 'USD')} tone="warn" strong />
                      ) : (
                        <Row label="ماوە بۆ دان" value={money(a.rest, 'USD')} tone={a.rest > 0.01 ? 'brand' : 'ok'} strong />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => nav(`/cars?partner=${p.id}`)} className="btn-ghost flex-1 !py-2 !text-[13px]">
                      <Car size={15} /> ئۆتۆمبێلەکان
                    </button>
                    {can('money.edit') && (
                      <>
                        <button onClick={() => setReceive({ acc: a, amount: Math.max(0, Math.round(a.debt)), currency: 'USD', carId: a.lines.find((l) => !l.sold && l.debt > 0.01)?.car.id || '' })} className="btn-ghost flex-1 !py-2 !text-[13px]">
                          <ArrowDownLeft size={15} /> وەرگرتن
                        </button>
                        <button onClick={() => setPayout({ p, amount: Math.max(0, Math.round(a.rest)), currency: 'USD' })} className="btn-brand flex-1 !py-2 !text-[13px]">
                          <Wallet size={15} /> پارەدان
                        </button>
                      </>
                    )}
                  </div>

                  {a.lines.length > 0 && (
                    <>
                      <button
                        onClick={() => setOpenId(open ? null : p.id)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-[12.5px] text-brand py-1"
                      >
                        وردەکاری هەر ئۆتۆمبێلێک
                        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <div className="space-y-2 mt-1">
                          {a.lines.map((l) => (
                            <CarLine key={l.car.id} line={l} onOpen={() => nav(`/cars/${l.car.id}`)} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Sheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'دەستکاری شەریک' : 'شەریکی نوێ'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEdit(null)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={submit}>
              خەزنکردن
            </button>
          </>
        }
      >
        {edit && (
          <div className="space-y-4">
            <Field label="ناو *">
              <input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="field" />
            </Field>
            <Field label="ژمارەی تەلەفۆن">
              <input dir="ltr" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="field text-start num" />
            </Field>
            <Field label="تێبینی">
              <textarea rows={2} value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} className="field" />
            </Field>
          </div>
        )}
      </Sheet>

      {/* ═══ پارەدان بە شەریک ═══ */}
      <Sheet
        open={!!payout}
        onClose={() => setPayout(null)}
        title={`پارەدان بە ${payout?.p.name || ''}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPayout(null)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={doPayout} disabled={!payout || payout.amount <= 0}>
              تۆمارکردن
            </button>
          </>
        }
      >
        {payout && (
          <div className="space-y-4">
            <Field label="بڕی پارە">
              <div className="flex gap-2">
                <MoneyInput value={payout.amount} onChange={(n) => setPayout({ ...payout, amount: n })} />
                <Segmented value={payout.currency} onChange={(v: Currency) => setPayout({ ...payout, currency: v })} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
              </div>
            </Field>
            <p className="text-xs text-muted leading-6">لە سندوقی پێشانگاوە دەرچوو تۆمار دەکرێت و لە «ماوە بۆ دان»ـی شەریک کەم دەکرێتەوە.</p>
          </div>
        )}
      </Sheet>

      {/* ═══ وەرگرتنی پارە لە شەریک ═══ */}
      <Sheet
        open={!!receive}
        onClose={() => setReceive(null)}
        title={`وەرگرتنی پارە لە ${receive?.acc.partner.name || ''}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setReceive(null)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={doReceive} disabled={!receive || receive.amount <= 0}>
              تۆمارکردن
            </button>
          </>
        }
      >
        {receive && (
          <div className="space-y-4">
            <Field label="بڕی پارە">
              <div className="flex gap-2">
                <MoneyInput value={receive.amount} onChange={(n) => setReceive({ ...receive, amount: n })} />
                <Segmented value={receive.currency} onChange={(v: Currency) => setReceive({ ...receive, currency: v })} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
              </div>
            </Field>
            <Field label="بۆ کام ئۆتۆمبێل؟" hint="ئەم بڕە لە قەرزی ئەو ئۆتۆمبێلە کەم دەکاتەوە">
              <Picker
                value={debtCars.find((l) => l.car.id === receive.carId) ? carLabel(debtCars.find((l) => l.car.id === receive.carId)!) : GENERAL}
                onChange={(v) => setReceive({ ...receive, carId: debtCars.find((l) => carLabel(l) === v)?.car.id || '' })}
                options={[...debtCars.map(carLabel), GENERAL]}
                placeholder="ئۆتۆمبێل هەڵبژێرە"
              />
            </Field>
            {receive.acc.debt > 0.01 && (
              <p className="text-xs text-muted leading-6">
                کۆی قەرزی ئێستای <b className="text-ink">{receive.acc.partner.name}</b>: <b className="num text-warn">{money(receive.acc.debt, 'USD')}</b>
              </p>
            )}
            <p className="text-xs text-muted leading-6">پارەکە دەچێتە ناو سندوقی پێشانگاوە (کاش).</p>
          </div>
        )}
      </Sheet>

      {node}
    </>
  )
}
