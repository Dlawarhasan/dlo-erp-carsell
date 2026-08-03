import { useEffect, useRef, useState } from 'react'
import { Save, Cloud, Download, Upload, Trash2, Plus, Building2, Percent, FileSignature, Database, Loader2, Image as ImgIcon, FlaskConical, Eraser } from 'lucide-react'
import { useApp, DEFAULT_SETTINGS } from '../store/app'
import { PageHead } from '../components/Layout'
import { Field, MoneyInput, Picker, Segmented, useConfirm } from '../components/ui'
import { FirebaseSetup } from '../components/FirebaseSetup'
import { compress } from '../components/PhotoUploader'
import { getRepo, COLLECTIONS } from '../lib/repo'
import { downloadFile } from '../lib/exportHtml'
import { CITIES, DEFAULT_TERMS, DEFAULT_TERMS_AR } from '../lib/catalog'
import { demoData } from '../lib/demo'
import { num, todayISO } from '../lib/format'
import type { Settings } from '../lib/types'

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-lg bg-brand/15 text-brand grid place-items-center shrink-0">{icon}</span>
        <h2 className="font-bold text-[15px]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const app = useApp()
  const { settings, save, say, can, mode, cars, customers, contracts, txs, partners } = app
  const { ask, node } = useConfirm()
  const [s, setS] = useState<Settings>({ ...DEFAULT_SETTINGS, ...settings })
  const [fb, setFb] = useState(false)
  const [busy, setBusy] = useState(false)
  const logoInp = useRef<HTMLInputElement>(null)
  const importInp = useRef<HTMLInputElement>(null)
  const dirty = useRef(false)

  // هاوکاتکردن لەگەڵ داتابەیس تا ئەو کاتەی بەکارهێنەر دەستکاری نەکردووە
  useEffect(() => {
    if (!dirty.current) setS({ ...DEFAULT_SETTINGS, ...settings })
  }, [settings])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    dirty.current = true
    setS((p) => ({ ...p, [k]: v }))
  }

  const submit = async () => {
    setBusy(true)
    await save('settings', { ...s, id: 'main' })
    dirty.current = false
    say('ڕێکخستنەکان خەزنکران')
    setBusy(false)
  }

  const pickLogo = async (f: File | undefined) => {
    if (!f) return
    const blob = await compress(f, 512, 0.85)
    const r = new FileReader()
    r.onload = () => set('logo', String(r.result))
    r.readAsDataURL(blob)
  }

  const backup = async () => {
    const data = { version: 1, at: new Date().toISOString(), cars, customers, contracts, txs, partners, settings: s }
    downloadFile(`باکئەپ_${todayISO()}.json`, JSON.stringify(data, null, 2), 'application/json')
    say('باکئەپ داگیرا')
  }

  const restore = async (file: File | undefined) => {
    if (!file) return
    if (!(await ask('داتای ناو فایلەکە زیاد دەکرێت بۆ سیستەم. بەردەوامبم؟'))) return
    setBusy(true)
    try {
      const data = JSON.parse(await file.text())
      const repo = await getRepo()
      for (const coll of COLLECTIONS) {
        const rows = (data as any)[coll]
        if (Array.isArray(rows) && rows.length) await repo.putMany(coll as any, rows)
      }
      if (data.settings) await repo.put('settings', { ...data.settings, id: 'main' })
      say('داتاکان گەڕێنرانەوە')
    } catch (e) {
      console.error(e)
      say('فایلەکە دروست نییە', 'bad')
    } finally {
      setBusy(false)
      if (importInp.current) importInp.current.value = ''
    }
  }

  const loadDemo = async () => {
    if (!(await ask('داتای نموونە زیاد دەکرێت (٤ ئۆتۆمبێل، ١ عەقد، چەند جوڵەی پارە). بەردەوامبم؟'))) return
    setBusy(true)
    try {
      const repo = await getRepo()
      const d = demoData()
      await repo.putMany('cars', d.cars as any)
      await repo.putMany('customers', d.customers as any)
      await repo.putMany('contracts', d.contracts as any)
      await repo.putMany('txs', d.txs as any)
      await repo.putMany('partners', d.partners as any)
      say('داتای نموونە زیادکرا')
    } finally {
      setBusy(false)
    }
  }

  const wipe = async () => {
    if (!(await ask('هەموو ئۆتۆمبێل، عەقد، کریار و جوڵەکانی پارە دەسڕدرێنەوە. ئەمە نەگەڕاوەیە! دڵنیایت؟'))) return
    setBusy(true)
    try {
      const repo = await getRepo()
      for (const [coll, rows] of [['cars', cars], ['customers', customers], ['contracts', contracts], ['txs', txs], ['partners', partners]] as const) {
        for (const r of rows as { id: string }[]) await repo.del(coll as any, r.id)
      }
      say('هەموو داتاکان سڕانەوە', 'info')
    } finally {
      setBusy(false)
    }
  }

  const editable = can('settings.edit')

  return (
    <>
      <PageHead
        title="ڕێکخستن"
        action={
          editable ? (
            <button onClick={submit} disabled={busy} className="btn-brand shrink-0">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} <span className="hidden sm:inline">خەزنکردن</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        {/* پێشانگا */}
        <Card icon={<Building2 size={17} />} title="زانیاری پێشانگا">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button onClick={() => logoInp.current?.click()} disabled={!editable} className="w-20 h-20 rounded-2xl border-2 border-dashed border-line hover:border-brand/60 grid place-items-center overflow-hidden shrink-0">
                {s.logo ? <img src={s.logo} alt="" className="w-full h-full object-cover" /> : <ImgIcon size={22} className="text-muted" />}
              </button>
              <div className="text-[13px] text-muted leading-6">
                لۆگۆی پێشانگا — لەسەر عەقدەکان دەردەکەوێت.
                {s.logo && (
                  <button onClick={() => set('logo', undefined)} className="block text-bad text-xs mt-1">
                    سڕینەوە
                  </button>
                )}
              </div>
              <input ref={logoInp} type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="ناوی پێشانگا (کوردی)">
                <input value={s.showroomName} onChange={(e) => set('showroomName', e.target.value)} className="field" disabled={!editable} />
              </Field>
              <Field label="ناوی پێشانگا (عەرەبی)">
                <input value={s.showroomNameAr} onChange={(e) => set('showroomNameAr', e.target.value)} className="field" disabled={!editable} />
              </Field>
              <Field label="ناوی خاوەن">
                <input value={s.ownerName} onChange={(e) => set('ownerName', e.target.value)} className="field" disabled={!editable} />
              </Field>
              <Field label="شار">
                <Picker value={s.city} onChange={(v) => set('city', v)} options={CITIES} disabled={!editable} />
              </Field>
              <Field label="ژمارەی تەلەفۆن">
                <input dir="ltr" value={s.phone} onChange={(e) => set('phone', e.target.value)} className="field text-start num" disabled={!editable} />
              </Field>
              <Field label="ژمارەی دووەم">
                <input dir="ltr" value={s.phone2 || ''} onChange={(e) => set('phone2', e.target.value)} className="field text-start num" disabled={!editable} />
              </Field>
              <Field label="ناونیشان" className="sm:col-span-2">
                <input value={s.address} onChange={(e) => set('address', e.target.value)} className="field" disabled={!editable} />
              </Field>
            </div>
          </div>
        </Card>

        {/* پارە */}
        <Card icon={<Percent size={17} />} title="دراو و عەقد">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="نرخی دۆلار (د.ع)" hint={`1$ = ${num(s.usdRate)} د.ع`}>
              <MoneyInput value={s.usdRate} onChange={(n) => set('usdRate', n)} />
            </Field>
            <Field label="پێشگری عەقد" hint="نموونە: 2026">
              <input value={s.contractPrefix} onChange={(e) => set('contractPrefix', e.target.value)} className="field num text-start" disabled={!editable} />
            </Field>
            <Field label="ژمارەی داهاتوو">
              <MoneyInput value={s.contractCounter} onChange={(n) => set('contractCounter', Math.max(1, Math.round(n)))} />
            </Field>
          </div>
        </Card>

        {/* مەرجەکان */}
        <Card icon={<FileSignature size={17} />} title="مەرجەکانی عەقد">
          <TermsEditor label="کوردی" list={s.terms} onChange={(v) => set('terms', v)} onReset={() => set('terms', DEFAULT_TERMS)} disabled={!editable} />
          <div className="h-5" />
          <TermsEditor label="عەرەبی" list={s.termsAr} onChange={(v) => set('termsAr', v)} onReset={() => set('termsAr', DEFAULT_TERMS_AR)} disabled={!editable} dir="rtl" />
        </Card>

        {/* داتا */}
        <Card icon={<Database size={17} />} title="داتا و پەیوەندی">
          <div className="space-y-3">
            <Field
              label="شوێنی خەزنکردنی وێنەکان"
              hint={
                s.photoStore === 'storage'
                  ? 'Firebase Storage — پێویستی بە پلانی Blaze هەیە (کارتی بانکی)'
                  : s.photoStore === 'cloudinary'
                    ? 'Cloudinary — ٢٥ گیگا خۆڕایی مانگانە، بێ کارتی بانکی'
                    : 'ناو خودی داتابەیس — لەسەر پلانی خۆڕایی کاردەکات (~٣٠٠٠ وێنە)'
              }
            >
              <Segmented
                value={s.photoStore || 'firestore'}
                onChange={(v) => set('photoStore', v)}
                options={[
                  { v: 'firestore' as const, label: 'Firestore' },
                  { v: 'cloudinary' as const, label: 'Cloudinary' },
                  { v: 'storage' as const, label: 'Storage' },
                ]}
                size="sm"
              />
            </Field>

            {s.photoStore === 'cloudinary' && (
              <div className="bg-surface2 border border-line rounded-xl p-3.5 space-y-3 animate-in">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Cloud name">
                    <input dir="ltr" value={s.cloudinaryName || ''} onChange={(e) => set('cloudinaryName', e.target.value.trim())} className="field field-sm text-start" placeholder="dxxxxxxx" disabled={!editable} />
                  </Field>
                  <Field label="Upload preset">
                    <input dir="ltr" value={s.cloudinaryPreset || ''} onChange={(e) => set('cloudinaryPreset', e.target.value.trim())} className="field field-sm text-start" placeholder="dlo_unsigned" disabled={!editable} />
                  </Field>
                </div>
                <details>
                  <summary className="cursor-pointer text-[13px] font-medium text-brand">چۆن ئەم دووانە دەهێنم؟</summary>
                  <ol className="text-xs text-muted leading-6 list-decimal ps-5 mt-2 space-y-1">
                    <li>لە <span className="num text-ink">cloudinary.com</span> هەژمارێکی خۆڕایی دروست بکە (کارتی بانکی ناوێت).</li>
                    <li>لە <b className="text-ink">Dashboard</b>، <span className="num text-ink">Cloud name</span> کۆپی بکە و لێرە دایبنێ.</li>
                    <li>بڕۆ <b className="text-ink">Settings ⚙️ → Upload → Upload presets → Add upload preset</b>.</li>
                    <li><b className="text-ink">Signing Mode</b> بکە <span className="num text-ink">Unsigned</span>، ناوێکی بدە (نموونە <span className="num text-ink">dlo_unsigned</span>) و <b className="text-ink">Save</b> بکە.</li>
                    <li>ناوی preset ـەکە لێرە دایبنێ و <b className="text-ink">خەزنکردن</b> لێبدە.</li>
                  </ol>
                  <p className="text-xs text-warn mt-2 leading-6">
                    تێبینی: وێنە بارکراوەکان بە لینکی گشتین (هەرکەس لینکەکەی هەبێت دەیبینێت) — بۆ وێنەی ئۆتۆمبێل کێشە نییە.
                    سڕینەوەی وێنە دەبێت لە داشبۆردی Cloudinary بکرێت.
                  </p>
                </details>
              </div>
            )}

            <button onClick={() => setFb(true)} className="btn-ghost w-full justify-between">
              <span className="flex items-center gap-2">
                <Cloud size={17} /> پەیوەندی Firebase
              </span>
              <span className={`chip ${mode === 'cloud' ? 'bg-ok/15 text-ok border-ok/30' : 'bg-warn/15 text-warn border-warn/30'}`}>
                {mode === 'cloud' ? 'پەیوەستە' : 'ناوخۆیی'}
              </span>
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={backup} className="btn-ghost">
                <Download size={17} /> باکئەپ
              </button>
              <button onClick={() => importInp.current?.click()} className="btn-ghost">
                <Upload size={17} /> گەڕاندنەوە
              </button>
              <input ref={importInp} type="file" accept="application/json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
            </div>
            <p className="text-xs text-muted leading-6">
              ئێستا: <span className="num">{cars.length}</span> ئۆتۆمبێل · <span className="num">{contracts.length}</span> عەقد ·{' '}
              <span className="num">{customers.length}</span> کریار · <span className="num">{txs.length}</span> جوڵەی پارە
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button onClick={loadDemo} disabled={busy} className="btn-ghost !text-[13px]">
                <FlaskConical size={16} /> داتای نموونە
              </button>
              <button onClick={wipe} disabled={busy} className="btn-bad !text-[13px]">
                <Eraser size={16} /> سڕینەوەی هەموو داتا
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted pb-6 leading-6">
          سیستەمی بەڕێوەبردنی پێشانگای ئۆتۆمبێل · وەشانی <span className="num">1.0</span>
          <br />
          بۆ دانانی وەک ئەپ لەسەر مۆبایل: لە وێبگەڕ «Add to Home Screen» هەڵبژێرە.
        </p>
      </div>

      <FirebaseSetup open={fb} onClose={() => setFb(false)} />
      {node}
    </>
  )
}

function TermsEditor({
  label,
  list,
  onChange,
  onReset,
  disabled,
  dir,
}: {
  label: string
  list: string[]
  onChange: (v: string[]) => void
  onReset: () => void
  disabled?: boolean
  dir?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label !mb-0">{label}</label>
        <button onClick={onReset} disabled={disabled} className="text-xs text-brand">
          گەڕاندنەوە بۆ بنەڕەت
        </button>
      </div>
      <div className="space-y-2">
        {(list || []).map((t, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="w-7 h-9 grid place-items-center text-xs text-muted num shrink-0">{i + 1}</span>
            <textarea
              rows={2}
              dir={dir}
              value={t}
              disabled={disabled}
              onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))}
              className="field !py-2 text-[13px]"
            />
            <button onClick={() => onChange(list.filter((_, j) => j !== i))} disabled={disabled} className="btn-quiet !p-2 hover:!text-bad shrink-0">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button onClick={() => onChange([...(list || []), ''])} disabled={disabled} className="btn-quiet w-full !py-2 !text-[13px]">
          <Plus size={14} /> مەرجێکی نوێ
        </button>
      </div>
    </div>
  )
}
