/** پیشاندان و چاپکردنی عەقدی دەرەکی */

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Printer, Languages, Ban, CheckCircle2, Share2, Handshake, TrendingUp } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { BrokerSheet } from '../components/BrokerSheet'
import { Empty, useConfirm } from '../components/ui'
import { fmtDate, money } from '../lib/format'

export default function BrokerView() {
  const { id } = useParams()
  const nav = useNavigate()
  const { brokers, settings, commit, log, say, can } = useApp()
  const { ask, node } = useConfirm()
  const [lang, setLang] = useState<'ku' | 'ar'>('ku')
  const d = brokers.find((x) => x.id === id)

  if (!d) return <Empty title="عەقدەکە نەدۆزرایەوە" />

  const toggleCancel = async () => {
    const cancelling = d.status !== 'cancelled'
    const msg = cancelling
      ? 'ئەم عەقدە هەڵبوەشێنرێتەوە؟ عمولەکەشی لە سندوق لادەبرێت.'
      : 'ئەم عەقدە بگەڕێتەوە بۆ چالاک؟ عمولەکەش دەگەڕێتەوە سندوق.'
    if (!(await ask(msg))) return
    try {
      const writes: Parameters<typeof commit>[0] = []
      if (cancelling && d.txId) writes.push({ kind: 'del', coll: 'txs', id: d.txId })
      if (!cancelling && d.fee > 0) {
        writes.push({
          kind: 'put', coll: 'txs',
          value: {
            id: d.txId || `tx_${d.id}`, date: d.date, kind: 'in', amount: d.fee, currency: d.feeCurrency,
            rate: d.rate || settings.usdRate, account: d.feeAccount, category: 'commission',
            title: `عمولەی عەقدی دەرەکی — ${d.no}`, createdAt: Date.now(),
          },
        })
      }
      writes.push({ kind: 'put', coll: 'brokers', value: { ...d, status: cancelling ? 'cancelled' : 'active' } })
      await commit(writes)
      await log(cancelling ? 'هەڵوەشاندنەوەی عەقدی دەرەکی' : 'چالاککردنەوەی عەقدی دەرەکی', 'brokers', d.id, d.no)
      say(cancelling ? 'هەڵوەشێنرایەوە' : 'چالاککرایەوە')
    } catch {
      say('نەتوانرا بگۆڕدرێت', 'bad')
    }
  }

  const share = async () => {
    const txt = `عەقدی دەرەکی ${d.no}\n${d.seller.name} ← ${d.buyer.name}\n${d.car.brand} ${d.car.model}\nنرخ: ${money(d.price, d.currency)}`
    try {
      if (navigator.share) await navigator.share({ title: `عەقد ${d.no}`, text: txt })
      else {
        await navigator.clipboard.writeText(txt)
        say('کۆپی کرا')
      }
    } catch { /* بەکارهێنەر پاشگەز بووەوە */ }
  }

  return (
    <>
      <PageHead
        title={`عەقدی دەرەکی ${d.no}`}
        sub={
          <span className="flex items-center gap-2 flex-wrap">
            <span className={`chip ${d.status === 'cancelled' ? 'bg-bad/15 text-bad border-bad/30' : 'bg-ok/15 text-ok border-ok/30'}`}>
              {d.status === 'cancelled' ? 'هەڵوەشێنراوە' : 'چالاک'}
            </span>
            <span className="num">{fmtDate(d.date)}</span>
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
        <div className="flex flex-wrap gap-2 no-print">
          <button onClick={() => setLang(lang === 'ku' ? 'ar' : 'ku')} className="btn-ghost">
            <Languages size={17} /> {lang === 'ku' ? 'گۆڕین بۆ عەرەبی' : 'گۆڕین بۆ کوردی'}
          </button>
          <button onClick={share} className="btn-ghost">
            <Share2 size={17} /> هاوبەشکردن
          </button>
          <button onClick={() => nav('/brokers')} className="btn-ghost">
            <Handshake size={17} /> هەموو عەقدەکان
          </button>
          {can('money.edit') && (
            <button onClick={toggleCancel} className={`btn-ghost ${d.status === 'cancelled' ? '' : '!text-bad'}`}>
              {d.status === 'cancelled' ? <><CheckCircle2 size={17} /> چالاککردنەوە</> : <><Ban size={17} /> هەڵوەشاندنەوە</>}
            </button>
          )}
        </div>

        {d.fee > 0 && d.status !== 'cancelled' && (
          <div className="card p-4 flex items-center gap-3 border-ok/30 bg-ok/[0.06] no-print">
            <span className="w-10 h-10 rounded-xl bg-ok/15 text-ok grid place-items-center shrink-0">
              <TrendingUp size={19} />
            </span>
            <div className="grow min-w-0">
              <p className="font-medium text-[14px]">عمولەی وەرگیراو — قازانجی ساف</p>
              <p className="text-[12px] text-muted">چووەتە {d.feeAccount === 'bank' ? 'بانک' : 'سندوق'} و لە ڕاپۆرتەکاندا دەژمێردرێت</p>
            </div>
            <span className="font-bold text-ok text-[19px] num shrink-0">{money(d.fee, d.feeCurrency)}</span>
          </div>
        )}

        <div className="overflow-x-auto print-area">
          <BrokerSheet d={d} s={settings} lang={lang} />
        </div>

        <p className="text-xs text-muted text-center no-print pb-6">
          بۆ PDF: لە پەنجەرەی پرینت «Save as PDF» هەڵبژێرە.
        </p>
      </div>

      {node}
    </>
  )
}
