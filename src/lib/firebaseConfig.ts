export interface FbConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const LS_KEY = 'gm.firebase'

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
    if (!raw) return null
    const c = JSON.parse(raw)
    if (c?.apiKey && c?.projectId) return c
  } catch {
    /* ignore */
  }
  return null
}

export function saveFbConfig(c: FbConfig | null) {
  if (c) localStorage.setItem(LS_KEY, JSON.stringify(c))
  else localStorage.removeItem(LS_KEY)
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
