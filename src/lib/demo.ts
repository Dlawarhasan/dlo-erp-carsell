import type { Car, Contract, Customer, Partner, Tx } from './types'
import { todayISO, uid } from './format'

const day = 86400000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** داتای نموونە بۆ تاقیکردنەوەی سیستەم */
export function demoData() {
  const now = Date.now()
  const ids = { c1: uid('car'), c2: uid('car'), c3: uid('car'), c4: uid('car'), cus1: uid('cus'), con1: uid('con'), p1: uid('prt') }

  const partners: Partner[] = [{ id: ids.p1, name: 'دڵشاد ئیبراهیم (نموونە)', phone: '07701112233', createdAt: now - 50 * day }]

  const cars: Car[] = [
    {
      id: ids.c1, vin: 'JTMBFREV5HD123456', brand: 'Toyota', model: 'RAV4', trim: 'Limited', year: 2019,
      color: 'سپی مرواری', bodyType: 'جیپ (SUV)', fuel: 'بەنزین', transmission: 'ئۆتۆماتیک', cylinders: '4 سلندەر',
      drive: 'چوار کش (4WD/AWD)', origin: 'ئەمریکی', km: 78500, keys: 2, plate: 'هەولێر 21345', status: 'available',
      ownership: 'owned', buyPrice: 17500, buyCurrency: 'USD', buyDate: iso(now - 40 * day), sellerName: 'کاروان عەلی',
      sellerPhone: '07501234567', askPrice: 21500, askCurrency: 'USD', photos: [],
      body: { bonnet: 'painted', doorFR: 'putty', bumperF: 'scratched' },
      bodyNote: 'کاپۆت بۆیاغ کراوە بەهۆی خەراشەیەکی بچووک.', location: 'پێشانگا ١',
      createdAt: now - 40 * day, updatedAt: now - 2 * day,
    },
    {
      id: ids.c2, vin: 'WDDGF4HB1CR123789', brand: 'Mercedes-Benz', model: 'C-Class', year: 2016, color: 'ڕەش',
      bodyType: 'سەدان', fuel: 'بەنزین', transmission: 'ئۆتۆماتیک', cylinders: '4 سلندەر', origin: 'ئەوروپی',
      km: 121000, keys: 2, status: 'available', ownership: 'consignment', partnerId: ids.p1, partnerPct: 50,
      buyPrice: 14000, buyCurrency: 'USD', buyDate: iso(now - 25 * day), askPrice: 17800, askCurrency: 'USD',
      photos: [], body: {}, createdAt: now - 25 * day, updatedAt: now - 25 * day,
    },
    {
      id: ids.c3, vin: 'JN8AZ2NE9J9123444', brand: 'Nissan', model: 'Patrol', year: 2020, color: 'شینی تاریک',
      bodyType: 'جیپ (SUV)', fuel: 'بەنزین', transmission: 'ئۆتۆماتیک', cylinders: '8 سلندەر', origin: 'خەلیجی',
      km: 54000, keys: 2, status: 'workshop', ownership: 'owned', buyPrice: 42000, buyCurrency: 'USD',
      buyDate: iso(now - 15 * day), askPrice: 49000, askCurrency: 'USD', photos: [], body: {},
      createdAt: now - 15 * day, updatedAt: now - day,
    },
    {
      id: ids.c4, vin: 'KNAGM4AD5F5123222', brand: 'Kia', model: 'Optima', year: 2015, color: 'زیوی',
      bodyType: 'سەدان', fuel: 'بەنزین', transmission: 'ئۆتۆماتیک', origin: 'کۆریایی', km: 145000, keys: 1,
      status: 'sold', ownership: 'owned', buyPrice: 8200, buyCurrency: 'USD', buyDate: iso(now - 90 * day),
      askPrice: 10500, askCurrency: 'USD', photos: [], body: { bumperR: 'painted' },
      createdAt: now - 90 * day, updatedAt: now - 5 * day,
    },
  ]

  const customers: Customer[] = [
    { id: ids.cus1, name: 'ئارام محمد ڕەشید (نموونە)', phone: '07701234567', idNumber: '19881234567', idIssuer: 'هەولێر', city: 'هەولێر', address: 'گەڕەکی ئەندازیاران', createdAt: now - 30 * day },
  ]

  const car4 = cars[3]
  const contracts: Contract[] = [
    {
      id: ids.con1, no: `${new Date().getFullYear()}-0001`, type: 'sale', date: iso(now - 5 * day), carId: ids.c4,
      car: { vin: car4.vin, brand: car4.brand, model: car4.model, year: car4.year, color: car4.color, km: car4.km, bodyType: car4.bodyType, fuel: car4.fuel, transmission: car4.transmission, origin: car4.origin, keys: car4.keys, body: car4.body },
      buyerId: ids.cus1,
      buyer: { name: 'ئارام محمد ڕەشید (نموونە)', phone: '07701234567', idNumber: '19881234567', idIssuer: 'هەولێر', address: 'هەولێر — گەڕەکی ئەندازیاران' },
      seller: { name: 'پێشانگا', phone: '', address: 'هەولێر' },
      price: 10500, currency: 'USD', rate: 1320, payment: 'installment', down: 4500,
      installments: [
        { no: 1, dueDate: iso(now - 2 * day), amount: 1500, paid: 1500, paidDate: iso(now - 2 * day) },
        { no: 2, dueDate: iso(now + 25 * day), amount: 1500, paid: 0 },
        { no: 3, dueDate: iso(now + 55 * day), amount: 1500, paid: 0 },
        { no: 4, dueDate: iso(now + 85 * day), amount: 1500, paid: 0 },
      ],
      terms: [], note: 'پلێت لەگەڵ ئۆتۆمبێلەکەدایە.', witness1: 'هێمن ئەحمەد', status: 'active',
      createdAt: now - 5 * day, createdByName: 'نموونە',
    },
  ]

  const txs: Tx[] = [
    { id: uid('tx'), date: iso(now - 30 * day), kind: 'in', amount: 60000, currency: 'USD', rate: 1320, account: 'bank', category: 'capital', title: 'سەرمایەی سەرەتایی', createdAt: now - 30 * day },
    { id: uid('tx'), date: iso(now - 90 * day), kind: 'out', amount: 8200, currency: 'USD', rate: 1320, account: 'cash', category: 'car_buy', title: 'کڕینی Kia Optima 2015', carId: ids.c4, createdAt: now - 90 * day },
    { id: uid('tx'), date: iso(now - 80 * day), kind: 'out', amount: 450, currency: 'USD', rate: 1320, account: 'cash', category: 'car_cost', title: 'بۆیاغ', carId: ids.c4, createdAt: now - 80 * day },
    { id: uid('tx'), date: iso(now - 40 * day), kind: 'out', amount: 17500, currency: 'USD', rate: 1320, account: 'cash', category: 'car_buy', title: 'کڕینی Toyota RAV4 2019', carId: ids.c1, createdAt: now - 40 * day },
    { id: uid('tx'), date: iso(now - 5 * day), kind: 'in', amount: 4500, currency: 'USD', rate: 1320, account: 'cash', category: 'car_sell', title: 'فرۆشتنی Kia Optima 2015', carId: ids.c4, contractId: ids.con1, createdAt: now - 5 * day },
    { id: uid('tx'), date: iso(now - 2 * day), kind: 'in', amount: 1500, currency: 'USD', rate: 1320, account: 'cash', category: 'installment', title: 'قیستی ژمارە 1', contractId: ids.con1, createdAt: now - 2 * day },
    { id: uid('tx'), date: iso(now - 12 * day), kind: 'out', amount: 900000, currency: 'IQD', rate: 1320, account: 'cash', category: 'expense', title: 'کرێی پێشانگا', createdAt: now - 12 * day },
    { id: uid('tx'), date: iso(now - 10 * day), kind: 'out', amount: 750000, currency: 'IQD', rate: 1320, account: 'cash', category: 'expense', title: 'مووچەی کارمەند', createdAt: now - 10 * day },
    { id: uid('tx'), date: todayISO(), kind: 'out', amount: 120000, currency: 'IQD', rate: 1320, account: 'cash', category: 'expense', title: 'سووتەمەنی و گواستنەوە', createdAt: now },
  ]

  return { cars, customers, contracts, txs, partners }
}
