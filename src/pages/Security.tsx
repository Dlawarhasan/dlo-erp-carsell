import { useMemo, useState } from 'react'
import { ShieldCheck, Printer, Download, FileArchive, Share2, CheckCheck, Languages, Calendar, Loader2 } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, Segmented } from '../components/ui'
import { ContractSheet } from '../components/ContractSheet'
import { contractsHtmlDoc, downloadFile, toCsv } from '../lib/exportHtml'
import { fmtDateShort, money, todayISO } from '../lib/format'

const firstOfMonth = () => todayISO().slice(0, 8) + '01'
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
const monthsAgo = (n: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

export default function Security() {
  const { contracts, settings, save, log, say, can } = useApp()
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(todayISO())
  const [lang, setLang] = useState<'ku' | 'ar'>('ar')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const list = useMemo(
    () => contracts.filter((c) => c.status !== 'cancelled' && c.date >= from && c.date <= to).sort((a, b) => a.date.localeCompare(b.date)),
    [contracts, from, to],
  )
  const chosen = useMemo(() => list.filter((c) => sel.has(c.id)), [list, sel])
  const allOn = list.length > 0 && chosen.length === list.length

  const toggle = (id: string) => {
    const n = new Set(sel)
    n.has(id) ? n.delete(id) : n.add(id)
    setSel(n)
  }
  const toggleAll = () => setSel(allOn ? new Set() : new Set(list.map((c) => c.id)))

  const target = chosen.length ? chosen : list

  const doPrint = () => {
    if (!target.length) return say('هیچ عەقدێک نییە', 'bad')
    setSel(new Set(target.map((c) => c.id)))
    setTimeout(() => window.print(), 120)
  }

  const doHtml = () => {
    if (!target.length) return say('هیچ عەقدێک نییە', 'bad')
    const doc = contractsHtmlDoc(target, settings, lang, `عەقدەکانی ${fmtDateShort(from)} — ${fmtDateShort(to)}`)
    downloadFile(`عەقدەکان_${from}_${to}.html`, doc)
    say(`${target.length} عەقد داگیرا`)
  }

  const doZip = async () => {
    if (!target.length) return say('هیچ عەقدێک نییە', 'bad')
    setBusy(true)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      for (const c of target) {
        zip.file(`${c.no}_${(c.buyer.name || '').replace(/[\\/:*?"<>|]/g, '')}.html`, contractsHtmlDoc([c], settings, lang, `عەقد ${c.no}`))
      }
      zip.file('لیستی_عەقدەکان.csv', '﻿' + csv())
      const blob = await zip.generateAsync({ type: 'blob' })
      downloadFile(`عەقدەکان_${from}_${to}.zip`, blob, 'application/zip')
      say(`${target.length} فایل لە ZIP دانرا`)
    } catch (e) {
      console.error(e)
      say('نەتوانرا ZIP دروست بکرێت', 'bad')
    } finally {
      setBusy(false)
    }
  }

  const csv = () =>
    toCsv([
      ['ژمارەی عەقد', 'بەروار', 'براند', 'مۆدێل', 'ساڵ', 'ڕەنگ', 'VIN', 'پلێت', 'ناوی کڕیار', 'ژمارەی ناسنامە', 'تەلەفۆن', 'ناونیشان', 'نرخ', 'دراو', 'شێوازی پارەدان'],
      ...target.map((c) => [
        c.no, c.date, c.car.brand || '', c.car.model || '', c.car.year || '', c.car.color || '', c.car.vin || '', c.car.plate || '',
        c.buyer.name, c.buyer.idNumber || '', c.buyer.phone || '', c.buyer.address || '', c.price, c.currency,
        c.payment === 'cash' ? 'نەقد' : 'قیست',
      ]),
    ])

  const doCsv = () => {
    if (!target.length) return say('هیچ عەقدێک نییە', 'bad')
    downloadFile(`لیستی_عەقدەکان_${from}_${to}.csv`, csv(), 'text/csv;charset=utf-8')
    say('لیستەکە داگیرا')
  }

  const doShare = async () => {
    const txt = `${settings.showroomName}\nلیستی عەقدەکان ${fmtDateShort(from)} — ${fmtDateShort(to)}\n\n${target
      .map((c, i) => `${i + 1}. ${c.no} · ${c.car.brand} ${c.car.model} ${c.car.year} · ${c.car.vin}\n   کریار: ${c.buyer.name} — ${c.buyer.phone} — ${c.buyer.idNumber || ''}\n   نرخ: ${money(c.price, c.currency)} · ${fmtDateShort(c.date)}`)
      .join('\n\n')}`
    if (navigator.share) await navigator.share({ title: 'لیستی عەقدەکان', text: txt }).catch(() => {})
    else {
      navigator.clipboard?.writeText(txt)
      say('لیستەکە کۆپی کرا')
    }
  }

  const markSent = async () => {
    for (const c of target) await save('contracts', { ...c, sentToSecurity: { at: Date.now(), by: settings.showroomName } })
    await log('ناردنی عەقد بۆ ئاسایش', 'contracts', undefined, `${target.length} عەقد — ${from} تا ${to}`)
    say(`${target.length} عەقد نیشانکرا وەک نێردراو`)
  }

  return (
    <>
      <div className="no-print">
        <PageHead title="بەشی ئاسایش" sub="ناردن و کۆپیکردنی عەقدەکان" />

        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
          <div className="card p-4 flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-info/15 text-info grid place-items-center shrink-0">
              <ShieldCheck size={20} />
            </span>
            <p className="text-[13px] text-muted leading-6">
              لێرەوە دەتوانیت کۆپی هەموو عەقدەکان بۆ ماوەیەکی دیاریکراو ئامادە بکەیت و بە یەک کلیک پرینت، داگرتن یان بنێریت.
              پێشنیار: بۆ ئاسایش نوسخەی <b className="text-ink">عەرەبی</b> بەکاربهێنە.
            </p>
          </div>

          {/* ماوە */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar size={16} className="text-brand" /> ماوەی بەروار
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">لە</label>
                <input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="field num text-start" />
              </div>
              <div>
                <label className="label">بۆ</label>
                <input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="field num text-start" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { l: '٣٠ ڕۆژی ڕابردوو', f: daysAgo(30), t: todayISO() },
                { l: 'ئەم مانگە', f: firstOfMonth(), t: todayISO() },
                { l: 'مانگی ڕابردوو', f: monthsAgo(1), t: firstOfMonth() },
                { l: '٣ مانگی ڕابردوو', f: monthsAgo(3), t: todayISO() },
                { l: 'هەموو', f: '2000-01-01', t: todayISO() },
              ].map((p) => (
                <button
                  key={p.l}
                  onClick={() => {
                    setFrom(p.f)
                    setTo(p.t)
                    setSel(new Set())
                  }}
                  className="chip bg-surface2 border-line hover:border-brand/50"
                >
                  {p.l}
                </button>
              ))}
            </div>
            <div>
              <label className="label">زمانی نوسخە</label>
              <Segmented value={lang} onChange={setLang} options={[{ v: 'ar' as const, label: 'عەرەبی' }, { v: 'ku' as const, label: 'کوردی' }]} size="sm" />
            </div>
          </div>

          {/* کردارەکان */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <button onClick={doPrint} className="btn-brand">
              <Printer size={17} /> پرینت
            </button>
            <button onClick={doHtml} className="btn-ghost">
              <Download size={17} /> داگرتنی HTML
            </button>
            <button onClick={doZip} disabled={busy} className="btn-ghost">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <FileArchive size={17} />} ZIP
            </button>
            <button onClick={doCsv} className="btn-ghost">
              <Download size={17} /> CSV
            </button>
            <button onClick={doShare} className="btn-ghost">
              <Share2 size={17} /> هاوبەشکردن
            </button>
            {can('security.export') && (
              <button onClick={markSent} className="btn-ghost">
                <CheckCheck size={17} /> نیشانکردن
              </button>
            )}
          </div>

          {/* لیست */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={allOn} onChange={toggleAll} className="w-4 h-4 accent-[rgb(var(--c-brand))]" />
                هەڵبژاردنی هەموو
              </label>
              <span className="text-[13px] text-muted num">
                {chosen.length || list.length} / {list.length}
              </span>
            </div>

            {list.length === 0 ? (
              <Empty icon={<Languages size={24} />} title="هیچ عەقدێک نییە لەم ماوەیەدا" sub="بەروارەکان بگۆڕە" />
            ) : (
              <div className="divide-y divide-line max-h-[60vh] overflow-y-auto">
                {list.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface2 cursor-pointer">
                    <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} className="w-4 h-4 accent-[rgb(var(--c-brand))] shrink-0" />
                    <div className="grow min-w-0">
                      <p className="text-sm font-medium truncate">
                        <span className="num">{c.no}</span> · {c.car.brand} {c.car.model} <span className="num">{c.car.year}</span>
                      </p>
                      <p className="text-xs text-muted truncate">
                        {c.buyer.name} · <span className="num">{c.buyer.phone}</span> · <span className="num">{fmtDateShort(c.date)}</span>
                      </p>
                    </div>
                    {c.sentToSecurity && <span className="chip bg-ok/12 text-ok border-ok/30 shrink-0">نێردراوە</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ناوچەی پرینت */}
      <div className="print-only">
        {target.map((c) => (
          <ContractSheet key={c.id} c={c} s={settings} lang={lang} />
        ))}
      </div>
    </>
  )
}
