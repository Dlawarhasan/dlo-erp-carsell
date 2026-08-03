import { useState } from 'react'
import { UserCog, Plus, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'
import { useApp } from '../store/app'
import { PageHead } from '../components/Layout'
import { Empty, Field, Picker, Sheet, useConfirm } from '../components/ui'
import { getRepo } from '../lib/repo'
import { ROLE_KU } from '../lib/catalog'
import { fmtDateShort } from '../lib/format'
import type { Role } from '../lib/types'

export default function UsersPage() {
  const { users, user, mode, save, log, say, can } = useApp()
  const { ask, node } = useConfirm()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ name: '', email: '', pass: '', role: 'seller' as Role })

  if (!can('users.manage')) return <Empty icon={<UserCog size={26} />} title="دەسەڵاتت نییە" sub="تەنها خاوەنی پێشانگا دەتوانێت بەکارهێنەران بەڕێوە ببات" />

  const add = async () => {
    if (!f.name || !f.email || f.pass.length < 6) return say('هەموو خانەکان پڕبکەرەوە (وشەی نهێنی ٦ پیت بەلایەنی کەم)', 'bad')
    setBusy(true)
    try {
      const repo = await getRepo()
      if (!repo.createUser) {
        say('لە دۆخی ناوخۆیی ناتوانرێت بەکارهێنەر زیاد بکرێت', 'bad')
        return
      }
      await repo.createUser(f.email, f.pass, f.name, f.role)
      await log('زیادکردنی بەکارهێنەر', 'users', undefined, `${f.name} — ${f.email} (${ROLE_KU[f.role]})`)
      say('بەکارهێنەر زیادکرا')
      setF({ name: '', email: '', pass: '', role: 'seller' })
      setOpen(false)
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code || ''
      say(code.includes('email-already-in-use') ? 'ئەم ئیمەیلە پێشتر بەکارهاتووە' : 'نەتوانرا بەکارهێنەر دروست بکرێت', 'bad')
    } finally {
      setBusy(false)
    }
  }

  const setRole = async (id: string, role: Role) => {
    const u = users.find((x) => x.id === id)
    if (!u) return
    await save('users', { ...u, role })
    await log('گۆڕینی ڕۆڵ', 'users', id, `${u.name} → ${ROLE_KU[role]}`)
    say('ڕۆڵەکە گۆڕدرا')
  }

  const toggle = async (id: string) => {
    const u = users.find((x) => x.id === id)
    if (!u) return
    if (u.id === user?.uid) return say('ناتوانیت خۆت ڕابگریت', 'bad')
    if (!(await ask(u.active ? `ڕاگرتنی ${u.name}؟ ناتوانێت بچێتە ژوورەوە.` : `چالاککردنەوەی ${u.name}؟`))) return
    await save('users', { ...u, active: !u.active })
    await log(u.active ? 'ڕاگرتنی بەکارهێنەر' : 'چالاککردنەوە', 'users', id, u.name)
    say('نوێکرایەوە')
  }

  return (
    <>
      <PageHead
        title="بەکارهێنەران"
        sub={<><span className="num">{users.length}</span> کەس</>}
        action={
          mode === 'cloud' ? (
            <button onClick={() => setOpen(true)} className="btn-brand shrink-0">
              <Plus size={17} /> <span className="hidden sm:inline">نوێ</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
        {mode === 'local' && (
          <div className="card p-4 text-[13px] text-warn bg-warn/8 border-warn/25 leading-6">
            سیستەم لە دۆخی ناوخۆییە. بۆ ئەوەی چەند کەس هاوکات کاری پێبکەن، لە ڕێکخستن پەیوەندی Firebase دابنێ.
          </div>
        )}

        {users.length === 0 ? (
          <Empty icon={<UserCog size={26} />} title="هیچ بەکارهێنەرێک نییە" />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className={`w-10 h-10 rounded-xl grid place-items-center font-bold shrink-0 ${u.active ? 'bg-brand/15 text-brand' : 'bg-surface2 text-muted'}`}>
                  {(u.name || u.email).charAt(0).toUpperCase()}
                </span>
                <div className="grow min-w-0">
                  <p className="font-medium truncate">
                    {u.name} {u.id === user?.uid && <span className="text-xs text-brand">(تۆ)</span>}
                  </p>
                  <p className="text-xs text-muted truncate num" dir="ltr">
                    {u.email}
                  </p>
                  <p className="text-[11px] text-muted num mt-0.5">{fmtDateShort(new Date(u.createdAt).toISOString().slice(0, 10))}</p>
                </div>
                <div className="w-36 shrink-0">
                  <Picker
                    value={ROLE_KU[u.role]}
                    onChange={(v) => setRole(u.id, (Object.keys(ROLE_KU).find((k) => ROLE_KU[k] === v) || 'viewer') as Role)}
                    options={Object.values(ROLE_KU)}
                    disabled={u.id === user?.uid}
                  />
                </div>
                <button onClick={() => toggle(u.id)} className={`btn-quiet !p-2 shrink-0 ${u.active ? 'text-ok' : 'text-bad'}`}>
                  {u.active ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card p-4">
          <h3 className="font-bold text-sm mb-3">دەسەڵاتەکان</h3>
          <div className="space-y-2 text-[13px] text-muted leading-6">
            <p>
              <b className="text-ink">خاوەن پێشانگا:</b> هەموو شتێک — بەکارهێنەران، حسابات، سڕینەوە
            </p>
            <p>
              <b className="text-ink">بەڕێوەبەر:</b> هەموو شتێک جگە لە بەڕێوەبردنی بەکارهێنەران
            </p>
            <p>
              <b className="text-ink">فرۆشیار:</b> تۆمارکردنی ئۆتۆمبێل و دروستکردنی عەقد — حسابات نابینێت
            </p>
            <p>
              <b className="text-ink">ژمێریار:</b> حسابات، سندوق، قەرز و ڕاپۆرتەکان
            </p>
            <p>
              <b className="text-ink">تەنها بینین:</b> هیچ شتێک ناگۆڕێت
            </p>
          </div>
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="بەکارهێنەری نوێ"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              پاشگەزبوونەوە
            </button>
            <button className="btn-brand" onClick={add} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} زیادکردن
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="ناو">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field" />
          </Field>
          <Field label="ئیمەیل">
            <input dir="ltr" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="field text-start" />
          </Field>
          <Field label="وشەی نهێنی" hint="بەلایەنی کەم ٦ پیت">
            <input dir="ltr" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} className="field text-start" />
          </Field>
          <Field label="ڕۆڵ">
            <Picker
              value={ROLE_KU[f.role]}
              onChange={(v) => setF({ ...f, role: (Object.keys(ROLE_KU).find((k) => ROLE_KU[k] === v) || 'viewer') as Role })}
              options={Object.values(ROLE_KU)}
            />
          </Field>
        </div>
      </Sheet>

      {node}
    </>
  )
}
