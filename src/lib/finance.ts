import type { Car, Contract, Currency, Tx } from './types'
import { convert, todayISO } from './format'

export interface CarMoney {
  buy: number
  costs: number
  total: number
  sold: number | null
  profit: number | null
  contract?: Contract
}

/** هەموو ژمێریارییەکی ئۆتۆمبێلێک بە دراوی دیاریکراو */
export function carMoney(car: Car, txs: Tx[], contracts: Contract[], cur: Currency, rate: number): CarMoney {
  const mine = txs.filter((t) => t.carId === car.id)
  const buy = convert(car.buyPrice || 0, car.buyCurrency || 'USD', cur, rate)
  const costs = mine
    .filter((t) => t.category === 'car_cost')
    .reduce((s, t) => s + convert(t.amount, t.currency, cur, t.rate || rate), 0)
  const contract = contracts.find((c) => c.carId === car.id && c.status !== 'cancelled' && c.type === 'sale')
  const sold = contract ? convert(contract.price, contract.currency, cur, contract.rate || rate) : null
  const commission = mine
    .filter((t) => t.category === 'commission' || t.category === 'partner')
    .reduce((s, t) => s + convert(t.amount, t.currency, cur, t.rate || rate), 0)
  const total = buy + costs + commission
  return { buy, costs: costs + commission, total, sold, profit: sold === null ? null : sold - total, contract }
}

export interface Balance {
  cash: number
  bank: number
  total: number
  in: number
  out: number
}

export function balances(txs: Tx[], cur: Currency, rate: number, from?: string, to?: string): Balance {
  let cash = 0
  let bank = 0
  let tin = 0
  let tout = 0
  for (const t of txs) {
    if (from && t.date < from) continue
    if (to && t.date > to) continue
    const v = convert(t.amount, t.currency, cur, t.rate || rate) * (t.kind === 'in' ? 1 : -1)
    if (t.account === 'bank') bank += v
    else cash += v
    if (t.kind === 'in') tin += Math.abs(v)
    else tout += Math.abs(v)
  }
  return { cash, bank, total: cash + bank, in: tin, out: tout }
}

export interface DueInfo {
  contract: Contract
  no: number
  dueDate: string
  amount: number
  paid: number
  rest: number
  overdue: boolean
  daysLeft: number
}

/** هەموو قیستە نەدراوەکان */
export function openInstallments(contracts: Contract[]): DueInfo[] {
  const t = todayISO()
  const out: DueInfo[] = []
  for (const c of contracts) {
    if (c.status === 'cancelled' || c.payment !== 'installment') continue
    for (const i of c.installments || []) {
      const rest = (i.amount || 0) - (i.paid || 0)
      if (rest <= 0.001) continue
      const daysLeft = Math.round((new Date(i.dueDate).getTime() - new Date(t).getTime()) / 86400000)
      out.push({
        contract: c,
        no: i.no,
        dueDate: i.dueDate,
        amount: i.amount,
        paid: i.paid || 0,
        rest,
        overdue: i.dueDate < t,
        daysLeft,
      })
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function contractDebt(c: Contract) {
  if (c.payment !== 'installment') return 0
  return (c.installments || []).reduce((s, i) => s + Math.max(0, (i.amount || 0) - (i.paid || 0)), 0)
}

export function contractPaid(c: Contract) {
  return (c.down || 0) + (c.installments || []).reduce((s, i) => s + (i.paid || 0), 0)
}

/** کۆی قازانج لە ماوەیەکدا */
export function profitInRange(cars: Car[], txs: Tx[], contracts: Contract[], cur: Currency, rate: number, from: string, to: string) {
  let profit = 0
  let count = 0
  for (const c of contracts) {
    if (c.status === 'cancelled' || c.type !== 'sale') continue
    if (c.date < from || c.date > to) continue
    const car = cars.find((x) => x.id === c.carId)
    if (!car) continue
    const m = carMoney(car, txs, contracts, cur, rate)
    if (m.profit !== null) {
      profit += m.profit
      count++
    }
  }
  return { profit, count }
}

export function monthKey(iso: string) {
  return iso.slice(0, 7)
}
