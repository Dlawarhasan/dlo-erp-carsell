import { create } from 'zustand'
import { getRepo, setPhotoStore, type SessionUser, type CollName } from '../lib/repo'
import type { AppUser, AuditEntry, Car, Contract, Customer, Debt, Partner, Settings, Tx, Role } from '../lib/types'
import { DEFAULT_TERMS, DEFAULT_TERMS_AR } from '../lib/catalog'
import { uid } from '../lib/format'
import { fx } from '../lib/feedback'

export type Cap =
  | 'car.edit'
  | 'car.delete'
  | 'contract.create'
  | 'contract.delete'
  | 'money.view'
  | 'money.edit'
  | 'users.manage'
  | 'settings.edit'
  | 'security.export'

const CAPS: Record<Role, Cap[]> = {
  owner: ['car.edit','car.delete','contract.create','contract.delete','money.view','money.edit','users.manage','settings.edit','security.export'],
  manager: ['car.edit','car.delete','contract.create','contract.delete','money.view','money.edit','settings.edit','security.export'],
  seller: ['car.edit','contract.create'],
  accountant: ['money.view','money.edit','security.export'],
  viewer: [],
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  showroomName: 'پێشانگای ئۆتۆمبێل',
  showroomNameAr: 'معرض السيارات',
  ownerName: '',
  phone: '',
  address: '',
  city: 'هەولێر',
  usdRate: 1320,
  contractPrefix: String(new Date().getFullYear()),
  contractCounter: 1,
  terms: DEFAULT_TERMS,
  termsAr: DEFAULT_TERMS_AR,
  photoStore: 'firestore',
}

interface AppState {
  ready: boolean
  mode: 'cloud' | 'local'
  user: SessionUser | null
  authChecked: boolean
  cars: Car[]
  customers: Customer[]
  contracts: Contract[]
  txs: Tx[]
  debts: Debt[]
  partners: Partner[]
  users: AppUser[]
  audit: AuditEntry[]
  settings: Settings
  toast: { id: string; msg: string; kind: 'ok' | 'bad' | 'info' }[]

  init: () => Promise<void>
  can: (c: Cap) => boolean
  say: (msg: string, kind?: 'ok' | 'bad' | 'info') => void
  drop: (id: string) => void

  save: <T extends { id: string }>(coll: CollName, obj: T) => Promise<void>
  remove: (coll: CollName, id: string, label?: string) => Promise<void>
  log: (action: string, entity: string, entityId?: string, detail?: string) => Promise<void>
  nextContractNo: () => Promise<string>
  signIn: (email: string, pass: string) => Promise<void>
  signOut: () => Promise<void>
}

let unsubs: (() => void)[] = []

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  mode: 'local',
  user: null,
  authChecked: false,
  cars: [],
  customers: [],
  contracts: [],
  txs: [],
  debts: [],
  partners: [],
  users: [],
  audit: [],
  settings: DEFAULT_SETTINGS,
  toast: [],

  async init() {
    const repo = await getRepo()
    unsubs.forEach((u) => u())
    unsubs = []
    set({ mode: repo.mode })

    unsubs.push(repo.onUser((u) => set({ user: u, authChecked: true })))

    const bind = <K extends keyof AppState>(coll: CollName, key: K) =>
      unsubs.push(repo.watch<any>(coll, (rows) => set({ [key]: rows } as any)))

    bind('cars', 'cars')
    bind('customers', 'customers')
    bind('contracts', 'contracts')
    bind('txs', 'txs')
    bind('debts', 'debts')
    bind('partners', 'partners')
    bind('users', 'users')
    unsubs.push(repo.watch<AuditEntry>('audit', (rows) => set({ audit: rows.sort((a, b) => b.at - a.at).slice(0, 500) })))
    unsubs.push(
      repo.watch<Settings>('settings', (rows) => {
        const s = rows.find((r) => r.id === 'main')
        const merged = s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS
        setPhotoStore(merged.photoStore || 'firestore', { cloudName: merged.cloudinaryName, preset: merged.cloudinaryPreset })
        set({ settings: merged })
      }),
    )
    set({ ready: true })
  },

  can(c) {
    const u = get().user
    if (!u) return false
    if (get().mode === 'local') return true
    return CAPS[u.role]?.includes(c) ?? false
  },

  say(msg, kind = 'ok') {
    const id = uid()
    fx(kind === 'bad' ? 'bad' : kind === 'info' ? 'info' : 'ok')
    set({ toast: [...get().toast, { id, msg, kind }] })
    setTimeout(() => get().drop(id), 3200)
  },
  drop(id) {
    set({ toast: get().toast.filter((t) => t.id !== id) })
  },

  async save(coll, obj) {
    const repo = await getRepo()
    await repo.put(coll, obj as any)
  },

  async remove(coll, id, label) {
    const repo = await getRepo()
    await repo.del(coll, id)
    await get().log('سڕینەوە', coll, id, label)
  },

  async log(action, entity, entityId, detail) {
    const u = get().user
    const repo = await getRepo()
    const e: AuditEntry = {
      id: uid('a'),
      at: Date.now(),
      uid: u?.uid || '-',
      name: u?.name || 'نەناسراو',
      action,
      entity,
      entityId,
      detail,
    }
    await repo.put('audit', e as any).catch(() => {})
  },

  async nextContractNo() {
    const s = get().settings
    const n = (s.contractCounter || 1)
    const no = `${s.contractPrefix || new Date().getFullYear()}-${String(n).padStart(4, '0')}`
    await get().save('settings', { ...s, contractCounter: n + 1 })
    return no
  },

  async signIn(email, pass) {
    const repo = await getRepo()
    await repo.signIn(email, pass)
  },
  async signOut() {
    const repo = await getRepo()
    await repo.signOut()
  },
}))
