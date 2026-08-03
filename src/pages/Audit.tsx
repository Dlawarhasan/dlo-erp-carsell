import { useMemo, useState } from 'react'
import { History, User } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, SearchBar } from '../components/ui'
import { fmtDateTime, fold } from '../lib/format'

export default function Audit() {
  const { audit, can } = useApp()
  const [q, setQ] = useState('')

  const list = useMemo(() => {
    const fq = fold(q)
    return audit.filter((a) => !fq || fold(a.action).includes(fq) || fold(a.name).includes(fq) || fold(a.detail || '').includes(fq))
  }, [audit, q])

  if (!can('settings.edit')) return <Empty icon={<History size={26} />} title="دەسەڵاتت نییە" />

  return (
    <>
      <PageHead title="چالاکییەکان" sub="تۆماری هەموو کردارەکان" />
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        <SearchBar value={q} onChange={setQ} placeholder="بگەڕێ..." />
        {list.length === 0 ? (
          <Empty icon={<History size={26} />} title="هیچ چالاکییەک نییە" />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {list.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <span className="w-9 h-9 rounded-xl bg-surface2 text-muted grid place-items-center shrink-0">
                  <User size={16} />
                </span>
                <div className="grow min-w-0">
                  <p className="text-sm font-medium">{a.action}</p>
                  {a.detail && <p className="text-xs text-muted truncate">{a.detail}</p>}
                  <p className="text-[11px] text-muted mt-0.5 num">
                    {a.name} · {fmtDateTime(a.at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
