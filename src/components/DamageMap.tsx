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
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface2/70 p-2.5">
        {PART_STATE_KEYS.map((k, i) => (
          <span key={k} className="chip" style={{ borderColor: PART_STATES[k].hex + '66', color: PART_STATES[k].hex, background: PART_STATES[k].hex + '18' }}>
            <span className="w-4 h-4 rounded-full grid place-items-center text-[10px] font-bold text-[#0b0f14]" style={{ background: PART_STATES[k].hex }}>
              {i + 1}
            </span>
            {PART_STATES[k].short}
          </span>
        ))}
        {!readOnly && <span className="text-[12px] text-muted me-auto">لەسەر پارچەکە کلیک بکە</span>}
      </div>

      <div className={compact ? 'space-y-4' : 'grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start'}>
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[220px] rounded-[28px] border border-line bg-gradient-to-b from-surface2 to-surface p-2.5 shadow-sm">
            <svg viewBox="0 0 240 500" className="w-full" aria-label="نەخشەی جەستەی ئۆتۆمبێل">
              {/* شێوەی سەرەوەی ئۆتۆمبێل */}
              <path d="M78 8h84c28 0 49 18 55 47l11 120v150l-11 120c-6 28-27 47-55 47H78c-28 0-49-19-55-47L12 325V175L23 55C29 26 50 8 78 8Z" fill="rgb(var(--c-surface))" stroke="rgb(var(--c-line))" strokeWidth="1.6" />
              <rect x="5" y="105" width="12" height="62" rx="6" fill="rgb(var(--c-ink))" opacity=".35" />
              <rect x="223" y="105" width="12" height="62" rx="6" fill="rgb(var(--c-ink))" opacity=".35" />
              <rect x="5" y="332" width="12" height="62" rx="6" fill="rgb(var(--c-ink))" opacity=".35" />
              <rect x="223" y="332" width="12" height="62" rx="6" fill="rgb(var(--c-ink))" opacity=".35" />
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
                      fillOpacity={active ? 0.9 : 1}
                      stroke={strokeOf(key)}
                      strokeWidth={active ? 2.2 : 1.2}
                      className={readOnly ? '' : 'cursor-pointer transition-[fill-opacity,stroke-width] hover:fill-opacity-100'}
                      onClick={() => !readOnly && setSel(key)}
                    />
                    {active && (
                      <text
                        x={g.x + g.w / 2}
                        y={g.y + g.h / 2 + 4}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight="800"
                        fill="#0b0f14"
                        pointerEvents="none"
                      >
                        {PART_STATE_KEYS.indexOf(v[key]) + 1}
                      </text>
                    )}
                  </g>
                )
              })}
              <path d="M113 22h14" stroke="rgb(var(--c-muted))" strokeWidth="2" strokeLinecap="round" opacity=".7" />
              <path d="M113 478h14" stroke="rgb(var(--c-muted))" strokeWidth="2" strokeLinecap="round" opacity=".7" />
            </svg>
          </div>
          <div className="mt-2 flex w-full max-w-[220px] justify-between px-2 text-[11px] text-muted">
            <span>پێشەوە</span><span>دواوە</span>
          </div>
          {!readOnly && (
            <button type="button" className="btn-ghost mt-2.5 !py-1.5 !px-3 !text-[13px]" onClick={() => onChange?.({})}>
              <CheckCircle2 size={14} /> هەمووی ئۆرجینال
            </button>
          )}
        </div>

        <div className={compact ? '' : 'min-w-0'}>
          {issues.length === 0 ? (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-ok/25 bg-ok/10 px-3.5 py-2.5 text-sm text-ok">
              <CheckCircle2 size={17} /> هەموو پارچەکان ئۆرجینال و سەلیمن
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-warn/25 bg-warn/10 px-3.5 py-2.5 text-sm text-ink">
              <span className="grid h-6 min-w-6 place-items-center rounded-lg bg-warn/20 text-[12px] font-bold num">{issues.length}</span>
              پارچە تێبینی لەسەرە
            </div>
          )}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {BODY_PARTS.map((p) => {
              const state = v[p.key]
              const detail = state ? PART_STATES[state] : PART_STATES.original
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={readOnly}
                  onClick={() => !readOnly && setSel(p.key)}
                  className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-start transition ${
                    state ? 'bg-surface border-line' : 'bg-surface2/55 border-line/70'
                  } ${readOnly ? 'cursor-default' : 'hover:border-brand/50 hover:bg-surface'}`}
                  style={state ? { borderColor: detail.hex + '88' } : undefined}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: detail.hex }} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{p.ku}</span>
                  <span className="shrink-0 text-[11px]" style={{ color: detail.hex }}>{detail.short}</span>
                </button>
              )
            })}
          </div>
        </div>
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
