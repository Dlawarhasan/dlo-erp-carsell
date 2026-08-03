import Dexie, { type Table } from 'dexie'
import { getFbConfig } from './firebaseConfig'
import type { AppUser, Role } from './types'

export const COLLECTIONS = ['cars', 'customers', 'contracts', 'txs', 'partners', 'users', 'audit', 'settings'] as const
export type CollName = (typeof COLLECTIONS)[number]

export interface SessionUser {
  uid: string
  email: string
  name: string
  role: Role
}

export interface Repo {
  mode: 'cloud' | 'local'
  watch<T>(coll: CollName, cb: (rows: T[]) => void): () => void
  put(coll: CollName, obj: Record<string, unknown> & { id: string }): Promise<void>
  putMany(coll: CollName, objs: (Record<string, unknown> & { id: string })[]): Promise<void>
  del(coll: CollName, id: string): Promise<void>
  uploadImage(blob: Blob, name: string): Promise<{ url: string; path?: string }>
  deleteImage(path?: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  onUser(cb: (u: SessionUser | null) => void): () => void
  createUser?(email: string, password: string, name: string, role: Role): Promise<void>
}

/* =========================================================
   LOCAL MODE — Dexie / IndexedDB
   بۆ تاقیکردنەوە و کارکردن بەبێ ئینتەرنێت لەسەر یەک ئامێر
========================================================= */
class LocalDB extends Dexie {
  cars!: Table<any, string>
  customers!: Table<any, string>
  contracts!: Table<any, string>
  txs!: Table<any, string>
  partners!: Table<any, string>
  users!: Table<any, string>
  audit!: Table<any, string>
  settings!: Table<any, string>
  constructor() {
    super('galaxy_motors')
    this.version(1).stores({
      cars: 'id, vin, status, brand, updatedAt',
      customers: 'id, phone, name',
      contracts: 'id, no, carId, date',
      txs: 'id, date, category, carId',
      partners: 'id',
      users: 'id, email',
      audit: 'id, at',
      settings: 'id',
    })
  }
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = rej
    r.readAsDataURL(b)
  })
}

const LOCAL_USER: SessionUser = { uid: 'local', email: 'local@offline', name: 'بەکارهێنەری ناوخۆیی', role: 'owner' }

function createLocalRepo(): Repo {
  const db = new LocalDB()
  const listeners = new Map<string, Set<(r: any[]) => void>>()

  const emit = async (coll: CollName) => {
    const rows = await (db as any)[coll].toArray()
    listeners.get(coll)?.forEach((cb) => cb(rows))
  }

  return {
    mode: 'local',
    watch(coll, cb) {
      if (!listeners.has(coll)) listeners.set(coll, new Set())
      listeners.get(coll)!.add(cb as any)
      ;(db as any)[coll].toArray().then((r: any[]) => cb(r))
      return () => listeners.get(coll)!.delete(cb as any)
    },
    async put(coll, obj) {
      await (db as any)[coll].put(JSON.parse(JSON.stringify(obj)))
      await emit(coll)
    },
    async putMany(coll, objs) {
      await (db as any)[coll].bulkPut(JSON.parse(JSON.stringify(objs)))
      await emit(coll)
    },
    async del(coll, id) {
      await (db as any)[coll].delete(id)
      await emit(coll)
    },
    async uploadImage(blob) {
      return { url: await blobToDataUrl(blob) }
    },
    async deleteImage() {
      /* noop */
    },
    async signIn() {
      /* بێ پێویست لە دۆخی ناوخۆیی */
    },
    async signOut() {
      /* noop */
    },
    onUser(cb) {
      cb(LOCAL_USER)
      return () => {}
    },
  }
}

/* =========================================================
   CLOUD MODE — Firebase (Firestore + Auth + Storage)
========================================================= */
async function createCloudRepo(cfg: NonNullable<ReturnType<typeof getFbConfig>>): Promise<Repo> {
  const { initializeApp } = await import('firebase/app')
  const fs = await import('firebase/firestore')
  const auth = await import('firebase/auth')
  const st = await import('firebase/storage')

  const app = initializeApp(cfg)
  const dbf = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
  })
  const a = auth.getAuth(app)
  await auth.setPersistence(a, auth.browserLocalPersistence).catch(() => {})
  const storage = st.getStorage(app)

  let profileCache: AppUser | null = null

  return {
    mode: 'cloud',
    watch(coll, cb) {
      const q = fs.collection(dbf, coll)
      return fs.onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }))),
        (err) => console.warn('[watch]', coll, err.message),
      )
    },
    async put(coll, obj) {
      const { id, ...rest } = obj
      await fs.setDoc(fs.doc(dbf, coll, id), JSON.parse(JSON.stringify(rest)), { merge: true })
    },
    async putMany(coll, objs) {
      const batch = fs.writeBatch(dbf)
      objs.forEach((o) => {
        const { id, ...rest } = o
        batch.set(fs.doc(dbf, coll, id), JSON.parse(JSON.stringify(rest)), { merge: true })
      })
      await batch.commit()
    },
    async del(coll, id) {
      await fs.deleteDoc(fs.doc(dbf, coll, id))
    },
    async uploadImage(blob, name) {
      const path = `cars/${Date.now()}_${name}`
      const r = st.ref(storage, path)
      await st.uploadBytes(r, blob, { contentType: blob.type || 'image/jpeg' })
      return { url: await st.getDownloadURL(r), path }
    },
    async deleteImage(path) {
      if (!path) return
      await st.deleteObject(st.ref(storage, path)).catch(() => {})
    },
    async signIn(email, password) {
      await auth.signInWithEmailAndPassword(a, email.trim(), password)
    },
    async signOut() {
      profileCache = null
      await auth.signOut(a)
    },
    onUser(cb) {
      return auth.onAuthStateChanged(a, async (u) => {
        if (!u) {
          profileCache = null
          cb(null)
          return
        }
        try {
          const ref = fs.doc(dbf, 'users', u.uid)
          const snap = await fs.getDoc(ref)
          if (!snap.exists()) {
            // یەکەم بەکارهێنەر = خاوەن
            const all = await fs.getDocs(fs.collection(dbf, 'users'))
            const role: Role = all.empty ? 'owner' : 'viewer'
            const prof: AppUser = {
              id: u.uid,
              email: u.email || '',
              name: u.displayName || u.email?.split('@')[0] || 'بەکارهێنەر',
              role,
              active: true,
              createdAt: Date.now(),
            }
            await fs.setDoc(ref, prof)
            profileCache = prof
          } else {
            profileCache = { ...(snap.data() as AppUser), id: u.uid }
          }
          if (profileCache && profileCache.active === false) {
            await auth.signOut(a)
            cb(null)
            return
          }
          cb({
            uid: u.uid,
            email: u.email || '',
            name: profileCache?.name || '',
            role: (profileCache?.role || 'viewer') as Role,
          })
        } catch (e) {
          console.warn('[profile]', e)
          cb({ uid: u.uid, email: u.email || '', name: u.email || '', role: 'viewer' })
        }
      })
    },
    async createUser(email, password, name, role) {
      // ئەپی دووەم بۆ ئەوەی سێشنی ئێستا نەشکێت
      const second = initializeApp(cfg, `secondary_${Date.now()}`)
      const a2 = auth.getAuth(second)
      const cred = await auth.createUserWithEmailAndPassword(a2, email.trim(), password)
      const prof: AppUser = { id: cred.user.uid, email: email.trim(), name, role, active: true, createdAt: Date.now() }
      await fs.setDoc(fs.doc(dbf, 'users', cred.user.uid), prof)
      await auth.signOut(a2)
    },
  }
}

/* ========================= singleton ========================= */
let _repo: Repo | null = null
let _pending: Promise<Repo> | null = null

export function repoMode(): 'cloud' | 'local' {
  return getFbConfig() ? 'cloud' : 'local'
}

export async function getRepo(): Promise<Repo> {
  if (_repo) return _repo
  if (_pending) return _pending
  _pending = (async () => {
    const cfg = getFbConfig()
    if (cfg) {
      try {
        _repo = await createCloudRepo(cfg)
      } catch (e) {
        console.error('Firebase failed, falling back to local:', e)
        _repo = createLocalRepo()
      }
    } else {
      _repo = createLocalRepo()
    }
    return _repo
  })()
  return _pending
}
