/**
 * یاریدەدەر — چات بۆتی ناوخۆیی سیستەم.
 *
 * لە ناو خودی ئامێرەکەتدا کاردەکات: بێ ئینتەرنێت، بێ کلیل، بێ پارە.
 * پرسیار بکە → وەڵام + دوگمەیەک کە ڕاستەوخۆ دەتباتە شوێنەکەی.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, X, Sparkles, Trash2, CornerDownLeft } from 'lucide-react'
import { useApp } from '../store/app'
import { Portal } from './Portal'
import { ask, SUGGESTIONS, type Answer } from '../lib/assistant'
import { fx } from '../lib/feedback'

interface Msg {
  id: number
  me: boolean
  text: string
  a?: Answer
}

/** **قەبە** → <b> */
function Rich({ s }: { s: string }) {
  const parts = s.split(/\*\*(.+?)\*\*/g)
  return <>{parts.map((p, i) => (i % 2 ? <b key={i} className="text-ink">{p}</b> : <span key={i}>{p}</span>))}</>
}

const GREET: Msg = {
  id: 0,
  me: false,
  text: '',
  a: {
    text: 'سڵاو! چۆن یارمەتیت بدەم؟',
    lines: [
      'دەتوانم پرسیارەکانت لەسەر **سەیارە، پارە، قەرز و خەرجی** وەڵام بدەمەوە،',
      'فێرت بکەم **چۆن** هەر کارێک بکەیت، و ڕاستەوخۆ **بتبەمە** شوێنەکەی.',
    ],
    chips: SUGGESTIONS.slice(0, 5),
  },
}

export function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const app = useApp()
  const [msgs, setMsgs] = useState<Msg[]>([GREET])
  const [q, setQ] = useState('')
  const box = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const seq = useRef(1)

  const ctx = useMemo(
    () => ({
      cars: app.cars, customers: app.customers, contracts: app.contracts, brokers: app.brokers,
      txs: app.txs, debts: app.debts, partners: app.partners, exchangers: app.exchangers,
      hawalas: app.hawalas, settings: app.settings,
    }),
    [app.cars, app.customers, app.contracts, app.brokers, app.txs, app.debts, app.partners,
     app.exchangers, app.hawalas, app.settings],
  )

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => box.current?.focus(), 120)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
      document.removeEventListener('keydown', k)
    }
  }, [open, onClose])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, open])

  const send = (text: string) => {
    const t = text.trim()
    if (!t) return
    const a = ask(t, ctx)
    setMsgs((p) => [
      ...p,
      { id: seq.current++, me: true, text: t },
      { id: seq.current++, me: false, text: '', a },
    ])
    setQ('')
    fx('info')
  }

  const go = (to: string) => {
    onClose()
    nav(to)
  }

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[96] flex sm:items-center items-end justify-center no-print sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] animate-in" onClick={onClose} />
        <div className="relative w-full sm:max-w-lg h-[88vh] sm:h-[76vh] flex flex-col bg-surface border border-line sm:rounded-2xl rounded-t-3xl shadow-pop animate-sheet sm:animate-in overflow-hidden">
          {/* سەردێڕ */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-line shrink-0">
            <span className="w-9 h-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0">
              <Sparkles size={18} />
            </span>
            <div className="grow min-w-0">
              <p className="font-bold text-[15px] leading-tight">یاریدەدەر</p>
              <p className="text-[11.5px] text-muted">سیستەم و داتاکانت دەناسێت · بێ ئینتەرنێت</p>
            </div>
            {msgs.length > 1 && (
              <button onClick={() => setMsgs([GREET])} className="p-2 -m-1 text-muted hover:text-ink" title="سڕینەوەی گفتوگۆ">
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={onClose} className="p-2 -m-1 text-muted hover:text-ink">
              <X size={19} />
            </button>
          </div>

          {/* گفتوگۆ */}
          <div className="app-scroll grow px-4 py-4 space-y-3">
            {msgs.map((msg) =>
              msg.me ? (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[85%] bg-brand text-brandInk rounded-2xl rounded-ss-md px-3.5 py-2.5 text-[14px] leading-6">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-end">
                  <div data-bot="1" className={`max-w-[92%] rounded-2xl rounded-se-md px-3.5 py-3 text-[14px] leading-6 border ${
                    msg.a?.tone === 'ok' ? 'bg-ok/[0.07] border-ok/25'
                      : msg.a?.tone === 'bad' ? 'bg-bad/[0.07] border-bad/25'
                      : 'bg-surface2 border-line'}`}>
                    <p className="font-medium"><Rich s={msg.a?.text || ''} /></p>

                    {!!msg.a?.lines?.length && (
                      <ul className="mt-2 space-y-1.5">
                        {msg.a.lines.map((l, i) => (
                          <li key={i} className="flex gap-2 text-[13px] text-muted leading-6">
                            <span className="text-brand shrink-0 mt-[7px] w-1 h-1 rounded-full bg-brand" />
                            <span className="min-w-0"><Rich s={l} /></span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!!msg.a?.actions?.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.a.actions.map((a) => (
                          <button key={a.to + a.label} onClick={() => go(a.to)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-brandInk text-[12.5px] font-medium">
                            {a.label} <CornerDownLeft size={13} />
                          </button>
                        ))}
                      </div>
                    )}

                    {!!msg.a?.chips?.length && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {msg.a.chips.map((ch) => (
                          <button key={ch} onClick={() => send(ch)}
                            className="px-2.5 py-1.5 rounded-xl border border-line bg-surface text-muted hover:text-ink text-[12px]">
                            {ch}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            <div ref={end} />
          </div>

          {/* نووسین */}
          <div className="border-t border-line p-3 shrink-0 safe-b">
            <div className="flex items-center gap-2">
              <input
                ref={box}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(q)}
                placeholder="پرسیارەکەت بنووسە..."
                className="field grow"
              />
              <button onClick={() => send(q)} disabled={!q.trim()}
                className="btn-brand shrink-0 !px-3.5 disabled:opacity-40">
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
