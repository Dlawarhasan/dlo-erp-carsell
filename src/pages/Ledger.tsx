import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownLeft, ArrowUpRight, Phone, MessageCircle, Download, Printer, Pencil,
  Trash2, Wallet, Loader2, Check, Clock, Scale,
} from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { EditInfo, Field, Segmented, Sheet, Switch, useConfirm } from '../components/ui'
import { withEdit } from '../lib/edits'
import { AccountForm } from './Debts'
import { fmtDateShort, fmtRate, money, normalizePhone, todayISO, uid } from '../lib/format'
import { fx } from '../lib/feedback'
import {
  toAccounts, balanceOf, statement, currenciesUsed, totals, sumsAll, combinedNet, nowTime,
  type Account, type EntryKind, type LedgerEntry,
} from '../lib/ledger'
import type { Currency, Tx } from '../lib/types'

/** `ALL` = هەردوو دراو پێکەوە لە یەک لیست */
type View = Currency | 'ALL'

export default function Ledger() {
  const { id } = useParams()
  const nav = useNavigate()
  const { debts, customers, settings, save, remove, log, say, can, user } = useApp()
  const { ask, node } = useConfirm()

  const accounts = useMemo(() => toAccounts(debts), [debts])
  const acc = accounts.find((a) => a.id === id)

  const [cur, setCur] = useState<View | null>(null)
  /* دراوی کۆی گشتی لە دۆخی «هەردوو» */
  const [totalCur, setTotalCur] = useState<Currency>('IQD')
  const [move, setMove] = useState<EntryKind | null>(null)
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null)
  const [editAcc, setEditAcc] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  const editable = can('money.edit')
  const rate = settings.usdRate

  const used = useMemo(() => (acc ? currenciesUsed(acc) : ['USD' as Currency]), [acc])
  /* ئەگەر هەردوو دراو بەکارهاتبن، بە بنەڕەت هەردووکیان پێکەوە پیشان دەدرێن */
  const view: View = cur ?? (used.length > 1 ? 'ALL' : used[0])
  const both = view === 'ALL'

  const rows = useMemo(() => (acc ? statement(acc, both ? undefined : (view as Currency)) : []), [acc, view, both])
  const bal = useMemo(() => (acc ? balanceOf(acc) : { USD: 0, IQD: 0 }), [acc])
  const sums = useMemo(() => (acc ? sumsAll(acc) : { USD: { took: 0, gave: 0, net: 0 }, IQD: { took: 0, gave: 0, net: 0 } }), [acc])
  const sum = useMemo(
    () => (acc ? (both ? { took: 0, gave: 0, net: 0 } : totals(acc, view as Currency)) : { took: 0, gave: 0, net: 0 }),
    [acc, view, both],
  )
  /* کۆی گشتی بە یەک دراو — دۆلارەکە بە نرخی ڕۆژ دەگۆڕدرێت */
  const net = useMemo(() => (acc ? combinedNet(acc, totalCur, rate) : 0), [acc, totalCur, rate])

  if (!acc) {
    return (
      <>
        <PageHead title="حساب" back={() => nav('/debts')} />
        <div className="p-6 text-center text-muted text-sm">ئەم حسابە نەدۆزرایەوە.</div>
      </>
    )
  }

  /** باڵانسی پیشاندراو — لە دۆخی هەردوو، کۆی گشتی */
  const b = both ? net : bal[view as Currency]
  const m = (n: number, c: Currency = both ? totalCur : (view as Currency)) => money(n, c)
  /** بڕی هەر ڕیزێک بە دراوی خۆی */
  const mr = (n: number, r: { currency: Currency }) => money(n, both ? r.currency : (view as Currency))

  /* ── پاشەکەوتکردنی حساب (لەگەڵ تێکەڵکراوەکان) ── */
  const persist = async (next: Account) => {
    await save('debts', { ...next, v: 2, updatedAt: Date.now() })
    /* ئەگەر چەند تۆمارێکی کۆن تێکەڵ کرابن، ئەوانی تر دەسڕدرێنەوە */
    for (const old of next.mergedIds || []) {
      if (old !== next.id) await remove('debts', old, next.name).catch(() => {})
    }
  }

  /* ── سڕینەوەی تۆمارێک — جوڵەی سندوقەکەشی لەگەڵ دەسڕدرێتەوە ── */
  const delEntry = async (e: LedgerEntry) => {
    if (!(await ask(`ئەم جوڵەیە بسڕدرێتەوە؟\n${money(e.amount, e.currency)} — ${fmtDateShort(e.date)}${e.cash ? '\nجوڵەی سندوقەکەشی لەگەڵ دەسڕدرێتەوە.' : ''}`))) return
    const next: Account = { ...acc, entries: acc.entries.filter((x) => x.id !== e.id) }
    await persist(next)
    if (e.txId) await remove('txs', e.txId).catch(() => {})
    await log('سڕینەوەی جوڵە', 'debts', acc.id, `${acc.name} — ${money(e.amount, e.currency)}`)
    say('سڕایەوە', 'info')
  }

  const wa = acc.phone ? normalizePhone(acc.phone) : ''

  /** PDF لەناو خودی ئەپەکەدا دروست دەکرێت — بەبێ پەنجەرەی پرینت،
      بۆیە لە ئەپی دانراوی ئایفۆنیش کاردەکات و خێرایە. */
  const toPdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      const { downloadStatementPdf } = await import('../lib/statementPdf')
      await downloadStatementPdf(acc, rows, both ? 'ALL' : (view as Currency), sum, b, {
        showroom: settings.showroomName,
        phone: settings.phone,
        address: [settings.city, settings.address].filter(Boolean).join(' — '),
        rate,
        totalCur,
        balances: bal,
        sums,
      })
      say('فایلی PDF داگیرا')
    } catch {
      say('نەتوانرا PDF دروست بکرێت', 'bad')
    } finally {
      setPdfBusy(false)
    }
  }

  const balLabel = Math.abs(b) < 0.01 ? 'حساب پاکە' : b > 0 ? 'ئەم کەسە قەرزارمە' : 'من قەرزاری ئەم کەسەم'
  const balTone = Math.abs(b) < 0.01 ? 'text-muted' : b > 0 ? 'text-ok' : 'text-bad'

  return (
    <>
      <PageHead
        title={acc.name}
        sub={acc.phone || 'حسابی کەسی'}
        back={() => nav('/debts')}
        action={
          <div className="flex gap-2">
            <button onClick={toPdf} disabled={pdfBusy} className="btn-brand !px-3.5 no-print" title="داگرتنی PDF">
              {pdfBusy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={() => window.print()} className="btn-ghost !px-3 no-print" title="پرینت">
              <Printer size={17} />
            </button>
            {editable && (
              <button onClick={() => setEditAcc(true)} className="btn-ghost !px-3 no-print" title="گۆڕین">
                <Pencil size={17} />
              </button>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4 print-area">
        {/* سەردێڕی پرینت */}
        <div className="print-only text-center mb-2">
          <h1 className="text-lg font-bold">{settings.showroomName}</h1>
          <p className="text-sm">
            کشف حساب — <b>{acc.name}</b>
            {acc.phone && <span className="num"> · {acc.phone}</span>}
          </p>
        </div>

        {/* ── باڵانس ── */}
        <div className={`card p-5 text-center ${Math.abs(b) < 0.01 ? '' : b > 0 ? 'border-ok/40' : 'border-bad/40'}`}>
          <p className="text-[13px] text-muted mb-1">{balLabel}</p>
          <p className={`text-[32px] font-bold num leading-tight ${balTone}`}>{m(Math.abs(b))}</p>

          {both && (
            <p className="text-[11px] text-muted mt-1">
              کۆی گشتی — دۆلارەکە بە نرخی <span className="num">{fmtRate(rate)}</span> گۆڕدراوە
            </p>
          )}

          {/* هەڵبژاردنی دراو — «هەردوو» تەنها کاتێک هەردووکیان هەن */}
          {used.length > 1 && (
            <div className="mt-3 flex justify-center no-print">
              <div className="w-64">
                <Segmented
                  size="sm"
                  value={view}
                  onChange={(v: View) => setCur(v)}
                  options={[
                    { v: 'ALL' as View, label: 'هەردوو' },
                    { v: 'USD' as View, label: 'دۆلار $' },
                    { v: 'IQD' as View, label: 'دینار' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* لە دۆخی هەردوو: باڵانسی هەر دراوێک بە جیا + دراوی کۆی گشتی */}
          {both && (
            <>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line text-[13px]">
                <div>
                  <p className="text-muted text-xs">باڵانسی دۆلار</p>
                  <p className={`font-bold num ${bal.USD > 0 ? 'text-ok' : bal.USD < 0 ? 'text-bad' : 'text-muted'}`}>
                    {money(Math.abs(bal.USD), 'USD')}
                  </p>
                  <p className="text-[10px] text-muted">{bal.USD > 0 ? 'قەرزارمە' : bal.USD < 0 ? 'قەرزارم' : 'پاک'}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">باڵانسی دینار</p>
                  <p className={`font-bold num ${bal.IQD > 0 ? 'text-ok' : bal.IQD < 0 ? 'text-bad' : 'text-muted'}`}>
                    {money(Math.abs(bal.IQD), 'IQD')}
                  </p>
                  <p className="text-[10px] text-muted">{bal.IQD > 0 ? 'قەرزارمە' : bal.IQD < 0 ? 'قەرزارم' : 'پاک'}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 no-print">
                <span className="text-[11px] text-muted shrink-0">کۆی گشتی بە</span>
                <div className="w-36 shrink-0">
                  <Segmented
                    size="sm"
                    value={totalCur}
                    onChange={setTotalCur}
                    options={[
                      { v: 'IQD' as Currency, label: 'دینار' },
                      { v: 'USD' as Currency, label: 'دۆلار' },
                    ]}
                  />
                </div>
              </div>
            </>
          )}

          {!both && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line text-[13px]">
              <div>
                <p className="text-muted text-xs flex items-center justify-center gap-1">
                  <ArrowDownLeft size={12} className="text-ok" /> کۆی هاتوو
                </p>
                <p className="font-bold num text-ok">{m(sum.took)}</p>
              </div>
              <div>
                <p className="text-muted text-xs flex items-center justify-center gap-1">
                  <ArrowUpRight size={12} className="text-bad" /> کۆی ڕۆیشتوو
                </p>
                <p className="font-bold num text-bad">{m(sum.gave)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── دوگمەکانی جوڵە ── */}
        {editable && (
          <div className="grid grid-cols-2 gap-3 no-print">
            <button onClick={() => setMove('take')} className="btn-brand !py-3 justify-center">
              <ArrowDownLeft size={18} /> پارەم لێ وەرگرت
            </button>
            <button onClick={() => setMove('give')} className="btn-ghost !py-3 justify-center !border-bad/40 text-bad">
              <ArrowUpRight size={18} /> پارەم دایێ
            </button>
          </div>
        )}

        {acc.phone && (
          <div className="grid grid-cols-2 gap-3 no-print">
            <a href={`tel:${acc.phone}`} className="btn-ghost !py-2.5 justify-center text-[13px]">
              <Phone size={15} /> پەیوەندی
            </a>
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost !py-2.5 justify-center text-[13px]"
            >
              <MessageCircle size={15} /> واتسئەپ
            </a>
          </div>
        )}

        {/* ── کشف حساب ── */}
        <section className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3">
            <h2 className="font-bold text-[15px]">کشف حساب</h2>
            <span className="text-xs text-muted num">
              {rows.length} جوڵە{both ? ' · دۆلار و دینار پێکەوە' : ''}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted text-center py-10 px-6 leading-6">
              هێشتا هیچ جوڵەیەک نییە.
              <br />
              بە دوگمەکانی سەرەوە یەکەم وەرگرتن یان دان تۆمار بکە.
            </p>
          ) : (
            <>
              {/* ── مۆبایل: کارتی ڕیزکراو (هەموو زانیارییەک بەبێ سکرۆڵ) ── */}
              <div className="sm:hidden divide-y divide-line/60 print:hidden">
                {rows.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
                          r.kind === 'take' ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'
                        }`}
                        title={r.kind === 'take' ? 'پارە هاتووە' : 'پارە ڕۆیشتووە'}
                      >
                        {r.kind === 'take' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                      </span>
                      <div className="min-w-0 grow">
                        <span className="num text-[13px] block">{fmtDateShort(r.date)}</span>
                        <span className="num text-[11px] text-muted flex items-center gap-1">
                          <Clock size={10} /> {r.time}
                          {r.cash && (
                            <>
                              · <Wallet size={10} /> {r.account === 'bank' ? 'بانک' : 'کاش'}
                            </>
                          )}
                        </span>
                      </div>
                      <span className="text-end shrink-0">
                        <span className={`num font-bold block ${r.kind === 'take' ? 'text-ok' : 'text-bad'}`}>
                          {r.kind === 'take' ? '+' : '−'}
                          {mr(r.amount, r)}
                        </span>
                        <span className={`text-[10px] ${r.kind === 'take' ? 'text-ok' : 'text-bad'}`}>
                          {r.kind === 'take' ? 'هاتووە' : 'ڕۆیشتووە'}
                        </span>
                      </span>
                    </div>

                    {r.note && <p className="text-[13px] mt-1.5">{r.note}</p>}
                    <EditInfo edits={r.edits} at={r.editedAt} by={r.editedByName} className="mt-1" />

                    <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-line/50">
                      <span className="text-[11px] text-muted">
                        باڵانس:{' '}
                        <b className={`num ${r.running > 0 ? 'text-ok' : r.running < 0 ? 'text-bad' : 'text-muted'}`}>
                          {mr(Math.abs(r.running), r)}
                        </b>{' '}
                        {r.running > 0 ? 'قەرزارمە' : r.running < 0 ? 'قەرزارم' : 'پاک'}
                      </span>
                      {editable && (
                        <span className="flex gap-1 shrink-0">
                          <button onClick={() => setEditEntry(r)} className="p-1.5 text-muted" title="گۆڕین">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => delEntry(r)} className="p-1.5 text-muted" title="سڕینەوە">
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <MobileTotals both={both} sums={sums} sum={sum} b={b} m={m} balLabel={balLabel} />
              </div>

              {/* ── دەسک‌تۆپ و پرینت: خشتە ── */}
              <div className="hidden sm:block print:block overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-muted text-xs bg-surface2">
                      <th className="text-start font-medium px-3 py-2">بەروار و کات</th>
                      <th className="text-start font-medium px-3 py-2">تێبینی</th>
                      <th className="text-end font-medium px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-ok">
                          <ArrowDownLeft size={12} /> هاتووە
                        </span>
                      </th>
                      <th className="text-end font-medium px-3 py-2">
                        <span className="inline-flex items-center gap-1 text-bad">
                          <ArrowUpRight size={12} /> ڕۆیشتووە
                        </span>
                      </th>
                      <th className="text-end font-medium px-3 py-2">باڵانس</th>
                      <th className="w-8 no-print" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-line/60">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-lg grid place-items-center shrink-0 ${
                                r.kind === 'take' ? 'bg-ok/15 text-ok' : 'bg-bad/15 text-bad'
                              }`}
                            >
                              {r.kind === 'take' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                            </span>
                            <span>
                              <span className="num block">{fmtDateShort(r.date)}</span>
                              <span className="num text-[11px] text-muted flex items-center gap-1">
                                <Clock size={10} /> {r.time}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="block">{r.note || '—'}</span>
                          {r.cash && (
                            <span className="text-[11px] text-muted flex items-center gap-1">
                              <Wallet size={10} /> {r.account === 'bank' ? 'بانک' : 'کاش'}
                            </span>
                          )}
                          <EditInfo edits={r.edits} at={r.editedAt} by={r.editedByName} />
                        </td>
                        <td className="px-3 py-2.5 text-end num text-ok font-medium">
                          {r.kind === 'take' ? mr(r.amount, r) : ''}
                        </td>
                        <td className="px-3 py-2.5 text-end num text-bad font-medium">
                          {r.kind === 'give' ? mr(r.amount, r) : ''}
                        </td>
                        <td className={`px-3 py-2.5 text-end num font-bold ${r.running > 0 ? 'text-ok' : r.running < 0 ? 'text-bad' : 'text-muted'}`}>
                          {mr(Math.abs(r.running), r)}
                          <span className="text-[10px] text-muted block">
                            {r.running > 0 ? 'قەرزارمە' : r.running < 0 ? 'قەرزارم' : 'پاک'}
                          </span>
                        </td>
                        <td className="px-1 no-print">
                          {editable && (
                            <div className="flex flex-col gap-1">
                              <button onClick={() => setEditEntry(r)} className="p-1 text-muted hover:text-ink" title="گۆڕین">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => delEntry(r)} className="p-1 text-muted hover:text-bad" title="سڕینەوە">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {both ? (
                      <>
                        <tr className="border-t-2 border-line font-bold bg-surface2/50">
                          <td className="px-3 py-2.5" colSpan={2}>
                            کۆی دۆلار
                          </td>
                          <td className="px-3 py-2.5 text-end num text-ok">{money(sums.USD.took, 'USD')}</td>
                          <td className="px-3 py-2.5 text-end num text-bad">{money(sums.USD.gave, 'USD')}</td>
                          <td className={`px-3 py-2.5 text-end num ${bal.USD > 0 ? 'text-ok' : bal.USD < 0 ? 'text-bad' : 'text-muted'}`}>
                            {money(Math.abs(bal.USD), 'USD')}
                          </td>
                          <td className="no-print" />
                        </tr>
                        <tr className="font-bold bg-surface2/50">
                          <td className="px-3 py-2.5" colSpan={2}>
                            کۆی دینار
                          </td>
                          <td className="px-3 py-2.5 text-end num text-ok">{money(sums.IQD.took, 'IQD')}</td>
                          <td className="px-3 py-2.5 text-end num text-bad">{money(sums.IQD.gave, 'IQD')}</td>
                          <td className={`px-3 py-2.5 text-end num ${bal.IQD > 0 ? 'text-ok' : bal.IQD < 0 ? 'text-bad' : 'text-muted'}`}>
                            {money(Math.abs(bal.IQD), 'IQD')}
                          </td>
                          <td className="no-print" />
                        </tr>
                      </>
                    ) : (
                      <tr className="border-t-2 border-line font-bold bg-surface2/50">
                        <td className="px-3 py-2.5" colSpan={2}>
                          کۆی گشتی
                        </td>
                        <td className="px-3 py-2.5 text-end num text-ok">{m(sum.took)}</td>
                        <td className="px-3 py-2.5 text-end num text-bad">{m(sum.gave)}</td>
                        <td className={`px-3 py-2.5 text-end num ${b > 0 ? 'text-ok' : b < 0 ? 'text-bad' : 'text-muted'}`}>
                          {m(Math.abs(b))}
                        </td>
                        <td className="no-print" />
                      </tr>
                    )}
                    <tr className="bg-surface2/80 font-bold">
                      <td className="px-3 py-2.5" colSpan={4}>
                        {b > 0 ? 'ماوە لەسەر ئەم کەسە' : b < 0 ? 'ماوە لەسەر ئێمە' : 'باڵانسی کۆتایی'}
                        {both && (
                          <span className="block text-[11px] font-normal text-muted">
                            هەردوو دراو پێکەوە بە نرخی <span className="num">{fmtRate(rate)}</span>
                          </span>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 text-end num text-[15px] ${b > 0 ? 'text-ok' : b < 0 ? 'text-bad' : 'text-muted'}`}>
                        {m(Math.abs(b))}
                      </td>
                      <td className="no-print" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </section>

        {acc.note && <p className="text-[13px] text-muted">تێبینی: {acc.note}</p>}

        <p className="text-[11px] text-muted text-center pb-4">
          چاپکراوە لە <span className="num">{fmtDateShort(todayISO())}</span> · {settings.showroomName}
        </p>
      </div>

      {move && (
        <MoveForm
          acc={acc}
          kind={move}
          cur={both ? used[0] : (view as Currency)}
          rate={rate}
          user={user}
          onClose={() => setMove(null)}
          onDone={async (entry, tx) => {
            if (tx) await save('txs', tx)
            await persist({ ...acc, entries: [...acc.entries, entry] })
            await log(
              entry.kind === 'take' ? 'وەرگرتنی پارە' : 'دانی پارە',
              'debts',
              acc.id,
              `${acc.name} — ${money(entry.amount, entry.currency)}`,
            )
            fx('money')
            say(entry.kind === 'take' ? 'وەرگرتنەکە تۆمار کرا' : 'دانەکە تۆمار کرا')
            setMove(null)
          }}
        />
      )}

      {editEntry && (
        <MoveForm
          acc={acc}
          kind={editEntry.kind}
          cur={editEntry.currency}
          rate={rate}
          user={user}
          existing={editEntry}
          onClose={() => setEditEntry(null)}
          onDone={async (entry, tx, dropTxId) => {
            /* دەستکاری ڕاستەقینەیە: جوڵەی سندوقەکەشی نوێ دەبێتەوە */
            if (dropTxId) await remove('txs', dropTxId).catch(() => {})
            if (tx) await save('txs', tx)
            await persist({ ...acc, entries: acc.entries.map((x) => (x.id === entry.id ? entry : x)) })
            await log('گۆڕینی جوڵە', 'debts', acc.id, `${acc.name} — ${money(entry.amount, entry.currency)}`)
            say('نوێ کرایەوە')
            setEditEntry(null)
          }}
        />
      )}

      {editAcc && (
        <AccountForm
          acc={acc}
          customers={customers}
          onClose={() => setEditAcc(false)}
          onSaved={() => setEditAcc(false)}
          save={save as never}
          log={log}
          say={say}
          rate={rate}
        />
      )}
      {node}
    </>
  )
}

/** کۆی گشتی لە بینینی مۆبایل */
function MobileTotals({
  both, sums, sum, b, m, balLabel,
}: {
  both: boolean
  sums: { USD: { took: number; gave: number }; IQD: { took: number; gave: number } }
  sum: { took: number; gave: number }
  b: number
  m: (n: number) => string
  balLabel: string
}) {
  return (
    <div className="px-4 py-3 bg-surface2/60">
      {both ? (
        <>
          <div className="flex items-center justify-between text-[13px] font-bold">
            <span>کۆی دۆلار</span>
            <span className="flex gap-3">
              <span className="num text-ok">+{money(sums.USD.took, 'USD')}</span>
              <span className="num text-bad">−{money(sums.USD.gave, 'USD')}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[13px] font-bold mt-1">
            <span>کۆی دینار</span>
            <span className="flex gap-3">
              <span className="num text-ok">+{money(sums.IQD.took, 'IQD')}</span>
              <span className="num text-bad">−{money(sums.IQD.gave, 'IQD')}</span>
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between text-[13px] font-bold">
          <span>کۆی گشتی</span>
          <span className="flex gap-3">
            <span className="num text-ok">+{m(sum.took)}</span>
            <span className="num text-bad">−{m(sum.gave)}</span>
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-line">
        <span className="text-[13px] font-bold flex items-center gap-1.5">
          {both && <Scale size={13} className="text-brand" />}
          {balLabel}
        </span>
        <span className={`num text-[15px] font-bold ${b > 0 ? 'text-ok' : b < 0 ? 'text-bad' : 'text-muted'}`}>
          {m(Math.abs(b))}
        </span>
      </div>
    </div>
  )
}

/* ═════════════ فۆرمی جوڵە ═════════════ */

function MoveForm({
  acc, kind, cur, rate, user, existing, onClose, onDone,
}: {
  acc: Account
  kind: EntryKind
  cur: Currency
  rate: number
  user: { uid: string; name: string } | null
  existing?: LedgerEntry
  onClose: () => void
  /** `dropTxId` = ئەو جوڵەی سندوقەی دەبێت بسڕدرێتەوە (کاتێک لە سندوق دەردەهێنرێت) */
  onDone: (e: LedgerEntry, tx?: Tx, dropTxId?: string) => void | Promise<void>
}) {
  const take = kind === 'take'
  const [amount, setAmount] = useState(existing?.amount || 0)
  const [currency, setCurrency] = useState<Currency>(existing?.currency || cur)
  const [date, setDate] = useState(existing?.date || todayISO())
  const [time, setTime] = useState(existing?.time || nowTime())
  const [cash, setCash] = useState(existing ? existing.cash : true)
  const [account, setAccount] = useState<'cash' | 'bank'>(existing?.account || 'cash')
  const [note, setNote] = useState(existing?.note || '')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!(amount > 0)) return
    setBusy(true)
    try {
      const at = existing?.at || Date.now()
      /* ئەگەر پێشتر لە سندوقدا بووە هەمان ناسنامە دەمێنێتەوە، ئەگەرنا نوێ دروست دەبێت */
      const txId = cash ? existing?.txId || uid('tx') : undefined
      const base: LedgerEntry = {
        id: existing?.id || uid('e'),
        date,
        time,
        kind,
        amount,
        currency,
        rate,
        cash,
        account: cash ? account : undefined,
        txId,
        note: note.trim() || undefined,
        at,
        by: existing?.by || user?.uid,
        byName: existing?.byName || user?.name,
        edits: existing?.edits,
        editedAt: existing?.editedAt,
        editedBy: existing?.editedBy,
        editedByName: existing?.editedByName,
      }
      const entry = existing ? withEdit(base, user) : base

      /* جوڵەی سندوق — بۆ نوێ و بۆ دەستکاریش، تا حساباتەکە ڕاست بێت */
      const tx: Tx | undefined = cash
        ? {
            id: txId!,
            date,
            kind: take ? 'in' : 'out',
            amount,
            currency,
            rate,
            account,
            category: take ? 'debt_in' : 'debt_out',
            title: `${take ? 'وەرگرتن لە' : 'دان بە'} ${acc.name}`,
            customerId: acc.customerId,
            note: note.trim() || undefined,
            createdAt: existing?.at || Date.now(),
            createdBy: existing?.by || user?.uid,
            ...(existing ? { edits: (existing.edits || 0) + 1, editedAt: Date.now(), editedBy: user?.uid, editedByName: user?.name } : {}),
          }
        : undefined

      /* ئەگەر پێشتر لە سندوق بووە و ئێستا دەرهێنراوە، جوڵەکەی دەسڕدرێتەوە */
      const dropTxId = existing?.cash && existing.txId && !cash ? existing.txId : undefined

      await onDone(entry, tx, dropTxId)
    } finally {
      setBusy(false)
    }
  }

  const quick = [50, 100, 250, 500, 1000]

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? 'گۆڕینی جوڵە' : take ? 'پارەم لێ وەرگرت' : 'پارەم دایێ'}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">
            پاشگەزبوونەوە
          </button>
          <button onClick={submit} disabled={busy || !(amount > 0)} className="btn-brand">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
            تۆمارکردن
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={`card p-3.5 ${take ? 'bg-ok/10 border-ok/30' : 'bg-bad/10 border-bad/30'}`}>
          <p className="text-[13px] flex items-center gap-2">
            {take ? <ArrowDownLeft size={16} className="text-ok" /> : <ArrowUpRight size={16} className="text-bad" />}
            <b>{acc.name}</b>
          </p>
          <p className="text-xs text-muted mt-1 leading-5">
            {take
              ? 'پارە لەم کەسەوە وەرگیراوە — قەرزەکەی کەم دەبێتەوە.'
              : 'پارە بەم کەسە دراوە — قەرزەکەی زیاد دەبێت.'}
          </p>
          {existing && (
            <EditInfo edits={existing.edits} at={existing.editedAt} by={existing.editedByName} className="mt-2" />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="بڕی پارە">
            <input
              dir="ltr"
              inputMode="decimal"
              autoFocus
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
              className="field num text-start !text-[18px]"
              placeholder="0"
            />
          </Field>
          <Field label="دراو">
            <Segmented
              value={currency}
              onChange={setCurrency}
              options={[
                { v: 'USD' as Currency, label: 'دۆلار $' },
                { v: 'IQD' as Currency, label: 'دینار' },
              ]}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount((v) => v + (currency === 'IQD' ? q * 1000 : q))}
              className="btn-ghost !py-1.5 !px-3 text-[13px] num"
            >
              +{currency === 'IQD' ? `${q}K` : q}
            </button>
          ))}
          {amount > 0 && (
            <button type="button" onClick={() => setAmount(0)} className="btn-ghost !py-1.5 !px-3 text-[13px] text-bad">
              سفر
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="بەروار">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field num" />
          </Field>
          <Field label="کاتژمێر">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field num" />
          </Field>
        </div>

        <div className="card p-3.5 space-y-3">
          <Switch
            checked={cash}
            onChange={setCash}
            label="بچێتە سندوقەوە"
            hint={
              take
                ? 'وەک داهات لە حسابات تۆمار دەکرێت و باڵانسی سندوق زیاد دەکات'
                : 'وەک خەرجی لە حسابات تۆمار دەکرێت و باڵانسی سندوق کەم دەکات'
            }
            icon={<Wallet size={17} />}
          />
          {cash && (
            <Segmented
              value={account}
              onChange={setAccount}
              options={[
                { v: 'cash' as const, label: 'کاش' },
                { v: 'bank' as const, label: 'بانک' },
              ]}
            />
          )}
          {existing && (
            <p className="text-[11px] text-muted">
              هەر گۆڕانکارییەک لێرە، جوڵەی سندوقەکەشی پێوە دەگۆڕێت — یان دەیسڕێتەوە ئەگەر لە سندوق دەریبهێنیت.
            </p>
          )}
        </div>

        <Field label="تێبینی" hint="نموونە: پێشەکی سەیارە، سلف، کرێی مانگ...">
          <input value={note} onChange={(e) => setNote(e.target.value)} className="field" placeholder="ئارەزوومەندانە" />
        </Field>
      </div>
    </Sheet>
  )
}
