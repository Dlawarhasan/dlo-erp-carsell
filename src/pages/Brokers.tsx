/**
 * عەقدی دەرەکی — مامەڵەی نێوان دوو کەسی دەرەکی کە لە پێشانگاکەماندا دەکرێت.
 *
 * ئێمە پارەی مامەڵەکە وەرناگرین — تەنها عمولەیەک وەردەگرین، و ئەو
 * عمولەیە **قازانجی ساف**ە چونکە هیچ تێچوویەکی لەسەر نییە.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Handshake, Trash2, Loader2, Check, TrendingUp, FileText, Ban,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, Field, MoneyInput, SearchBar, Segmented, Sheet, Stat, useConfirm } from '../components/ui'
import { convert, fmtDateShort, money, num, todayISO, uid } from '../lib/format'
import { fx } from '../lib/feedback'
import type { BrokerDeal, Currency } from '../lib/types'

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export function blankDeal(no: string): BrokerDeal {
  return {
    id: uid('brk'), no, date: todayISO(),
    seller: { name: '', phone: '', idNumber: '', address: '' },
    buyer: { name: '', phone: '', idNumber: '', address: '' },
    car: { brand: '', model: '' },
    price: 0, currency: 'USD', rate: 0,
    fee: 0, feeCurrency: 'USD', feeAccount: 'cash',
    terms: [], status: 'active', createdAt: Date.now(),
  }
}

export default function Brokers() {
  const nav = useNavigate()
  const { brokers, settings, commit, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()

  const [q, setQ] = useState('')
  const [cur, setCur] = useState<Currency>('USD')
  const [from, setFrom] = useState(daysAgo(365))
  const [to, setTo] = useState(todayISO())
  const [form, setForm] = useState<BrokerDeal | null>(null)
  const [saving, setSaving] = useState(false)
  const rate = settings.usdRate
  const editable = can('money.edit')

  const rows = useMemo(
    () => [...brokers].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [brokers],
  )

  const inRange = useMemo(() => rows.filter((d) => d.date >= from && d.date <= to && d.status !== 'cancelled'), [rows, from, to])

  const totalFee = useMemo(
    () => inRange.reduce((s, d) => s + convert(d.fee, d.feeCurrency, cur, d.rate || rate), 0),
    [inRange, cur, rate],
  )
  const totalPrice = useMemo(
    () => inRange.reduce((s, d) => s + convert(d.price, d.currency, cur, d.rate || rate), 0),
    [inRange, cur, rate],
  )

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return rows
    return rows.filter((d) =>
      `${d.no} ${d.seller.name} ${d.buyer.name} ${d.seller.phone || ''} ${d.buyer.phone || ''} ${d.car.brand} ${d.car.model} ${d.car.plate || ''} ${d.car.vin || ''}`
        .toLowerCase()
        .includes(n),
    )
  }, [rows, q])

  const nextNo = () => {
    const n = brokers.reduce((m, d) => {
      const x = Number(String(d.no).split('-').pop())
      return Number.isFinite(x) && x > m ? x : m
    }, 0)
    return `D-${new Date().getFullYear()}-${String(n + 1).padStart(3, '0')}`
  }

  const openNew = () => setForm(blankDeal(nextNo()))

  const save = async () => {
    if (!form || saving) return
    if (!form.seller.name || !form.buyer.name) return say('ناوی فرۆشیار و کڕیار پێویستە', 'bad')
    if (!form.car.brand) return say('براندی ئۆتۆمبێل پێویستە', 'bad')
    setSaving(true)
    try {
      const old = brokers.find((x) => x.id === form.id)
      const deal: BrokerDeal = {
        ...form,
        rate: form.rate || rate,
        terms: form.terms || [],
        createdBy: form.createdBy || user?.uid,
      }
      const writes: Parameters<typeof commit>[0] = []

      /* مامەڵەی کۆنی عمولە لادەبرێت و بە نوێ دەگۆڕدرێت */
      if (old?.txId) writes.push({ kind: 'del', coll: 'txs', id: old.txId })

      if (deal.fee > 0) {
        const txId = uid('tx')
        deal.txId = txId
        writes.push({
          kind: 'put', coll: 'txs',
          value: {
            id: txId, date: deal.date, kind: 'in', amount: deal.fee, currency: deal.feeCurrency,
            rate: deal.rate, account: deal.feeAccount, category: 'commission',
            title: `عمولەی عەقدی دەرەکی — ${deal.no}`,
            note: `${deal.seller.name} ← ${deal.buyer.name}`,
            createdAt: Date.now(), createdBy: user?.uid,
          },
        })
      } else {
        deal.txId = undefined
      }

      writes.push({ kind: 'put', coll: 'brokers', value: deal })
      await commit(writes)
      await log(old ? 'دەستکاریی عەقدی دەرەکی' : 'عەقدی دەرەکیی نوێ', 'brokers', deal.id,
        `${deal.no} — عمولە ${money(deal.fee, deal.feeCurrency)}`)
      if (deal.fee > 0) fx('money')
      say('پاشەکەوتکرا')
      setForm(null)
      if (!old) nav(`/brokers/${deal.id}`)
    } catch {
      say('نەتوانرا پاشەکەوت بکرێت', 'bad')
    } finally {
      setSaving(false)
    }
  }

  const del = async (d: BrokerDeal) => {
    if (!(await ask(`عەقدی ${d.no} بسڕدرێتەوە؟ عمولەکەشی لە سندوق لادەبرێت.`))) return
    const writes: Parameters<typeof commit>[0] = [{ kind: 'del', coll: 'brokers', id: d.id }]
    if (d.txId) writes.push({ kind: 'del', coll: 'txs', id: d.txId })
    try {
      await commit(writes)
      await log('سڕینەوەی عەقدی دەرەکی', 'brokers', d.id, d.no)
      say('سڕایەوە')
    } catch {
      say('نەتوانرا بسڕدرێتەوە', 'bad')
    }
  }

  const set = (patch: Partial<BrokerDeal>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const setCar = (patch: Partial<BrokerDeal['car']>) => setForm((f) => (f ? { ...f, car: { ...f.car, ...patch } } : f))

  return (
    <>
      <PageHead
        title="عەقدی دەرەکی"
        sub="مامەڵەی دوو کەسی دەرەکی — عمولەکە قازانجی سافە"
        action={
          editable ? (
            <button onClick={openNew} className="btn-brand shrink-0">
              <Plus size={17} /> <span className="hidden sm:inline">عەقد</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* ماوە و دراو */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="grid grid-cols-2 gap-2 grow">
            <input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="field num text-start field-sm" />
            <input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="field num text-start field-sm" />
          </div>
          <div className="sm:w-40">
            <Segmented value={cur} onChange={setCur} size="sm"
              options={[{ v: 'USD' as Currency, label: 'دۆلار' }, { v: 'IQD' as Currency, label: 'دینار' }]} />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="قازانجی ساف — عمولە" value={<span className="num">{money(totalFee, cur)}</span>}
            sub="هیچ تێچوویەکی لەسەر نییە" tone="ok" icon={<TrendingUp size={16} />} />
          <Stat label="بەهای مامەڵەکان" value={<span className="num">{money(totalPrice, cur)}</span>}
            sub="بە دەستی ئێمەدا تێناپەڕێت" tone="ink" icon={<Handshake size={16} />} />
          <Stat label="ژمارەی عەقد" value={<span className="num">{num(inRange.length)}</span>}
            sub={<>لە <span className="num">{num(rows.length)}</span> عەقدی گشتی</>} tone="brand" icon={<FileText size={16} />} />
        </div>

        <SearchBar value={q} onChange={setQ} placeholder="ناو، ژمارەی عەقد، سەیارە..." />

        {shown.length === 0 ? (
          <Empty
            icon={<Handshake size={26} />}
            title={q ? 'هیچ ئەنجامێک نەدۆزرایەوە' : 'هێشتا عەقدی دەرەکی نییە'}
            sub={q ? undefined : 'کاتێک دوو کەسی دەرەکی مامەڵەکەیان لای تۆ ئەنجام دەدەن، لێرە تۆماری بکە و عمولەکەت وەربگرە.'}
            action={editable && !q ? <button onClick={openNew} className="btn-brand"><Plus size={17} /> عەقدی نوێ</button> : undefined}
          />
        ) : (
          <div className="space-y-2">
            {shown.map((d) => (
              <div key={d.id} className={`card p-0 overflow-hidden ${d.status === 'cancelled' ? 'opacity-60' : ''}`}>
                <button onClick={() => nav(`/brokers/${d.id}`)} className="w-full text-start p-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-brand/12 text-brand grid place-items-center shrink-0">
                    <Handshake size={19} />
                  </span>
                  <div className="min-w-0 grow">
                    <p className="font-bold text-[14.5px] truncate">
                      {d.seller.name} <span className="text-muted font-normal">←</span> {d.buyer.name}
                    </p>
                    <p className="text-[12px] text-muted truncate">
                      <span className="num">{d.no}</span> · <span className="num">{fmtDateShort(d.date)}</span>
                      {d.car.brand ? ` · ${d.car.brand} ${d.car.model}` : ''}
                    </p>
                  </div>
                  <div className="text-end shrink-0">
                    {d.status === 'cancelled' ? (
                      <span className="chip bg-bad/15 text-bad border-bad/30"><Ban size={12} /> هەڵوەشێنراوە</span>
                    ) : (
                      <>
                        <p className="font-bold text-ok num leading-tight">{d.fee > 0 ? money(d.fee, d.feeCurrency) : '—'}</p>
                        <p className="text-[11px] text-muted num">{money(d.price, d.currency)}</p>
                      </>
                    )}
                  </div>
                </button>
                {editable && (
                  <div className="flex border-t border-line divide-x divide-line rtl:divide-x-reverse">
                    <button onClick={() => setForm(d)} className="flex-1 py-2 text-[13px] text-muted hover:text-ink">دەستکاری</button>
                    <button onClick={() => del(d)} className="flex-1 py-2 text-[13px] text-muted hover:text-bad flex items-center justify-center gap-1">
                      <Trash2 size={14} /> سڕینەوە
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ فۆڕمی عەقد ═══ */}
      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        wide
        title={brokers.some((x) => x.id === form?.id) ? `دەستکاریی ${form?.no}` : 'عەقدی دەرەکیی نوێ'}
        footer={
          <>
            <button onClick={() => setForm(null)} className="btn-quiet">پاشگەزبوونەوە</button>
            <button onClick={save} disabled={saving} className="btn-brand">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} پاشەکەوت
            </button>
          </>
        }
      >
        {form && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="ژمارەی عەقد">
                <input value={form.no} onChange={(e) => set({ no: e.target.value })} className="field num text-start" dir="ltr" />
              </Field>
              <Field label="بەروار">
                <input type="date" dir="ltr" value={form.date} onChange={(e) => set({ date: e.target.value })} className="field num text-start" />
              </Field>
            </div>

            {/* فرۆشیار */}
            <div>
              <h4 className="font-bold text-[14px] mb-2.5">لای یەکەم — فرۆشیار</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="ناو *">
                  <input value={form.seller.name} onChange={(e) => set({ seller: { ...form.seller, name: e.target.value } })} className="field" />
                </Field>
                <Field label="تەلەفۆن">
                  <input value={form.seller.phone || ''} dir="ltr" inputMode="tel"
                    onChange={(e) => set({ seller: { ...form.seller, phone: e.target.value } })} className="field num text-start" />
                </Field>
                <Field label="ژمارەی ناسنامە">
                  <input value={form.seller.idNumber || ''} dir="ltr"
                    onChange={(e) => set({ seller: { ...form.seller, idNumber: e.target.value } })} className="field num text-start" />
                </Field>
                <Field label="ناونیشان">
                  <input value={form.seller.address || ''} onChange={(e) => set({ seller: { ...form.seller, address: e.target.value } })} className="field" />
                </Field>
              </div>
            </div>

            {/* کڕیار */}
            <div>
              <h4 className="font-bold text-[14px] mb-2.5">لای دووەم — کڕیار</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="ناو *">
                  <input value={form.buyer.name} onChange={(e) => set({ buyer: { ...form.buyer, name: e.target.value } })} className="field" />
                </Field>
                <Field label="تەلەفۆن">
                  <input value={form.buyer.phone || ''} dir="ltr" inputMode="tel"
                    onChange={(e) => set({ buyer: { ...form.buyer, phone: e.target.value } })} className="field num text-start" />
                </Field>
                <Field label="ژمارەی ناسنامە">
                  <input value={form.buyer.idNumber || ''} dir="ltr"
                    onChange={(e) => set({ buyer: { ...form.buyer, idNumber: e.target.value } })} className="field num text-start" />
                </Field>
                <Field label="ناونیشان">
                  <input value={form.buyer.address || ''} onChange={(e) => set({ buyer: { ...form.buyer, address: e.target.value } })} className="field" />
                </Field>
              </div>
            </div>

            {/* ئۆتۆمبێل */}
            <div>
              <h4 className="font-bold text-[14px] mb-2.5">ئۆتۆمبێل</h4>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="براند *"><input value={form.car.brand} onChange={(e) => setCar({ brand: e.target.value })} className="field" /></Field>
                <Field label="مۆدێل"><input value={form.car.model} onChange={(e) => setCar({ model: e.target.value })} className="field" /></Field>
                <Field label="ساڵ">
                  <input type="number" dir="ltr" value={form.car.year || ''} onChange={(e) => setCar({ year: Number(e.target.value) || undefined })} className="field num text-start" />
                </Field>
                <Field label="ڕەنگ"><input value={form.car.color || ''} onChange={(e) => setCar({ color: e.target.value })} className="field" /></Field>
                <Field label="ژمارەی پلێت"><input value={form.car.plate || ''} onChange={(e) => setCar({ plate: e.target.value })} className="field num text-start" dir="ltr" /></Field>
                <Field label="کیلۆمەتر">
                  <MoneyInput value={form.car.km || 0} onChange={(n) => setCar({ km: n })} placeholder="0" />
                </Field>
                <Field label="ژمارەی شاسی (VIN)" className="sm:col-span-3">
                  <input value={form.car.vin || ''} dir="ltr" onChange={(e) => setCar({ vin: e.target.value.toUpperCase() })} className="field num text-start" />
                </Field>
              </div>
            </div>

            {/* نرخ و عمولە */}
            <div>
              <h4 className="font-bold text-[14px] mb-2.5">نرخ و عمولە</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="نرخی مامەڵە" hint="پارەکە بە دەستی ئێمەدا تێناپەڕێت">
                  <MoneyInput value={form.price} onChange={(n) => set({ price: n })} placeholder="0" />
                </Field>
                <Field label="دراوی مامەڵە">
                  <Segmented value={form.currency} onChange={(v) => set({ currency: v })}
                    options={[{ v: 'USD' as Currency, label: 'دۆلار' }, { v: 'IQD' as Currency, label: 'دینار' }]} />
                </Field>
              </div>

              <div className="mt-3 p-3.5 rounded-xl border border-ok/30 bg-ok/[0.06] space-y-3">
                <p className="text-[12.5px] text-muted leading-6">
                  <b className="text-ok">عمولەی ئێمە</b> — ئەم بڕە یەکسەر دەچێتە سندوق و لە ڕاپۆرتەکاندا وەک
                  <b className="text-ink"> قازانجی ساف</b> دەژمێردرێت. ئەگەر عمولەیەک نەبووە، سفری بەجێبهێڵە.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="بڕی عمولە">
                    <MoneyInput value={form.fee} onChange={(n) => set({ fee: n })} placeholder="0" />
                  </Field>
                  <Field label="دراو">
                    <Segmented value={form.feeCurrency} onChange={(v) => set({ feeCurrency: v })}
                      options={[{ v: 'USD' as Currency, label: 'دۆلار' }, { v: 'IQD' as Currency, label: 'دینار' }]} />
                  </Field>
                  <Field label="بۆ کوێ">
                    <Segmented value={form.feeAccount} onChange={(v) => set({ feeAccount: v })}
                      options={[{ v: 'cash' as const, label: 'سندوق' }, { v: 'bank' as const, label: 'بانک' }]} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 100, 200, 300, 500, 1000].map((v) => (
                    <button key={v} type="button" onClick={() => set({ fee: v })}
                      className={`px-2.5 py-1.5 rounded-lg border text-[12.5px] font-medium num transition ${
                        form.fee === v ? 'bg-ok text-white border-transparent' : 'border-line bg-surface2 text-muted hover:text-ink'}`}>
                      {v === 0 ? 'بێ عمولە' : money(v, form.feeCurrency)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="شایەتی یەکەم"><input value={form.witness1 || ''} onChange={(e) => set({ witness1: e.target.value })} className="field" /></Field>
              <Field label="شایەتی دووەم"><input value={form.witness2 || ''} onChange={(e) => set({ witness2: e.target.value })} className="field" /></Field>
            </div>
            <Field label="تێبینی">
              <textarea value={form.note || ''} onChange={(e) => set({ note: e.target.value })} className="field min-h-[70px]" rows={2} />
            </Field>
          </div>
        )}
      </Sheet>

      {node}
    </>
  )
}
