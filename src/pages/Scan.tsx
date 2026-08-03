import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, Plus, Search, CircleAlert, Handshake, Eye } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { VinScanner } from '../components/VinScanner'
import { CarCard } from './Cars'
import { cleanVin, maskVin, VIN_RE } from '../lib/format'
import type { Car } from '../lib/types'

export default function Scan() {
  const nav = useNavigate()
  const { cars, can } = useApp()
  const [open, setOpen] = useState(true)
  const [vin, setVin] = useState('')
  const [found, setFound] = useState<Car | null>(null)
  const [searched, setSearched] = useState(false)

  const lookup = (v: string) => {
    const clean = cleanVin(v)
    setVin(clean)
    setSearched(true)
    const car = cars.find((c) => cleanVin(c.vin) === clean)
    setFound(car || null)
    if (car) {
      try {
        navigator.vibrate?.([40, 60, 40])
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <>
      <PageHead title="سکانی VIN" sub="بارکۆدی ژمارەی شانس سکان بکە" back={() => nav(-1)} />

      <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-4">
        <button onClick={() => setOpen(true)} className="w-full card p-8 flex flex-col items-center gap-3 hover:border-brand/60 transition group">
          <span className="w-20 h-20 rounded-3xl bg-brand/15 text-brand grid place-items-center group-hover:scale-105 transition">
            <ScanLine size={38} />
          </span>
          <span className="font-bold text-lg">کردنەوەی کامێرا</span>
          <span className="text-sm text-muted text-center leading-6">
            بارکۆدی VIN لەسەر دەرگا، شووشەی پێشەوە یان ناو ماتۆڕ هەیە.
            <br />
            دەتوانیت نووسینەکەش بخوێنیتەوە.
          </span>
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px bg-line grow" />
          <span className="text-xs text-muted">یان</span>
          <span className="h-px bg-line grow" />
        </div>

        <div>
          <label className="label">VIN بەدەست بنووسە</label>
          <div className="flex gap-2">
            <input
              dir="ltr"
              value={vin}
              onChange={(e) => {
                setVin(cleanVin(e.target.value).slice(0, 17))
                setSearched(false)
              }}
              placeholder="1HGCM82633A004352"
              className="field num tracking-[0.12em] text-center"
            />
            <button onClick={() => lookup(vin)} disabled={!VIN_RE.test(vin)} className="btn-brand shrink-0 !px-4">
              <Search size={18} />
            </button>
          </div>
          <span className={`text-xs num mt-1.5 inline-block ${vin.length === 17 ? 'text-ok' : 'text-muted'}`}>{vin.length}/17</span>
        </div>

        {searched && found && (
          <div className="space-y-3 animate-in">
            <p className="text-sm text-ok flex items-center gap-2 bg-ok/10 border border-ok/25 rounded-xl px-3.5 py-2.5">
              ئۆتۆمبێلەکە دۆزرایەوە
            </p>
            <CarCard car={found} onClick={() => nav(`/cars/${found.id}`)} />
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => nav(`/cars/${found.id}`)} className="btn-ghost">
                <Eye size={17} /> بینینی تەواو
              </button>
              {found.status !== 'sold' && can('contract.create') && (
                <button onClick={() => nav(`/sell/${found.id}`)} className="btn-brand">
                  <Handshake size={17} /> فرۆشتن
                </button>
              )}
            </div>
          </div>
        )}

        {searched && !found && (
          <div className="card p-6 flex flex-col items-center text-center gap-3 animate-in">
            <span className="w-14 h-14 rounded-2xl bg-warn/15 text-warn grid place-items-center">
              <CircleAlert size={26} />
            </span>
            <div>
              <p className="font-bold">ئەم ئۆتۆمبێلە تۆمار نەکراوە</p>
              <p className="text-sm text-muted num mt-1" dir="ltr">
                {maskVin(vin)}
              </p>
            </div>
            {can('car.edit') && (
              <button onClick={() => nav('/cars/new', { state: { vin } })} className="btn-brand w-full">
                <Plus size={17} /> تۆمارکردنی ئێستا
              </button>
            )}
          </div>
        )}
      </div>

      {open && (
        <VinScanner
          onClose={() => setOpen(false)}
          onResult={(v) => {
            setOpen(false)
            lookup(v)
          }}
        />
      )}
    </>
  )
}
