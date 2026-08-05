/**
 * خوێندنەوەی زانیاری لە ژمارەی شانس (VIN)
 *
 * دوو قۆناغ:
 *  ١) ئۆفلاین — خشتەی WMI (٣ پیتی یەکەم) براند و وڵات دەردەهێنێت.
 *     هەمیشە کاردەکات، بەبێ ئینتەرنێت، خێرا. براندە چینییەکانیشی تێدایە.
 *  ٢) ئۆنلاین — NHTSA vPIC (بنکەدراوەی فەرمیی حکومەتی ئەمریکا، بەخۆڕایی و
 *     بێ کلیل) مۆدێل، جۆری بۆدی، ماتۆڕ و سووتەمەنی زیاد دەکات.
 *     ⚠️ ئۆتۆمبێلی چینی لەم بنکەدراوەیەدا نییە — بۆیە قۆناغی یەکەم گرنگە.
 *
 * هیچ کاتێک بەزۆر داتا نانووسێت — تەنها پێشنیار دەکات و بەکارهێنەر پەسەندی دەکات.
 */

import { BRANDS, BODY_TYPES, CYLINDERS, DRIVES, FUELS, ORIGINS } from './catalog'
import { cleanVin, VIN_RE, vinYear } from './format'

/* ═══════════════ ١) خشتەی WMI — ئۆفلاین ═══════════════ */

/** ٣ پیتی یەکەمی VIN → براند. تەنها ئەوانەی دڵنیاین لێیان. */
const WMI: Record<string, string> = {
  /* ── تویۆتا / لێکسەس (یابان، ئەمریکا، خەلیج) ── */
  JTD: 'Toyota', JTE: 'Toyota', JTF: 'Toyota', JTG: 'Toyota', JTK: 'Toyota',
  JTL: 'Toyota', JTM: 'Toyota', JTN: 'Toyota', JTA: 'Toyota', JTB: 'Toyota',
  JT2: 'Toyota', JT3: 'Toyota', JT4: 'Toyota', JT5: 'Toyota', JT6: 'Toyota',
  JT7: 'Toyota', '2T1': 'Toyota', '2T2': 'Lexus', '2T3': 'Toyota',
  '4T1': 'Toyota', '4T3': 'Toyota', '4T4': 'Toyota', '5TB': 'Toyota',
  '5TD': 'Toyota', '5TE': 'Toyota', '5TF': 'Toyota', '1NX': 'Toyota',
  MR0: 'Toyota', MHF: 'Toyota', AHT: 'Toyota', SB1: 'Toyota', VNK: 'Toyota',
  '6T1': 'Toyota', '9BR': 'Toyota', LFM: 'Toyota',
  JTH: 'Lexus', JTJ: 'Lexus', JT8: 'Lexus', '58A': 'Lexus', '58B': 'Lexus',

  /* ── هۆندا / ئەکورا ── */
  JHM: 'Honda', JHL: 'Honda', JHG: 'Honda', JHZ: 'Honda', SHH: 'Honda',
  SHS: 'Honda', JH4: 'Honda', '19U': 'Honda', '19X': 'Honda', '1HG': 'Honda',
  '2HG': 'Honda', '2HK': 'Honda', '2HJ': 'Honda', '5FN': 'Honda', '5FP': 'Honda',
  '5J6': 'Honda', '5J8': 'Honda', '5KB': 'Honda', '1HF': 'Honda', '7FA': 'Honda',
  '3CZ': 'Honda', '3HG': 'Honda', MRH: 'Honda', NLA: 'Honda',

  /* ── نیسان / ئینفینیتی ── */
  JN1: 'Nissan', JN3: 'Nissan', JN6: 'Nissan', JN8: 'Nissan',
  '1N4': 'Nissan', '1N6': 'Nissan', '3N1': 'Nissan', '3N6': 'Nissan',
  '5N1': 'Nissan', VSK: 'Nissan', SJN: 'Nissan', VWA: 'Nissan', MDH: 'Nissan',
  JNK: 'Infiniti', JNR: 'Infiniti', JNA: 'Infiniti', '5N3': 'Infiniti',

  /* ── مازدا / سوبارو / میتسوبیشی / سوزوکی ── */
  JM1: 'Mazda', JM3: 'Mazda', JM6: 'Mazda', JM7: 'Mazda', JMZ: 'Mazda',
  '3MZ': 'Mazda', '3M1': 'Mazda', '4F2': 'Mazda', '4F4': 'Mazda',
  JF1: 'Subaru', JF2: 'Subaru', JF3: 'Subaru', '4S3': 'Subaru', '4S4': 'Subaru',
  JA3: 'Mitsubishi', JA4: 'Mitsubishi', JA7: 'Mitsubishi', JMB: 'Mitsubishi',
  JMY: 'Mitsubishi', MMB: 'Mitsubishi', MMC: 'Mitsubishi', MMT: 'Mitsubishi',
  '4A3': 'Mitsubishi', '4A4': 'Mitsubishi', ML0: 'Mitsubishi', ML3: 'Mitsubishi',
  JS2: 'Suzuki', JS3: 'Suzuki', JSA: 'Suzuki', MMS: 'Suzuki', MBH: 'Suzuki',
  TSM: 'Suzuki',
  JAA: 'Isuzu', JAB: 'Isuzu', JAL: 'Isuzu', JAN: 'Isuzu', MPA: 'Isuzu',
  MP1: 'Isuzu', '4NU': 'Isuzu',
  JDA: 'Daihatsu', JD1: 'Daihatsu', JD2: 'Daihatsu', MHK: 'Daihatsu',

  /* ── کۆریایی ── */
  KMH: 'Hyundai', KMF: 'Hyundai', KMJ: 'Hyundai', KMX: 'Hyundai',
  KM8: 'Hyundai', TMA: 'Hyundai', NLH: 'Hyundai', '5NP': 'Hyundai',
  '5NM': 'Hyundai', LBE: 'Hyundai',
  KNA: 'Kia', KNC: 'Kia', KND: 'Kia', KNE: 'Kia', KNM: 'Kia', KNB: 'Kia',
  U5Y: 'Kia', U6Y: 'Kia', '3KP': 'Kia', '5XY': 'Kia', '5XX': 'Kia',
  KMT: 'Genesis', KMU: 'Genesis',
  KL1: 'Chevrolet', KL3: 'Chevrolet', KL4: 'Chevrolet', KL5: 'Chevrolet',
  KL7: 'Chevrolet', KL8: 'Chevrolet', KLA: 'Chevrolet', KLY: 'Chevrolet',

  /* ── ئەمریکی ── */
  '1G1': 'Chevrolet', '1G3': 'Chevrolet', '1GB': 'Chevrolet', '1GC': 'Chevrolet',
  '1GN': 'Chevrolet', '2G1': 'Chevrolet', '2GN': 'Chevrolet', '3GC': 'Chevrolet',
  '3GN': 'Chevrolet', '3G1': 'Chevrolet', '1GA': 'Chevrolet', '1GG': 'Chevrolet',
  '1GT': 'GMC', '1GK': 'GMC', '1GD': 'GMC', '2GK': 'GMC', '3GT': 'GMC',
  '1G6': 'Cadillac', '1GY': 'Cadillac', '3G6': 'Cadillac',
  '1FA': 'Ford', '1FB': 'Ford', '1FC': 'Ford', '1FD': 'Ford', '1FM': 'Ford',
  '1FT': 'Ford', '1F1': 'Ford', '2FA': 'Ford', '2FM': 'Ford', '2FT': 'Ford',
  '3FA': 'Ford', '3FT': 'Ford', MAJ: 'Ford', NM0: 'Ford', WF0: 'Ford', VS6: 'Ford',
  '5LM': 'Lincoln', '5LT': 'Lincoln', '1LN': 'Lincoln', '2LM': 'Lincoln',
  '1C3': 'Chrysler', '2C3': 'Chrysler', '2A4': 'Chrysler', '2A8': 'Chrysler',
  '3C3': 'Chrysler',
  '1C4': 'Jeep', '1J4': 'Jeep', '1J8': 'Jeep', '3C4': 'Jeep', ZAC: 'Jeep',
  '1C6': 'Dodge', '1B3': 'Dodge', '2B3': 'Dodge', '2C4': 'Dodge', '1D7': 'Dodge',
  '3D7': 'Dodge', '2D4': 'Dodge', '3C6': 'Dodge',
  '5YJ': 'Tesla', '7SA': 'Tesla', LRW: 'Tesla', XP7: 'Tesla',

  /* ── ئەڵمانی ── */
  WDB: 'Mercedes-Benz', WDC: 'Mercedes-Benz', WDD: 'Mercedes-Benz',
  WDF: 'Mercedes-Benz', WMX: 'Mercedes-Benz', W1K: 'Mercedes-Benz',
  W1N: 'Mercedes-Benz', W1V: 'Mercedes-Benz', '4JG': 'Mercedes-Benz',
  '55S': 'Mercedes-Benz', LE4: 'Mercedes-Benz', NMB: 'Mercedes-Benz',
  WBA: 'BMW', WBS: 'BMW', WBX: 'BMW', WBY: 'BMW', WB1: 'BMW', WB3: 'BMW',
  '4US': 'BMW', '5UX': 'BMW', '5YM': 'BMW', LBV: 'BMW',
  WAU: 'Audi', WA1: 'Audi', WUA: 'Audi', TRU: 'Audi', '93U': 'Audi', LFV: 'Audi',
  WVW: 'Volkswagen', WV1: 'Volkswagen', WV2: 'Volkswagen', WVG: 'Volkswagen',
  '1VW': 'Volkswagen', '3VW': 'Volkswagen', '9BW': 'Volkswagen', LSV: 'Volkswagen',
  WP0: 'Porsche', WP1: 'Porsche',

  /* ── ئەوروپی ── */
  SAL: 'Land Rover', SAJ: 'Jaguar', SAD: 'Jaguar',
  YV1: 'Volvo', YV4: 'Volvo', LYV: 'Volvo', LVY: 'Volvo',
  VF3: 'Peugeot', VF7: 'Peugeot', VR3: 'Peugeot',
  VF1: 'Renault', VF6: 'Renault', X7L: 'Renault', VNV: 'Renault',
  W0L: 'Opel', W0V: 'Opel', VSX: 'Opel',
  TMB: 'Škoda', TMP: 'Škoda',
  ZFA: 'Fiat', ZFF: 'Ferrari', ZAM: 'Maserati', ZHW: 'Lamborghini',
  SCB: 'Bentley', SCA: 'Rolls-Royce',

  /* ── چینی (زۆر باوە لە عێراق) ── */
  LSJ: 'MG', LSF: 'MG', SFF: 'MG', LSH: 'MG',
  LVV: 'Chery', LVT: 'Chery', LVR: 'Chery', L6T: 'Chery',
  LS5: 'Changan', LS4: 'Changan', LS9: 'Changan',
  LB3: 'Geely', LJU: 'Geely', L6X: 'Geely',
  LGW: 'Haval', LGH: 'Haval',
  LGX: 'BYD', LC0: 'BYD', LC6: 'BYD',
  LJ1: 'JAC', LJ4: 'JAC', LJ8: 'JAC',
  LFP: 'Bestune', LFW: 'Hongqi', LFC: 'Hongqi',
  LGJ: 'Jetour', LJD: 'Jetour',
}

/** پیتی یەکەمی VIN → ناوچەی بەرهەمهێنان */
const REGION: Record<string, string> = {
  J: 'یابانی', K: 'کۆریایی', L: 'چینی', M: 'خەلیجی', N: 'ئەوروپی',
  S: 'ئەوروپی', T: 'ئەوروپی', U: 'ئەوروپی', V: 'ئەوروپی', W: 'ئەوروپی',
  X: 'ڕووسی', Y: 'ئەوروپی', Z: 'ئەوروپی',
  '1': 'ئەمریکی', '4': 'ئەمریکی', '5': 'ئەمریکی', '7': 'ئەمریکی',
  '2': 'کەنەدی', '3': 'ئەمریکی', '9': 'ئەوروپی',
}

export interface VinLocal {
  brand?: string
  year?: number
  origin?: string
}

/** خوێندنەوەی ئۆفلاین — هەمیشە بەردەستە */
export function decodeVinLocal(raw: string): VinLocal {
  const vin = cleanVin(raw)
  if (vin.length < 3) return {}
  return {
    brand: WMI[vin.slice(0, 3)],
    year: vinYear(vin) || undefined,
    origin: REGION[vin[0]],
  }
}

/* ═══════════════ ٢) NHTSA — ئۆنلاین ═══════════════ */

const API = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues'

interface NhtsaRow {
  Make?: string
  Model?: string
  ModelYear?: string
  BodyClass?: string
  EngineCylinders?: string
  DisplacementL?: string
  FuelTypePrimary?: string
  DriveType?: string
  TransmissionStyle?: string
  Doors?: string
  PlantCountry?: string
  Trim?: string
  Series?: string
  ErrorCode?: string
}

export interface VinInfo {
  brand?: string
  model?: string
  year?: number
  bodyType?: string
  fuel?: string
  cylinders?: string
  drive?: string
  transmission?: string
  origin?: string
  /** ئەوەی نەتوانرا دیاری بکرێت */
  missing: string[]
  /** ئایا لە ئینتەرنێتەوە هات یان تەنها ئۆفلاین */
  online: boolean
}

/* ── بەرامبەرکردن بە کاتالۆگی خۆمان ── */

const clean = (s?: string) => (s || '').trim()

function matchBrand(make?: string): string | undefined {
  const m = clean(make).toLowerCase()
  if (!m) return undefined
  const keys = Object.keys(BRANDS)
  const exact = keys.find((k) => k.toLowerCase() === m)
  if (exact) return exact
  // نموونە: "MERCEDES-BENZ" → لە لیستەکەماندا نییە
  const partial = keys.find((k) => k !== 'Other' && (m.includes(k.toLowerCase()) || k.toLowerCase().includes(m)))
  return partial
}

function matchModel(brand: string | undefined, model?: string, series?: string): string | undefined {
  const raw = clean(model) || clean(series)
  if (!raw) return undefined
  const list = brand ? BRANDS[brand] || [] : []
  const low = raw.toLowerCase()
  const exact = list.find((x) => x.toLowerCase() === low)
  if (exact) return exact
  const partial = list.find((x) => low.includes(x.toLowerCase()) || x.toLowerCase().includes(low))
  // ئەگەر لە لیستەکەماندا نەبوو، خودی ناوەکە بەکاردەهێنین (Picker ڕێگە بە نوێ دەدات)
  return partial || raw
}

function matchBody(body?: string): string | undefined {
  const b = clean(body).toLowerCase()
  if (!b) return undefined
  if (b.includes('sedan') || b.includes('saloon')) return 'سەدان'
  if (b.includes('hatchback') || b.includes('liftback') || b.includes('notchback')) return 'هاچباک'
  if (b.includes('pickup') || b.includes('truck')) return 'پیکاب'
  if (b.includes('minivan')) return 'مینی ڤان'
  if (b.includes('van')) return 'ڤان'
  if (b.includes('coupe')) return 'کوپێ'
  if (b.includes('convertible') || b.includes('cabriolet') || b.includes('roadster')) return 'کەبریۆلێت'
  if (b.includes('wagon')) return 'ستەیشن'
  if (b.includes('bus')) return 'باس'
  if (b.includes('sport utility') || b.includes('suv') || b.includes('mpv') || b.includes('crossover'))
    return b.includes('crossover') ? 'کرۆس ئۆڤەر' : 'جیپ (SUV)'
  return undefined
}

function matchFuel(fuel?: string): string | undefined {
  const f = clean(fuel).toLowerCase()
  if (!f) return undefined
  if (f.includes('diesel')) return 'دیزەل'
  if (f.includes('electric') && !f.includes('gasoline')) return 'کارەبایی'
  if (f.includes('gas') && (f.includes('electric') || f.includes('hybrid'))) return 'هایبرید'
  if (f.includes('gasoline') || f.includes('petrol')) return 'بەنزین'
  if (f.includes('cng') || f.includes('lpg') || f.includes('natural gas')) return 'گاز'
  return undefined
}

function matchCyl(n?: string, fuel?: string): string | undefined {
  if (clean(fuel).toLowerCase().includes('electric') && !clean(fuel).toLowerCase().includes('gasoline'))
    return 'کارەبایی'
  const v = parseInt(clean(n), 10)
  if (!v) return undefined
  const hit = CYLINDERS.find((c) => c.startsWith(String(v) + ' '))
  return hit
}

function matchDrive(d?: string): string | undefined {
  const v = clean(d).toLowerCase()
  if (!v) return undefined
  if (v.includes('4x2') || v.includes('fwd') || v.includes('front')) {
    if (v.includes('rear') || v.includes('rwd')) return DRIVES[1]
    return DRIVES[0]
  }
  if (v.includes('rwd') || v.includes('rear')) return DRIVES[1]
  if (v.includes('4x4') || v.includes('awd') || v.includes('4wd') || v.includes('all')) return DRIVES[2]
  return undefined
}

function matchOrigin(country?: string, vin?: string): string | undefined {
  const c = clean(country).toLowerCase()
  if (c.includes('united states')) return 'ئەمریکی'
  if (c.includes('canada')) return 'کەنەدی'
  if (c.includes('korea')) return 'کۆریایی'
  if (c.includes('japan')) return 'یابانی'
  if (c.includes('china')) return 'چینی'
  if (c.includes('russia')) return 'ڕووسی'
  if (
    c.includes('germany') ||
    c.includes('france') ||
    c.includes('spain') ||
    c.includes('italy') ||
    c.includes('united kingdom') ||
    c.includes('czech') ||
    c.includes('slovakia') ||
    c.includes('sweden') ||
    c.includes('hungary') ||
    c.includes('belgium') ||
    c.includes('poland') ||
    c.includes('portugal') ||
    c.includes('austria')
  )
    return 'ئەوروپی'
  if (c.includes('saudi') || c.includes('emirates') || c.includes('united arab')) return 'خەلیجی'
  return vin ? REGION[vin[0]] : undefined
}

/* ── داواکاریی سەرەکی ── */

/**
 * زانیاری VIN دەهێنێت. سەرەتا ئۆفلاین، دواتر ئەگەر ئینتەرنێت هەبوو
 * لە NHTSA زیاتری بۆ زیاد دەکات. هەرگیز هەڵە فڕێ نادات.
 */
export async function decodeVin(raw: string, timeoutMs = 9000): Promise<VinInfo> {
  const vin = cleanVin(raw)
  const local = decodeVinLocal(vin)

  const out: VinInfo = {
    brand: local.brand,
    year: local.year,
    origin: local.origin,
    missing: [],
    online: false,
  }

  if (!VIN_RE.test(vin)) {
    out.missing = ['VIN دروست نییە']
    return out
  }

  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(`${API}/${vin}?format=json`, { signal: ctrl.signal })
    clearTimeout(t)
    if (res.ok) {
      const json = (await res.json()) as { Results?: NhtsaRow[] }
      const r = json?.Results?.[0]
      if (r) {
        out.online = true
        const brand = matchBrand(r.Make) || out.brand
        out.brand = brand
        out.model = matchModel(brand, r.Model, r.Series)
        const y = parseInt(clean(r.ModelYear), 10)
        if (y >= 1950 && y <= new Date().getFullYear() + 2) out.year = y
        out.bodyType = matchBody(r.BodyClass)
        out.fuel = matchFuel(r.FuelTypePrimary)
        out.cylinders = matchCyl(r.EngineCylinders, r.FuelTypePrimary)
        out.drive = matchDrive(r.DriveType)
        out.origin = matchOrigin(r.PlantCountry, vin) || out.origin
      }
    }
  } catch {
    /* ئینتەرنێت نییە یان درەنگ کەوت — تەنها ئۆفلاین بەکاردەهێنین */
  }

  const miss: string[] = []
  if (!out.brand) miss.push('براند')
  if (!out.model) miss.push('مۆدێل')
  if (!out.bodyType) miss.push('جۆری بۆدی')
  if (!out.fuel) miss.push('سووتەمەنی')
  out.missing = miss

  return out
}

/** ناوی کوردیی ناوچەکە — بۆ پیشاندان */
export const ORIGIN_LIST = ORIGINS
export const BODY_LIST = BODY_TYPES
export const FUEL_LIST = FUELS
