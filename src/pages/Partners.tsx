import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Handshake, Plus, Pencil, Trash2, Car, Wallet } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, Field, MoneyInput, Segmented, Sheet, useConfirm } from '../components/ui'
import { carMoney } from '../lib/finance'
import { money, todayISO, uid } from '../lib/format'
import type { Currency, Partner } from '../lib/types'

export default function PartnersPage() {
  const nav = useNavigate()
  const { partners, cars, txs, contracts, settings, save, remove, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()
  const [edit, setEdit] = useState<Partial<Partner> | null>(null)
  const [payout, setPayout] = useState<{ p: Partner; amount: number; currency: Currency } | null>(null)
  const rate = settings.usdRate

  const rows = useMemo(
    () =>
      partners.map((p) => {
        const mine = cars.filter((c) => c.partnerId === p.id)
        const sold = mine.filter((c) => c.status === 'sold')
        const profit = sold.reduce((s, c) => {
          const m = carMoney(c, txs, contracts, 'USD', rate)
          return s + ((m.profit || 0) * (c.partnerPct || 50)) / 100
        }, 0)
        const paid = txs.filter((t) => t.partnerId === p.id && t.category === 'partner').reduce((s, t) => s + (t.currency === 'USD' ? t.amount : t.amount / (t.rate || rate)), 0)
        return { p, cars: mine.length, sold: sold.length, profit, paid, rest: profit - paid }
      }),
    [partners, cars, txs, contracts, rate],
  )

  const submit = async () => {
    if (!edit?.name) return say('ناو پێویستە', 'bad')
    await save('partners', { id: edit.id || uid('prt'), name: edit.name, phone: edit.phone, note: edit.note, createdAt: edit.createdAt || Date.now() })
    say(edit.id ? 'نوێکرایەوە' : 'شەریک زیادکرا')
    setEdit(null)
  }

  const doPayout = async () => {
    if (!payout || payout.amount <= 0) return
    await save('txs', {
      id: uid('tx'),
      date: todayISO(),
      kind: 'out',
      amount: payout.amount,
      currency: payout.currency,
      rate,
      account: 'cash',
      category: 'partner',
      title: `پشکی شەریک — ${payout.p.name}`,
      partnerId: payout.p.id,
      createdAt: Date.now(),
      createdBy: user?.uid,
    })
    await log('پارەدان بە شەریک', 'partners', payout.p.id, `${payout.p.name} — ${money(payout.amount, payout.currency)}`)
    say('تۆمارکرا')
    setPayout(null)
  }

  if (!can('money.view')) return <Empty icon={<Handshake size={26} />} title="دەسەڵاتت نییە" />

  return (
    <>
      <PageHead
        title="شەریکەکان"
        sub={<><span className="num">{partners.length}</span> شەریک</>}
        action={
          <button onClick={() => setEdit({})} className="btn-brand shrink-0">
            <Plus size={17} /> <span className="hidden sm:inline">نوێ</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <div className="card p-4 text-[13px] text-muted leading-6">
          ئۆتۆمبێلی «ئەمانەت / شەریکی» لە فۆرمی تۆمارکردنی ئۆتۆمبێل دیاری دەکرێت و ڕێژەی شەریک لەوێ دادەنرێت.
        </div>

        {rows.length === 0 ? (
          <Empty icon={<Handshake size={26} />} title="هیچ شەریکێک نییە" sub="شەریک زیادبکە بۆ ئەوەی ئۆتۆمبێلی ئەمانەتی بۆ تۆمار بکەیت" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map(({ p, cars: n, sold, profit, paid, rest }) => (
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
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEdit(p)} className="btn-quiet !p-2">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={async () => {
                        if (await ask(`سڕینەوەی ${p.name}؟`)) {
                          await remove('partners', p.id, p.name)
                          say('سڕایەوە')
                        }
                      }}
                      className="btn-quiet !p-2 hover:!text-bad"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-line text-center">
                  <div>
                    <p className="text-lg font-bold num">{n}</p>
                    <p className="text-[11px] text-muted">ئۆتۆمبێل</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold num text-ok">{sold}</p>
                    <p className="text-[11px] text-muted">فرۆشراو</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold num ${rest > 0 ? 'text-warn' : 'text-ok'}`}>{money(rest, 'USD')}</p>
                    <p className="text-[11px] text-muted">ماوە</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => nav(`/cars?partner=${p.id}`)} className="btn-ghost flex-1 !py-2 !text-[13px]">
                    <Car size={15} /> ئۆتۆمبێلەکان
                  </button>
                  {can('money.edit') && (
                    <button onClick={() => setPayout({ p, amount: Math.max(0, Math.round(rest)), currency: 'USD' })} className="btn-brand flex-1 !py-2 !text-[13px]">
                      <Wallet size={15} /> پارەدان
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted mt-2">
                  پشکی قازانج <span className="num">{money(profit, 'USD')}</span> · دراوە <span className="num">{money(paid, 'USD')}</span>
                </p>
              </div>
            ))}
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

      <Sheet
        open={!!payout}
        onClose={() => setPayout(null)}
        title={`پارەدان بە ${payout?.p.name || ''}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPayout(null)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={doPayout}>
              تۆمارکردن
            </button>
          </>
        }
      >
        {payout && (
          <Field label="بڕی پارە">
            <div className="flex gap-2">
              <MoneyInput value={payout.amount} onChange={(n) => setPayout({ ...payout, amount: n })} />
              <Segmented value={payout.currency} onChange={(v: Currency) => setPayout({ ...payout, currency: v })} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
            </div>
          </Field>
        )}
      </Sheet>

      {node}
    </>
  )
}
