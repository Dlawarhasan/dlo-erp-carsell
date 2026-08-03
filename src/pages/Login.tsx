import { useRef, useState } from 'react'
import { LogIn, Loader2, ShieldCheck } from 'lucide-react'
import { useApp } from '../store/app'
import { FirebaseSetup } from '../components/FirebaseSetup'
import { BrandMark, BrandWord } from '../components/Brand'

export function Login() {
  const { signIn } = useApp()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [setup, setSetup] = useState(false)
  const taps = useRef(0)

  /* پەنجەرەی ڕێکخستنی Firebase شاراوەیە — بە ٥ جار دەستلێدان لە لۆگۆ دەکرێتەوە */
  const secret = () => {
    taps.current += 1
    if (taps.current >= 5) {
      taps.current = 0
      setSetup(true)
      return
    }
    setTimeout(() => (taps.current = 0), 2500)
  }

  const go = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await signIn(email, pass)
    } catch (ex: unknown) {
      const code = (ex as { code?: string })?.code || ''
      setErr(
        code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'ئیمەیل یان وشەی نهێنی هەڵەیە'
          : code.includes('too-many-requests')
            ? 'هەوڵی زۆر — تکایە چەند خولەکێک چاوەڕێ بکە'
            : code.includes('network')
              ? 'کێشەی ئینتەرنێت — پەیوەندییەکەت بپشکنە'
              : 'نەتوانرا بچیتە ژوورەوە',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* ---------- فۆرم ---------- */}
      <div className="flex flex-col items-center justify-center p-6 safe-t safe-x">
        <form onSubmit={go} className="w-full max-w-sm space-y-5 animate-in">
          <div className="text-center mb-2">
            <button type="button" onClick={secret} className="mx-auto mb-5 block" aria-label="DLO IT">
              <BrandMark size={64} />
            </button>
            <h1 className="text-2xl font-bold">بەخێربێیتەوە</h1>
            <p className="text-muted text-sm mt-1.5">بچۆ ژوورەوە بۆ بەڕێوەبردنی پێشانگاکەت</p>
          </div>

          <div>
            <label className="label">ئیمەیل</label>
            <input
              dir="ltr"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field text-start"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label">وشەی نهێنی</label>
            <input
              dir="ltr"
              type="password"
              autoComplete="current-password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="field text-start"
              placeholder="••••••••"
            />
          </div>

          {err && <p className="text-sm text-bad bg-bad/10 border border-bad/25 rounded-xl px-3.5 py-2.5">{err}</p>}

          <button disabled={busy} className="btn-brand w-full !py-3">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            چوونە ژوورەوە
          </button>
        </form>

        <div className="mt-10 flex flex-col items-center gap-2.5">
          <BrandWord height={26} className="opacity-75" />
          <p className="text-[11px] text-muted/70">سیستەمی بەڕێوەبردنی پێشانگای ئۆتۆمبێل</p>
        </div>
      </div>

      {/* ---------- پێشکەشکردن ---------- */}
      <div className="hidden lg:flex flex-col justify-center gap-6 p-12 bg-surface border-s border-line">
        <h2 className="text-3xl font-bold leading-relaxed">
          سیستەمی تەواوی <span className="text-brand">پێشانگای ئۆتۆمبێل</span>
        </h2>
        <ul className="space-y-3.5 text-[15px] text-muted">
          {[
            'تۆمارکردنی ئۆتۆمبێل بە VIN، وێنە، ڕەنگ، کیلۆمەتر و پارچە لێدراوەکان',
            'سکانی VIN بە کامێرای مۆبایل — یەکسەر زانیارییەکان دەردەکەون',
            'دروستکردن و پرینتی عەقدی فەرمی بە کوردی و عەرەبی',
            'حساباتی تەواو: قازانج، قەرز و قیست، سندوق، خەرجی و شەریک',
            'بەشی تایبەت بۆ ناردنی کۆپی عەقدەکان بۆ ئاسایش',
            'کاردەکات وەک ئەپ لەسەر مۆبایل — تەنانەت بەبێ ئینتەرنێت',
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <ShieldCheck size={19} className="text-brand shrink-0 mt-0.5" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      <FirebaseSetup open={setup} onClose={() => setSetup(false)} />
    </div>
  )
}
