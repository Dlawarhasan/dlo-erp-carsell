import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BarChart3, Download, FileSpreadsheet, Handshake, NotebookPen, Printer, ReceiptText, TrendingUp, Users, Wallet } from 'lucide-react'
import { PageHead } from '../components/Layout'
import { Empty, Picker, Segmented, Stat } from '../components/ui'
import { TX_CATEGORY_KU } from '../lib/catalog'
import { carMoney, cashBalance, exchangerBalance, profitInRange } from '../lib/finance'
import { convert, fmtDateShort, money, todayISO } from '../lib/format'
import { downloadFile, toCsv } from '../lib/exportHtml'
import { useApp } from '../store/app'
import { toAccounts, balanceOf } from '../lib/ledger'
import type { Currency, DebtKind } from '../lib/types'

type Tab = 'report' | 'statement'
type StatementKind = 'customer' | 'partner' | 'exchanger' | 'debt'
type StatementRow = {
  id: string
  date: string
  title: string
  note?: string
  amount: number
  direction: 'increase' | 'decrease'
}

const monthStart = () => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

export default function Reports() {
  const { cars, contracts, customers, partners, exchangers, debts, txs, settings, can } = useApp()
  const [tab, setTab] = useState<Tab>('report')
  const [cur, setCur] = useState<Currency>('USD')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayISO)
  const [statementKind, setStatementKind] = useState<StatementKind>('customer')
  const [debtKind, setDebtKind] = useState<DebtKind>('receivable')
  const [selectedId, setSelectedId] = useState('')

  const txsInPeriod = useMemo(() => txs.filter((t) => t.date >= from && t.date <= to), [txs, from, to])
  const report = useMemo(() => {
    const regular = txsInPeriod.filter((t) => t.account !== 'exchanger' && t.category !== 'cash_exchange_out' && t.category !== 'cash_exchange_in')
    const amount = (n: typeof regular) => n.reduce((sum, t) => sum + convert(t.amount, t.currency, cur, t.rate || settings.usdRate), 0)
    const income = amount(regular.filter((t) => t.kind === 'in'))
    const expense = amount(regular.filter((t) => t.kind === 'out'))
    const profit = profitInRange(cars, txs, contracts, cur, settings.usdRate, from, to)
    const sales = contracts.filter((c) => c.status !== 'cancelled' && c.date >= from && c.date <= to)
    const salesAmount = sales.reduce((sum, c) => sum + convert(c.price, c.currency, cur, c.rate || settings.usdRate), 0)
    const categories = regular
      .filter((t) => t.kind === 'out')
      .reduce<Record<string, number>>((all, t) => {
        const k = t.category
        all[k] = (all[k] || 0) + convert(t.amount, t.currency, cur, t.rate || settings.usdRate)
        return all
      }, {})
    return { income, expense, profit, sales, salesAmount, categories: Object.entries(categories).sort((a, b) => b[1] - a[1]) }
  }, [cars, contracts, cur, from, settings.usdRate, to, txs, txsInPeriod])

  const choices = useMemo(() => {
    if (statementKind === 'customer') return customers.map((x) => ({ id: x.id, label: `${x.name}${x.phone ? ` — ${x.phone}` : ''}` }))
    if (statementKind === 'partner') return partners.map((x) => ({ id: x.id, label: x.name }))
    if (statementKind === 'debt') {
      /* حسابەکان — ئاراستە بەپێی باڵانسی ئێستا دیاری دەکرێت */
      return toAccounts(debts)
        .filter((a) => {
          const b = balanceOf(a)
          const v = b.USD + b.IQD
          return debtKind === 'receivable' ? v > 0 : v < 0
        })
        .map((a) => ({ id: a.id, label: `${a.name}${a.phone ? ` — ${a.phone}` : ''}` }))
    }
    return exchangers.map((x) => ({ id: x.id, label: x.name }))
  }, [customers, debtKind, debts, exchangers, partners, statementKind])

  const statement = useMemo<{ name: string; rows: StatementRow[]; balance: number; balanceLabel: string }>(() => {
    const pick = choices.find((x) => x.id === selectedId)
    if (!pick) return { name: '', rows: [] as StatementRow[], balance: 0, balanceLabel: 'باقی' }
    const inRange = (date: string) => date >= from && date <= to
    const atRate = (amount: number, currency: Currency, rate?: number) => convert(amount, currency, cur, rate || settings.usdRate)

    if (statementKind === 'customer') {
      const allContracts = contracts.filter((c) => c.buyerId === selectedId && c.status !== 'cancelled')
      const allPayments = txs.filter((t) => t.customerId === selectedId && (t.category === 'car_sell' || t.category === 'installment'))
      const rows: StatementRow[] = [
        ...allContracts.filter((c) => inRange(c.date)).map((c) => ({
          id: `contract_${c.id}`, date: c.date, title: `عەقدی ${c.no} — ${c.car.brand} ${c.car.model}`,
          amount: atRate(c.price, c.currency, c.rate), direction: 'increase' as const,
        })),
        ...allPayments.filter((t) => inRange(t.date)).map((t) => ({
          id: `tx_${t.id}`, date: t.date, title: t.title, note: t.note,
          amount: atRate(t.amount, t.currency, t.rate), direction: 'decrease' as const,
        })),
      ]
      const total = allContracts.reduce((sum, c) => sum + atRate(c.price, c.currency, c.rate), 0)
      const paid = allPayments.reduce((sum, t) => sum + atRate(t.amount, t.currency, t.rate), 0)
      return { name: pick.label, rows: rows.sort((a, b) => b.date.localeCompare(a.date)), balance: Math.max(0, total - paid), balanceLabel: 'باقی لەسەر کریار' }
    }

    if (statementKind === 'partner') {
      const relevantCars = cars.filter((c) => c.partnerId === selectedId && c.status === 'sold')
      const profitRows: StatementRow[] = relevantCars.flatMap((car) => {
        const m = carMoney(car, txs, contracts, 'USD', settings.usdRate)
        if (!m.contract || !inRange(m.contract.date)) return []
        const shareUsd = ((m.profit || 0) * (car.partnerPct || 50)) / 100
        return [{
          id: `profit_${car.id}`, date: m.contract.date, title: `پشکی شەریک — ${car.brand} ${car.model}`,
          amount: atRate(shareUsd, 'USD'), direction: 'increase' as const,
        }]
      })
      const allProfit = relevantCars.reduce((sum, car) => {
        const m = carMoney(car, txs, contracts, 'USD', settings.usdRate)
        return sum + ((m.profit || 0) * (car.partnerPct || 50)) / 100
      }, 0)
      const partnerTxs = txs.filter((t) => t.partnerId === selectedId && (t.category === 'partner' || t.category === 'hawala' || t.category === 'hawala_cancel'))
      const paidValue = (t: (typeof partnerTxs)[number]) => {
        const n = t.category === 'hawala' || t.category === 'hawala_cancel' ? Math.max(0, t.amount - (t.fee || 0)) : t.amount
        return atRate(n, t.currency, t.rate)
      }
      const txRows: StatementRow[] = partnerTxs.filter((t) => inRange(t.date)).map((t) => ({
        id: `tx_${t.id}`, date: t.date, title: t.title, note: t.note, amount: paidValue(t),
        direction: (t.category === 'hawala_cancel' ? 'increase' : 'decrease') as 'increase' | 'decrease',
      }))
      const paid = partnerTxs.reduce((sum, t) => sum + (t.category === 'hawala_cancel' ? -paidValue(t) : paidValue(t)), 0)
      return { name: pick.label, rows: [...profitRows, ...txRows].sort((a, b) => b.date.localeCompare(a.date)), balance: allProfit - paid, balanceLabel: 'باقی پشکی شەریک' }
    }

    if (statementKind === 'debt') {
      const acc = toAccounts(debts).find((a) => a.id === selectedId)
      const entries = acc ? acc.entries.filter((e) => inRange(e.date)) : []
      const rows: StatementRow[] = entries.map((e) => ({
        id: e.id,
        date: e.date,
        title: e.kind === 'give' ? 'پارە/قەرز دراوە' : 'پارە وەرگیراوە',
        note: [e.time, e.note].filter(Boolean).join(' · '),
        amount: atRate(e.amount, e.currency, e.rate),
        direction: e.kind === 'give' ? ('increase' as const) : ('decrease' as const),
      }))
      const bal = acc ? balanceOf(acc) : { USD: 0, IQD: 0 }
      const balance = Math.abs(atRate(bal.USD, 'USD') + atRate(bal.IQD, 'IQD'))
      return {
        name: pick.label,
        rows: rows.sort((a, b) => b.date.localeCompare(a.date)),
        balance,
        balanceLabel: debtKind === 'receivable' ? 'کۆی ماوە لەسەر ئەم کەسە' : 'کۆی ماوە لەسەر ئێمە',
      }
    }

    const exchangerTxs = txs.filter((t) => t.exchangerId === selectedId && inRange(t.date))
    const rows: StatementRow[] = exchangerTxs.map((t) => ({
      id: `tx_${t.id}`, date: t.date, title: t.title, note: t.note, amount: atRate(t.amount, t.currency, t.rate),
      direction: (t.category === 'exchange_transfer' || t.category === 'hawala_cancel' ? 'increase' : 'decrease') as 'increase' | 'decrease',
    }))
    return { name: pick.label, rows: rows.sort((a, b) => b.date.localeCompare(a.date)), balance: exchangerBalance(txs, selectedId, cur), balanceLabel: 'باڵانسی لای سەراف' }
  }, [cars, choices, contracts, cur, debtKind, debts, from, selectedId, settings.usdRate, statementKind, to, txs])

  const exportReport = () => {
    const rows = [
      ['راپۆرتی حسابات', `${from} — ${to}`, cur],
      ['داهاتی تۆمارکراو', report.income], ['خەرجی تۆمارکراو', report.expense], ['قازانجی فرۆشتن', report.profit.profit],
      ['کۆی فرۆشتن', report.salesAmount], ['ژمارەی عەقد', report.sales.length],
      ...report.categories.map(([k, v]) => [`خەرجی — ${TX_CATEGORY_KU[k] || k}`, v]),
    ]
    downloadFile(`راپۆرتی_حسابات_${from}_${to}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
  }

  const exportStatement = () => {
    if (!statement.name) return
    const rows = [
      ['کەشف حساب', statement.name, `${from} — ${to}`, cur],
      ['بەروار', 'بەیان', 'لەسەر', 'دراوە'],
      ...statement.rows.map((r) => [r.date, r.title, r.direction === 'increase' ? r.amount : '', r.direction === 'decrease' ? r.amount : '']),
      ['', statement.balanceLabel, statement.balance, ''],
    ]
    downloadFile(`کەشف_حساب_${statement.name}_${from}_${to}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
  }

  if (!can('money.view')) return <Empty icon={<BarChart3 size={26} />} title="دەسەڵاتت نییە" />

  return (
    <>
      <PageHead
        title="راپۆرت و کەشف حساب"
        sub={<span className="num">{fmtDateShort(from)} — {fmtDateShort(to)}</span>}
        action={<div className="flex gap-2"><button onClick={() => window.print()} className="btn-ghost !px-3" aria-label="پرینت"><Printer size={17} /></button><button onClick={tab === 'report' ? exportReport : exportStatement} className="btn-brand !px-3" aria-label="داگرتن"><Download size={17} /></button></div>}
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 print-area">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="grid grid-cols-2 gap-2 grow"><input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="field num text-start field-sm" /><input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="field num text-start field-sm" /></div>
          <div className="sm:w-40"><Segmented value={cur} onChange={setCur} options={[{ v: 'USD', label: 'دۆلار' }, { v: 'IQD', label: 'دینار' }]} size="sm" /></div>
        </div>
        <Segmented value={tab} onChange={setTab} options={[{ v: 'report', label: 'راپۆرتی حسابات' }, { v: 'statement', label: 'کەشف حساب' }]} />

        {tab === 'report' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="داهاتی تۆمارکراو" value={<span className="num">{money(report.income, cur)}</span>} tone="ok" icon={<ArrowDownLeft size={16} />} />
              <Stat label="خەرجی تۆمارکراو" value={<span className="num">{money(report.expense, cur)}</span>} tone="bad" icon={<ArrowUpRight size={16} />} />
              <Stat label="قازانجی فرۆشتن" value={<span className="num">{money(report.profit.profit, cur)}</span>} tone={report.profit.profit >= 0 ? 'brand' : 'bad'} icon={<TrendingUp size={16} />} />
              <Stat label="کۆی فرۆشتن" value={<span className="num">{money(report.salesAmount, cur)}</span>} sub={<><span className="num">{report.sales.length}</span> عەقد</>} icon={<FileSpreadsheet size={16} />} />
            </div>
            <div className="grid grid-cols-2 gap-3"><Stat label="سندوقی دۆلار" value={<span className="num">{money(cashBalance(txs, 'USD'), 'USD')}</span>} icon={<Wallet size={16} />} /><Stat label="سندوقی دینار" value={<span className="num">{money(cashBalance(txs, 'IQD'), 'IQD')}</span>} icon={<Wallet size={16} />} /></div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-line flex items-center gap-2"><ReceiptText size={17} className="text-brand" /><h2 className="font-bold text-sm">خەرجییەکان بەپێی جۆر</h2></div>
              {report.categories.length ? <div className="divide-y divide-line">{report.categories.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-3 px-4 py-3"><span className="text-sm">{TX_CATEGORY_KU[k] || k}</span><b className="num text-bad">{money(v, cur)}</b></div>)}</div> : <Empty icon={<ReceiptText size={24} />} title="هیچ خەرجییەک نییە" sub="لە ماوەی دیاریکراودا" />}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card p-4 space-y-4">
              <Segmented value={statementKind} onChange={(v: StatementKind) => { setStatementKind(v); setSelectedId('') }} options={[{ v: 'customer', label: 'کریار' }, { v: 'partner', label: 'شەریک' }, { v: 'exchanger', label: 'سەراف' }, { v: 'debt', label: 'دەفتەری قەرز' }]} />
              {statementKind === 'debt' && <Segmented value={debtKind} onChange={(v: DebtKind) => { setDebtKind(v); setSelectedId('') }} options={[{ v: 'receivable', label: 'خەڵک قەرزارمە' }, { v: 'payable', label: 'من قەرزارم' }]} />}
              <Picker value={choices.find((x) => x.id === selectedId)?.label || ''} onChange={(label) => setSelectedId(choices.find((x) => x.label === label)?.id || '')} options={choices.map((x) => x.label)} placeholder={`${statementKind === 'customer' ? 'کریار' : statementKind === 'partner' ? 'شەریک' : statementKind === 'exchanger' ? 'سەراف' : debtKind === 'receivable' ? 'کەسی قەرزار' : 'کەسی بڕاوە'} هەڵبژێرە`} />
            </div>
            {!statement.name ? <Empty icon={statementKind === 'customer' ? <Users size={26} /> : statementKind === 'partner' ? <Handshake size={26} /> : statementKind === 'exchanger' ? <ArrowLeftRight size={26} /> : <NotebookPen size={26} />} title="بۆ کەشف حساب، کەسێک هەڵبژێرە" /> : <>
              <div className="grid grid-cols-2 gap-3"><Stat label={statement.balanceLabel} value={<span className="num">{money(statement.balance, cur)}</span>} tone={statement.balance > 0 ? 'brand' : 'ok'} icon={<ReceiptText size={16} />} /><Stat label="جوڵەی ناو ماوە" value={<span className="num">{statement.rows.length}</span>} icon={<BarChart3 size={16} />} /></div>
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-3"><h2 className="font-bold text-sm truncate">کەشف حسابی {statement.name}</h2><span className="text-xs text-muted num">{fmtDateShort(from)} — {fmtDateShort(to)}</span></div>
                {statement.rows.length ? <div className="divide-y divide-line">{statement.rows.map((r) => <div key={r.id} className="flex items-center gap-3 px-4 py-3"><span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${r.direction === 'increase' ? 'bg-warn/15 text-warn' : 'bg-ok/15 text-ok'}`}>{r.direction === 'increase' ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}</span><div className="grow min-w-0"><p className="text-sm font-medium truncate">{r.title}</p><p className="text-xs text-muted truncate"><span className="num">{fmtDateShort(r.date)}</span>{r.note ? ` · ${r.note}` : ''}</p></div><b className={`num text-sm shrink-0 ${r.direction === 'increase' ? 'text-warn' : 'text-ok'}`}>{r.direction === 'increase' ? '+' : '−'}{money(r.amount, cur)}</b></div>)}</div> : <Empty icon={<ReceiptText size={24} />} title="هیچ جوڵەیەک نییە" sub="لە ماوەی دیاریکراودا" />}
              </div>
            </>}
          </div>
        )}
      </div>
    </>
  )
}
