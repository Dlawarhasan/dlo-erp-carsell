import { Fragment } from 'react'
import type { Contract, Settings } from '../lib/types'
import { fmtDateShort, money, num } from '../lib/format'
import { amountWordsAr, amountWordsKu } from '../lib/numwords'
import { BODY_PARTS, PART_STATES } from '../lib/catalog'

type Lang = 'ku' | 'ar'

const T = {
  ku: {
    title: 'عەقدی فرۆشتنی ئۆتۆمبێل',
    no: 'ژمارەی عەقد',
    date: 'بەروار',
    seller: 'لای یەکەم — فرۆشیار',
    buyer: 'لای دووەم — کڕیار',
    name: 'ناو',
    phone: 'تەلەفۆن',
    idNo: 'ژمارەی ناسنامە',
    issuer: 'دەرکراوە لە',
    address: 'ناونیشان',
    keys: 'ژمارەی کلیل',
    carInfo: 'زانیاری ئۆتۆمبێل',
    brand: 'براند',
    model: 'مۆدێل',
    year: 'ساڵ',
    color: 'ڕەنگ',
    vin: 'ژمارەی شانس (VIN)',
    km: 'کیلۆمەتر',
    plate: 'ژمارەی پلێت',
    body: 'شێواز',
    fuel: 'سووتەمەنی',
    gear: 'گێڕ',
    engine: 'ماتۆڕ',
    origin: 'ڕەگەز',
    condition: 'دۆخی جەستەی ئۆتۆمبێل',
    allOriginal: 'هەموو پارچەکان ئۆرجینال و سەلیمن.',
    price: 'نرخی فرۆشتن',
    inWords: 'بە نووسین',
    payment: 'شێوازی پارەدان',
    cash: 'نەقد — بە تەواوی وەرگیرا',
    inst: 'بە قیست',
    down: 'پێشەکی',
    rest: 'بەرماوە',
    instTable: 'خشتەی قیستەکان',
    instNo: 'ژ.',
    due: 'بەرواری وەرگرتن',
    amount: 'بڕ',
    sign: 'واژوو',
    terms: 'مەرجەکانی عەقد',
    note: 'تێبینی',
    fingerprint: 'پەنجەمۆر',
    signature: 'واژوو',
    witness: 'شایەت',
    w1: 'شایەتی یەکەم',
    w2: 'شایەتی دووەم',
    footer: 'ئەم عەقدە بە ڕەزامەندی هەردوولا ئیمزا کراوە و لە بەرواری واژوودا کاری پێدەکرێت.',
    copy: 'نوسخەی پێشانگا / نوسخەی کڕیار',
  },
  ar: {
    title: 'عقد بيع سيارة',
    no: 'رقم العقد',
    date: 'التاريخ',
    seller: 'الطرف الأول — البائع',
    buyer: 'الطرف الثاني — المشتري',
    name: 'الاسم',
    phone: 'الهاتف',
    idNo: 'رقم الهوية',
    issuer: 'صادرة من',
    address: 'العنوان',
    keys: 'عدد المفاتيح',
    carInfo: 'معلومات السيارة',
    brand: 'الماركة',
    model: 'الموديل',
    year: 'سنة الصنع',
    color: 'اللون',
    vin: 'رقم الشاسي (VIN)',
    km: 'الكيلومترات',
    plate: 'رقم اللوحة',
    body: 'نوع الهيكل',
    fuel: 'الوقود',
    gear: 'ناقل الحركة',
    engine: 'المحرك',
    origin: 'المنشأ',
    condition: 'حالة هيكل السيارة',
    allOriginal: 'جميع القطع أصلية وسليمة.',
    price: 'سعر البيع',
    inWords: 'كتابةً',
    payment: 'طريقة الدفع',
    cash: 'نقداً — استلم كاملاً',
    inst: 'بالتقسيط',
    down: 'الدفعة المقدمة',
    rest: 'المتبقي',
    instTable: 'جدول الأقساط',
    instNo: 'ت',
    due: 'تاريخ الاستحقاق',
    amount: 'المبلغ',
    sign: 'التوقيع',
    terms: 'شروط العقد',
    note: 'ملاحظات',
    fingerprint: 'بصمة الإبهام',
    signature: 'التوقيع',
    witness: 'شاهد',
    w1: 'الشاهد الأول',
    w2: 'الشاهد الثاني',
    footer: 'حرر هذا العقد برضا الطرفين ويعمل به من تاريخ التوقيع.',
    copy: 'نسخة المعرض / نسخة المشتري',
  },
}

const PART_AR: Record<string, string> = {
  bumperF: 'الصدام الأمامي', bonnet: 'غطاء المحرك', fenderFR: 'الرفرف الأمامي الأيمن', fenderFL: 'الرفرف الأمامي الأيسر',
  doorFR: 'الباب الأمامي الأيمن', doorFL: 'الباب الأمامي الأيسر', doorRR: 'الباب الخلفي الأيمن', doorRL: 'الباب الخلفي الأيسر',
  quarterRR: 'الرفرف الخلفي الأيمن', quarterRL: 'الرفرف الخلفي الأيسر', roof: 'السقف', trunk: 'غطاء الصندوق',
  bumperR: 'الصدام الخلفي', pillarR: 'العمود الأيمن', pillarL: 'العمود الأيسر', chassis: 'الشاسي',
  glassF: 'الزجاج الأمامي', glassR: 'الزجاج الخلفي',
}
const STATE_AR: Record<string, string> = {
  original: 'أصلي', painted: 'مصبوغ', putty: 'معجون', replaced: 'مستبدل', dented: 'مضروب', scratched: 'خدش',
}

export function ContractSheet({ c, s, lang = 'ku' }: { c: Contract; s: Settings; lang?: Lang }) {
  const t = T[lang]
  const issues = BODY_PARTS.filter((p) => (c.car.body || {})[p.key])
  const rest = c.price - (c.down || 0)
  const words = lang === 'ku' ? amountWordsKu(c.price, c.currency) : amountWordsAr(c.price, c.currency)

  const L = ({ k, v }: { k: string; v?: React.ReactNode }) => (
    <div className="flex gap-1.5 items-baseline">
      <span className="text-[10.5pt] text-neutral-600 shrink-0">{k}:</span>
      <span className="text-[11pt] font-bold border-b border-dotted border-neutral-400 grow pb-0.5">{v || ' '}</span>
    </div>
  )

  return (
    <div
      className="print-sheet bg-white text-black font-doc mx-auto shadow-card print:shadow-none"
      style={{ width: '100%', maxWidth: '820px', padding: '12px 16px' }}
      dir="rtl"
    >
      {/* ---- سەردێڕ ---- */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div className="flex items-center gap-3">
          {s.logo && <img src={s.logo} alt="" className="w-16 h-16 object-contain" />}
          <div>
            <h1 className="text-[17pt] font-bold leading-tight">{lang === 'ku' ? s.showroomName : s.showroomNameAr || s.showroomName}</h1>
            <p className="text-[9.5pt] text-neutral-700 mt-0.5">
              {[s.city, s.address].filter(Boolean).join(' — ')}
              {s.phone ? ` · ${s.phone}` : ''}
              {s.phone2 ? ` · ${s.phone2}` : ''}
            </p>
          </div>
        </div>
        <div className="text-end text-[10pt] leading-6 shrink-0">
          <p>
            <span className="text-neutral-600">{t.no}: </span>
            <b className="num">{c.no}</b>
          </p>
          <p>
            <span className="text-neutral-600">{t.date}: </span>
            <b className="num">{fmtDateShort(c.date)}</b>
          </p>
        </div>
      </div>

      <h2 className="text-center text-[15pt] font-bold my-2.5 tracking-wide">{t.title}</h2>

      {/* ---- لایەنەکان ---- */}
      <div className="grid grid-cols-2 gap-4 avoid-break">
        <div className="border border-neutral-400 rounded p-2.5">
          <p className="text-[10pt] font-bold bg-neutral-100 -m-2.5 mb-2 p-1.5 px-2.5 border-b border-neutral-300">{t.seller}</p>
          <div className="space-y-1.5">
            <L k={t.name} v={c.seller.name} />
            <L k={t.phone} v={<span className="num">{c.seller.phone}</span>} />
            <L k={t.address} v={c.seller.address} />
          </div>
        </div>
        <div className="border border-neutral-400 rounded p-2.5">
          <p className="text-[10pt] font-bold bg-neutral-100 -m-2.5 mb-2 p-1.5 px-2.5 border-b border-neutral-300">{t.buyer}</p>
          <div className="space-y-1.5">
            <L k={t.name} v={c.buyer.name} />
            <L k={t.phone} v={<span className="num">{c.buyer.phone}</span>} />
            <L k={t.idNo} v={<span className="num">{c.buyer.idNumber}</span>} />
            <L k={t.issuer} v={c.buyer.idIssuer} />
            <L k={t.address} v={c.buyer.address} />
          </div>
        </div>
      </div>

      {/* ---- ئۆتۆمبێل ---- */}
      <div className="mt-3 avoid-break">
        <p className="text-[10.5pt] font-bold bg-neutral-100 border border-neutral-400 rounded-t px-2.5 py-1.5">{t.carInfo}</p>
        <table className="w-full border-collapse border border-neutral-400 border-t-0 text-[10.5pt]">
          <tbody>
            <Tr a={[t.brand, c.car.brand]} b={[t.model, c.car.model]} c={[t.year, <span key="y" className="num">{c.car.year}</span>]} />
            <Tr a={[t.color, c.car.color]} b={[t.km, <span key="k" className="num">{num(c.car.km || 0)}</span>]} c={[t.plate, <span key="p" className="num">{c.car.plate || '—'}</span>]} />
            <Tr a={[t.body, c.car.bodyType || '—']} b={[t.fuel, c.car.fuel || '—']} c={[t.gear, c.car.transmission || '—']} />
            <Tr a={[t.engine, c.car.cylinders || '—']} b={[t.origin, c.car.origin || '—']} c={[t.keys, c.car.keys ? <span key="kk" className="num">{c.car.keys}</span> : '—']} />
            <tr>
              <td className="border border-neutral-400 px-2 py-1.5 bg-neutral-50 text-neutral-700 w-[110px]">{t.vin}</td>
              <td className="border border-neutral-400 px-2 py-1.5 font-bold tracking-[0.18em] text-[12pt]" colSpan={5} dir="ltr">
                <span className="num">{c.car.vin}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- دۆخی جەستە ---- */}
      <div className="mt-3 avoid-break">
        <p className="text-[10.5pt] font-bold bg-neutral-100 border border-neutral-400 rounded-t px-2.5 py-1.5">{t.condition}</p>
        <div className="border border-neutral-400 border-t-0 rounded-b px-2.5 py-2 text-[10.5pt] leading-6">
          {issues.length === 0 ? (
            <p>{t.allOriginal}</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {issues.map((p) => (
                <span key={p.key}>
                  • {lang === 'ku' ? p.ku : PART_AR[p.key] || p.ku}:{' '}
                  <b>{lang === 'ku' ? PART_STATES[c.car.body![p.key]].ku : STATE_AR[c.car.body![p.key]]}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- پارە ---- */}
      <div className="mt-3 avoid-break">
        <table className="w-full border-collapse border border-neutral-400 text-[10.5pt]">
          <tbody>
            <tr>
              <td className="border border-neutral-400 px-2 py-2 bg-neutral-50 text-neutral-700 w-[110px]">{t.price}</td>
              <td className="border border-neutral-400 px-2 py-2 font-bold text-[13pt]"><span className="num">{money(c.price, c.currency)}</span></td>
              <td className="border border-neutral-400 px-2 py-2 bg-neutral-50 text-neutral-700 w-[80px]">{t.inWords}</td>
              <td className="border border-neutral-400 px-2 py-2">{words}</td>
            </tr>
            <tr>
              <td className="border border-neutral-400 px-2 py-2 bg-neutral-50 text-neutral-700">{t.payment}</td>
              <td className="border border-neutral-400 px-2 py-2 font-bold" colSpan={3}>
                {c.payment === 'cash' ? (
                  t.cash
                ) : (
                  <span>
                    {t.inst} — {t.down}: <span className="num">{money(c.down, c.currency)}</span> · {t.rest}:{' '}
                    <span className="num">{money(rest, c.currency)}</span> (<span className="num">{c.installments.length}</span>{' '}
                    {lang === 'ku' ? 'قیست' : 'قسط'})
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---- خشتەی قیست ---- */}
      {c.payment === 'installment' && c.installments.length > 0 && (
        <div className="mt-3 avoid-break">
          <p className="text-[10.5pt] font-bold bg-neutral-100 border border-neutral-400 rounded-t px-2.5 py-1.5">{t.instTable}</p>
          <table className="w-full border-collapse border border-neutral-400 border-t-0 text-[10pt]">
            <thead>
              <tr className="bg-neutral-50">
                <th className="border border-neutral-400 px-2 py-1 w-10">{t.instNo}</th>
                <th className="border border-neutral-400 px-2 py-1">{t.due}</th>
                <th className="border border-neutral-400 px-2 py-1">{t.amount}</th>
                <th className="border border-neutral-400 px-2 py-1 w-28">{t.sign}</th>
              </tr>
            </thead>
            <tbody>
              {c.installments.map((i) => (
                <tr key={i.no}>
                  <td className="border border-neutral-400 px-2 py-1.5 text-center"><span className="num">{i.no}</span></td>
                  <td className="border border-neutral-400 px-2 py-1.5 text-center"><span className="num">{fmtDateShort(i.dueDate)}</span></td>
                  <td className="border border-neutral-400 px-2 py-1.5 text-center font-bold"><span className="num">{money(i.amount, c.currency)}</span></td>
                  <td className="border border-neutral-400 px-2 py-1.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- مەرجەکان ---- */}
      <div className="mt-3 avoid-break">
        <p className="text-[10.5pt] font-bold bg-neutral-100 border border-neutral-400 rounded-t px-2.5 py-1.5">{t.terms}</p>
        <ol className="border border-neutral-400 border-t-0 rounded-b px-6 py-2 text-[10pt] leading-6 list-decimal space-y-0.5">
          {(lang === 'ku' ? (c.terms?.length ? c.terms : s.terms) : s.termsAr || []).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      </div>

      {c.note && (
        <p className="mt-2.5 text-[10pt] leading-6">
          <b>{t.note}: </b>
          {c.note}
        </p>
      )}

      <p className="text-[9.5pt] text-neutral-600 mt-3 text-center">{t.footer}</p>

      {/* ---- واژوو و پەنجەمۆر ---- */}
      <div className="grid grid-cols-2 gap-6 mt-4 avoid-break">
        {[
          { role: t.seller, name: c.seller.name },
          { role: t.buyer, name: c.buyer.name },
        ].map((p) => (
          <div key={p.role} className="border border-neutral-400 rounded p-3">
            <p className="text-[10pt] font-bold mb-1">{p.role}</p>
            <p className="text-[10.5pt] mb-3">{p.name}</p>
            <div className="flex items-end gap-3">
              <div className="grow">
                <div className="h-12 border-b border-neutral-500" />
                <p className="text-[9pt] text-neutral-600 text-center mt-1">{t.signature}</p>
              </div>
              <div className="shrink-0">
                <div className="w-[26mm] h-[26mm] border border-neutral-500 rounded-sm bg-neutral-50" />
                <p className="text-[9pt] text-neutral-600 text-center mt-1">{t.fingerprint}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(c.witness1 || c.witness2) && (
        <div className="grid grid-cols-2 gap-6 mt-3 avoid-break">
          {[
            { l: t.w1, n: c.witness1 },
            { l: t.w2, n: c.witness2 },
          ]
            .filter((x) => x.n)
            .map((x) => (
              <div key={x.l} className="text-[10pt]">
                <p className="text-neutral-600">{x.l}</p>
                <p className="font-bold border-b border-dotted border-neutral-400 pb-1 mt-1">{x.n}</p>
                <div className="h-8 border-b border-neutral-500 mt-2" />
                <p className="text-[9pt] text-neutral-600 text-center mt-1">{t.signature}</p>
              </div>
            ))}
        </div>
      )}

      <p className="text-[8.5pt] text-neutral-500 text-center mt-3 pt-2 border-t border-neutral-300">
        {t.copy} · <span className="num">{c.no}</span> · <span className="num">{fmtDateShort(c.date)}</span>
      </p>
    </div>
  )
}

function Tr({ a, b, c }: { a: [string, React.ReactNode]; b: [string, React.ReactNode]; c: [string, React.ReactNode] }) {
  return (
    <tr>
      {[a, b, c].map(([k, v], i) => (
        <Fragment key={i}>
          <td className="border border-neutral-400 px-2 py-1.5 bg-neutral-50 text-neutral-700 w-[90px]">{k}</td>
          <td className="border border-neutral-400 px-2 py-1.5 font-bold">{v}</td>
        </Fragment>
      ))}
    </tr>
  )
}
