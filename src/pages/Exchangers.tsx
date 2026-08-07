import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, History, Loader2, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { PageHead } from '../components/Layout'
import { Empty, Field, MoneyInput, Segmented, Sheet, Stat, useConfirm } from '../components/ui'
import { cashBalance, exchangerBalance, exchangersTotal } from '../lib/finance'
import { fmtDateShort, money, todayISO, uid } from '../lib/format'
import { useApp } from '../store/app'
import type { Currency, Exchanger, Tx } from '../lib/types'

type Flow = 'transfer' | 'return'

type Movement = {
  exchanger: Exchanger
  flow: Flow
  amount: number
  currency: Currency
  date: string
  note: string
}

export default function ExchangersPage() {
  const { exchangers, hawalas, txs, settings, save, remove, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()
  const [cur, setCur] = useState<Currency>('USD')
  const [edit, setEdit] = useState<Partial<Exchanger> | null>(null)
  const [movement, setMovement] = useState<Movement | null>(null)
  const [savingExchanger, setSavingExchanger] = useState(false)
  const [savingMovement, setSavingMovement] = useState(false)

  const transfers = useMemo(
    () =>
      txs
        .filter((t) => t.exchangerId && (t.category === 'exchange_transfer' || t.category === 'exchange_return'))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [txs],
  )
  const totalUsd = useMemo(() => exchangersTotal(txs, 'USD'), [txs])
  const totalIqd = useMemo(() => exchangersTotal(txs, 'IQD'), [txs])

  const saveExchanger = async () => {
    if (savingExchanger) return
    if (!edit?.name?.trim()) return say('ناوی سەراف پێویستە', 'bad')
    setSavingExchanger(true)
    try {
      const id = edit.id || uid('ex')
      await save('exchangers', {
        id,
        name: edit.name.trim(),
        phone: edit.phone?.trim(),
        note: edit.note?.trim(),
        createdAt: edit.createdAt || Date.now(),
      })
      await log(edit.id ? 'دەستکاری سەراف' : 'زیادکردنی سەراف', 'exchangers', id, edit.name.trim())
      say(edit.id ? 'سەراف نوێکرایەوە' : 'سەراف زیادکرا')
      setEdit(null)
    } catch {
      say('نەتوانرا سەراف زیاد بکرێت؛ پەیوەندی داتا یان دەسەڵات پشکنین بکە', 'bad')
    } finally {
      setSavingExchanger(false)
    }
  }

  const saveMovement = async () => {
    if (!movement || savingMovement) return
    if (movement.amount <= 0) return say('بڕی پارە پێویستە', 'bad')
    const tolerance = movement.currency === 'USD' ? 0.011 : 1
    const current = exchangerBalance(txs, movement.exchanger.id, movement.currency)
    const showroomCash = cashBalance(txs, movement.currency)
    if (movement.flow === 'transfer' && movement.amount > showroomCash + tolerance) {
      return say('باڵانسی سندوقی پێشانگا بەس نییە', 'bad')
    }
    if (movement.flow === 'return' && movement.amount > current + tolerance) {
      return say('بڕەکە لە باڵانسی ئەم سەرافە زیاترە', 'bad')
    }
    setSavingMovement(true)
    try {
      const transfer = movement.flow === 'transfer'
      const tx: Tx = {
        id: uid('tx'),
        date: movement.date,
        kind: transfer ? 'out' : 'in',
        amount: movement.amount,
        currency: movement.currency,
        rate: settings.usdRate,
        account: 'cash',
        category: transfer ? 'exchange_transfer' : 'exchange_return',
        title: `${transfer ? 'گواستنەوە بۆ' : 'وەرگرتنەوە لە'} سەراف — ${movement.exchanger.name}`,
        exchangerId: movement.exchanger.id,
        note: movement.note || undefined,
        createdAt: Date.now(),
        createdBy: user?.uid,
      }
      await save('txs', tx)
      await log(transfer ? 'گواستنەوە بۆ سەراف' : 'وەرگرتنەوە لە سەراف', 'exchangers', movement.exchanger.id, `${movement.exchanger.name} — ${money(movement.amount, movement.currency)}`)
      say(transfer ? 'گواستنەوەکە تۆمارکرا' : 'وەرگرتنەوەکە تۆمارکرا')
      setMovement(null)
    } catch {
      say('نەتوانرا جوڵەی پارە تۆمار بکرێت؛ پەیوەندی داتا یان دەسەڵات پشکنین بکە', 'bad')
    } finally {
      setSavingMovement(false)
    }
  }

  const deleteExchanger = async (exchanger: Exchanger) => {
    if (transfers.some((t) => t.exchangerId === exchanger.id) || hawalas.some((h) => h.exchangerId === exchanger.id)) {
      return say('سەرافێک کە جوڵەی پارەی هەیە ناتوانرێت بسڕدرێتەوە', 'bad')
    }
    if (!(await ask(`سڕینەوەی «${exchanger.name}»؟`))) return
    if (await remove('exchangers', exchanger.id, exchanger.name)) say('سڕایەوە')
  }

  if (!can('money.view')) return <Empty icon={<Wallet size={26} />} title="دەسەڵاتت نییە" sub="تەنها خاوەن و ژمێریار دەتوانن سندوق ببینن" />

  const openMovement = (exchanger: Exchanger, flow: Flow) => {
    setMovement({ exchanger, flow, amount: 0, currency: cur, date: todayISO(), note: '' })
  }

  return (
    <>
      <PageHead
        title="سندووقی سەرافەکان"
        sub={<><span className="num">{exchangers.length}</span> سەراف</>}
        action={
          can('money.edit') ? (
            <button onClick={() => setEdit({})} className="btn-brand shrink-0">
              <Plus size={17} /> <span className="hidden sm:inline">سەرافی نوێ</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="card p-3.5 text-[13px] leading-6 text-muted grow">
            دۆلار یان دینار لە سندوقی پێشانگا بۆ سەراف لێرە تۆمار بکە. کاتێک پارەکە دەگەڕێتەوە، «وەرگرتنەوە» بکە تا هەردوو باڵانسەکە ڕاست بمێننەوە.
          </div>
          <div className="w-full sm:w-40 shrink-0">
            <Segmented value={cur} onChange={setCur} options={[{ v: 'USD', label: 'دۆلار' }, { v: 'IQD', label: 'دینار' }]} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="کۆی لای سەرافەکان" value={<span className="num">{money(cur === 'USD' ? totalUsd : totalIqd, cur)}</span>} tone="brand" icon={<ArrowLeftRight size={16} />} />
          <Stat label="جوڵەی تۆمارکراو" value={<span className="num">{transfers.length}</span>} sub="گواستنەوە و وەرگرتنەوە" icon={<History size={16} />} />
        </div>

        {exchangers.length === 0 ? (
          <Empty icon={<ArrowLeftRight size={26} />} title="هێشتا هیچ سەرافێک زیاد نەکراوە" sub="سەرافی خۆت زیاد بکە، پاشان گواستنەوەی پارە تۆمار بکە" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {exchangers.map((exchanger) => {
              const usd = exchangerBalance(txs, exchanger.id, 'USD')
              const iqd = exchangerBalance(txs, exchanger.id, 'IQD')
              const activeBalance = cur === 'USD' ? usd : iqd
              return (
                <div key={exchanger.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-11 h-11 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0">
                      <ArrowLeftRight size={20} />
                    </span>
                    <div className="grow min-w-0">
                      <p className="font-bold truncate">{exchanger.name}</p>
                      {exchanger.phone ? <p className="text-[13px] text-muted num" dir="ltr">{exchanger.phone}</p> : <p className="text-[12px] text-muted">سەراف</p>}
                    </div>
                    {can('money.edit') && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEdit(exchanger)} className="btn-quiet !p-2" aria-label="دەستکاری سەراف"><Pencil size={15} /></button>
                        {can('contract.delete') && <button onClick={() => deleteExchanger(exchanger)} className="btn-quiet !p-2 hover:!text-bad" aria-label="سڕینەوەی سەراف"><Trash2 size={15} /></button>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-line">
                    <div className="rounded-xl bg-surface2 border border-line px-3 py-2.5">
                      <p className="text-[11px] text-muted">دۆلار لای</p>
                      <p className={`num font-bold mt-0.5 ${usd > 0 ? 'text-brand' : 'text-ink'}`}>{money(usd, 'USD')}</p>
                    </div>
                    <div className="rounded-xl bg-surface2 border border-line px-3 py-2.5">
                      <p className="text-[11px] text-muted">دینار لای</p>
                      <p className={`num font-bold mt-0.5 ${iqd > 0 ? 'text-brand' : 'text-ink'}`}>{money(iqd, 'IQD')}</p>
                    </div>
                  </div>
                  {exchanger.note && <p className="text-xs text-muted mt-2 truncate">{exchanger.note}</p>}

                  {can('money.edit') && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button onClick={() => openMovement(exchanger, 'transfer')} className="btn-brand !py-2 !text-[13px]">
                        <ArrowUpRight size={16} /> بۆ سەراف
                      </button>
                      <button disabled={activeBalance <= 0} onClick={() => openMovement(exchanger, 'return')} className="btn-ghost !py-2 !text-[13px] disabled:opacity-45">
                        <ArrowDownLeft size={16} /> وەرگرتنەوە
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {transfers.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center gap-2">
              <History size={17} className="text-brand" />
              <h2 className="font-bold text-sm">دوایین جوڵەکان</h2>
            </div>
            <div className="divide-y divide-line">
              {transfers.slice(0, 20).map((t) => {
                const isTransfer = t.category === 'exchange_transfer'
                const exchanger = exchangers.find((x) => x.id === t.exchangerId)
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${isTransfer ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}>
                      {isTransfer ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                    </span>
                    <div className="grow min-w-0">
                      <p className="text-sm font-medium truncate">{isTransfer ? 'گواستنەوە بۆ' : 'وەرگرتنەوە لە'} {exchanger?.name || 'سەرافی سڕاوە'}</p>
                      <p className="text-xs text-muted truncate"><span className="num">{fmtDateShort(t.date)}</span>{t.note ? ` · ${t.note}` : ''}</p>
                    </div>
                    <span className={`num text-sm font-bold shrink-0 ${isTransfer ? 'text-warn' : 'text-ok'}`}>{isTransfer ? '−' : '+'}{money(t.amount, t.currency)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Sheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'دەستکاری سەراف' : 'سەرافی نوێ'}
        footer={<><button className="btn-ghost" disabled={savingExchanger} onClick={() => setEdit(null)}>پاشگەزبوونەوە</button><button className="btn-brand" disabled={savingExchanger} onClick={saveExchanger}>{savingExchanger ? <Loader2 size={16} className="animate-spin" /> : null} خەزنکردن</button></>}
      >
        {edit && (
          <div className="space-y-4">
            <Field label="ناوی سەراف *"><input autoFocus value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="field" /></Field>
            <Field label="ژمارەی تەلەفۆن"><input dir="ltr" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="field num text-start" /></Field>
            <Field label="تێبینی"><textarea rows={2} value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} className="field" /></Field>
          </div>
        )}
      </Sheet>

      <Sheet
        open={!!movement}
        onClose={() => setMovement(null)}
        title={movement?.flow === 'transfer' ? `گواستنەوە بۆ ${movement.exchanger.name}` : `وەرگرتنەوە لە ${movement?.exchanger.name || ''}`}
        footer={<><button className="btn-ghost" disabled={savingMovement} onClick={() => setMovement(null)}>پاشگەزبوونەوە</button><button className="btn-brand" disabled={savingMovement} onClick={saveMovement}>{savingMovement ? <Loader2 size={16} className="animate-spin" /> : null} تۆمارکردن</button></>}
      >
        {movement && (
          <div className="space-y-4">
            <div className={`rounded-xl border px-3 py-2.5 text-[13px] ${movement.flow === 'transfer' ? 'border-warn/35 bg-warn/10 text-ink' : 'border-ok/35 bg-ok/10 text-ink'}`}>
              {movement.flow === 'transfer' ? 'پارە لە سندوقی پێشانگا کەم دەبێت و دەچێتە باڵانسی ئەم سەرافە.' : 'پارە لە سەراف وەردەگیرێت و دەگەڕێتە سندوقی پێشانگا.'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="بڕ"><MoneyInput value={movement.amount} onChange={(amount) => setMovement({ ...movement, amount })} /></Field>
              <Field label="دراو"><Segmented value={movement.currency} onChange={(currency: Currency) => setMovement({ ...movement, currency })} options={[{ v: 'USD', label: '$' }, { v: 'IQD', label: 'د.ع' }]} size="sm" /></Field>
              <Field label="بەروار" className="col-span-2"><input type="date" dir="ltr" value={movement.date} onChange={(e) => setMovement({ ...movement, date: e.target.value })} className="field num text-start" /></Field>
            </div>
            <div className="rounded-xl bg-surface2 border border-line px-3 py-2.5 text-sm flex items-center justify-between gap-3">
              <span className="text-muted">باڵانسی ئێستا لای سەراف</span>
              <b className="num">{money(exchangerBalance(txs, movement.exchanger.id, movement.currency), movement.currency)}</b>
            </div>
            <Field label="تێبینی"><input value={movement.note} onChange={(e) => setMovement({ ...movement, note: e.target.value })} className="field" placeholder="ئارەزوومەندانە" /></Field>
          </div>
        )}
      </Sheet>

      {node}
    </>
  )
}
