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
  /** قەبارەی وێنەی تەواو بە بایت */
  size?: number
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

/** بڕی وەرگیراوی ڕاستەقینە لە کاتی فرۆشتن، بە هەر یەک لە دراوەکان */
export interface CurrencyPayment {
  currency: Currency
  amount: number
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
  /** بۆ فرۆشتنی نەقدی دوو دراو؛ کۆی بەهاکەیان بە نرخەکەی عەقد دەبێت یەکسانی price بێت */
  cashPayments?: CurrencyPayment[]
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
  | 'debt_in'
  | 'debt_out'
  | 'exchange_transfer'
  | 'exchange_return'
  | 'cash_exchange_out'
  | 'cash_exchange_in'
  | 'contract_refund'
  | 'hawala'
  | 'hawala_cancel'
  | 'other'

export interface Tx {
  id: string
  date: string
  kind: 'in' | 'out'
  amount: number
  /** کرێی حەواڵە؛ لە amount ـدا هەژمارکراوە، بەڵام بۆ ڕاپۆرتی وەرگر جیا دەخرێتەوە */
  fee?: number
  currency: Currency
  rate: number
  /** شوێنی پارە: سەراف تەنها بۆ جوڵەی ناوخۆی سەرافە و باڵانسی کاش/بانک ناگۆڕێت */
  account: 'cash' | 'bank' | 'exchanger'
  category: TxCategory
  title: string
  carId?: string
  contractId?: string
  partnerId?: string
  /** سەرافێکی پەیوەندیدار، بۆ گواستنەوە و حەواڵە */
  exchangerId?: string
  hawalaId?: string
  /** هەمان ناسنامە بۆ هەردوو جوڵەی ئیکسچێنجی دینار/دۆلار */
  cashExchangeId?: string
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

/** سەرافێک کە پارەی پێشانگا لەلای خەزن دەکرێت */
export interface Exchanger {
  id: string
  name: string
  phone?: string
  note?: string
  createdAt: number
}

/** حەواڵەی دەرچوو لە ڕێگەی سەرافەوە */
export interface Hawala {
  id: string
  exchangerId: string
  recipientType: 'partner' | 'customer' | 'other'
  recipientName: string
  recipientPhone?: string
  partnerId?: string
  customerId?: string
  amount: number
  fee: number
  currency: Currency
  rate: number
  date: string
  reference?: string
  note?: string
  status: 'sent' | 'cancelled'
  txId: string
  cancelTxId?: string
  createdAt: number
  createdBy?: string
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

/* ═══════════════ دەفتەری قەرز (قەرزی پێش سیستەم) ═══════════════ */

/** `receivable` = خەڵک قەرزارن بۆ ئێمە · `payable` = ئێمە قەرزارین بۆ خەڵک */
export type DebtKind = 'receivable' | 'payable'
export type DebtStatus = 'open' | 'closed'

export interface DebtPayment {
  id: string
  date: string
  amount: number
  /** ئایا چووەتە سندوقی سیستەمەوە؟ */
  toCashbox: boolean
  account?: 'cash' | 'bank'
  txId?: string
  note?: string
  at: number
  by?: string
  byName?: string
}

export interface Debt {
  id: string
  kind: DebtKind
  /** ناوی کەسەکە — دەکرێت لە کریارە تۆمارکراوەکان بێت یان ئازاد بنووسرێت */
  personName: string
  customerId?: string
  phone?: string
  amount: number
  currency: Currency
  /** نرخی دۆلار لە کاتی تۆمارکردن — بۆ ژماردنی کۆی گشتی */
  rate: number
  /** بەرواری خودی قەرزەکە (لەوانەیە زۆر کۆن بێت) */
  date: string
  dueDate?: string
  reason?: string
  note?: string
  /** ئۆتۆمبێلی پەیوەندیدار — نووسینێکی ئازاد، چونکە لەوانەیە لە سیستەمدا نەبێت */
  carInfo?: string
  /** خشتەی قیست — ئەگەر بەتاڵ بێت، پارەدانی ئازادە */
  installments?: Installment[]
  payments: DebtPayment[]
  status: DebtStatus
  createdAt: number
  updatedAt?: number
  createdBy?: string
  createdByName?: string
}
