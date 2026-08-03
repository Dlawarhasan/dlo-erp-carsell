import { useState } from 'react'
import type { PartState } from '../lib/types'
import { BODY_PARTS, PART_STATES, PART_STATE_KEYS } from '../lib/catalog'
import { Sheet } from './ui'
import { CheckCircle2, RotateCcw } from 'lucide-react'

/** پێگەی هەر پارچەیەک لەسەر وێنەی سەرەوەی ئۆتۆمبێل */
const GEO: Record<string, { x: number; y: number; w: number; h: number; rx: number }> = {
  bumperF: { x: 32, y: 14, w: 176, h: 26, rx: 13 },
  fenderFL: { x: 20, y: 46, w: 44, h: 80, rx: 12 },
  bonnet: { x: 70, y: 46, w: 100, h: 80, rx: 12 },
  fenderFR: { x: 176, y: 46, w: 44, h: 80, rx: 12 },
  pillarL: { x: 20, y: 132, w: 44, h: 50, rx: 10 },
  glassF: { x: 70, y: 132, w: 100, h: 50, rx: 14 },
  pillarR: { x: 176, y: 132, w: 44, h: 50, rx: 10 },
  doorFL: { x: 20, y: 188, w: 44, h: 76, rx: 10 },
  roof: { x: 70, y: 188, w: 100, h: 158, rx: 16 },
  doorFR: { x: 176, y: 188, w: 44, h: 76, rx: 10 },
  doorRL: { x: 20, y: 270, w: 44, h: 76, rx: 10 },
  doorRR: { x: 176, y: 270, w: 44, h: 76, rx: 10 },
  quarterRL: { x: 20, y: 352, w: 44, h: 100, rx: 12 },
  glassR: { x: 70, y: 352, w: 100, h: 50, rx: 14 },
  quarterRR: { x: 176, y: 352, w: 44, h: 100, rx: 12 },
  trunk: { x: 70, y: 408, w: 100, h: 44, rx: 12 },
  bumperR: { x: 32, y: 458, w: 176, h: 26, rx: 13 },
}

export function DamageMap({
  value,
  onChange,
  readOnly,
  compact,
}: {
  value: Record<string, PartState>
  onChange?: (v: Record<string, PartState>) => void
  readOnly?: boolean
  compact?: boolean
}) {
  const [sel, setSel] = useState<string | null>(null)
  const v = value || {}
  const part = BODY_PARTS.find((p) => p.key === sel)

  const set = (key: string, s: PartState | null) => {
    const next = { ...v }
    if (!s || s === 'original') delete next[key]
    else next[key] = s
    onChange?.(next)
    setSel(null)
  }

  const fillOf = (key: string) => {
    const s = v[key]
    return s ? PART_STATES[s].hex : 'rgb(var(--c-surface2))'
  }
  const strokeOf = (key: string) => {
    const s = v[key]
    return s ? PART_STATES[s].hex : 'rgb(var(--c-line))'
  }

  const issues = BODY_PARTS.filter((p) => v[p.key])

  return (
    <div className={compact ? '' : 'grid lg:grid-cols-[auto_1fr] gap-6 items-start'}>
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 240 500" className={compact ? 'w-[150px]' : 'w-[220px] max-w-full'} aria-label="نەخشەی جەستەی ئۆتۆمبێل">
          {/* سێبەری ناو */}
          <rect x="14" y="8" width="212" height="482" rx="60" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-line))" strokeWidth="1.5" />
          {Object.entries(GEO).map(([key, g]) => {
            const active = !!v[key]
            return (
              <g key={key}>
                <rect
                  x={g.x}
                  y={g.y}
                  width={g.w}
                  height={g.h}
                  rx={g.rx}
                  fill={fillOf(key)}
                  fillOpacity={active ? 0.85 : 1}
                  stroke={strokeOf(key)}
                  strokeWidth={active ? 2 : 1.2}
                  className={readOnly ? '' : 'cursor-pointer transition-[fill-opacity,stroke-width] hover:fill-opacity-100'}
                  onClick={() => !readOnly && setSel(key)}
                />
                {active && (
                  <text
                    x={g.x + g.w / 2}
                    y={g.y + g.h / 2 + 4}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill="#0b0f14"
                    pointerEvents="none"
                  >
                    {PART_STATE_KEYS.indexOf(v[key]) + 1}
                  </text>
                )}
              </g>
            )
          })}
          {/* ئاراستە */}
          <text x="120" y="504" textAnchor="middle" fontSize="11" fill="rgb(var(--c-muted))">
            دواوە
          </text>
          <text x="120" y="8" textAnchor="middle" fontSize="11" fill="rgb(var(--c-muted))">
            پێشەوە
          </text>
        </svg>
        {!readOnly && (
          <div className="flex gap-2 mt-3">
            <button type="button" className="btn-ghost !py-1.5 !px-3 !text-[13px]" onClick={() => onChange?.({})}>
              <CheckCircle2 size={14} /> هەمووی ئۆرجینال
            </button>
          </div>
        )}
      </div>

      <div className={compact ? 'mt-4' : ''}>
        {/* پێناسەی ڕەنگەکان */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PART_STATE_KEYS.map((k, i) => (
            <span key={k} className="chip" style={{ borderColor: PART_STATES[k].hex + '66', color: PART_STATES[k].hex, background: PART_STATES[k].hex + '18' }}>
              <span className="w-4 h-4 rounded-full grid place-items-center text-[10px] font-bold text-[#0b0f14]" style={{ background: PART_STATES[k].hex }}>
                {i + 1}
              </span>
              {PART_STATES[k].short}
            </span>
          ))}
        </div>

        {issues.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-ok bg-ok/10 border border-ok/25 rounded-xl px-3.5 py-3">
            <CheckCircle2 size={17} /> هەموو پارچەکان ئۆرجینال و سەلیمن
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[13px] text-muted mb-2">
              <span className="num font-bold text-ink">{issues.length}</span> پارچە تێبینی لەسەرە:
            </p>
            {issues.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2 bg-surface2 border border-line rounded-xl px-3 py-2">
                <span className="text-sm">{p.ku}</span>
                <span className="chip" style={{ borderColor: PART_STATES[v[p.key]].hex + '66', color: PART_STATES[v[p.key]].hex, background: PART_STATES[v[p.key]].hex + '18' }}>
                  {PART_STATES[v[p.key]].ku}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={part?.ku}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => set(sel!, null)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-line bg-surface2 hover:border-ok/50 text-start"
          >
            <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: PART_STATES.original.hex + '22', color: PART_STATES.original.hex }}>
              <CheckCircle2 size={18} />
            </span>
            <span className="font-medium">ئۆرجینال / سەلیم</span>
          </button>
          {PART_STATE_KEYS.filter((k) => k !== 'original').map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => set(sel!, k)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-line bg-surface2 hover:border-brand/50 text-start"
              style={v[sel!] === k ? { borderColor: PART_STATES[k].hex, background: PART_STATES[k].hex + '15' } : {}}
            >
              <span className="w-8 h-8 rounded-lg shrink-0" style={{ background: PART_STATES[k].hex }} />
              <span className="font-medium">{PART_STATES[k].ku}</span>
            </button>
          ))}
          {v[sel!] && (
            <button type="button" onClick={() => set(sel!, null)} className="btn-quiet w-full mt-1">
              <RotateCcw size={15} /> سڕینەوەی تێبینی
            </button>
          )}
        </div>
      </Sheet>
    </div>
  )
}

/** پوختەیەکی بچووک بۆ لیستەکان */
export function BodySummary({ body }: { body: Record<string, PartState> }) {
  const n = Object.keys(body || {}).length
  if (!n) return <span className="chip bg-ok/12 text-ok border-ok/30">بێ بۆیاغ</span>
  const painted = Object.values(body).filter((s) => s === 'painted' || s === 'putty').length
  const hit = Object.values(body).filter((s) => s === 'dented' || s === 'replaced').length
  return (
    <span className="flex gap-1.5 flex-wrap">
      {painted > 0 && (
        <span className="chip bg-warn/12 text-warn border-warn/30">
          <span className="num">{painted}</span> بۆیاغ
        </span>
      )}
      {hit > 0 && (
        <span className="chip bg-bad/12 text-bad border-bad/30">
          <span className="num">{hit}</span> ناوگرتن
        </span>
      )}
      {!painted && !hit && (
        <span className="chip bg-info/12 text-info border-info/30">
          <span className="num">{n}</span> تێبینی
        </span>
      )}
    </span>
  )
}
