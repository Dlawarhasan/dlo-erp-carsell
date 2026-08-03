import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Phone, Pencil, Trash2, FileText, MessageCircle } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, Field, Picker, SearchBar, Sheet, useConfirm } from '../components/ui'
import { CITIES } from '../lib/catalog'
import { contractDebt } from '../lib/finance'
import { fold, money, normalizePhone, uid } from '../lib/format'
import type { Customer } from '../lib/types'

export default function CustomersPage() {
  const nav = useNavigate()
  const { customers, contracts, save, remove, say, can, settings } = useApp()
  const { ask, node } = useConfirm()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Partial<Customer> | null>(null)

  const rows = useMemo(() => {
    const fq = fold(q)
    return customers
      .map((c) => {
        const mine = contracts.filter((x) => x.buyerId === c.id && x.status !== 'cancelled')
        return { c, count: mine.length, debt: mine.reduce((s, x) => s + contractDebt(x), 0), cur: mine[0]?.currency || 'USD' }
      })
      .filter(({ c }) => !fq || fold(c.name).includes(fq) || (c.phone || '').includes(fq) || (c.idNumber || '').includes(fq))
      .sort((a, b) => b.debt - a.debt || b.count - a.count || a.c.name.localeCompare(b.c.name))
  }, [customers, contracts, q])

  const submit = async () => {
    if (!edit?.name || !edit?.phone) return say('ناو و ژمارە پێویستە', 'bad')
    const c: Customer = {
      id: edit.id || uid('cus'),
      name: edit.name,
      phone: normalizePhone(edit.phone),
      phone2: edit.phone2,
      idNumber: edit.idNumber,
      idIssuer: edit.idIssuer,
      address: edit.address,
      city: edit.city,
      note: edit.note,
      createdAt: edit.createdAt || Date.now(),
    }
    await save('customers', c)
    say(edit.id ? 'نوێکرایەوە' : 'کریار زیادکرا')
    setEdit(null)
  }

  const del = async (c: Customer) => {
    if (!(await ask(`سڕینەوەی ${c.name}؟`))) return
    await remove('customers', c.id, c.name)
    say('سڕایەوە')
  }

  return (
    <>
      <PageHead
        title="کریارەکان"
        sub={<><span className="num">{customers.length}</span> کەس</>}
        action={
          can('contract.create') ? (
            <button onClick={() => setEdit({ city: settings.city })} className="btn-brand shrink-0">
              <Plus size={17} /> <span className="hidden sm:inline">نوێ</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <SearchBar value={q} onChange={setQ} placeholder="بگەڕێ بە ناو، ژمارە یان ناسنامە..." />

        {rows.length === 0 ? (
          <Empty icon={<Users size={26} />} title="هیچ کریارێک نییە" sub="کاتێک ئۆتۆمبێل دەفرۆشیت کریارەکە خۆکارانە زیاد دەکرێت" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map(({ c, count, debt, cur }) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-xl bg-brand/15 text-brand grid place-items-center font-bold shrink-0">{c.name.charAt(0)}</span>
                  <div className="grow min-w-0">
                    <p className="font-bold truncate">{c.name}</p>
                    <p className="text-[13px] text-muted num" dir="ltr">
                      {c.phone}
                    </p>
                    {c.idNumber && (
                      <p className="text-xs text-muted mt-0.5">
                        ناسنامە: <span className="num">{c.idNumber}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <a href={`tel:${c.phone}`} className="btn-quiet !p-2">
                      <Phone size={16} />
                    </a>
                    <a href={`https://wa.me/${c.phone.replace(/^0/, '964').replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="btn-quiet !p-2">
                      <MessageCircle size={16} />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                  <span className="chip bg-surface2 border-line">
                    <FileText size={12} /> <span className="num">{count}</span> عەقد
                  </span>
                  {debt > 0 && <span className="chip bg-warn/12 text-warn border-warn/30">قەرز <span className="num">{money(debt, cur)}</span></span>}
                  <span className="grow" />
                  {can('contract.create') && (
                    <>
                      <button onClick={() => setEdit(c)} className="btn-quiet !p-2">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => del(c)} className="btn-quiet !p-2 hover:!text-bad">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
                {count > 0 && (
                  <div className="mt-2 space-y-1">
                    {contracts
                      .filter((x) => x.buyerId === c.id && x.status !== 'cancelled')
                      .slice(0, 3)
                      .map((x) => (
                        <button key={x.id} onClick={() => nav(`/contracts/${x.id}`)} className="w-full text-start text-xs text-muted hover:text-brand truncate">
                          • {x.car.brand} {x.car.model} <span className="num">{x.car.year}</span> — <span className="num">{money(x.price, x.currency)}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? 'دەستکاری کریار' : 'کریاری نوێ'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEdit(null)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={submit}>
              خەزنکردن
            </button>
          </>
        }
      >
        {edit && (
          <div className="space-y-4">
            <Field label="ناوی سیانی *">
              <input value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="field" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ژمارەی تەلەفۆن *">
                <input dir="ltr" value={edit.phone || ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="field text-start num" />
              </Field>
              <Field label="ژمارەی دووەم">
                <input dir="ltr" value={edit.phone2 || ''} onChange={(e) => setEdit({ ...edit, phone2: e.target.value })} className="field text-start num" />
              </Field>
              <Field label="ژمارەی ناسنامە">
                <input dir="ltr" value={edit.idNumber || ''} onChange={(e) => setEdit({ ...edit, idNumber: e.target.value })} className="field text-start num" />
              </Field>
              <Field label="دەرکراوە لە">
                <input value={edit.idIssuer || ''} onChange={(e) => setEdit({ ...edit, idIssuer: e.target.value })} className="field" />
              </Field>
              <Field label="شار">
                <Picker value={edit.city || ''} onChange={(v) => setEdit({ ...edit, city: v })} options={CITIES} />
              </Field>
              <Field label="ناونیشان">
                <input value={edit.address || ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} className="field" />
              </Field>
            </div>
            <Field label="تێبینی">
              <textarea rows={2} value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} className="field" />
            </Field>
          </div>
        )}
      </Sheet>

      {node}
    </>
  )
}
