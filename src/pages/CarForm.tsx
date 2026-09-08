import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ScanLine, Save, Loader2, AlertTriangle, Car as CarIcon, Palette, Gauge, Wallet, Camera, Wrench, Sparkles, WifiOff, Check, UserPlus, Handshake } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Field, Picker, Segmented, MoneyInput, Sheet } from '../components/ui'
import { OptionPicker } from '../components/OptionPicker'
import { DamageMap } from '../components/DamageMap'
import { PhotoUploader } from '../components/PhotoUploader'
import { VinScanner } from '../components/VinScanner'
import { BRANDS, BRAND_LIST, COLORS, BODY_TYPES, FUELS, TRANSMISSIONS, CYLINDERS, DRIVES, ORIGINS, CAR_STATUS } from '../lib/catalog'
import type { Car, Currency, PartState, Photo } from '../lib/types'
import { cleanVin, kmToMiles, milesToKm, money, todayISO, uid, VIN_RE, vinChecksumOk, vinYear } from '../lib/format'
import { partnerFunded, partnerPctOf } from '../lib/partners'
import { decodeVin, type VinInfo } from '../lib/vin'
import { fx } from '../lib/feedback'

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
  const { cars, partners, txs, save, log, say, user, settings, can } = useApp()
  const editing = cars.find((c) => c.id === id)
  const [c, setC] = useState<Car>(() => (editing ? { ...empty(), ...editing } : { ...empty(), vin: cleanVin(preVin).slice(0, 17), year: vinYear(preVin) || new Date().getFullYear() }))
  const [scan, setScan] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dup, setDup] = useState<Car | null>(null)
  const [lookup, setLookup] = useState(false)
  const [found, setFound] = useState<VinInfo | null>(null)
  /* کێ پشکی شەریکی لە نرخی کڕیندا داوە */
  const [fund, setFund] = useState<'partner' | 'showroom' | 'partial'>('partner')
  const [partnerPart, setPartnerPart] = useState(0)
  const [newPartner, setNewPartner] = useState<{ name: string; phone: string } | null>(null)

  const set = <K extends keyof Car>(k: K, v: Car[K]) => setC((p) => ({ ...p, [k]: v }))

  const models = useMemo(() => BRANDS[c.brand] || [], [c.brand])

  /* ئەوانەی پێشتر بەکارهاتوون لە سەیارەکانی خۆتدا — خۆکارانە دەردەکەون */
  const used = useMemo(() => {
    const pull = (f: (x: Car) => string | undefined) => cars.map(f).filter(Boolean) as string[]
    return {
      brands: pull((x) => x.brand),
      models: cars.filter((x) => x.brand === c.brand).map((x) => x.model).filter(Boolean),
      colors: pull((x) => x.color),
      bodyTypes: pull((x) => x.bodyType),
      fuels: pull((x) => x.fuel),
      gears: pull((x) => x.transmission),
      cylinders: pull((x) => x.cylinders),
      drives: pull((x) => x.drive),
      origins: pull((x) => x.origin),
    }
  }, [cars, c.brand])
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
    setFound(null)
  }

  /** زانیاری لە VIN دەهێنێت و خانە بەتاڵەکان پڕ دەکاتەوە — هیچ شتێکی نووسراو ناگۆڕێت */
  const fetchVin = async () => {
    if (!vinOk) return say('سەرەتا VINـێکی دروست بنووسە', 'bad')
    setLookup(true)
    setFound(null)
    try {
      const r = await decodeVin(c.vin)
      setFound(r)
      setC((p) => ({
        ...p,
        brand: r.brand && (!p.brand || p.brand !== r.brand) ? r.brand : p.brand,
        // ئەگەر براند گۆڕا، مۆدێلی کۆن ڕەت دەکەینەوە
        model: r.brand && p.brand && p.brand !== r.brand ? r.model || '' : r.model || p.model,
        year: r.year || p.year,
        bodyType: p.bodyType || r.bodyType || '',
        fuel: p.fuel || r.fuel || '',
        cylinders: p.cylinders || r.cylinders,
        drive: p.drive || r.drive,
        origin: p.origin || r.origin,
      }))
      if (r.brand) {
        fx('ok')
        say(r.model ? `${r.brand} ${r.model} — زانیاری هێنرا` : `${r.brand} دۆزرایەوە`)
      } else {
        say('نەتوانرا براند دیاری بکرێت — بە دەست هەڵیبژێرە', 'info')
      }
    } catch {
      say('نەتوانرا زانیاری بهێنرێت', 'bad')
    } finally {
      setLookup(false)
    }
  }

  /* ═══ حساباتی پشکی شەریک لە کاتی کڕین ═══ */
  const pct = partnerPctOf(c)
  const partner = partners.find((p) => p.id === c.partnerId)
  const shareOfBuy = Math.round((((c.buyPrice || 0) * pct) / 100) * 100) / 100
  const partnerGave = c.ownership !== 'partnership' ? 0 : fund === 'partner' ? shareOfBuy : fund === 'showroom' ? 0 : Math.min(partnerPart, shareOfBuy)
  const partnerDebt = Math.max(0, shareOfBuy - partnerGave)
  const fromCashbox = Math.max(0, (c.buyPrice || 0) - partnerGave)
  /* بۆ دەستکاری: ئەوەی پێشتر تۆمارکراوە لە جوڵەی پارەکاندا */
  const recorded = useMemo(() => {
    if (!editing || !c.partnerId) return null
    const funded = partnerFunded(txs, c.partnerId, c.id, settings.usdRate)
    return { funded, debt: Math.max(0, shareOfBuy - funded) }
  }, [editing, c.partnerId, c.id, txs, settings.usdRate, shareOfBuy])

  const valid = !!(vinOk && c.brand && c.model && c.color && !dup && (c.ownership === 'owned' || c.partnerId))

  const addPartner = async () => {
    const name = (newPartner?.name || '').trim()
    if (!name) return say('ناوی شەریک پێویستە', 'bad')
    if (partners.some((p) => p.name.trim() === name)) return say('ئەم ناوە پێشتر تۆمارکراوە', 'bad')
    const p = { id: uid('prt'), name, phone: (newPartner?.phone || '').trim() || undefined, createdAt: Date.now() }
    try {
      await save('partners', p)
      await log('زیادکردنی شەریک', 'partners', p.id, p.name)
      set('partnerId', p.id)
      setNewPartner(null)
      say('شەریک زیادکرا')
    } catch {
      say('نەتوانرا شەریک زیاد بکرێت', 'bad')
    }
  }

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
      /*
       * تۆمارکردنی کڕین لە سندوق (تەنها بۆ ئۆتۆمبێلی نوێ).
       * ئەمانەت پارەی لەسەر نادرێت، بۆیە هیچ جوڵەیەکی پارەی بۆ ناکرێت.
       * لە شەریکیدا نرخی تەواو وەک دەرچوون تۆمار دەکرێت، و ئەو بڕەی
       * شەریک خۆی داویەتی وەک هاتنە ژوورەوە — کۆی دەرچوونی سندوق
       * دەبێتە نرخی کڕین کەم پشکی شەریک.
       */
      if (!editing && car.buyPrice > 0 && car.ownership !== 'consignment') {
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
        if (car.ownership === 'partnership' && car.partnerId && partnerGave > 0) {
          await save('txs', {
            id: uid('tx'),
            date: car.buyDate || todayISO(),
            kind: 'in',
            amount: partnerGave,
            currency: car.buyCurrency,
            rate: settings.usdRate,
            account: 'cash',
            category: 'partner_in',
            title: `پشکی شەریک لە کڕینی ${car.brand} ${car.model}${partner ? ` — ${partner.name}` : ''}`,
            carId: car.id,
            partnerId: car.partnerId,
            note: `${pct}٪ لە نرخی کڕین`,
            createdAt: now + 1,
            createdBy: user?.uid,
          })
        }
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

              {/* هێنانی زانیاری لە VIN */}
              {vinOk && !dup && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={fetchVin}
                    disabled={lookup}
                    className="btn-ghost w-full !py-2 text-[13px] justify-center"
                  >
                    {lookup ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-brand" />}
                    {lookup ? 'دەگەڕێم...' : 'زانیاری بهێنە لە VIN'}
                  </button>

                  {found && (
                    <div className="mt-2 text-xs rounded-xl border border-line bg-surface2 px-3 py-2.5 space-y-1.5">
                      <p className="flex items-center gap-1.5 flex-wrap">
                        {found.brand ? (
                          <>
                            <Check size={13} className="text-ok shrink-0" />
                            <b>{found.brand}</b>
                            {found.model && <b>{found.model}</b>}
                            {found.year && <span className="num">{found.year}</span>}
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={13} className="text-warn shrink-0" />
                            نەناسرایەوە — بە دەست هەڵیبژێرە
                          </>
                        )}
                      </p>
                      {!found.online && (
                        <p className="flex items-center gap-1.5 text-muted">
                          <WifiOff size={12} className="shrink-0" />
                          بەبێ ئینتەرنێت — تەنها براند و ساڵ
                        </p>
                      )}
                      {found.missing.length > 0 && (
                        <p className="text-muted">نەدۆزرانەوە: {found.missing.join('، ')} — خۆت پڕیان بکەرەوە</p>
                      )}
                      <p className="text-muted/70">هەموو خانەکان دەگۆڕدرێن پێش پاشەکەوتکردن</p>
                    </div>
                  )}
                </div>
              )}
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="براند *">
                <OptionPicker optKey="brand" base={BRAND_LIST} fromData={used.brands} value={c.brand}
                  onChange={(v) => setC((p) => ({ ...p, brand: v, model: p.brand === v ? p.model : '' }))} placeholder="براند هەڵبژێرە یان بنووسە" />
              </Field>
              <Field label="مۆدێل *">
                <OptionPicker optKey={`model:${c.brand}`} base={models} fromData={used.models} value={c.model}
                  onChange={(v) => set('model', v)} disabled={!c.brand}
                  placeholder={c.brand ? 'مۆدێل هەڵبژێرە یان بنووسە' : 'سەرەتا براند هەڵبژێرە'} />
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
              <OptionPicker
                optKey="color"
                fromData={used.colors}
                value={c.color}
                onChange={(v) => set('color', v)}
                base={COLORS.map((x) => x.ku)}
                placeholder="ڕەنگ هەڵبژێرە یان بنووسە"
                renderOption={(o) => (
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full border border-line shrink-0" style={{ background: COLORS.find((x) => x.ku === o)?.hex }} />
                    {o}
                  </span>
                )}
              />
            </Field>
            <Field label="جۆری ئۆتۆمبێل">
              <OptionPicker optKey="bodyType" base={BODY_TYPES} fromData={used.bodyTypes} value={c.bodyType} onChange={(v) => set('bodyType', v)} />
            </Field>
            <Field label="جۆری سووتەمەنی">
              <OptionPicker optKey="fuel" base={FUELS} fromData={used.fuels} value={c.fuel} onChange={(v) => set('fuel', v)} />
            </Field>
            <Field label="گێڕ">
              <OptionPicker optKey="transmission" base={TRANSMISSIONS} fromData={used.gears} value={c.transmission} onChange={(v) => set('transmission', v)} />
            </Field>
            <Field label="ماتۆڕ / سلندەر">
              <OptionPicker optKey="cylinders" base={CYLINDERS} fromData={used.cylinders} value={c.cylinders || ''} onChange={(v) => set('cylinders', v)} />
            </Field>
            <Field label="جۆری کش">
              <OptionPicker optKey="drive" base={DRIVES} fromData={used.drives} value={c.drive || ''} onChange={(v) => set('drive', v)} />
            </Field>
          </div>
        </Section>

        {/* ---------- دۆخ ---------- */}
        <Section icon={<Gauge size={17} />} title="دۆخی ئێستا">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="ژمێرەری ڕێگا — کیلۆمەتر / مایل"
              className="sm:col-span-2"
              hint="هەردوو خانەکە پێکەوە دەگۆڕێن؛ ئەوەی لەسەر ئۆتۆمبێلەکەیە بنووسە"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <MoneyInput value={Math.round(c.km || 0)} onChange={(n) => setC((p) => ({ ...p, km: Math.round(n), odoUnit: 'km' }))} placeholder="0" />
                  <p className={`text-[11px] mt-1 text-center ${c.odoUnit === 'mi' ? 'text-muted' : 'text-brand font-medium'}`}>کیلۆمەتر (km)</p>
                </div>
                <div>
                  <MoneyInput value={Math.round(kmToMiles(c.km || 0))} onChange={(n) => setC((p) => ({ ...p, km: Math.round(milesToKm(n)), odoUnit: 'mi' }))} placeholder="0" />
                  <p className={`text-[11px] mt-1 text-center ${c.odoUnit === 'mi' ? 'text-brand font-medium' : 'text-muted'}`}>مایل (mi)</p>
                </div>
              </div>
            </Field>
            <Field label="ڕەگەز / وارد">
              <OptionPicker optKey="origin" base={ORIGINS} fromData={used.origins} value={c.origin || ''} onChange={(v) => set('origin', v)} />
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
            <Field
              label="خاوەندارێتی"
              hint={
                c.ownership === 'partnership'
                  ? 'بە سەرمایەی هاوبەش کڕدراوە — شەریک هەم لە تێچوو هەم لە قازانج بەشدارە'
                  : c.ownership === 'consignment'
                    ? 'ئەمانەت — هیچ پارەیەکی لەسەر نادرێت، تەنها ڕێژەیەک لە قازانج بۆ خاوەنەکەیە'
                    : ''
              }
            >
              <Segmented
                value={c.ownership}
                onChange={(v) =>
                  setC((p) => ({
                    ...p,
                    ownership: v,
                    partnerId: v === 'owned' ? undefined : p.partnerId,
                    partnerPct: v === 'owned' ? undefined : (p.partnerPct ?? 50),
                  }))
                }
                options={[
                  { v: 'owned', label: 'موڵکی پێشانگا' },
                  { v: 'partnership', label: 'شەریکی' },
                  { v: 'consignment', label: 'ئەمانەت' },
                ]}
              />
            </Field>

            {c.ownership !== 'owned' && (
              <div className="rounded-2xl border border-line bg-surface2/50 p-3.5 sm:p-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="شەریک / خاوەنی ئۆتۆمبێل *" hint={partners.length ? '' : 'هیچ شەریکێک تۆمار نەکراوە'}>
                    <div className="flex gap-2">
                      <div className="grow min-w-0">
                        <Picker
                          value={partner?.name || ''}
                          onChange={(v) => set('partnerId', partners.find((p) => p.name === v)?.id)}
                          options={partners.map((p) => p.name)}
                          placeholder={partners.length ? 'شەریک هەڵبژێرە' : 'شەریک زیاد بکە'}
                        />
                      </div>
                      {can('settings.edit') && (
                        <button
                          type="button"
                          onClick={() => setNewPartner({ name: '', phone: '' })}
                          className="btn-ghost shrink-0 !px-3"
                          title="شەریکی نوێ زیاد بکە"
                        >
                          <UserPlus size={17} />
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label="ڕێژەی شەریک (%)" hint="نموونە: ٥٠ بۆ ٥٠ بە ٥٠">
                    <MoneyInput
                      value={c.partnerPct ?? 50}
                      onChange={(n) => set('partnerPct', Math.min(100, Math.max(0, n)))}
                      placeholder="50"
                    />
                  </Field>
                </div>

                {c.ownership === 'partnership' && !editing && (
                  <>
                    <Field label="کێ پشکی شەریکی لە نرخی کڕیندا داوە؟">
                      <Segmented
                        value={fund}
                        onChange={setFund}
                        size="sm"
                        options={[
                          { v: 'partner' as const, label: 'شەریک خۆی' },
                          { v: 'showroom' as const, label: 'ئێمە بۆمان دا' },
                          { v: 'partial' as const, label: 'بەشێکی' },
                        ]}
                      />
                    </Field>
                    {fund === 'partial' && (
                      <Field label="ئەوەی شەریک خۆی داویەتی" hint={`زۆرترین: ${money(shareOfBuy, c.buyCurrency)}`}>
                        <MoneyInput value={partnerPart} onChange={(n) => setPartnerPart(Math.max(0, n))} placeholder="0" />
                      </Field>
                    )}
                    <div className="rounded-xl border border-line bg-surface p-3 space-y-1.5 text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">پشکی شەریک لە نرخی کڕین ({pct}٪)</span>
                        <b className="num">{money(shareOfBuy, c.buyCurrency)}</b>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">شەریک داویەتی</span>
                        <b className="num text-ok">{money(partnerGave, c.buyCurrency)}</b>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">قەرز لەسەر شەریک</span>
                        <b className={`num ${partnerDebt > 0 ? 'text-warn' : ''}`}>{money(partnerDebt, c.buyCurrency)}</b>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-line">
                        <span className="text-muted">لە سندوقی پێشانگاوە دەچێت</span>
                        <b className="num text-bad">{money(fromCashbox, c.buyCurrency)}</b>
                      </div>
                    </div>
                  </>
                )}

                {c.ownership === 'partnership' && editing && recorded && (
                  <div className="rounded-xl border border-line bg-surface p-3 space-y-1.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">شەریک داویەتی (تۆمارکراو)</span>
                      <b className="num text-ok">{money(recorded.funded, 'USD')}</b>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">قەرزی ماوە لەسەر شەریک</span>
                      <b className={`num ${recorded.debt > 0 ? 'text-warn' : ''}`}>{money(recorded.debt, 'USD')}</b>
                    </div>
                    <p className="text-[12px] text-muted pt-1.5 border-t border-line flex items-center gap-1.5">
                      <Handshake size={13} className="shrink-0" />
                      وەرگرتنی پارە لە شەریک لە پەڕەی «شەریکەکان» تۆمار دەکرێت
                    </p>
                  </div>
                )}
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
            <textarea rows={3} value={c.bodyNote || ''} onChange={(e) => set('bodyNote', e.target.value)} className="field" placeholder="نموونە: بۆنیت بۆیاغی فەبریکە نییە، دەرگای چەپ گۆڕدراوە..." />
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

      <Sheet
        open={!!newPartner}
        onClose={() => setNewPartner(null)}
        title="شەریکی نوێ"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setNewPartner(null)}>پاشگەزبوونەوە</button>
            <button className="btn-brand" onClick={addPartner} disabled={!newPartner?.name.trim()}>خەزنکردن</button>
          </>
        }
      >
        {newPartner && (
          <div className="space-y-4">
            <Field label="ناو *">
              <input autoFocus value={newPartner.name} onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })} className="field" />
            </Field>
            <Field label="ژمارەی تەلەفۆن">
              <input dir="ltr" value={newPartner.phone} onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })} className="field text-start num" placeholder="0750..." />
            </Field>
            <p className="text-xs text-muted leading-6">
              ئەم شەریکە لە پەڕەی «شەریکەکان»یش تۆمار دەبێت و حساباتی خۆی دەبێت.
            </p>
          </div>
        )}
      </Sheet>

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
