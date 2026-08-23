/**
 * گەڕانی گشتی — یەک شوێن بۆ دۆزینەوەی هەموو شتێک.
 *
 * دەکرێتەوە بە ⌘K / Ctrl+K لەسەر کۆمپیوتەر، یان بە دوگمەی گەڕان.
 * دەگەڕێت بەدوای: ئۆتۆمبێل · کڕیار · حساب · عەقد · بەشەکانی سیستەم.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, Car, Users, NotebookPen, FileText, CornerDownLeft, ArrowUp, ArrowDown,
  LayoutDashboard, Wallet, Receipt, BarChart3, Handshake, ArrowLeftRight, Send,
  ShieldCheck, UserCog, History, Settings as Cog, ScanLine, Plus,
} from 'lucide-react'
import { useApp } from '../store/app'
import { Portal } from './Portal'
import { toAccounts, balanceOf } from '../lib/ledger'
import { money, num } from '../lib/format'

interface Hit {
  id: string
  group: string
  icon: React.ReactNode
  title: string
  sub?: string
  meta?: string
  to: string
}

const PAGES: { label: string; to: string; icon: React.ReactNode; keys: string }[] = [
  { label: 'داشبۆرد', to: '/', icon: <LayoutDashboard size={17} />, keys: 'dashboard سەرەکی' },
  { label: 'ئۆتۆمبێلەکان', to: '/cars', icon: <Car size={17} />, keys: 'cars سەیارە' },
  { label: 'ئۆتۆمبێلی نوێ', to: '/cars/new', icon: <Plus size={17} />, keys: 'new car زیادکردن سەیارە' },
  { label: 'سکانی VIN', to: '/scan', icon: <ScanLine size={17} />, keys: 'scan vin شانسی' },
  { label: 'عەقدەکان', to: '/contracts', icon: <FileText size={17} />, keys: 'contracts گرێبەست' },
  { label: 'عەقدی دەرەکی', to: '/brokers', icon: <Handshake size={17} />, keys: 'broker دەلاڵی ناوبژیوان عمولە' },
  { label: 'حسابات', to: '/accounting', icon: <Wallet size={17} />, keys: 'accounting سندوق پارە' },
  { label: 'مەسروفات', to: '/expenses', icon: <Receipt size={17} />, keys: 'expenses خەرجی' },
  { label: 'ڕاپۆرت و کەشف حساب', to: '/reports', icon: <BarChart3 size={17} />, keys: 'reports راپۆرت' },
  { label: 'دەفتەری قەرز', to: '/debts', icon: <NotebookPen size={17} />, keys: 'debts قەرز' },
  { label: 'کڕیارەکان', to: '/customers', icon: <Users size={17} />, keys: 'customers کریار' },
  { label: 'شەریکەکان', to: '/partners', icon: <Handshake size={17} />, keys: 'partners شەریک' },
  { label: 'سندووقی سەراف', to: '/exchangers', icon: <ArrowLeftRight size={17} />, keys: 'exchangers سەراف' },
  { label: 'حەواڵەکان', to: '/hawalas', icon: <Send size={17} />, keys: 'hawala حەواڵە' },
  { label: 'ئاسایش', to: '/security', icon: <ShieldCheck size={17} />, keys: 'security backup پاڵپشت' },
  { label: 'بەکارهێنەران', to: '/users', icon: <UserCog size={17} />, keys: 'users بەکارهێنەر' },
  { label: 'چالاکییەکان', to: '/audit', icon: <History size={17} />, keys: 'audit log چالاکی' },
  { label: 'ڕێکخستن', to: '/settings', icon: <Cog size={17} />, keys: 'settings ڕێکخستن' },
]

/** ڕێکخستنی دەق بۆ بەراورد — ی/ك/ه‌ی عەرەبی و کوردی وەک یەک */
const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/[ىیي]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[ۆو]/g, 'و')
    .replace(/[ةه]/g, 'ه')
    .replace(/[أإآا]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim()

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const { cars, customers, contracts, brokers, debts, settings, can } = useApp()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const box = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setSel(0)
    const t = setTimeout(() => box.current?.focus(), 60)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
    }
  }, [open])

  const hits = useMemo<Hit[]>(() => {
    const nq = norm(q)
    const out: Hit[] = []
    const money_ = can('money.view')

    /* ── بەشەکان ── */
    for (const p of PAGES) {
      if (!nq || norm(p.label).includes(nq) || norm(p.keys).includes(nq)) {
        out.push({ id: 'p' + p.to, group: 'بەشەکان', icon: p.icon, title: p.label, to: p.to })
      }
    }

    if (!nq) return out.slice(0, 8)

    /* ── ئۆتۆمبێل ── */
    const STATUS: Record<string, string> = {
      available: 'بەردەستە', reserved: 'حیجزکراوە', sold: 'فرۆشراوە', workshop: 'لە وۆرکشۆپ',
    }
    for (const c of cars) {
      const hay = norm(`${c.brand} ${c.model} ${c.trim || ''} ${c.year} ${c.plate || ''} ${c.vin} ${c.color}`)
      if (!hay.includes(nq)) continue
      out.push({
        id: 'c' + c.id,
        group: 'ئۆتۆمبێل',
        icon: <Car size={17} />,
        title: `${c.brand} ${c.model}`,
        sub: [String(c.year), c.color, c.plate].filter(Boolean).join(' · '),
        meta: STATUS[c.status] || '',
        to: `/cars/${c.id}`,
      })
      if (out.length > 60) break
    }

    /* ── کڕیار ── */
    for (const c of customers) {
      const hay = norm(`${c.name} ${c.phone} ${c.phone2 || ''} ${c.idNumber || ''} ${c.city || ''}`)
      if (!hay.includes(nq)) continue
      out.push({
        id: 'u' + c.id,
        group: 'کڕیار',
        icon: <Users size={17} />,
        title: c.name,
        sub: c.phone,
        to: '/customers',
      })
      if (out.length > 90) break
    }

    /* ── حسابی قەرز ── */
    if (money_) {
      for (const a of toAccounts(debts)) {
        const hay = norm(`${a.name} ${a.phone || ''}`)
        if (!hay.includes(nq)) continue
        const b = balanceOf(a)
        const v = b.USD !== 0 ? b.USD : b.IQD
        const curr = b.USD !== 0 ? 'USD' : 'IQD'
        out.push({
          id: 'd' + a.id,
          group: 'حسابی قەرز',
          icon: <NotebookPen size={17} />,
          title: a.name,
          sub: a.phone || undefined,
          meta: Math.abs(v) < 0.01 ? 'پاک' : `${v > 0 ? 'قەرزارە' : 'قەرزارین'} ${money(Math.abs(v), curr)}`,
          to: `/debts/${a.id}`,
        })
        if (out.length > 120) break
      }
    }

    /* ── عەقد ── */
    for (const c of contracts) {
      const hay = norm(`${c.no} ${c.buyer?.name || ''} ${c.seller?.name || ''} ${c.car?.brand || ''} ${c.car?.model || ''}`)
      if (!hay.includes(nq)) continue
      out.push({
        id: 'k' + c.id,
        group: 'عەقد',
        icon: <FileText size={17} />,
        title: `${c.no} — ${c.buyer?.name || 'بێ ناو'}`,
        sub: [c.car?.brand, c.car?.model, c.date].filter(Boolean).join(' · '),
        meta: money_ ? money(c.price, c.currency) : undefined,
        to: `/contracts/${c.id}`,
      })
      if (out.length > 150) break
    }

    /* ── عەقدی دەرەکی ── */
    for (const d of brokers) {
      const hay = norm(`${d.no} ${d.seller.name} ${d.buyer.name} ${d.car.brand} ${d.car.model} ${d.car.plate || ''}`)
      if (!hay.includes(nq)) continue
      out.push({
        id: 'b' + d.id,
        group: 'عەقدی دەرەکی',
        icon: <Handshake size={17} />,
        title: `${d.seller.name} ← ${d.buyer.name}`,
        sub: [d.no, d.car.brand, d.car.model].filter(Boolean).join(' · '),
        meta: money_ && d.fee > 0 ? `عمولە ${money(d.fee, d.feeCurrency)}` : undefined,
        to: `/brokers/${d.id}`,
      })
      if (out.length > 170) break
    }

    return out.slice(0, 40)
  }, [q, cars, customers, contracts, brokers, debts, can])

  /* گرووپکردن بە پاراستنی ڕیزبەندی */
  const groups = useMemo(() => {
    const g: { name: string; items: Hit[] }[] = []
    for (const h of hits) {
      let last = g[g.length - 1]
      if (!last || last.name !== h.group) {
        last = { name: h.group, items: [] }
        g.push(last)
      }
      last.items.push(h)
    }
    return g
  }, [hits])

  useEffect(() => setSel(0), [q])

  const go = (h: Hit) => {
    onClose()
    nav(h.to)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(hits.length - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(0, s - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hits[sel]) go(hits[sel])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  /* سکڕۆڵ بۆ ئەوەی هەڵبژێردراو دیار بێت */
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-sel="1"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  let idx = -1

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] flex items-start justify-center no-print px-4 pt-[12vh] sm:pt-[14vh]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] animate-in" onClick={onClose} />
        <div className="relative w-full sm:max-w-xl bg-surface border border-line rounded-2xl shadow-pop flex flex-col max-h-[70vh] animate-in overflow-hidden">
          {/* خانەی گەڕان */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line shrink-0">
            <Search size={19} className="text-muted shrink-0" />
            <input
              ref={box}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="بگەڕێ بەدوای سەیارە، کڕیار، حساب، عەقد..."
              className="grow bg-transparent outline-none text-[15px] placeholder:text-muted/70"
            />
            <button onClick={onClose} className="p-1 -m-1 text-muted hover:text-ink shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* ئەنجامەکان */}
          <div ref={listRef} className="app-scroll grow py-2">
            {hits.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted text-sm">هیچ ئەنجامێک نەدۆزرایەوە</p>
                <p className="text-muted/70 text-[12.5px] mt-1">«{q}»</p>
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.name} className="mb-1">
                  <p className="px-4 pt-2 pb-1 text-[11px] font-bold text-muted/80 tracking-wide">{g.name}</p>
                  {g.items.map((h) => {
                    idx++
                    const on = idx === sel
                    const my = idx
                    return (
                      <button
                        key={h.id}
                        data-sel={on ? '1' : '0'}
                        onMouseEnter={() => setSel(my)}
                        onClick={() => go(h)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition ${
                          on ? 'bg-brand/12' : 'hover:bg-surface2'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                          on ? 'bg-brand/20 text-brand' : 'bg-surface2 text-muted'}`}>
                          {h.icon}
                        </span>
                        <span className="min-w-0 grow">
                          <span className="block font-medium text-[14px] truncate">{h.title}</span>
                          {h.sub && <span className="block text-[12px] text-muted truncate num">{h.sub}</span>}
                        </span>
                        {h.meta && <span className="text-[12px] text-muted shrink-0 num">{h.meta}</span>}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* ژێرەوە */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-line shrink-0 text-[11.5px] text-muted">
            <span className="flex items-center gap-1"><ArrowUp size={12} /><ArrowDown size={12} /> جوڵان</span>
            <span className="flex items-center gap-1"><CornerDownLeft size={12} /> کردنەوە</span>
            <span className="ms-auto num">
              {num(hits.length)} ئەنجام
              {settings.showroomName ? ` · ${settings.showroomName}` : ''}
            </span>
          </div>
        </div>
      </div>
    </Portal>
  )
}

/** ⌘K / Ctrl+K */
export function useCommandKey(onOpen: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onOpen])
}
