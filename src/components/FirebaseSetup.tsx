import { useState } from 'react'
import { Sheet } from './ui'
import { getFbConfig, parseFbSnippet, saveFbConfig } from '../lib/firebaseConfig'
import { Cloud, CloudOff, Copy, Check } from 'lucide-react'

const RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn()  { return request.auth != null; }
    function profile()   { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data; }
    function role()      { return signedIn() ? profile().role : 'none'; }
    function active()    { return signedIn() && profile().active == true; }
    function isBoss()    { return active() && role() in ['owner','manager']; }
    function canWrite()  { return active() && role() in ['owner','manager','seller','accountant']; }

    // یەکەم بەکارهێنەر خۆی تۆمار دەکات، دواتر تەنها خاوەن دەتوانێت
    match /users/{uid} {
      allow read: if signedIn();
      allow create: if signedIn() && request.auth.uid == uid;
      allow update, delete: if isBoss();
    }

    match /cars/{id}      { allow read: if active(); allow write: if canWrite(); }
    match /customers/{id} { allow read: if active(); allow write: if canWrite(); }
    match /contracts/{id} { allow read: if active(); allow create, update: if canWrite(); allow delete: if isBoss(); }
    match /txs/{id}       { allow read: if active(); allow create, update: if canWrite(); allow delete: if isBoss(); }
    match /debts/{id}     { allow read: if active(); allow create, update: if canWrite(); allow delete: if isBoss(); }
    match /exchangers/{id}{ allow read: if active(); allow create, update: if canWrite(); allow delete: if isBoss(); }
    match /hawalas/{id}   { allow read: if active(); allow create, update: if canWrite(); allow delete: if isBoss(); }
    match /partners/{id}  { allow read: if active(); allow write: if isBoss(); }
    match /settings/{id}  { allow read: if active(); allow write: if isBoss(); }
    match /photos/{id}    { allow read: if active(); allow write: if canWrite(); }
    match /audit/{id}     { allow read: if isBoss(); allow create: if active(); allow update, delete: if false; }
  }
}`

const STORAGE_RULES = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`

export function FirebaseSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cur = getFbConfig()
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState('')

  const copy = (t: string, k: string) => {
    navigator.clipboard?.writeText(t)
    setCopied(k)
    setTimeout(() => setCopied(''), 1600)
  }

  const apply = () => {
    const c = parseFbSnippet(text)
    if (!c) {
      setErr('نەتوانرا زانیارییەکان بخوێنرێتەوە. دڵنیابە کۆدی firebaseConfig ـەکەت تەواو کۆپی کردووە.')
      return
    }
    saveFbConfig(c)
    location.reload()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title="پەیوەندی Firebase"
      footer={
        <>
          {cur && (
            <button
              className="btn-bad me-auto"
              onClick={() => {
                saveFbConfig(null)
                location.reload()
              }}
            >
              <CloudOff size={16} /> پەیوەندی ببڕە
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>
            داخستن
          </button>
          <button className="btn-brand" onClick={apply}>
            <Cloud size={16} /> پەیوەست بە
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className={`rounded-xl px-4 py-3 text-sm border ${cur ? 'bg-ok/10 border-ok/30 text-ok' : 'bg-warn/10 border-warn/30 text-warn'}`}>
          {cur ? (
            <>
              پەیوەستە بە پرۆژەی <b className="num">{cur.projectId}</b> — داتاکان لە هەورەوە خەزن دەکرێن.
            </>
          ) : (
            <>دۆخی ناوخۆیی (ئۆفلاین). داتاکان تەنها لەسەر ئەم ئامێرەن. بۆ هاوبەشکردن لەگەڵ کارمەندان، Firebase پەیوەست بکە.</>
          )}
        </div>

        <ol className="text-sm text-muted space-y-2.5 leading-7 list-decimal ps-5">
          <li>
            بڕۆ بۆ <span className="num text-ink">console.firebase.google.com</span> و پرۆژەیەکی نوێ دروست بکە.
          </li>
          <li>
            لە <b className="text-ink">Build → Authentication</b>، ڕێبازی <span className="num text-ink">Email/Password</span> چالاک بکە.
          </li>
          <li>
            لە <b className="text-ink">Build → Firestore Database</b>، داتابەیسێک دروست بکە (Production mode).
          </li>
          <li>
            <b className="text-ink">Storage پێویست نییە</b> — وێنەکان لە خودی Firestore خەزن دەکرێن. (ئەگەر پلانی Blaze ت هەیە، لە ڕێکخستن دەتوانیت بیگۆڕیت بۆ Storage.)
          </li>
          <li>
            لە <b className="text-ink">Project settings → Your apps → Web</b>، ئەپێک زیاد بکە و کۆدی <span className="num text-ink">firebaseConfig</span> کۆپی بکە و لێرە دایبنێ.
          </li>
        </ol>

        <div>
          <label className="label">کۆدی firebaseConfig</label>
          <textarea
            dir="ltr"
            rows={8}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setErr('')
            }}
            placeholder={`const firebaseConfig = {\n  apiKey: "AIza...",\n  authDomain: "myapp.firebaseapp.com",\n  projectId: "myapp",\n  storageBucket: "myapp.appspot.com",\n  messagingSenderId: "123456789",\n  appId: "1:123:web:abc"\n};`}
            className="field font-mono text-[12px] text-start leading-6"
          />
          {err && <p className="text-xs text-bad mt-1.5">{err}</p>}
        </div>

        <details className="card p-4">
          <summary className="cursor-pointer font-medium text-sm">یاساکانی پاراستن (Security Rules) — گرنگە</summary>
          <p className="text-xs text-muted mt-3 mb-2">ئەم کۆدە لە Firestore → Rules دایبنێ و Publish بکە:</p>
          <div className="relative">
            <pre dir="ltr" className="bg-surface2 border border-line rounded-xl p-3 text-[11px] overflow-x-auto leading-5 max-h-64">
              {RULES}
            </pre>
            <button onClick={() => copy(RULES, 'fs')} className="absolute top-2 end-2 btn-ghost !p-2">
              {copied === 'fs' ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs text-muted mt-4 mb-2">ئەمەش لە Storage → Rules (تەنها ئەگەر Storage بەکاردەهێنیت):</p>
          <div className="relative">
            <pre dir="ltr" className="bg-surface2 border border-line rounded-xl p-3 text-[11px] overflow-x-auto leading-5">
              {STORAGE_RULES}
            </pre>
            <button onClick={() => copy(STORAGE_RULES, 'st')} className="absolute top-2 end-2 btn-ghost !p-2">
              {copied === 'st' ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
            </button>
          </div>
        </details>
      </div>
    </Sheet>
  )
}
