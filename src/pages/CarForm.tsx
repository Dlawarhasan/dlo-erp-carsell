import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ScanLine, Save, Loader2, AlertTriangle, Car as CarIcon, Palette, Gauge, Wallet, Camera, Wrench } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Field, Picker, Segmented, MoneyInput } from '../components/ui'
import { DamageMap } from '../components/DamageMap'
import { PhotoUploader } from '../components/PhotoUploader'
import { VinScanner } from '../components/VinScanner'
import { BRANDS, BRAND_LIST, COLORS, BODY_TYPES, FUELS, TRANSMISSIONS, CYLINDERS, DRIVES, ORIGINS, CAR_STATUS } from '../lib/catalog'
import type { Car, Currency, PartState, Photo } from '../lib/types'
import { cleanVin, todayISO, uid, VIN_RE, vinChecksumOk, vinYear } from '../lib/format'

const YEARS = Array.from({ length: 42 }, (_, i) => String(new Date().getFullYear() + 1 - i))

const empty = (): Car => ({
  id: uid('car'),
  vin: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  bodyType: '',
  fuel: 'بەنزین',
  transmission: 'ئۆتۆماتیک',
  km: 0,
  status: 'available',
  ownership: 'owned',
  buyPrice: 0,
  buyCurrency: 'USD',
  buyDate: todayISO(),
  askPrice: 0,
  askCurrency: 'USD',
  photos: [],
  body: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

function Section({ icon, title, children, sub }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-lg bg-brand/15 text-brand grid place-items-center shrink-0">{icon}</span>
        <div>
          <h2 className="font-bold text-[15px]">{title}</h2>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export default function CarForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const loc = useLocation()
  const preVin = (loc.state as { vin?: string } | null)?.vin || ''
  const { cars, partners, save, log, say, user, settings } = useApp()
  const editing = cars.find((c) => c.id === id)
  const [c, setC] = useState<Car>(() => (editing ? { ...empty(), ...editing } : { ...empty(), vin: cleanVin(preVin).slice(0, 17), year: vinYear(preVin) || new Date().getFullYear() }))
  const [scan, setScan] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dup, setDup] = useState<Car | null>(null)

  const set = <K extends keyof Car>(k: K, v: Car[K]) => setC((p) => ({ ...p, [k]: v }))

  const models = useMemo(() => BRANDS[c.brand] || [], [c.brand])
  const vinOk = VIN_RE.test(c.vin)
  const vinWarn = vinOk && !vinChecksumOk(c.vin)
  const guessedYear = vinOk ? vinYear(c.vin) : null

  const onVin = (raw: string) => {
    const v = cleanVin(raw).slice(0, 17)
    set('vin', v)
    if (v.length === 17) {
      const other = cars.find((x) => x.vin === v && x.id !== c.id)
      setDup(other || null)
      const y = vinYear(v)
      if (y && !editing) set('year', y)
    } else setDup(null)
  }

  const valid = vinOk && c.brand && c.model && c.color && !dup

  const submit = async () => {
    if (!valid) {
      say('تکایە خانە پێویستەکان پڕبکەرەوە', 'bad')
      return
    }
    setBusy(true)
    try {
      const now = Date.now()
      const car: Car = { ...c, vin: cleanVin(c.vin), updatedAt: now, createdBy: c.createdBy || user?.uid }
      await save('cars', car)
      // تۆمارکردنی کڕین لە سندوق (تەنها بۆ ئۆتۆمبێلی نوێ)
      if (!editing && car.buyPrice > 0 && car.ownership === 'owned') {
        await save('txs', {
          id: uid('tx'),
          date: car.buyDate || todayISO(),
          kind: 'out',
          amount: car.buyPrice,
          currency: car.buyCurrency,
          rate: settings.usdRate,
          account: 'cash',
          category: 'car_buy',
          title: `کڕینی ${car.brand} ${car.model} ${car.year}`,
          carId: car.id,
          note: car.sellerName ? `لە ${car.sellerName}` : '',
          createdAt: now,
          createdBy: user?.uid,
        })
      }
      await log(editing ? 'دەستکاری ئۆتۆمبێل' : 'تۆمارکردنی ئۆتۆمبێل', 'cars', car.id, `${car.brand} ${car.model} — ${car.vin}`)
      say(editing ? 'زانیارییەکان نوێکرانەوە' : 'ئۆتۆمبێلەکە تۆمارکرا')
      nav(`/cars/${car.id}`, { replace: true })
    } catch (e) {
      console.error(e)
      say('هەڵەیەک ڕوویدا لە خەزنکردن', 'bad')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHead
        title={editing ? 'دەستکاری ئۆتۆمبێل' : 'تۆمارکردنی ئۆتۆمبێلی نوێ'}
        sub={editing ? `${editing.brand} ${editing.model}` : 'زانیارییەکان بە تەواوی پڕبکەرەوە'}
        back={() => nav(-1)}
        action={
          <button onClick={submit} disabled={!valid || busy} className="btn-brand shrink-0">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            <span className="hidden sm:inline">خەزنکردن</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* ---------- ناسنامە ---------- */}
        <Section icon={<CarIcon size={17} />} title="ناسنامەی ئۆتۆمبێل" sub="ژمارەی شانس (VIN) و مۆدێل">
          <div className="space-y-4">
            <Field
              label="ژمارەی شانس — VIN"
              error={dup ? 'ئەم VIN پێشتر تۆمارکراوە!' : c.vin && !vinOk ? 'دەبێت ١٧ پیت بێت (بێ I, O, Q)' : ''}
              hint={vinWarn ? 'ئاگاداری: پشکنینی ناوەکی VIN نەگونجا — زۆرجار ئاساییە بۆ ئۆتۆمبێلی ئەوروپی/یابانی' : guessedYear ? `ساڵی خەمڵێنراو لە VIN: ${guessedYear}` : ''}
            >
              <div className="flex gap-2">
                <input
                  dir="ltr"
                  value={c.vin}
                  onChange={(e) => onVin(e.target.value)}
                  placeholder="1HGCM82633A004352"
                  className={`field num tracking-[0.12em] text-center !text-[17px] ${dup ? '!border-bad' : vinOk ? '!border-ok/60' : ''}`}
                />
                <button type="button" onClick={() => setScan(true)} className="btn-brand shrink-0 !px-4" title="سکان بە کامێرا">
                  <ScanLine size={19} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-xs num ${vinOk ? 'text-ok' : 'text-muted'}`}>{c.vin.length}/17</span>
                {dup && (
                  <button onClick={() => nav(`/cars/${dup.id}`)} className="text-xs text-brand flex items-center gap-1">
                    <AlertTriangle size={13} /> بینینی ئۆتۆمبێلە تۆمارکراوەکە
                  </button>
                )}
              </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="براند *">
                <Picker value={c.brand} onChange={(v) => setC((p) => ({ ...p, brand: v, model: '' }))} options={BRAND_LIST} placeholder="براند هەڵبژێرە" />
              </Field>
              <Field label="مۆدێل *">
                <Picker value={c.model} onChange={(v) => set('model', v)} options={models} placeholder={c.brand ? 'مۆدێل هەڵبژێرە' : 'سەرەتا براند هەڵبژێرە'} allowCustom disabled={!c.brand} />
              </Field>
              <Field label="ساڵی بەرهەمهێنان">
                <Picker value={String(c.year)} onChange={(v) => set('year', Number(v))} options={YEARS} />
              </Field>
              <Field label="جۆر / تریم" hint="نموونە: GLE، Limited، Sport">
                <input value={c.trim || ''} onChange={(e) => set('trim', e.target.value)} className="field" placeholder="ئارەزوومەندانە" />
              </Field>
            </div>
          </div>
        </Section>

        {/* ---------- ڕەنگ و شێواز ---------- */}
        <Section icon={<Palette size={17} />} title="ڕەنگ و شێواز">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="ڕەنگ *">
              <Picker
                value={c.color}
                onChange={(v) => set('color', v)}
                options={COLORS.map((x) => x.ku)}
                placeholder="ڕەنگ هەڵبژێرە"
                renderOption={(o) => (
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full border border-line shrink-0" style={{ background: COLORS.find((x) => x.ku === o)?.hex }} />
                    {o}
                  </span>
                )}
              />
            </Field>
            <Field label="شێوازی جەستە">
              <Picker value={c.bodyType} onChange={(v) => set('bodyType', v)} options={BODY_TYPES} />
            </Field>
            <Field label="جۆری سووتەمەنی">
              <Picker value={c.fuel} onChange={(v) => set('fuel', v)} options={FUELS} />
            </Field>
            <Field label="گێڕ">
              <Picker value={c.transmission} onChange={(v) => set('transmission', v)} options={TRANSMISSIONS} />
            </Field>
            <Field label="ماتۆڕ / سلندەر">
              <Picker value={c.cylinders || ''} onChange={(v) => set('cylinders', v)} options={CYLINDERS} />
            </Field>
            <Field label="جۆری کش">
              <Picker value={c.drive || ''} onChange={(v) => set('drive', v)} options={DRIVES} />
            </Field>
          </div>
        </Section>

        {/* ---------- دۆخ ---------- */}
        <Section icon={<Gauge size={17} />} title="دۆخی ئێستا">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="کیلۆمەتر" hint="بە کیلۆمەتر">
              <MoneyInput value={c.km} onChange={(n) => set('km', n)} placeholder="0" />
            </Field>
            <Field label="ڕەگەز / وارد">
              <Picker value={c.origin || ''} onChange={(v) => set('origin', v)} options={ORIGINS} />
            </Field>
            <Field label="ژمارەی پلێت">
              <input dir="ltr" value={c.plate || ''} onChange={(e) => set('plate', e.target.value)} className="field text-start num" placeholder="اربیل 12345" />
            </Field>
            <Field label="ژمارەی کلیل">
              <Picker value={c.keys ? String(c.keys) : ''} onChange={(v) => set('keys', Number(v))} options={['1', '2', '3']} />
            </Field>
            <Field label="دۆخی فرۆشتن" className="sm:col-span-2">
              <Segmented
                value={c.status}
                onChange={(v) => set('status', v)}
                options={(Object.keys(CAR_STATUS) as Car['status'][]).map((k) => ({ v: k, label: CAR_STATUS[k].ku }))}
              />
            </Field>
            <Field label="شوێن" className="sm:col-span-2" hint="نموونە: پێشانگا ١، وۆرکشۆپ، گەرەج">
              <input value={c.location || ''} onChange={(e) => set('location', e.target.value)} className="field" />
            </Field>
          </div>
        </Section>

        {/* ---------- پارە ---------- */}
        <Section icon={<Wallet size={17} />} title="کڕین و نرخ" sub="ئەم زانیارییانە تەنها بۆ خاوەن و ژمێریار دەردەکەون">
          <div className="space-y-4">
            <Field label="خاوەندارێتی">
              <Segmented
                value={c.ownership}
                onChange={(v) => set('ownership', v)}
                options={[
                  { v: 'owned', label: 'موڵکی پێشانگا' },
                  { v: 'consignment', label: 'ئەمانەت / شەریکی' },
                ]}
              />
            </Field>

            {c.ownership === 'consignment' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="شەریک / خاوەنی ئۆتۆمبێل">
                  <Picker
                    value={partners.find((p) => p.id === c.partnerId)?.name || ''}
                    onChange={(v) => set('partnerId', partners.find((p) => p.name === v)?.id)}
                    options={partners.map((p) => p.name)}
                    placeholder={partners.length ? 'شەریک هەڵبژێرە' : 'سەرەتا شەریک زیاد بکە'}
                  />
                </Field>
                <Field label="ڕێژەی شەریک (%)">
                  <MoneyInput value={c.partnerPct || 0} onChange={(n) => set('partnerPct', n)} placeholder="50" />
                </Field>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="نرخی کڕین">
                <div className="flex gap-2">
                  <MoneyInput value={c.buyPrice} onChange={(n) => set('buyPrice', n)} placeholder="0" />
                  <Segmented value={c.buyCurrency} onChange={(v: Currency) => set('buyCurrency', v)} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
                </div>
              </Field>
              <Field label="بەرواری کڕین">
                <input type="date" dir="ltr" value={c.buyDate} onChange={(e) => set('buyDate', e.target.value)} className="field num text-start" />
              </Field>
              <Field label="کڕدراوە لە (ناو)">
                <input value={c.sellerName || ''} onChange={(e) => set('sellerName', e.target.value)} className="field" />
              </Field>
              <Field label="ژمارەی تەلەفۆن">
                <input dir="ltr" value={c.sellerPhone || ''} onChange={(e) => set('sellerPhone', e.target.value)} className="field text-start num" placeholder="0750..." />
              </Field>
              <Field label="نرخی داواکراو (بۆ فرۆشتن)" className="sm:col-span-2">
                <div className="flex gap-2">
                  <MoneyInput value={c.askPrice} onChange={(n) => set('askPrice', n)} placeholder="0" />
                  <Segmented value={c.askCurrency} onChange={(v: Currency) => set('askCurrency', v)} options={[{ v: 'USD' as Currency, label: '$' }, { v: 'IQD' as Currency, label: 'د.ع' }]} size="sm" />
                </div>
              </Field>
            </div>
          </div>
        </Section>

        {/* ---------- وێنە ---------- */}
        <Section icon={<Camera size={17} />} title="وێنەکان" sub="یەکەم وێنە وەک وێنەی سەرەکی دەردەکەوێت">
          <PhotoUploader photos={c.photos} onChange={(p: Photo[]) => set('photos', p)} />
        </Section>

        {/* ---------- پارچەکان ---------- */}
        <Section icon={<Wrench size={17} />} title="دۆخی پارچەکان" sub="لەسەر هەر پارچەیەک دابگرە و دۆخەکەی دیاری بکە">
          <DamageMap value={c.body} onChange={(v: Record<string, PartState>) => set('body', v)} />
          <Field label="تێبینی لەسەر جەستە" className="mt-5">
            <textarea rows={3} value={c.bodyNote || ''} onChange={(e) => set('bodyNote', e.target.value)} className="field" placeholder="نموونە: کاپۆت بۆیاغی فەبریکە نییە، دەرگای چەپ گۆڕدراوە..." />
          </Field>
        </Section>

        <Section icon={<Wrench size={17} />} title="تێبینی گشتی">
          <textarea rows={3} value={c.note || ''} onChange={(e) => set('note', e.target.value)} className="field" placeholder="هەر زانیارییەکی تر..." />
        </Section>

        <div className="flex gap-2 pb-6">
          <button onClick={() => nav(-1)} className="btn-ghost flex-1">
            پاشگەزبوونەوە
          </button>
          <button onClick={submit} disabled={!valid || busy} className="btn-brand flex-[2]">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            {editing ? 'نوێکردنەوە' : 'تۆمارکردن'}
          </button>
        </div>
      </div>

      {scan && (
        <VinScanner
          onClose={() => setScan(false)}
          onResult={(v) => {
            setScan(false)
            onVin(v)
          }}
        />
      )}

    </>
  )
}
