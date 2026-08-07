import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Contract, Settings } from '../lib/types'
import { fmtDateShort, money, num } from '../lib/format'
import { amountWordsAr, amountWordsKu } from '../lib/numwords'
import { BODY_PARTS, PART_STATES } from '../lib/catalog'
import dloLogo from '../assets/dlo-it-logo.png'

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
    vin: 'ژمارەی شاسی (VIN)',
    km: 'کیلۆمەتر',
    plate: 'ژمارەی پلێت',
    body: 'جۆری ئۆتۆمبێل',
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
    received: 'بڕی وەرگیراو',
    rate: 'نرخی دراو',
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
    received: 'المبلغ المستلم',
    rate: 'سعر الصرف',
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

function AutoMark() {
  return (
    <svg viewBox="0 0 116 82" aria-hidden="true" className="w-full h-full">
      <path d="M12 26C30 9 83 7 105 26v33c-16 13-77 15-93 0V26Z" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M24 33h68l9 17H15l9-17Zm14 0 9-12h23l9 12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="31" cy="53" r="8" fill="currentColor" />
      <circle cx="85" cy="53" r="8" fill="currentColor" />
      <path d="M43 62h30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** بەرزی ناوەوەی A4 بە پیکسل — (297mm − ٢×10mm مارجن) لە ٩٦dpi */
const PAGE_H = ((297 - 20) / 25.4) * 96

/**
 * دڵنیادەبێتەوە لەوەی عەقدەکە هەمیشە لە *یەک* لاپەڕەدا جێدەبێتەوە.
 * بەرزی ناوەڕۆک دەپێوێت و ئەگەر لە لاپەڕەکە تێپەڕی، بە ڕێژەیەکی
 * وردەوە بچووکی دەکاتەوە. ئەگەر جێبووەوە، هیچ ناگۆڕێت.
 */
function useOnePage(dep: unknown) {
  const inner = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ k: 1, h: 0 })

  useLayoutEffect(() => {
    const el = inner.current
    const paper = el?.parentElement?.parentElement
    if (!el || !paper) return

    let raf = 0
    const measure = () => {
      const cs = getComputedStyle(paper)
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      const avail = PAGE_H - pad - 4
      /* transform کاریگەری لەسەر scrollHeight نییە، بۆیە پێوانەکە هەمیشە خاوێنە */
      const h = el.scrollHeight
      if (!h) return
      const k = h > avail ? Math.max(0.5, avail / h) : 1
      setFit((p) => (Math.abs(p.k - k) > 0.002 || Math.abs(p.h - h) > 1 ? { k, h } : p))
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }

    schedule()
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    /* دوای بارکردنی فۆنت و وێنەکان دووبارە دەپێوێت */
    const late = setTimeout(schedule, 700)
    document.fonts?.ready.then(schedule).catch(() => {})
    window.addEventListener('beforeprint', measure)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(late)
      ro.disconnect()
      window.removeEventListener('beforeprint', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep])

  return { inner, ...fit }
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="contract-section-title"><span>{children}</span></div>
}

function Line({ label, children, className = '' }: { label: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`contract-line ${className}`}>
      <span className="contract-line-label">{label}</span>
      <span className="contract-line-value">{children || ' '}</span>
    </div>
  )
}

function Party({ title, rows }: { title: string; rows: { label: string; value?: ReactNode }[] }) {
  return (
    <section className="contract-party">
      <SectionTitle>{title}</SectionTitle>
      <div className="contract-party-body">
        {rows.map((row) => <Line key={row.label} label={row.label}>{row.value}</Line>)}
      </div>
    </section>
  )
}

export function ContractSheet({ c, s, lang = 'ku' }: { c: Contract; s: Settings; lang?: Lang }) {
  const t = T[lang]
  const issues = BODY_PARTS.filter((p) => (c.car.body || {})[p.key])
  const rest = c.price - (c.down || 0)
  const cashPayments = (c.cashPayments || []).filter((p) => p.amount > 0)
  const words = lang === 'ku' ? amountWordsKu(c.price, c.currency) : amountWordsAr(c.price, c.currency)
  const terms = lang === 'ku' ? (c.terms?.length ? c.terms : s.terms) : s.termsAr || []
  const showroom = lang === 'ku' ? s.showroomName : s.showroomNameAr || s.showroomName

  const { inner, k, h } = useOnePage(`${c.id}|${lang}|${terms.length}|${c.installments.length}`)

  return (
    <article className="print-sheet contract-paper bg-white text-black font-doc mx-auto shadow-card print:shadow-none" dir="rtl">
     <div className="contract-fit" style={k < 1 ? { height: Math.ceil(h * k) } : undefined}>
      <div ref={inner} className="contract-fit-in" style={k < 1 ? { transform: `scale(${k})` } : undefined}>
      <header className="contract-head">
        <div className="contract-logo" dir="ltr">
          {s.logo ? <img src={s.logo} alt="" /> : <AutoMark />}
        </div>
        <div className="contract-head-center" dir="rtl">
          <p className="contract-head-kicker">{[s.city, s.address].filter(Boolean).join(' — ') || 'پێشانگای ئۆتۆمبێل'}</p>
          <h1>{showroom}</h1>
          <p className="contract-head-subtitle">{t.title}</p>
        </div>
        <div className="contract-head-meta" dir="rtl">
          <Line label={t.no}><b className="num">{c.no}</b></Line>
          <Line label={t.date}><b className="num">{fmtDateShort(c.date)}</b></Line>
          {s.phone && <Line label={t.phone}><b className="num">{s.phone}</b></Line>}
        </div>
      </header>

      <div className="contract-divider" />

      <div className="contract-parties avoid-break">
        <Party title={t.seller} rows={[
          { label: t.name, value: c.seller.name },
          { label: t.phone, value: <span className="num">{c.seller.phone}</span> },
          { label: t.address, value: c.seller.address },
        ]} />
        <Party title={t.buyer} rows={[
          { label: t.name, value: c.buyer.name },
          { label: t.phone, value: <span className="num">{c.buyer.phone}</span> },
          { label: t.idNo, value: <span className="num">{c.buyer.idNumber}</span> },
          { label: t.issuer, value: c.buyer.idIssuer },
          { label: t.address, value: c.buyer.address },
        ]} />
      </div>

      <section className="contract-section avoid-break">
        <SectionTitle>{t.carInfo}</SectionTitle>
        <div className="contract-form-grid">
          <Line label={t.brand}>{c.car.brand}</Line>
          <Line label={t.model}>{c.car.model}</Line>
          <Line label={t.year}><span className="num">{c.car.year}</span></Line>
          <Line label={t.color}>{c.car.color}</Line>
          <Line label={t.km}><span className="num">{num(c.car.km || 0)}</span></Line>
          <Line label={t.plate}><span className="num">{c.car.plate || '—'}</span></Line>
          <Line label={t.body}>{c.car.bodyType || '—'}</Line>
          <Line label={t.fuel}>{c.car.fuel || '—'}</Line>
          <Line label={t.gear}>{c.car.transmission || '—'}</Line>
          <Line label={t.engine}>{c.car.cylinders || '—'}</Line>
          <Line label={t.origin}>{c.car.origin || '—'}</Line>
          <Line label={t.keys}><span className="num">{c.car.keys || '—'}</span></Line>
          <Line label={t.vin} className="contract-vin"><span className="num">{c.car.vin}</span></Line>
        </div>
      </section>

      <section className="contract-section contract-condition avoid-break">
        <SectionTitle>{t.condition}</SectionTitle>
        <div className="contract-condition-body">
          {issues.length === 0 ? t.allOriginal : issues.map((p) => (
            <span key={p.key} className="contract-condition-item">
              <b>{lang === 'ku' ? p.ku : PART_AR[p.key] || p.ku}</b>
              <span>{lang === 'ku' ? PART_STATES[c.car.body![p.key]].ku : STATE_AR[c.car.body![p.key]]}</span>
            </span>
          ))}
          {c.car.bodyNote && <p className="contract-condition-note">{c.car.bodyNote}</p>}
        </div>
      </section>

      <section className="contract-section contract-payment avoid-break">
        <SectionTitle>{t.price} {c.payment === 'installment' ? `— ${t.inst}` : ''}</SectionTitle>
        <div className="contract-payment-grid">
          <div className="contract-price">
            <span>{t.price}</span>
            <strong className="num">{money(c.price, c.currency)}</strong>
          </div>
          <div className="contract-words"><b>{t.inWords}:</b> {words}</div>
          <div className="contract-payment-detail">
            {c.payment === 'cash' ? (
              <>
                <span>{t.cash}</span>
                {cashPayments.length > 0 && <span>{t.received}: <b className="num">{cashPayments.map((p) => money(p.amount, p.currency)).join(' + ')}</b></span>}
                {cashPayments.length > 1 && <span>{t.rate}: <b className="num">1 $ = {money(c.rate, 'IQD')}</b></span>}
              </>
            ) : (
              <>
                <span>{t.down}: <b className="num">{money(c.down, c.currency)}</b></span>
                <span>{t.rest}: <b className="num">{money(rest, c.currency)}</b></span>
                <span><b className="num">{c.installments.length}</b> {lang === 'ku' ? 'قیست' : 'قسط'}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {c.payment === 'installment' && c.installments.length > 0 && (
        <section className="contract-section avoid-break">
          <SectionTitle>{t.instTable}</SectionTitle>
          <table className="contract-installments">
            <thead><tr><th>{t.instNo}</th><th>{t.due}</th><th>{t.amount}</th><th>{t.sign}</th></tr></thead>
            <tbody>{c.installments.map((i) => (
              <tr key={i.no}>
                <td><span className="num">{i.no}</span></td>
                <td><span className="num">{fmtDateShort(i.dueDate)}</span></td>
                <td><b className="num">{money(i.amount, c.currency)}</b></td>
                <td />
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}

      <section className="contract-terms avoid-break">
        <div className="contract-terms-title">{t.terms}</div>
        <ol>{terms.map((term, i) => <li key={i}>{term}</li>)}</ol>
      </section>

      {c.note && <p className="contract-note avoid-break"><b>{t.note}:</b> {c.note}</p>}
      <p className="contract-consent avoid-break">{t.footer}</p>

      <section className="contract-signatures avoid-break">
        {[
          { role: t.seller, name: c.seller.name },
          { role: t.buyer, name: c.buyer.name },
        ].map((party) => (
          <div className="contract-sign" key={party.role}>
            <div className="contract-sign-person">
              <b>{party.role}</b>
              <span><small>{t.name}: </small>{party.name}</span>
            </div>
            <div className="contract-sign-actions">
              <div className="contract-sign-line"><span>{t.signature}</span></div>
              <div className="contract-fingerprint"><span>{t.fingerprint}</span></div>
            </div>
          </div>
        ))}
      </section>

      {(c.witness1 || c.witness2) && (
        <section className="contract-witnesses avoid-break">
          {[
            { label: t.w1, name: c.witness1 },
            { label: t.w2, name: c.witness2 },
          ].filter((w) => w.name).map((w) => (
            <Line key={w.label} label={w.label}>{w.name}</Line>
          ))}
        </section>
      )}

      <footer className="contract-footer">
        <a href="https://www.instagram.com/dlo_.it/" target="_blank" rel="noreferrer" className="contract-promo-link">
          <img src={dloLogo} alt="DLO.IT" className="contract-dlo-logo" />
          <b className="num">07700581716</b>
          <span>بۆ دروستکردنی ئەپلیکەیشن و سیستەمی داتابەیس پەیوەندیم پێوە بکە.</span>
        </a>
      </footer>
      </div>
     </div>
    </article>
  )
}
