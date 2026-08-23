/**
 * عەقدی دەرەکی — مامەڵەی نێوان دوو کەسی دەرەکی کە لە پێشانگاکەماندا دەکرێت.
 *
 * جیاوازی سەرەکی لەگەڵ عەقدی ئاسایی:
 *   • پێشانگا لایەنی مامەڵەکە نییە — ناوبژیوانە
 *   • پارەی مامەڵەکە بە دەستی ئێمەدا تێناپەڕێت
 *   • تەنها عمولەکە دەچێتە سندوقەوە، و ئەویش قازانجی سافە
 */

import type { BrokerDeal, Settings } from '../lib/types'
import { fmtDateShort, money, num } from '../lib/format'
import { amountWordsAr, amountWordsKu } from '../lib/numwords'
import { AutoMark, Line, Party, SectionTitle, useOnePage } from './ContractSheet'
import dloLogo from '../assets/dlo-it-logo.png'

type Lang = 'ku' | 'ar'

const T = {
  ku: {
    title: 'عەقدی فرۆشتنی ئۆتۆمبێل — بە ناوبژیوانیی پێشانگا',
    no: 'ژمارەی عەقد', date: 'بەروار', phone: 'تەلەفۆن',
    seller: 'لای یەکەم — فرۆشیار', buyer: 'لای دووەم — کڕیار',
    broker: 'ناوبژیوان — پێشانگا',
    name: 'ناو', idNo: 'ژمارەی ناسنامە', issuer: 'دەرکراوە لە', address: 'ناونیشان',
    carInfo: 'زانیاری ئۆتۆمبێل',
    brand: 'براند', model: 'مۆدێل', year: 'ساڵ', color: 'ڕەنگ', vin: 'ژمارەی شاسی (VIN)',
    km: 'کیلۆمەتر', plate: 'ژمارەی پلێت', body: 'جۆری ئۆتۆمبێل', fuel: 'سووتەمەنی', gear: 'گێڕ',
    price: 'نرخی فرۆشتن', inWords: 'بە نووسین',
    paid: 'پارەکە ڕاستەوخۆ لە نێوان فرۆشیار و کڕیاردا دراوە و وەرگیراوە.',
    fee: 'عمولەی ناوبژیوانی', feeNone: 'بێ عمولە', feeNote: 'وەرگیراوە لەلایەن پێشانگاوە',
    terms: 'مەرجەکانی عەقد', note: 'تێبینی',
    fingerprint: 'پەنجەمۆر', signature: 'واژوو',
    w1: 'شایەتی یەکەم', w2: 'شایەتی دووەم',
    footer: 'پێشانگا تەنها ناوبژیوانە و هیچ بەرپرسیارێتییەکی یاساییی لەسەر ئۆتۆمبێلەکە نییە. ' +
      'ئەم عەقدە بە ڕەزامەندی هەردوولا ئیمزا کراوە و لە بەرواری واژوودا کاری پێدەکرێت.',
  },
  ar: {
    title: 'عقد بيع سيارة — بوساطة المعرض',
    no: 'رقم العقد', date: 'التاريخ', phone: 'الهاتف',
    seller: 'الطرف الأول — البائع', buyer: 'الطرف الثاني — المشتري',
    broker: 'الوسيط — المعرض',
    name: 'الاسم', idNo: 'رقم الهوية', issuer: 'صادرة من', address: 'العنوان',
    carInfo: 'معلومات السيارة',
    brand: 'الماركة', model: 'الموديل', year: 'سنة الصنع', color: 'اللون', vin: 'رقم الشاسي (VIN)',
    km: 'الكيلومترات', plate: 'رقم اللوحة', body: 'نوع الهيكل', fuel: 'الوقود', gear: 'ناقل الحركة',
    price: 'سعر البيع', inWords: 'كتابةً',
    paid: 'تم تسليم واستلام المبلغ مباشرة بين البائع والمشتري.',
    fee: 'أجور الوساطة', feeNone: 'بدون أجور', feeNote: 'استلمها المعرض',
    terms: 'شروط العقد', note: 'ملاحظات',
    fingerprint: 'بصمة الإبهام', signature: 'التوقيع',
    w1: 'الشاهد الأول', w2: 'الشاهد الثاني',
    footer: 'المعرض وسيط فقط ولا يتحمل أي مسؤولية قانونية عن السيارة. ' +
      'حرر هذا العقد برضا الطرفين ويعمل به من تاريخ التوقيع.',
  },
}

export function BrokerSheet({ d, s, lang = 'ku' }: { d: BrokerDeal; s: Settings; lang?: Lang }) {
  const t = T[lang]
  const words = lang === 'ku' ? amountWordsKu(d.price, d.currency) : amountWordsAr(d.price, d.currency)
  const showroom = lang === 'ku' ? s.showroomName : s.showroomNameAr || s.showroomName
  const terms = d.terms?.length ? d.terms : lang === 'ku' ? s.terms : s.termsAr || []

  const shopAddress = [s.city, s.address].filter(Boolean).join(' — ')

  const { inner, k, h, avail, gap } = useOnePage(`${d.id}|${lang}|${terms.length}`)
  const shrink = k < 1

  return (
    <article className="print-sheet contract-paper bg-white text-black font-doc mx-auto shadow-card print:shadow-none" dir="rtl">
     <div className="contract-fit" style={shrink ? { height: Math.ceil(h * k) } : undefined}>
      <div
        ref={inner}
        className="contract-fit-in"
        style={shrink ? { transform: `scale(${k})` } : { minHeight: avail || undefined, rowGap: gap || undefined }}
      >
        <header className="contract-head">
          <div className="contract-logo" dir="ltr">{s.logo ? <img src={s.logo} alt="" /> : <AutoMark />}</div>
          <div className="contract-head-center" dir="rtl">
            <h1>{showroom}</h1>
            <p className="contract-head-subtitle">{t.title}</p>
          </div>
          <div className="contract-head-meta" dir="rtl">
            <Line label={t.no}><b className="num">{d.no}</b></Line>
            <Line label={t.date}><b className="num">{fmtDateShort(d.date)}</b></Line>
            {s.phone && <Line label={t.phone}><b className="num">{s.phone}</b></Line>}
          </div>
        </header>

        <div className="contract-divider" />

        <div className="contract-parties avoid-break">
          <Party title={t.seller} rows={[
            { label: t.name, value: d.seller.name },
            { label: t.phone, value: <span className="num">{d.seller.phone}</span> },
            { label: t.idNo, value: <span className="num">{d.seller.idNumber}</span> },
            { label: t.address, value: d.seller.address },
          ]} />
          <Party title={t.buyer} rows={[
            { label: t.name, value: d.buyer.name },
            { label: t.phone, value: <span className="num">{d.buyer.phone}</span> },
            { label: t.idNo, value: <span className="num">{d.buyer.idNumber}</span> },
            { label: t.address, value: d.buyer.address },
          ]} />
        </div>

        <section className="contract-section avoid-break">
          <SectionTitle>{t.carInfo}</SectionTitle>
          <div className="contract-form-grid">
            <Line label={t.brand}>{d.car.brand || '—'}</Line>
            <Line label={t.model}>{d.car.model || '—'}</Line>
            <Line label={t.year}><span className="num">{d.car.year || '—'}</span></Line>
            <Line label={t.color}>{d.car.color || '—'}</Line>
            <Line label={t.km}><span className="num">{d.car.km ? num(d.car.km) : '—'}</span></Line>
            <Line label={t.plate}><span className="num">{d.car.plate || '—'}</span></Line>
            <Line label={t.body}>{d.car.bodyType || '—'}</Line>
            <Line label={t.fuel}>{d.car.fuel || '—'}</Line>
            <Line label={t.gear}>{d.car.transmission || '—'}</Line>
            <Line label={t.vin} className="contract-vin"><span className="num">{d.car.vin || '—'}</span></Line>
          </div>
        </section>

        <section className="contract-section contract-payment avoid-break">
          <SectionTitle>{t.price}</SectionTitle>
          <div className="contract-payment-grid">
            <div className="contract-price">
              <span>{t.price}</span>
              <strong className="num">{money(d.price, d.currency)}</strong>
            </div>
            <div className="contract-words"><b>{t.inWords}:</b> {words}</div>
            <div className="contract-payment-detail"><span>{t.paid}</span></div>
          </div>
        </section>

        {/* عمولەی ناوبژیوانی — بەشێکی جیاواز و ڕوون */}
        <section className="contract-section broker-fee avoid-break">
          <SectionTitle>{t.fee}</SectionTitle>
          <div className="broker-fee-body">
            <div className="broker-fee-amount">
              <span>{t.fee}</span>
              <strong className="num">{d.fee > 0 ? money(d.fee, d.feeCurrency) : t.feeNone}</strong>
            </div>
            <div className="broker-fee-side">
              <b>{showroom}</b>
              {d.fee > 0 && <span>{t.feeNote}</span>}
            </div>
          </div>
        </section>

        <section className="contract-terms avoid-break">
          <div className="contract-terms-title">{t.terms}</div>
          <ol>{terms.map((term, i) => <li key={i}>{term}</li>)}</ol>
        </section>

        {d.note && <p className="contract-note avoid-break"><b>{t.note}:</b> {d.note}</p>}
        <p className="contract-consent avoid-break">{t.footer}</p>

        <div className="contract-spacer" aria-hidden="true" />

        <section className="contract-signatures broker-signatures avoid-break">
          {[
            { role: t.seller, name: d.seller.name },
            { role: t.buyer, name: d.buyer.name },
            { role: t.broker, name: showroom },
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

        {(d.witness1 || d.witness2) && (
          <section className="contract-witnesses avoid-break">
            {[{ label: t.w1, name: d.witness1 }, { label: t.w2, name: d.witness2 }]
              .filter((w) => w.name)
              .map((w) => <Line key={w.label} label={w.label}>{w.name}</Line>)}
          </section>
        )}

        <section className="contract-shopline avoid-break">
          <b>{showroom}</b>
          {shopAddress && <span>{shopAddress}</span>}
          {s.phone && <span className="num" dir="ltr">{s.phone}</span>}
          {s.phone2 && <span className="num" dir="ltr">{s.phone2}</span>}
        </section>

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
