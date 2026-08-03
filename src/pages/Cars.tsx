import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Car as CarIcon, SlidersHorizontal, Image as ImgIcon, Gauge, X } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { SearchBar, Empty, Picker, Segmented, Sheet } from '../components/ui'
import { BodySummary } from '../components/DamageMap'
import { CAR_STATUS, COLORS, BRAND_LIST } from '../lib/catalog'
import { fold, maskVin, money, num } from '../lib/format'
import type { Car } from '../lib/types'

export function CarCard({ car, onClick }: { car: Car; onClick: () => void }) {
  const cover = car.photos?.find((p) => p.cover) || car.photos?.[0]
  const st = CAR_STATUS[car.status]
  const hex = COLORS.find((x) => x.ku === car.color)?.hex
  return (
    <button onClick={onClick} className="card overflow-hidden text-start hover:border-brand/50 transition group">
      <div className="aspect-[16/10] bg-surface2 relative overflow-hidden">
        {cover ? (
          <img src={cover.url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.04] transition duration-500" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted/50">
            <ImgIcon size={30} />
          </div>
        )}
        <span className={`absolute top-2.5 start-2.5 chip ${st.cls} backdrop-blur bg-opacity-90`}>{st.ku}</span>
        {car.photos?.length > 1 && (
          <span className="absolute top-2.5 end-2.5 chip bg-black/55 text-white border-transparent !px-2 !py-0.5 backdrop-blur">
            <ImgIcon size={11} /> <span className="num">{car.photos.length}</span>
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold truncate">
              {car.brand} {car.model}
            </h3>
            <p className="text-[13px] text-muted"><span className="num">{car.year}</span>{car.trim ? ` · ${car.trim}` : ''}</p>
          </div>
          {hex && <span className="w-5 h-5 rounded-full border border-line shrink-0 mt-1" style={{ background: hex }} title={car.color} />}
        </div>
        <div className="flex items-center gap-3 mt-2.5 text-[12px] text-muted">
          <span className="flex items-center gap-1">
            <Gauge size={13} /> <span className="num">{num(car.km)}</span> کم
          </span>
          <span className="num truncate opacity-70" dir="ltr">{maskVin(car.vin)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-line">
          <span className="font-bold text-brand num">{car.askPrice ? money(car.askPrice, car.askCurrency) : '—'}</span>
          <BodySummary body={car.body} />
        </div>
      </div>
    </button>
  )
}

export default function Cars() {
  const nav = useNavigate()
  const { cars, can } = useApp()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | Car['status']>('all')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState<'new' | 'price' | 'km' | 'year'>('new')
  const [filters, setFilters] = useState(false)

  const list = useMemo(() => {
    const fq = fold(q)
    let out = cars.filter((c) => {
      if (status !== 'all' && c.status !== status) return false
      if (brand && c.brand !== brand) return false
      if (!fq) return true
      return (
        fold(c.brand).includes(fq) ||
        fold(c.model).includes(fq) ||
        fold(c.color).includes(fq) ||
        (c.vin || '').toLowerCase().includes(fq) ||
        (c.plate || '').toLowerCase().includes(fq) ||
        String(c.year).includes(fq)
      )
    })
    out = [...out].sort((a, b) => {
      if (sort === 'price') return (b.askPrice || 0) - (a.askPrice || 0)
      if (sort === 'km') return (a.km || 0) - (b.km || 0)
      if (sort === 'year') return (b.year || 0) - (a.year || 0)
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
    return out
  }, [cars, q, status, brand, sort])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: cars.length }
    for (const k of Object.keys(CAR_STATUS)) c[k] = cars.filter((x) => x.status === k).length
    return c
  }, [cars])

  const brandsInUse = useMemo(() => BRAND_LIST.filter((b) => cars.some((c) => c.brand === b)), [cars])

  return (
    <>
      <PageHead
        title="ئۆتۆمبێلەکان"
        sub={
          <>
            <span className="num">{list.length}</span> لە <span className="num">{cars.length}</span>
          </>
        }
        action={
          can('car.edit') ? (
            <button onClick={() => nav('/cars/new')} className="btn-brand shrink-0">
              <Plus size={18} /> <span className="hidden sm:inline">نوێ</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex gap-2">
          <div className="grow">
            <SearchBar value={q} onChange={setQ} placeholder="بگەڕێ بە VIN، براند، مۆدێل، پلێت..." />
          </div>
          <button onClick={() => setFilters(true)} className={`btn-ghost shrink-0 ${brand || sort !== 'new' ? '!border-brand !text-brand' : ''}`}>
            <SlidersHorizontal size={17} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
          {[{ k: 'all', ku: 'هەموو' }, ...Object.entries(CAR_STATUS).map(([k, v]) => ({ k, ku: v.ku }))].map((t) => (
            <button key={t.k} onClick={() => setStatus(t.k as any)} className={`tab ${status === t.k ? 'tab-on' : 'bg-surface2 border border-line'}`}>
              {t.ku} <span className="num opacity-60">{counts[t.k] ?? 0}</span>
            </button>
          ))}
        </div>

        {brand && (
          <button onClick={() => setBrand('')} className="chip bg-brand/15 text-brand border-brand/30">
            {brand} <X size={12} />
          </button>
        )}

        {list.length === 0 ? (
          <Empty
            icon={<CarIcon size={26} />}
            title={cars.length ? 'هیچ ئۆتۆمبێلێک نەدۆزرایەوە' : 'هێشتا هیچ ئۆتۆمبێلێک تۆمار نەکراوە'}
            sub={cars.length ? 'گەڕانەکەت یان فلتەرەکان بگۆڕە' : 'یەکەم ئۆتۆمبێل تۆمار بکە بۆ دەستپێکردن'}
            action={
              can('car.edit') && !cars.length ? (
                <button onClick={() => nav('/cars/new')} className="btn-brand">
                  <Plus size={17} /> تۆمارکردنی ئۆتۆمبێل
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
            {list.map((c) => (
              <CarCard key={c.id} car={c} onClick={() => nav(`/cars/${c.id}`)} />
            ))}
          </div>
        )}
      </div>

      <Sheet open={filters} onClose={() => setFilters(false)} title="فلتەر و ڕیزکردن">
        <div className="space-y-5">
          <div>
            <label className="label">ڕیزکردن بەپێی</label>
            <Segmented
              value={sort}
              onChange={setSort}
              options={[
                { v: 'new' as const, label: 'نوێترین' },
                { v: 'price' as const, label: 'نرخ' },
                { v: 'km' as const, label: 'کیلۆمەتر' },
                { v: 'year' as const, label: 'ساڵ' },
              ]}
              size="sm"
            />
          </div>
          <div>
            <label className="label">براند</label>
            <Picker value={brand} onChange={setBrand} options={['', ...brandsInUse]} placeholder="هەموو براندەکان" />
          </div>
          <button
            onClick={() => {
              setBrand('')
              setSort('new')
              setStatus('all')
            }}
            className="btn-ghost w-full"
          >
            سڕینەوەی فلتەرەکان
          </button>
        </div>
      </Sheet>
    </>
  )
}
