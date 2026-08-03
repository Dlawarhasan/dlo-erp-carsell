/* گۆڕینی ژمارە بۆ نووسین — کوردی و عەرەبی (بۆ عەقد) */

const KU_ONES = ['', 'یەک', 'دوو', 'سێ', 'چوار', 'پێنج', 'شەش', 'حەوت', 'هەشت', 'نۆ']
const KU_TEENS = ['دە', 'یازدە', 'دوازدە', 'سێزدە', 'چواردە', 'پازدە', 'شازدە', 'حەڤدە', 'هەژدە', 'نۆزدە']
const KU_TENS = ['', '', 'بیست', 'سی', 'چل', 'پەنجا', 'شەست', 'حەفتا', 'هەشتا', 'نەوەد']
const KU_HUNDREDS = ['', 'سەد', 'دووسەد', 'سێسەد', 'چوارسەد', 'پێنجسەد', 'شەشسەد', 'حەوتسەد', 'هەشتسەد', 'نۆسەد']

function kuUnder1000(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) parts.push(KU_HUNDREDS[h])
  if (r >= 10 && r < 20) parts.push(KU_TEENS[r - 10])
  else {
    const t = Math.floor(r / 10)
    const o = r % 10
    if (t) parts.push(KU_TENS[t])
    if (o) parts.push(KU_ONES[o])
  }
  return parts.join(' و ')
}

export function kuNumberWords(n: number): string {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'سفر'
  const scales = ['', 'هەزار', 'ملیۆن', 'ملیار', 'تریلیۆن']
  const chunks: number[] = []
  let x = n
  while (x > 0) {
    chunks.push(x % 1000)
    x = Math.floor(x / 1000)
  }
  const out: string[] = []
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i]
    if (!c) continue
    if (i === 0) out.push(kuUnder1000(c))
    else if (i === 1 && c === 1) out.push('هەزار')
    else out.push(`${kuUnder1000(c)} ${scales[i]}`)
  }
  return out.join(' و ')
}

const AR_ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة']
const AR_TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
const AR_TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
const AR_HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']

function arUnder1000(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) parts.push(AR_HUNDREDS[h])
  if (r >= 10 && r < 20) parts.push(AR_TEENS[r - 10])
  else {
    const t = Math.floor(r / 10)
    const o = r % 10
    if (o) parts.push(AR_ONES[o])
    if (t) parts.push(AR_TENS[t])
  }
  return parts.join(' و')
}

export function arNumberWords(n: number): string {
  n = Math.floor(Math.abs(n))
  if (n === 0) return 'صفر'
  const chunks: number[] = []
  let x = n
  while (x > 0) {
    chunks.push(x % 1000)
    x = Math.floor(x / 1000)
  }
  const nameFor = (i: number, c: number) => {
    if (i === 1) return c === 1 ? 'ألف' : c === 2 ? 'ألفان' : c <= 10 ? 'آلاف' : 'ألفاً'
    if (i === 2) return c === 1 ? 'مليون' : c === 2 ? 'مليونان' : c <= 10 ? 'ملايين' : 'مليوناً'
    if (i === 3) return c === 1 ? 'مليار' : c === 2 ? 'ملياران' : c <= 10 ? 'مليارات' : 'ملياراً'
    return ''
  }
  const out: string[] = []
  for (let i = chunks.length - 1; i >= 0; i--) {
    const c = chunks[i]
    if (!c) continue
    if (i === 0) out.push(arUnder1000(c))
    else if (c === 1 || c === 2) out.push(nameFor(i, c))
    else out.push(`${arUnder1000(c)} ${nameFor(i, c)}`)
  }
  return out.join(' و')
}

export function amountWordsKu(n: number, cur: 'USD' | 'IQD') {
  return `${kuNumberWords(n)} ${cur === 'USD' ? 'دۆلاری ئەمریکی' : 'دیناری عێراقی'}`
}
export function amountWordsAr(n: number, cur: 'USD' | 'IQD') {
  return `${arNumberWords(n)} ${cur === 'USD' ? 'دولار أمريكي' : 'دينار عراقي'}`
}
