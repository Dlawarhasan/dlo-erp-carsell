import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Printer } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { SearchBar, Empty } from '../components/ui'
import { contractDebt, contractPaid } from '../lib/finance'
import { fmtDateShort, fold, money } from '../lib/format'
import type { Contract } from '../lib/types'

const STATUS: Record<Contract['status'], { ku: string; cls: string }> = {
  active: { ku: 'چالاک', cls: 'bg-info/15 text-info border-info/30' },
  completed: { ku: 'تەواوبووە', cls: 'bg-ok/15 text-ok border-ok/30' },
  cancelled: { ku: 'هەڵوەشێنراوە', cls: 'bg-bad/15 text-bad border-bad/30' },
}

export default function Contracts() {
  const nav = useNavigate()
  const { contracts } = useApp()
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'all' | Contract['status'] | 'debt'>('all')

  const list = useMemo(() => {
    const fq = fold(q)
    return contracts
      .filter((c) => {
        if (tab === 'debt') {
          if (contractDebt(c) <= 0 || c.status === 'cancelled') return false
        } else if (tab !== 'all' && c.status !== tab) return false
        if (!fq) return true
        return (
          fold(c.no).includes(fq) ||
          fold(c.buyer.name).includes(fq) ||
          (c.buyer.phone || '').includes(fq) ||
          fold(`${c.car.brand} ${c.car.model}`).includes(fq) ||
          (c.car.vin || '').toLowerCase().includes(fq)
        )
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [contracts, q, tab])

  const counts = useMemo(
    () => ({
      all: contracts.length,
      active: contracts.filter((c) => c.status === 'active').length,
      completed: contracts.filter((c) => c.status === 'completed').length,
      cancelled: contracts.filter((c) => c.status === 'cancelled').length,
      debt: contracts.filter((c) => c.status !== 'cancelled' && contractDebt(c) > 0).length,
    }),
    [contracts],
  )

  return (
    <>
      <PageHead
        title="عەقدەکان"
        sub={<><span className="num">{list.length}</span> عەقد</>}
        action={
          <button onClick={() => nav('/security')} className="btn-ghost shrink-0">
            <Printer size={17} /> <span className="hidden sm:inline">ناردن بۆ ئاسایش</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        <SearchBar value={q} onChange={setQ} placeholder="بگەڕێ بە ژمارەی عەقد، ناوی کریار، VIN..." />

        <div className="flex gap-2 overflow-x-auto hide-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { k: 'all', ku: 'هەموو' },
            { k: 'active', ku: 'چالاک' },
            { k: 'debt', ku: 'قەرزدار' },
            { k: 'completed', ku: 'تەواوبوو' },
            { k: 'cancelled', ku: 'هەڵوەشاوە' },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`tab ${tab === t.k ? 'tab-on' : 'bg-surface2 border border-line'}`}>
              {t.ku} <span className="num opacity-60">{(counts as any)[t.k]}</span>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <Empty icon={<FileText size={26} />} title="هیچ عەقدێک نییە" sub="کاتێک ئۆتۆمبێلێک دەفرۆشیت، عەقدەکەی لێرە دەردەکەوێت" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => {
              const debt = contractDebt(c)
              return (
                <button key={c.id} onClick={() => nav(`/contracts/${c.id}`)} className="card p-4 text-start hover:border-brand/50 transition">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-bold num">{c.no}</p>
                      <p className="text-[13px] text-muted num">{fmtDateShort(c.date)}</p>
                    </div>
                    <span className={`chip ${STATUS[c.status].cls}`}>{STATUS[c.status].ku}</span>
                  </div>
                  <p className="text-[15px] font-medium truncate">
                    {c.car.brand} {c.car.model} <span className="num text-muted">{c.car.year}</span>
                  </p>
                  <p className="text-[13px] text-muted truncate mt-0.5">
                    {c.buyer.name} · <span className="num">{c.buyer.phone}</span>
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-line">
                    <span className="font-bold text-brand num">{money(c.price, c.currency)}</span>
                    {c.payment === 'installment' ? (
                      debt > 0 ? (
                        <span className="chip bg-warn/12 text-warn border-warn/30">ماوە <span className="num">{money(debt, c.currency)}</span></span>
                      ) : (
                        <span className="chip bg-ok/12 text-ok border-ok/30">تەواو دراوە</span>
                      )
                    ) : (
                      <span className="chip bg-ok/12 text-ok border-ok/30">نەقد</span>
                    )}
                  </div>
                  {c.payment === 'installment' && (
                    <div className="h-1.5 bg-surface2 rounded-full overflow-hidden mt-2.5">
                      <div className="h-full bg-ok rounded-full" style={{ width: `${Math.min(100, (contractPaid(c) / c.price) * 100)}%` }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
