import React, { useEffect, useRef, useState } from 'react'
import { X, Search, ChevronDown, Check, AlertTriangle } from 'lucide-react'

/* ---------------- Sheet / Modal ---------------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', k)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex sm:items-center items-end justify-center no-print">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'} max-h-[92vh] flex flex-col
        bg-surface border border-line sm:rounded-2xl rounded-t-3xl shadow-pop animate-sheet sm:animate-in`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line shrink-0">
          <h3 className="font-bold text-[17px]">{title}</h3>
          <button onClick={onClose} className="p-2 -m-2 text-muted hover:text-ink rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 grow">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line shrink-0 flex gap-2 justify-end safe-b">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------------- Confirm ---------------- */
export function useConfirm() {
  const [state, setState] = useState<{ msg: string; resolve: (v: boolean) => void } | null>(null)
  const ask = (msg: string) => new Promise<boolean>((resolve) => setState({ msg, resolve }))
  const node = (
    <Sheet
      open={!!state}
      onClose={() => {
        state?.resolve(false)
        setState(null)
      }}
      title="دڵنیایت؟"
      footer={
        <>
          <button
            className="btn-ghost"
            onClick={() => {
              state?.resolve(false)
              setState(null)
            }}
          >
            نەخێر
          </button>
          <button
            className="btn-bad"
            onClick={() => {
              state?.resolve(true)
              setState(null)
            }}
          >
            بەڵێ، بیکە
          </button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        <AlertTriangle className="text-warn shrink-0 mt-0.5" size={20} />
        <p className="text-[15px] leading-7 text-ink/90">{state?.msg}</p>
      </div>
    </Sheet>
  )
  return { ask, node }
}

/* ---------------- Field wrapper ---------------- */
export function Field({
  label,
  children,
  hint,
  error,
  className = '',
}: {
  label?: string
  children: React.ReactNode
  hint?: string
  error?: string
  className?: string
}) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {error ? <p className="text-xs text-bad mt-1.5">{error}</p> : hint ? <p className="text-xs text-muted mt-1.5">{hint}</p> : null}
    </div>
  )
}

/* ---------------- Searchable Select ---------------- */
export function Picker({
  value,
  onChange,
  options,
  placeholder = 'هەڵبژێرە',
  allowCustom,
  renderOption,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  allowCustom?: boolean
  renderOption?: (o: string) => React.ReactNode
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen(!open)
          setQ('')
        }}
        className={`field flex items-center justify-between text-start ${disabled ? 'opacity-50' : ''}`}
      >
        <span className={value ? '' : 'text-muted/70'}>{value || placeholder}</span>
        <ChevronDown size={17} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 w-full bg-surface border border-line rounded-xl shadow-pop overflow-hidden animate-in">
          <div className="p-2 border-b border-line">
            <div className="relative">
              <Search size={15} className="absolute top-1/2 -translate-y-1/2 start-2.5 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="بگەڕێ..."
                className="field field-sm ps-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  onChange(o)
                  setOpen(false)
                }}
                className="w-full text-start px-3.5 py-2.5 text-[15px] hover:bg-surface2 flex items-center justify-between gap-2"
              >
                {renderOption ? renderOption(o) : o}
                {value === o && <Check size={16} className="text-brand" />}
              </button>
            ))}
            {allowCustom && q && !filtered.includes(q) && (
              <button
                type="button"
                onClick={() => {
                  onChange(q)
                  setOpen(false)
                }}
                className="w-full text-start px-3.5 py-2.5 text-[15px] text-brand hover:bg-surface2"
              >
                زیادکردنی «{q}»
              </button>
            )}
            {!filtered.length && !allowCustom && <p className="px-3.5 py-4 text-sm text-muted text-center">هیچ نەدۆزرایەوە</p>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { v: T; label: React.ReactNode }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex bg-surface2 border border-line rounded-xl p-1 gap-1 w-full">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-lg font-medium transition whitespace-nowrap ${
            size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm'
          } ${value === o.v ? 'bg-brand text-brandInk' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Stat card ---------------- */
export function Stat({
  label,
  value,
  sub,
  tone = 'ink',
  icon,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'ink' | 'ok' | 'bad' | 'brand' | 'info'
  icon?: React.ReactNode
}) {
  const c = { ink: 'text-ink', ok: 'text-ok', bad: 'text-bad', brand: 'text-brand', info: 'text-info' }[tone]
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13px] text-muted font-medium">{label}</span>
        {icon && <span className="text-muted/70">{icon}</span>}
      </div>
      <div className={`text-[22px] font-bold leading-tight ${c}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1.5">{sub}</div>}
    </div>
  )
}

/* ---------------- Empty ---------------- */
export function Empty({ icon, title, sub, action }: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-surface2 border border-line grid place-items-center text-muted mb-4">{icon}</div>
      <h3 className="font-bold text-ink mb-1.5">{title}</h3>
      {sub && <p className="text-sm text-muted max-w-xs leading-6">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ---------------- Search bar ---------------- */
export function SearchBar({ value, onChange, placeholder = 'بگەڕێ...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={17} className="absolute top-1/2 -translate-y-1/2 start-3 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field ps-10" />
      {value && (
        <button onClick={() => onChange('')} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted hover:text-ink">
          <X size={16} />
        </button>
      )}
    </div>
  )
}

/* ---------------- Number input with formatting ---------------- */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
  className?: string
}) {
  const [txt, setTxt] = useState(value ? value.toLocaleString('en-US') : '')
  useEffect(() => {
    const cur = Number(txt.replace(/,/g, '')) || 0
    if (cur !== value) setTxt(value ? value.toLocaleString('en-US') : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      inputMode="decimal"
      dir="ltr"
      className={`field text-start num ${className}`}
      placeholder={placeholder}
      value={txt}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '')
        const n = Number(raw) || 0
        setTxt(raw === '' ? '' : Number(raw).toLocaleString('en-US', { maximumFractionDigits: 2 }))
        onChange(n)
      }}
    />
  )
}

/* ---------------- Toasts ---------------- */
export function Toasts({ items, onDrop }: { items: { id: string; msg: string; kind: string }[]; onDrop: (id: string) => void }) {
  return (
    <div className="fixed z-[60] bottom-24 sm:bottom-6 start-1/2 -translate-x-1/2 sm:translate-x-0 sm:start-6 flex flex-col gap-2 no-print pointer-events-none">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onDrop(t.id)}
          className={`pointer-events-auto animate-in px-4 py-3 rounded-xl shadow-pop text-sm font-medium border backdrop-blur
          ${t.kind === 'bad' ? 'bg-bad/90 text-white border-bad' : t.kind === 'info' ? 'bg-info/90 text-white border-info' : 'bg-ok/90 text-white border-ok'}`}
        >
          {t.msg}
        </button>
      ))}
    </div>
  )
}
