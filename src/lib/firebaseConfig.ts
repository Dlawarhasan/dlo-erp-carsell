export interface FbConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const LS_KEY = 'gm.firebase'

/** پرۆژەی بنەڕەتی — ئەم زانیارییانە نهێنی نین، پاراستن لە یاساکانی Firestore ـەوە دێت */
const BUILT_IN: FbConfig = {
  apiKey: 'AIzaSyCO4sAX5ilsM95Doki8hr0S8yRYh_q53Tc',
  authDomain: 'dlo-erp-cars.firebaseapp.com',
  projectId: 'dlo-erp-cars',
  storageBucket: 'dlo-erp-cars.firebasestorage.app',
  messagingSenderId: '671800621522',
  appId: '1:671800621522:web:5cff68e0c6d3282ee2b00b',
}

/** ١) لە .env  ٢) لە localStorage (لە ڕووکاری ڕێکخستن دایدەنێیت) */
export function getFbConfig(): FbConfig | null {
  const env = import.meta.env as Record<string, string | undefined>
  if (env.VITE_FB_API_KEY && env.VITE_FB_PROJECT_ID) {
    return {
      apiKey: env.VITE_FB_API_KEY!,
      authDomain: env.VITE_FB_AUTH_DOMAIN || `${env.VITE_FB_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FB_PROJECT_ID!,
      storageBucket: env.VITE_FB_STORAGE_BUCKET || `${env.VITE_FB_PROJECT_ID}.appspot.com`,
      messagingSenderId: env.VITE_FB_SENDER_ID || '',
      appId: env.VITE_FB_APP_ID || '',
    }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c?.apiKey && c?.projectId) return c
    }
  } catch {
    /* ignore */
  }
  // ٣) پرۆژەی بنەڕەتی — مەگەر بەکارهێنەر پەیوەندییەکەی بڕیبێت
  if (localStorage.getItem('gm.firebase.off') === '1') return null
  return BUILT_IN
}

export function saveFbConfig(c: FbConfig | null) {
  if (c) {
    localStorage.setItem(LS_KEY, JSON.stringify(c))
    localStorage.removeItem('gm.firebase.off')
  } else {
    localStorage.removeItem(LS_KEY)
    localStorage.setItem('gm.firebase.off', '1')
  }
}

/** لێکدانەوەی کۆدی firebaseConfig کە لە کۆنسۆڵی Firebase کۆپی دەکرێت */
export function parseFbSnippet(text: string): FbConfig | null {
  try {
    const direct = JSON.parse(text)
    if (direct?.apiKey) return direct
  } catch {
    /* not plain json */
  }
  const grab = (k: string) => {
    const m = text.match(new RegExp(`${k}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`))
    return m ? m[1] : ''
  }
  const apiKey = grab('apiKey')
  const projectId = grab('projectId')
  if (!apiKey || !projectId) return null
  return {
    apiKey,
    authDomain: grab('authDomain') || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: grab('storageBucket') || `${projectId}.appspot.com`,
    messagingSenderId: grab('messagingSenderId'),
    appId: grab('appId'),
  }
}
