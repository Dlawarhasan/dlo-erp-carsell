import { useMemo, useState } from 'react'
import { CircleX, Landmark, Loader2, Plus, ReceiptText, Send, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHead } from '../components/Layout'
import { Empty, Field, MoneyInput, Picker, Segmented, Sheet, Stat, useConfirm } from '../components/ui'
import { fmtDateShort, money, todayISO, uid } from '../lib/format'
import { exchangerBalance } from '../lib/finance'
import { useApp } from '../store/app'
import type { Currency, Hawala, Tx } from '../lib/types'

type RecipientType = Hawala['recipientType']
type HawalaForm = {
  exchangerId: string
  recipientType: RecipientType
  recipientName: string
  recipientPhone: string
  partnerId?: string
  customerId?: string
  amount: number
  fee: number
  currency: Currency
  date: string
  reference: string
  note: string
}

const freshForm = (): HawalaForm => ({
  exchangerId: '', recipientType: 'other', recipientName: '', recipientPhone: '', amount: 0, fee: 0,
  currency: 'USD', date: todayISO(), reference: '', note: '',
})

export default function HawalasPage() {
  const nav = useNavigate()
  const { hawalas, exchangers, partners, customers, txs, settings, commit, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()
  const [cur, setCur] = useState<Currency>('USD')
  const [form, setForm] = useState<HawalaForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const ordered = useMemo(() => [...hawalas].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [hawalas])
  const active = useMemo(() => hawalas.filter((h) => h.status === 'sent'), [hawalas])
  const sentInCurrency = useMemo(
    () => active.filter((h) => h.currency === cur).reduce((sum, h) => sum + h.amount, 0),
    [active, cur],
  )
  const feesInCurrency = useMemo(
    () => active.filter((h) => h.currency === cur).reduce((sum, h) => sum + h.fee, 0),
    [active, cur],
  )

  const start = () => setForm({ ...freshForm(), exchangerId: exchangers[0]?.id || '' })

  const setRecipientType = (recipientType: RecipientType) => {
    if (!form) return
    setForm({ ...form, recipientType, recipientName: '', recipientPhone: '', partnerId: undefined, customerId: undefined })
  }

  const pickPartner = (name: string) => {
    if (!form) return
    const p = partners.find((x) => x.name === name)
    setForm({ ...form, recipientName: p?.name || '', recipientPhone: p?.phone || '', partnerId: p?.id, customerId: undefined })
  }

  const pickCustomer = (name: string) => {
    if (!form) return
    const c = customers.find((x) => x.name === name)
    setForm({ ...form, recipientName: c?.name || '', recipientPhone: c?.phone || '', customerId: c?.id, partnerId: undefined })
  }

  const submit = async () => {
    if (saving) return
    if (!form?.exchangerId) return say('سەراف هەڵبژێرە', 'bad')
    if (!form.recipientName.trim()) return say('ناوی وەرگر پێویستە', 'bad')
    if (form.amount <= 0 || form.fee < 0) return say('بڕی حەواڵە دروست نییە', 'bad')
    const exchanger = exchangers.find((x) => x.id === form.exchangerId)
    if (!exchanger) return say('سەراف نەدۆزرایەوە', 'bad')
    const available = exchangerBalance(txs, exchanger.id, form.currency)
    if (form.amount + form.fee > available + 0.001) {
      return say(`باڵانسی ${exchanger.name} بەس نییە`, 'bad')
    }

    setSaving(true)
    try {
      const id = uid('haw')
      const txId = uid('tx')
      const hawala: Hawala = {
        id,
        exchangerId: form.exchangerId,
        recipientType: form.recipientType,
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim() || undefined,
        partnerId: form.partnerId,
        customerId: form.customerId,
        amount: form.amount,
        fee: form.fee,
        currency: form.currency,
        rate: settings.usdRate,
        date: form.date,
        reference: form.reference.trim() || undefined,
        note: form.note.trim() || undefined,
        status: 'sent',
        txId,
        createdAt: Date.now(),
        createdBy: user?.uid,
      }
      const tx: Tx = {
        id: txId,
        date: form.date,
        kind: 'out',
        amount: form.amount + form.fee,
        fee: form.fee || undefined,
        currency: form.currency,
        rate: settings.usdRate,
        account: 'exchanger',
        category: 'hawala',
        title: `حەواڵە بۆ ${hawala.recipientName} — لەلای ${exchanger.name}`,
        exchangerId: exchanger.id,
        hawalaId: id,
        partnerId: hawala.partnerId,
        customerId: hawala.customerId,
        note: hawala.note,
        createdAt: Date.now(),
        createdBy: user?.uid,
      }
      await commit([
        { kind: 'put', coll: 'hawalas', value: hawala },
        { kind: 'put', coll: 'txs', value: tx },
      ])
      await log('حەواڵەکردن', 'hawalas', id, `${hawala.recipientName} — ${money(hawala.amount + hawala.fee, hawala.currency)}`)
      say('حەواڵەکە تۆمارکرا')
      setForm(null)
    } catch {
      say('نەتوانرا حەواڵەکە تۆمار بکرێت؛ پەیوەندی داتا یان دەسەڵات پشکنین بکە', 'bad')
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (hawala: Hawala) => {
    if (hawala.status === 'cancelled' || cancellingId) return
    if (!(await ask('تەنها ئەگەر حەواڵەکە نەگەیشتووە و پارەکە گەڕاوەتە باڵانسی سەراف، هەڵیوەشێنەوە. بەردەوامبم؟'))) return
    const exchanger = exchangers.find((x) => x.id === hawala.exchangerId)
    if (!exchanger) return say('سەرافی ئەم حەواڵەیە نەدۆزرایەوە؛ ناتوانرێت هەڵبوەشێتەوە', 'bad')
    setCancellingId(hawala.id)
    try {
      const txId = uid('tx')
      const refund: Tx = {
        id: txId,
        date: todayISO(),
        kind: 'in',
        amount: hawala.amount + hawala.fee,
        fee: hawala.fee || undefined,
        currency: hawala.currency,
        rate: hawala.rate || settings.usdRate,
        account: 'exchanger',
        category: 'hawala_cancel',
        title: `هەڵوەشاندنەوەی حەواڵە — ${hawala.recipientName}`,
        exchangerId: hawala.exchangerId,
        hawalaId: hawala.id,
        partnerId: hawala.partnerId,
        customerId: hawala.customerId,
        createdAt: Date.now(),
        createdBy: user?.uid,
      }
      await commit([
        { kind: 'put', coll: 'hawalas', value: { ...hawala, status: 'cancelled', cancelTxId: txId } },
        { kind: 'put', coll: 'txs', value: refund },
      ])
      await log('هەڵوەشاندنەوەی حەواڵە', 'hawalas', hawala.id, `${hawala.recipientName} — ${exchanger.name}`)
      say('حەواڵەکە هەڵوەشایەوە و پارەکە گەڕایەوە بۆ باڵانسی سەراف')
    } catch {
      say('نەتوانرا حەواڵەکە هەڵبوەشێندرێتەوە؛ پەیوەندی داتا یان دەسەڵات پشکنین بکە', 'bad')
    } finally {
      setCancellingId(null)
    }
  }

  if (!can('money.view')) return <Empty icon={<Wallet size={26} />} title="دەسەڵاتت نییە" />

  return (
    <>
      <PageHead
        title="حەواڵەکان"
        sub={<><span className="num">{active.length}</span> حەواڵەی چالاک</>}
        action={can('money.edit') ? <button onClick={start} className="btn-brand shrink-0"><Plus size={17} /> <span className="hidden sm:inline">حەواڵەی نوێ</span></button> : undefined}
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {exchangers.length === 0 ? (
          <Empty
            icon={<Landmark size={26} />}
            title="سەرەتا سەراف زیاد بکە"
            sub="بۆ تۆمارکردنی حەواڵە پێویستە سەرافێک هەبێت"
            action={can('money.edit') ? <button onClick={() => nav('/exchangers')} className="btn-brand"><Plus size={16} /> سەرافی نوێ</button> : undefined}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="card p-3.5 text-[13px] leading-6 text-muted grow">
                حەواڵەی دۆلار یان دینار لە باڵانسی سەراف کەم دەکات. ئەگەر پارەکە لە پێشانگایە، سەرەتا لە «سندووقی سەرافەکان» بیگوازەوە بۆ سەراف؛ کرێی حەواڵەش بە هەمان جوڵەی پارە تۆمار دەکرێت.
              </div>
              <div className="w-full sm:w-40 shrink-0"><Segmented value={cur} onChange={setCur} options={[{ v: 'USD', label: 'دۆلار' }, { v: 'IQD', label: 'دینار' }]} size="sm" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="کۆی حەواڵە" value={<span className="num">{money(sentInCurrency, cur)}</span>} tone="brand" icon={<Send size={16} />} />
              <Stat label="کرێی حەواڵە" value={<span className="num">{money(feesInCurrency, cur)}</span>} tone="info" icon={<ReceiptText size={16} />} />
            </div>

            {ordered.length === 0 ? (
              <Empty icon={<Send size={25} />} title="هیچ حەواڵەیەک نییە" sub="حەواڵەی نوێ تۆمار بکە" />
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {ordered.map((hawala) => {
                  const exchanger = exchangers.find((x) => x.id === hawala.exchangerId)
                  const cancelled = hawala.status === 'cancelled'
                  return (
                    <div key={hawala.id} className={`flex items-center gap-3 px-4 py-3 ${cancelled ? 'opacity-55' : ''}`}>
                      <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${cancelled ? 'bg-muted/15 text-muted' : 'bg-brand/15 text-brand'}`}>
                        {cancelled ? <CircleX size={18} /> : <Send size={18} />}
                      </span>
                      <div className="grow min-w-0">
                        <p className="text-sm font-medium truncate">{hawala.recipientName}</p>
                        <p className="text-xs text-muted truncate">
                          {exchanger?.name || 'سەرافی سڕاوە'} · <span className="num">{fmtDateShort(hawala.date)}</span>
                          {hawala.reference ? ` · ${hawala.reference}` : ''}
                        </p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className={`num text-sm font-bold ${cancelled ? 'line-through text-muted' : 'text-brand'}`}>{money(hawala.amount, hawala.currency)}</p>
                        {hawala.fee > 0 && <p className="num text-[11px] text-muted">کرێ {money(hawala.fee, hawala.currency)}</p>}
                      </div>
                      {!cancelled && can('money.edit') && <button disabled={!!cancellingId} onClick={() => cancel(hawala)} className="btn-quiet !p-2 text-muted hover:!text-bad disabled:opacity-45" aria-label="هەڵوەشاندنەوەی حەواڵە">{cancellingId === hawala.id ? <Loader2 size={17} className="animate-spin" /> : <CircleX size={17} />}</button>}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title="حەواڵەی نوێ"
        footer={<><button className="btn-ghost" disabled={saving} onClick={() => setForm(null)}>پاشگەزبوونەوە</button><button className="btn-brand" disabled={saving} onClick={submit}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} حەواڵەکردن</button></>}
      >
        {form && (
          <div className="space-y-4">
            <Field label="سەراف *">
              <Picker value={exchangers.find((x) => x.id === form.exchangerId)?.name || ''} onChange={(name) => setForm({ ...form, exchangerId: exchangers.find((x) => x.name === name)?.id || '' })} options={exchangers.map((x) => x.name)} placeholder="سەراف هەڵبژێرە" />
            </Field>
            <Field label="جۆری وەرگر">
              <Segmented value={form.recipientType} onChange={setRecipientType} options={[{ v: 'partner', label: 'شەریک' }, { v: 'customer', label: 'کریار' }, { v: 'other', label: 'کەسی تر' }]} size="sm" />
            </Field>
            {form.recipientType === 'partner' ? (
              <Field label="شەریک *"><Picker value={form.recipientName} onChange={pickPartner} options={partners.map((p) => p.name)} placeholder={partners.length ? 'شەریک هەڵبژێرە' : 'هیچ شەریکێک نییە'} disabled={!partners.length} /></Field>
            ) : form.recipientType === 'customer' ? (
              <Field label="کریار *"><Picker value={form.recipientName} onChange={pickCustomer} options={customers.map((c) => c.name)} placeholder={customers.length ? 'کریار هەڵبژێرە' : 'هیچ کریارێک نییە'} disabled={!customers.length} /></Field>
            ) : (
              <Field label="ناوی وەرگر *"><input autoFocus value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="field" /></Field>
            )}
            <Field label="ژمارەی وەرگر"><input dir="ltr" value={form.recipientPhone} onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })} className="field num text-start" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="بڕی حەواڵە"><MoneyInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} /></Field>
              <Field label="کرێ"><MoneyInput value={form.fee} onChange={(fee) => setForm({ ...form, fee })} /></Field>
              <Field label="دراو"><Segmented value={form.currency} onChange={(currency: Currency) => setForm({ ...form, currency })} options={[{ v: 'USD', label: '$' }, { v: 'IQD', label: 'د.ع' }]} size="sm" /></Field>
              <Field label="بەروار"><input type="date" dir="ltr" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field num text-start" /></Field>
            </div>
            <div className="rounded-xl bg-surface2 border border-line px-3 py-2.5 flex items-center justify-between text-sm"><span className="text-muted">کۆی دەرچوو لە سندوق</span><b className="num">{money(form.amount + form.fee, form.currency)}</b></div>
            <Field label="کۆدی حەواڵە / ڕیفرنس"><input dir="ltr" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="field num text-start" placeholder="ئارەزوومەندانە" /></Field>
            <Field label="تێبینی"><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="field" /></Field>
          </div>
        )}
      </Sheet>

      {node}
    </>
  )
}
