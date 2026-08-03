export type Currency = 'USD' | 'IQD'
export type Role = 'owner' | 'manager' | 'seller' | 'accountant' | 'viewer'

export type PartState = 'original' | 'painted' | 'putty' | 'replaced' | 'dented' | 'scratched'

export interface Photo {
  id: string
  /** وێنەی بچووک (data URL) — هەمیشە لەگەڵ ئۆتۆمبێلەکە خەزن دەکرێت، بۆ لیستەکان */
  thumb?: string
  /** وێنەی تەواو — data URL (ناوخۆیی) یان لینکی Storage */
  url?: string
  /** شوێنی وێنەی تەواو: `photos/<id>` لە Firestore، یان ڕێڕەوی Storage */
  path?: string
  cover?: boolean
}

export interface CarCost {
  id: string
  label: string
  amount: number
  currency: Currency
  date: string
}

export interface Car {
  id: string
  vin: string
  plate?: string
  brand: string
  model: string
  trim?: string
  year: number
  color: string
  bodyType: string
  fuel: string
  transmission: string
  cylinders?: string
  drive?: string
  origin?: string
  km: number
  keys?: number
  status: 'available' | 'reserved' | 'sold' | 'workshop'
  ownership: 'owned' | 'consignment'
  partnerId?: string
  partnerPct?: number
  buyPrice: number
  buyCurrency: Currency
  buyDate: string
  sellerName?: string
  sellerPhone?: string
  askPrice: number
  askCurrency: Currency
  photos: Photo[]
  body: Record<string, PartState>
  bodyNote?: string
  note?: string
  location?: string
  createdAt: number
  updatedAt: number
  createdBy?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  phone2?: string
  idNumber?: string
  idIssuer?: string
  address?: string
  city?: string
  note?: string
  createdAt: number
}

export interface Installment {
  no: number
  dueDate: string
  amount: number
  paid: number
  paidDate?: string
}

export interface ContractParty {
  name: string
  phone?: string
  idNumber?: string
  idIssuer?: string
  address?: string
}

export interface Contract {
  id: string
  no: string
  type: 'sale' | 'purchase'
  date: string
  carId: string
  car: Partial<Car>
  buyerId?: string
  buyer: ContractParty
  seller: ContractParty
  price: number
  currency: Currency
  rate: number
  payment: 'cash' | 'installment'
  down: number
  installments: Installment[]
  terms: string[]
  note?: string
  witness1?: string
  witness2?: string
  status: 'active' | 'completed' | 'cancelled'
  sentToSecurity?: { at: number; by: string }
  createdAt: number
  createdBy?: string
  createdByName?: string
}

export type TxCategory =
  | 'car_buy'
  | 'car_cost'
  | 'car_sell'
  | 'installment'
  | 'expense'
  | 'capital'
  | 'withdraw'
  | 'commission'
  | 'partner'
  | 'other'

export interface Tx {
  id: string
  date: string
  kind: 'in' | 'out'
  amount: number
  currency: Currency
  rate: number
  account: 'cash' | 'bank'
  category: TxCategory
  title: string
  carId?: string
  contractId?: string
  partnerId?: string
  customerId?: string
  note?: string
  createdAt: number
  createdBy?: string
}

export interface Partner {
  id: string
  name: string
  phone?: string
  note?: string
  createdAt: number
}

export interface AppUser {
  id: string
  email: string
  name: string
  role: Role
  active: boolean
  createdAt: number
}

export interface AuditEntry {
  id: string
  at: number
  uid: string
  name: string
  action: string
  entity: string
  entityId?: string
  detail?: string
}

export interface Settings {
  id: string
  showroomName: string
  showroomNameAr: string
  ownerName: string
  phone: string
  phone2?: string
  address: string
  city: string
  logo?: string
  usdRate: number
  contractPrefix: string
  contractCounter: number
  terms: string[]
  termsAr: string[]
  securityNote?: string
  /** لەکوێ وێنەکان خەزن بکرێن */
  photoStore?: 'firestore' | 'storage' | 'cloudinary'
  cloudinaryName?: string
  cloudinaryPreset?: string
}
