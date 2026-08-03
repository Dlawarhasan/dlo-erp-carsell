import { useState } from 'react'
import { LogIn, Loader2, Cloud, ShieldCheck } from 'lucide-react'
import { useApp } from '../store/app'
import { FirebaseSetup } from '../components/FirebaseSetup'

export function Login() {
  const { signIn } = useApp()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [setup, setSetup] = useState(false)

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
              ? 'کێشەی ئینتەرنێت'
              : 'نەتوانرا بچیتە ژوورەوە',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* لای ڕاست — فۆرم */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={go} className="w-full max-w-sm space-y-5 animate-in">
          <div className="text-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-brand text-brandInk grid place-items-center text-2xl font-bold mx-auto mb-4">پ</div>
            <h1 className="text-2xl font-bold">بەخێربێیتەوە</h1>
            <p className="text-muted text-sm mt-1.5">بچۆ ژوورەوە بۆ بەڕێوەبردنی پێشانگاکەت</p>
          </div>

          <div>
            <label className="label">ئیمەیل</label>
            <input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field text-start" placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">وشەی نهێنی</label>
            <input dir="ltr" type="password" required value={pass} onChange={(e) => setPass(e.target.value)} className="field text-start" placeholder="••••••••" />
          </div>

          {err && <p className="text-sm text-bad bg-bad/10 border border-bad/25 rounded-xl px-3.5 py-2.5">{err}</p>}

          <button disabled={busy} className="btn-brand w-full !py-3">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            چوونە ژوورەوە
          </button>

          <button type="button" onClick={() => setSetup(true)} className="btn-quiet w-full !text-[13px]">
            <Cloud size={15} /> ڕێکخستنی پەیوەندی Firebase
          </button>
        </form>
      </div>

      {/* لای چەپ — پێشکەشکردن */}
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
