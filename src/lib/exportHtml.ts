import type { Contract, Settings } from './types'
import { fmtDateShort, money, num } from './format'
import { amountWordsAr, amountWordsKu } from './numwords'
import { BODY_PARTS, PART_STATES } from './catalog'

type Lang = 'ku' | 'ar'

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const L = {
  ku: {
    title: 'عەقدی فرۆشتنی ئۆتۆمبێل', no: 'ژمارەی عەقد', date: 'بەروار',
    seller: 'لای یەکەم — فرۆشیار', buyer: 'لای دووەم — کڕیار',
    name: 'ناو', phone: 'تەلەفۆن', idNo: 'ژمارەی ناسنامە', issuer: 'دەرکراوە لە', address: 'ناونیشان', keys: 'ژمارەی کلیل',
    carInfo: 'زانیاری ئۆتۆمبێل', brand: 'براند', model: 'مۆدێل', year: 'ساڵ', color: 'ڕەنگ',
    vin: 'ژمارەی شانس (VIN)', km: 'کیلۆمەتر', plate: 'پلێت', body: 'شێواز', fuel: 'سووتەمەنی',
    gear: 'گێڕ', engine: 'ماتۆڕ', origin: 'ڕەگەز', condition: 'دۆخی جەستەی ئۆتۆمبێل',
    allOriginal: 'هەموو پارچەکان ئۆرجینال و سەلیمن.', price: 'نرخی فرۆشتن', inWords: 'بە نووسین',
    payment: 'شێوازی پارەدان', cash: 'نەقد — بە تەواوی وەرگیرا', inst: 'بە قیست', down: 'پێشەکی',
    rest: 'بەرماوە', instTable: 'خشتەی قیستەکان', instNo: 'ژ.', due: 'بەرواری وەرگرتن', amount: 'بڕ',
    sign: 'واژوو', terms: 'مەرجەکانی عەقد', note: 'تێبینی', fingerprint: 'پەنجەمۆر', signature: 'واژوو',
    w1: 'شایەتی یەکەم', w2: 'شایەتی دووەم',
    footer: 'ئەم عەقدە بە ڕەزامەندی هەردوولا ئیمزا کراوە و لە بەرواری واژوودا کاری پێدەکرێت.',
  },
  ar: {
    title: 'عقد بيع سيارة', no: 'رقم العقد', date: 'التاريخ',
    seller: 'الطرف الأول — البائع', buyer: 'الطرف الثاني — المشتري',
    name: 'الاسم', phone: 'الهاتف', idNo: 'رقم الهوية', issuer: 'صادرة من', address: 'العنوان', keys: 'عدد المفاتيح',
    carInfo: 'معلومات السيارة', brand: 'الماركة', model: 'الموديل', year: 'سنة الصنع', color: 'اللون',
    vin: 'رقم الشاسي (VIN)', km: 'الكيلومترات', plate: 'اللوحة', body: 'نوع الهيكل', fuel: 'الوقود',
    gear: 'ناقل الحركة', engine: 'المحرك', origin: 'المنشأ', condition: 'حالة هيكل السيارة',
    allOriginal: 'جميع القطع أصلية وسليمة.', price: 'سعر البيع', inWords: 'كتابةً',
    payment: 'طريقة الدفع', cash: 'نقداً — استلم كاملاً', inst: 'بالتقسيط', down: 'الدفعة المقدمة',
    rest: 'المتبقي', instTable: 'جدول الأقساط', instNo: 'ت', due: 'تاريخ الاستحقاق', amount: 'المبلغ',
    sign: 'التوقيع', terms: 'شروط العقد', note: 'ملاحظات', fingerprint: 'بصمة الإبهام', signature: 'التوقيع',
    w1: 'الشاهد الأول', w2: 'الشاهد الثاني',
    footer: 'حرر هذا العقد برضا الطرفين ويعمل به من تاريخ التوقيع.',
  },
}

const PART_AR: Record<string, string> = {
  bumperF: 'الصدام الأمامي', bonnet: 'غطاء المحرك', fenderFR: 'الرفرف الأمامي الأيمن', fenderFL: 'الرفرف الأمامي الأيسر',
  doorFR: 'الباب الأمامي الأيمن', doorFL: 'الباب الأمامي الأيسر', doorRR: 'الباب الخلفي الأيمن', doorRL: 'الباب الخلفي الأيسر',
  quarterRR: 'الرفرف الخلفي الأيمن', quarterRL: 'الرفرف الخلفي الأيسر', roof: 'السقف', trunk: 'غطاء الصندوق',
  bumperR: 'الصدام الخلفي', pillarR: 'العمود الأيمن', pillarL: 'العمود الأيسر', chassis: 'الشاسي',
  glassF: 'الزجاج الأمامي', glassR: 'الزجاج الخلفي',
}
const STATE_AR: Record<string, string> = { original: 'أصلي', painted: 'مصبوغ', putty: 'معجون', replaced: 'مستبدل', dented: 'مضروب', scratched: 'خدش' }

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
*{box-sizing:border-box}
body{margin:0;background:#e9edf2;font-family:'Noto Naskh Arabic','Times New Roman',serif;color:#111}
.sheet{--orange:#ff9d0a;--coral:#f04452;width:210mm;min-height:297mm;background:#fff;margin:10px auto;padding:8mm;box-shadow:0 2px 14px rgba(0,0,0,.15)}
.num{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:1mm solid transparent;border-image:linear-gradient(90deg,var(--orange),var(--coral)) 1;padding:1mm 2mm 3mm;gap:14px}
.hd h1{font-size:19pt;margin:0;font-family:'Noto Kufi Arabic',sans-serif;text-align:center}
.hd p{margin:3px 0 0;font-size:9.5pt;color:#555;text-align:center}
.meta{font-size:9.5pt;line-height:1.9;text-align:left;white-space:nowrap}
h2.t{text-align:center;font-size:12pt;margin:9px 0 12px;color:var(--coral);font-family:'Noto Kufi Arabic',sans-serif}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.box{border:1px solid #ffc4c8;border-radius:3mm;overflow:hidden;background:#fff4f4}
.box>.bt{color:#fff;background:linear-gradient(100deg,var(--orange),var(--coral));padding:1.4mm 2.7mm;font-size:10pt;font-weight:700}
.box>.bb{padding:2.5mm 2.7mm}
.row{display:flex;gap:2mm;align-items:center;margin-bottom:1.4mm}
.row span.k{color:#fff;background:#111;border-radius:999px;padding:.8mm 2mm 1mm;font-family:'Noto Kufi Arabic',sans-serif;font-size:8pt;font-weight:700;white-space:nowrap}
.row span.v{font-size:10pt;font-weight:700;border-bottom:1px dotted #999;flex:1;padding-bottom:1mm;min-height:5mm}
table{width:100%;border-collapse:collapse;font-size:10pt;background:#fff}
td,th{border-left:1px solid #ffd0d2;border-bottom:1px solid #ffd0d2;padding:1.45mm 2mm}
td.k{color:#fff;background:#111;width:90px;white-space:nowrap;font-family:'Noto Kufi Arabic',sans-serif;font-size:8pt}
td.v{font-weight:700}
.vin{font-size:12.5pt;letter-spacing:.18em;font-weight:700;direction:ltr;text-align:left}
.sec{margin-top:3mm;border:1px solid #ffc4c8;border-radius:3mm;overflow:hidden}
.sec .hd2{color:#fff;background:linear-gradient(100deg,var(--orange),var(--coral));padding:1.4mm 2.7mm;font-family:'Noto Kufi Arabic',sans-serif;font-size:10pt;font-weight:700}
.sec .bd{padding:2mm 2.7mm;font-size:10pt;line-height:1.7;background:#fff}
ol.terms{margin:0;padding:0 20px 0 0;font-size:9pt;line-height:1.7}
.signs{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:5mm}
.sign{border:0;border-radius:0;padding:0}
.sign .r{font-family:'Noto Kufi Arabic',sans-serif;font-size:9pt;font-weight:700;margin:0 0 3px}
.sign .n{font-size:10.5pt;margin:0 0 12px}
.sigline{display:flex;gap:12px;align-items:flex-end}
.sigline .l{flex:1}
.sigline .l .ln{height:46px;border-bottom:1px solid #666}
.fp{width:26mm;height:26mm;border:1px solid #666;background:#fafafa;border-radius:2px}
.cap{font-size:9pt;color:#555;text-align:center;margin:4px 0 0}
.foot{font-size:9pt;color:#666;text-align:center;margin-top:4mm;padding-top:2mm;border-top:1px solid #ddd}
@page{size:A4;margin:0}
@media print{body{background:#fff}.sheet{margin:0;box-shadow:none;page-break-after:always}.sheet:last-child{page-break-after:auto}.noprint{display:none}}
.bar{position:sticky;top:0;background:#111a24;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;font-family:'Noto Kufi Arabic',sans-serif;font-size:13px}
.bar button{background:linear-gradient(90deg,var(--orange),var(--coral));color:#fff;border:0;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;font-family:inherit}
`

function sheet(c: Contract, s: Settings, lang: Lang) {
  const t = L[lang]
  const issues = BODY_PARTS.filter((p) => (c.car.body || {})[p.key])
  const rest = c.price - (c.down || 0)
  const words = lang === 'ku' ? amountWordsKu(c.price, c.currency) : amountWordsAr(c.price, c.currency)
  const terms = lang === 'ku' ? (c.terms?.length ? c.terms : s.terms) : s.termsAr || []

  const row = (k: string, v: unknown) => `<div class="row"><span class="k">${esc(k)}:</span><span class="v">${esc(v || '')}</span></div>`
  const cell = (k: string, v: unknown) => `<td class="k">${esc(k)}</td><td class="v">${v ?? ''}</td>`

  return `
<div class="sheet">
  <div class="hd">
    <div style="display:flex;gap:12px;align-items:center">
      ${s.logo ? `<img src="${esc(s.logo)}" style="width:62px;height:62px;object-fit:contain">` : ''}
      <div>
        <h1>${esc(lang === 'ku' ? s.showroomName : s.showroomNameAr || s.showroomName)}</h1>
        <p>${esc([s.city, s.address].filter(Boolean).join(' — '))}${s.phone ? ' · ' + esc(s.phone) : ''}${s.phone2 ? ' · ' + esc(s.phone2) : ''}</p>
      </div>
    </div>
    <div class="meta">
      <div>${esc(t.no)}: <b class="num">${esc(c.no)}</b></div>
      <div>${esc(t.date)}: <b class="num">${fmtDateShort(c.date)}</b></div>
    </div>
  </div>

  <h2 class="t">${esc(t.title)}</h2>

  <div class="grid2">
    <div class="box"><div class="bt">${esc(t.seller)}</div><div class="bb">
      ${row(t.name, c.seller.name)}${row(t.phone, c.seller.phone)}${row(t.address, c.seller.address)}
    </div></div>
    <div class="box"><div class="bt">${esc(t.buyer)}</div><div class="bb">
      ${row(t.name, c.buyer.name)}${row(t.phone, c.buyer.phone)}${row(t.idNo, c.buyer.idNumber)}${row(t.issuer, c.buyer.idIssuer)}${row(t.address, c.buyer.address)}
    </div></div>
  </div>

  <div class="sec">
    <div class="hd2">${esc(t.carInfo)}</div>
    <table style="border-top:0">
      <tr>${cell(t.brand, esc(c.car.brand))}${cell(t.model, esc(c.car.model))}${cell(t.year, `<span class="num">${esc(c.car.year)}</span>`)}</tr>
      <tr>${cell(t.color, esc(c.car.color))}${cell(t.km, `<span class="num">${num(c.car.km || 0)}</span>`)}${cell(t.plate, `<span class="num">${esc(c.car.plate || '—')}</span>`)}</tr>
      <tr>${cell(t.body, esc(c.car.bodyType || '—'))}${cell(t.fuel, esc(c.car.fuel || '—'))}${cell(t.gear, esc(c.car.transmission || '—'))}</tr>
      <tr>${cell(t.engine, esc(c.car.cylinders || '—'))}${cell(t.origin, esc(c.car.origin || '—'))}${cell(t.keys, `<span class="num">${esc(c.car.keys || '—')}</span>`)}</tr>
      <tr><td class="k">${esc(t.vin)}</td><td colspan="5" class="vin">${esc(c.car.vin)}</td></tr>
    </table>
  </div>

  <div class="sec">
    <div class="hd2">${esc(t.condition)}</div>
    <div class="bd">${
      issues.length === 0
        ? esc(t.allOriginal)
        : issues
            .map(
              (p) =>
                `• ${esc(lang === 'ku' ? p.ku : PART_AR[p.key] || p.ku)}: <b>${esc(lang === 'ku' ? PART_STATES[c.car.body![p.key]].ku : STATE_AR[c.car.body![p.key]])}</b>`,
            )
            .join(' &nbsp;&nbsp; ')
    }</div>
  </div>

  <div class="sec">
    <table>
      <tr>
        <td class="k">${esc(t.price)}</td><td class="v" style="font-size:13pt"><span class="num">${money(c.price, c.currency)}</span></td>
        <td class="k" style="width:70px">${esc(t.inWords)}</td><td>${esc(words)}</td>
      </tr>
      <tr>
        <td class="k">${esc(t.payment)}</td>
        <td class="v" colspan="3">${
          c.payment === 'cash'
            ? esc(t.cash)
            : `${esc(t.inst)} — ${esc(t.down)}: <span class="num">${money(c.down, c.currency)}</span> · ${esc(t.rest)}: <span class="num">${money(rest, c.currency)}</span> (<span class="num">${c.installments.length}</span> ${lang === 'ku' ? 'قیست' : 'قسط'})`
        }</td>
      </tr>
    </table>
  </div>

  ${
    c.payment === 'installment' && c.installments.length
      ? `<div class="sec"><div class="hd2">${esc(t.instTable)}</div>
      <table style="border-top:0;font-size:10pt">
        <tr><th style="width:36px">${esc(t.instNo)}</th><th>${esc(t.due)}</th><th>${esc(t.amount)}</th><th style="width:110px">${esc(t.sign)}</th></tr>
        ${c.installments
          .map(
            (i) =>
              `<tr><td style="text-align:center"><span class="num">${i.no}</span></td><td style="text-align:center"><span class="num">${fmtDateShort(i.dueDate)}</span></td><td style="text-align:center;font-weight:700"><span class="num">${money(i.amount, c.currency)}</span></td><td></td></tr>`,
          )
          .join('')}
      </table></div>`
      : ''
  }

  <div class="sec">
    <div class="hd2">${esc(t.terms)}</div>
    <div class="bd"><ol class="terms">${terms.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
  </div>

  ${c.note ? `<p style="font-size:10pt;line-height:1.7;margin-top:8px"><b>${esc(t.note)}: </b>${esc(c.note)}</p>` : ''}

  <p class="foot" style="border:0;margin-top:8px">${esc(t.footer)}</p>

  <div class="signs">
    ${[
      { r: t.seller, n: c.seller.name },
      { r: t.buyer, n: c.buyer.name },
    ]
      .map(
        (p) => `<div class="sign">
      <p class="r">${esc(p.r)}</p><p class="n">${esc(p.n)}</p>
      <div class="sigline">
        <div class="l"><div class="ln"></div><p class="cap">${esc(t.signature)}</p></div>
        <div><div class="fp"></div><p class="cap">${esc(t.fingerprint)}</p></div>
      </div></div>`,
      )
      .join('')}
  </div>

  ${
    c.witness1 || c.witness2
      ? `<div class="signs" style="margin-top:10px">${[
          { l: t.w1, n: c.witness1 },
          { l: t.w2, n: c.witness2 },
        ]
          .filter((x) => x.n)
          .map(
            (x) =>
              `<div style="font-size:10pt"><p style="color:#555;margin:0">${esc(x.l)}</p><p style="font-weight:700;border-bottom:1px dotted #999;padding-bottom:3px;margin:4px 0 0">${esc(x.n)}</p><div style="height:30px;border-bottom:1px solid #666;margin-top:8px"></div><p class="cap">${esc(t.signature)}</p></div>`,
          )
          .join('')}</div>`
      : ''
  }

  <p class="foot"><span class="num">${esc(c.no)}</span> · <span class="num">${fmtDateShort(c.date)}</span> · ${esc(s.showroomName)}</p>
</div>`
}

export function contractsHtmlDoc(list: Contract[], s: Settings, lang: Lang = 'ku', title = 'عەقدەکان') {
  return `<!doctype html>
<html lang="${lang === 'ku' ? 'ckb' : 'ar'}" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ${esc(s.showroomName)}</title><style>${CSS}</style></head>
<body>
<div class="bar noprint"><span>${esc(title)} — <b class="num">${list.length}</b> ${lang === 'ku' ? 'عەقد' : 'عقد'} · ${esc(s.showroomName)}</span><button onclick="window.print()">${lang === 'ku' ? 'پرینت / PDF' : 'طباعة / PDF'}</button></div>
${list.map((c) => sheet(c, s, lang)).join('\n')}
</body></html>`
}

export function downloadFile(name: string, content: string | Blob, type = 'text/html;charset=utf-8') {
  const blob = typeof content === 'string' ? new Blob(['﻿' + content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
}
