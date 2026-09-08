import type { Car, Contract, Currency, Partner, Tx } from './types'
import { carMoney } from './finance'
import { convert } from './format'

/**
 * ═══════════ حساباتی شەریکەکان ═══════════
 *
 * دوو جۆر ئۆتۆمبێلی شەریک هەیە:
 *  · `partnership` — بە سەرمایەی هاوبەش کڕدراوە. شەریک بە ڕێژەی خۆی
 *    هەم لە **تێچوو** هەم لە **قازانج** بەشدارە.
 *  · `consignment` — ئەمانەت. هیچ پارەیەکی لەسەر نادرێت، تەنها
 *    ڕێژەیەک لە قازانج بۆ شەریک دەبێت (وەک پێشتر).
 *
 * پارەی شەریک هەمیشە لە خشتەی `txs` تۆمار دەکرێت — تەنها ئەوە سەرچاوەی ڕاستییە:
 *  · `partner_in`  (kind: in)  → پارە لە شەریکەوە هاتووە (پشکی کڕین یان دانەوەی قەرز)
 *  · `partner`     (kind: out) → پارە دراوە بە شەریک
 *  · `hawala` / `hawala_cancel` → پارەدان بە ڕێگەی سەراف
 *
 * ژمێریاری هەر ئۆتۆمبێلێک:
 *   پشکی شەریک لە تێچوو = کۆی تێچوو × ڕێژە٪
 *   قەرزی شەریک         = پشکی لە تێچوو − ئەوەی خۆی داویەتی   (تەنها بۆ نەفرۆشراوەکان)
 *   دوای فرۆشتن، پشکی شەریک لە نرخی فرۆشتن = پشکی لە تێچوو + پشکی لە قازانج،
 *   قەرزەکەشی لێ کەم دەکرێتەوە؛ کەواتە ئەوەی دەیدەینەوە = ئەوەی داویەتی + پشکی قازانج.
 */

export const PARTNER_PCT_DEFAULT = 50

export const partnerPctOf = (car: Car) => {
  const pct = car.partnerPct ?? PARTNER_PCT_DEFAULT
  return Math.min(100, Math.max(0, pct))
}

/** ئۆتۆمبێلی شەریکی بە سەرمایە (نەک ئەمانەت) */
export const isPartnership = (car: Car) => car.ownership === 'partnership' && !!car.partnerId

/** هەموو ئۆتۆمبێلەکانی شەریکێک — شەریکی و ئەمانەت */
export const partnerCars = (cars: Car[], partnerId: string) => cars.filter((c) => c.partnerId === partnerId)

export interface PartnerCarLine {
  car: Car
  pct: number
  /** ئایا سەرمایەی تێدا هەیە؟ (ئەمانەت = نەخێر) */
  capital: boolean
  sold: boolean
  /** کۆی تێچووی ئۆتۆمبێلەکە (کڕین + خەرجییەکان) بە دۆلار */
  cost: number
  /** پشکی شەریک لە تێچوو */
  costShare: number
  /** ئەوەی شەریک بە ڕاستی داویەتی بۆ ئەم ئۆتۆمبێلە */
  funded: number
  /** پشکی شەریک کە ئێمە بۆمان داوە و هێشتا نەیداوەتەوە (تەنها بۆ نەفرۆشراو) */
  debt: number
  /** نرخی فرۆشتن، ئەگەر فرۆشراوە */
  soldPrice: number | null
  /** بەرواری عەقدی فرۆشتن */
  soldDate: string | null
  profit: number | null
  profitShare: number | null
  /** ئەوەی دوای فرۆشتن دەبێت بدرێت بە شەریک = ئەوەی داویەتی + پشکی قازانج */
  payable: number
}

export interface PartnerAccount {
  partner: Partner
  lines: PartnerCarLine[]
  cars: number
  stock: number
  sold: number
  /** سەرمایەی شەریک لەناو ئۆتۆمبێلە نەفرۆشراوەکان */
  stockCapital: number
  /** بەهای پشکی شەریک لە کۆی تێچووی ئۆتۆمبێلە نەفرۆشراوەکان */
  stockShare: number
  /** قەرزی لەسەر شەریک — ئەو پشکەی ئێمە بۆمان داوە */
  debt: number
  /** پشکی قازانج لە ئۆتۆمبێلە فرۆشراوەکان */
  profitShare: number
  /** سەرمایەی شەریک کە بە فرۆشتن ئازاد بووەتەوە */
  releasedCapital: number
  /** پارەی شەریک کە بە هیچ ئۆتۆمبێلێکەوە بەند نییە */
  generalCapital: number
  /** کۆی ئەوەی دەبێت بدرێت بە شەریک، پێش کەمکردنەوەی ئەوەی دراوە */
  payable: number
  /** ئەوەی تا ئێستا دراوە بە شەریک (بە دۆلار) */
  paidOut: number
  /** ماوە بۆ دان بە شەریک */
  rest: number
  /** کۆی پارەی شەریک لای ئێمە (سەرمایەی کۆگا + ماوە) */
  totalWithUs: number
  /** باڵانسی کۆتایی — پارەی شەریک لای ئێمە، کەم قەرزەکەی */
  balance: number
}

interface Ctx {
  cars: Car[]
  txs: Tx[]
  contracts: Contract[]
  rate: number
}

const usd = (amount: number, currency: Currency, txRate: number | undefined, rate: number) =>
  convert(amount, currency, 'USD', txRate || rate)

/** ئەوەی شەریک داویەتی بۆ ئۆتۆمبێلێکی دیاریکراو (بە دۆلار) */
export function partnerFunded(txs: Tx[], partnerId: string, carId: string, rate: number) {
  return txs
    .filter((t) => t.category === 'partner_in' && t.partnerId === partnerId && t.carId === carId)
    .reduce((s, t) => s + usd(t.amount, t.currency, t.rate, rate) * (t.kind === 'out' ? -1 : 1), 0)
}

/** پارەی شەریک کە بە ئۆتۆمبێلێکەوە بەند نییە */
function generalCapitalOf(txs: Tx[], partnerId: string, rate: number) {
  return txs
    .filter((t) => t.category === 'partner_in' && t.partnerId === partnerId && !t.carId)
    .reduce((s, t) => s + usd(t.amount, t.currency, t.rate, rate) * (t.kind === 'out' ? -1 : 1), 0)
}

/** ئەوەی تا ئێستا دراوە بە شەریک — پارەدانی ڕاستەوخۆ و حەواڵە */
export function partnerPaidOut(txs: Tx[], partnerId: string, rate: number) {
  return txs
    .filter((t) => t.partnerId === partnerId && (t.category === 'partner' || t.category === 'hawala' || t.category === 'hawala_cancel'))
    .reduce((s, t) => {
      /* لە حەواڵەدا کرێیەکە ناگاتە دەستی شەریک، بۆیە لێی کەم دەکرێتەوە */
      const net = t.category === 'hawala' || t.category === 'hawala_cancel' ? Math.max(0, t.amount - (t.fee || 0)) : t.amount
      const v = usd(net, t.currency, t.rate, rate)
      if (t.category === 'hawala_cancel') return s - v
      return s + (t.kind === 'in' ? -v : v)
    }, 0)
}

/** حساباتی ئۆتۆمبێلێکی شەریک */
export function partnerCarLine(car: Car, ctx: Ctx): PartnerCarLine {
  const { txs, contracts, rate } = ctx
  const pct = partnerPctOf(car)
  const capital = isPartnership(car)
  const m = carMoney(car, txs, contracts, 'USD', rate)
  const sold = m.sold !== null
  const cost = m.total
  const costShare = capital ? (cost * pct) / 100 : 0
  const funded = car.partnerId ? partnerFunded(txs, car.partnerId, car.id, rate) : 0
  const profitShare = m.profit === null ? null : (m.profit * pct) / 100
  const debt = sold ? 0 : Math.max(0, costShare - funded)
  return {
    car,
    pct,
    capital,
    sold,
    cost,
    costShare,
    funded,
    debt,
    soldPrice: m.sold,
    soldDate: m.contract?.date || null,
    profit: m.profit,
    profitShare,
    payable: sold ? funded + (profitShare || 0) : 0,
  }
}

/** حساباتی تەواوی شەریکێک */
export function partnerAccount(partner: Partner, ctx: Ctx): PartnerAccount {
  const lines = partnerCars(ctx.cars, partner.id)
    .map((car) => partnerCarLine(car, ctx))
    .sort((a, b) => Number(a.sold) - Number(b.sold) || (b.car.createdAt || 0) - (a.car.createdAt || 0))

  const inStock = lines.filter((l) => !l.sold)
  const done = lines.filter((l) => l.sold)

  const stockCapital = inStock.reduce((s, l) => s + l.funded, 0)
  const stockShare = inStock.reduce((s, l) => s + l.costShare, 0)
  const debt = inStock.reduce((s, l) => s + l.debt, 0)
  const profitShare = done.reduce((s, l) => s + (l.profitShare || 0), 0)
  const releasedCapital = done.reduce((s, l) => s + l.funded, 0)
  const generalCapital = generalCapitalOf(ctx.txs, partner.id, ctx.rate)
  const payable = releasedCapital + profitShare + generalCapital
  const paidOut = partnerPaidOut(ctx.txs, partner.id, ctx.rate)
  const rest = payable - paidOut

  return {
    partner,
    lines,
    cars: lines.length,
    stock: inStock.length,
    sold: done.length,
    stockCapital,
    stockShare,
    debt,
    profitShare,
    releasedCapital,
    generalCapital,
    payable,
    paidOut,
    rest,
    totalWithUs: stockCapital + rest,
    balance: stockCapital + rest - debt,
  }
}

export function partnerAccounts(partners: Partner[], ctx: Ctx): PartnerAccount[] {
  return partners.map((p) => partnerAccount(p, ctx))
}
