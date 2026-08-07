import type { PartState } from './types'

/* ============ براندەکان و مۆدێلەکان ============ */
export const BRANDS: Record<string, string[]> = {
  Toyota: ['Corolla','Camry','Yaris','Avalon','Land Cruiser','Prado','FJ Cruiser','RAV4','Highlander','Fortuner','Hilux','Tundra','Tacoma','Sequoia','4Runner','C-HR','Crown','Supra','Prius','Rush','Innova','Hiace','Coaster','Aurion','Venza','Sienna'],
  Lexus: ['ES','IS','GS','LS','RX','NX','UX','GX','LX','LC','RC','RZ','TX'],
  Kia: ['Rio','Cerato','K3','K5','Optima','Forte','Sportage','Sorento','Seltos','Sonet','Telluride','Carnival','Picanto','Soul','Stinger','Cadenza','Mohave','EV6','Niro','Pegas'],
  Hyundai: ['Accent','Elantra','Sonata','Azera','Grandeur','Tucson','Santa Fe','Palisade','Creta','Venue','Kona','Veloster','Genesis','i10','i20','i30','Staria','H1','Porter','Ioniq 5','Ioniq 6','Santa Cruz'],
  Genesis: ['G70','G80','G90','GV70','GV80','GV60'],
  Nissan: ['Sunny','Sentra','Altima','Maxima','Patrol','Pathfinder','X-Trail','Kicks','Juke','Qashqai','Murano','Armada','Navara','Titan','Tiida','Micra','Z','GT-R','Urvan'],
  Infiniti: ['Q50','Q60','Q70','QX50','QX55','QX60','QX70','QX80'],
  Honda: ['Civic','Accord','City','CR-V','HR-V','Pilot','Odyssey','Ridgeline','Passport','Insight','ZR-V'],
  Mazda: ['2','3','6','CX-3','CX-30','CX-5','CX-9','CX-60','CX-90','MX-5','BT-50'],
  Mitsubishi: ['Lancer','Attrage','Mirage','Eclipse Cross','Outlander','Pajero','Montero Sport','L200','ASX','Xpander'],
  Suzuki: ['Swift','Baleno','Ciaz','Dzire','Vitara','Grand Vitara','Jimny','Ertiga','Alto','Fronx'],
  Subaru: ['Impreza','Legacy','Outback','Forester','XV','Crosstrek','WRX','Ascent','BRZ'],
  Chevrolet: ['Aveo','Cruze','Malibu','Impala','Camaro','Corvette','Captiva','Equinox','Traverse','Blazer','Tahoe','Suburban','Silverado','Colorado','Trailblazer','Groove','Spark','Optra'],
  GMC: ['Sierra','Yukon','Yukon XL','Acadia','Terrain','Canyon','Savana','Hummer EV'],
  Cadillac: ['ATS','CTS','CT4','CT5','CT6','XT4','XT5','XT6','Escalade','SRX'],
  Ford: ['Focus','Fusion','Fiesta','Taurus','Mustang','Escape','Edge','Explorer','Expedition','Bronco','Bronco Sport','F-150','F-250','Ranger','Ecosport','Territory','Everest','Transit'],
  Lincoln: ['MKZ','MKC','MKX','Corsair','Nautilus','Aviator','Navigator','Continental'],
  Dodge: ['Charger','Challenger','Durango','Journey','Ram 1500','Ram 2500','Dart','Neon','Nitro'],
  Jeep: ['Wrangler','Grand Cherokee','Cherokee','Compass','Renegade','Gladiator','Commander','Patriot','Wagoneer'],
  Chrysler: ['300','200','Pacifica','Voyager'],
  'Mercedes-Benz': ['A-Class','C-Class','E-Class','S-Class','CLA','CLS','GLA','GLB','GLC','GLE','GLS','G-Class','Maybach S','SL','AMG GT','Sprinter','Vito','V-Class','EQS','EQE'],
  BMW: ['1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','8 Series','X1','X2','X3','X4','X5','X6','X7','XM','Z4','M3','M4','M5','i4','iX'],
  Audi: ['A3','A4','A5','A6','A7','A8','Q2','Q3','Q5','Q7','Q8','e-tron','TT','R8','RS6','S5'],
  Volkswagen: ['Golf','Jetta','Passat','Polo','Arteon','Tiguan','Touareg','Teramont','T-Roc','ID.4','ID.6','Caddy','Amarok'],
  Porsche: ['911','718 Cayman','718 Boxster','Panamera','Macan','Cayenne','Taycan'],
  'Land Rover': ['Range Rover','Range Rover Sport','Range Rover Velar','Range Rover Evoque','Discovery','Discovery Sport','Defender','Freelander'],
  Jaguar: ['XE','XF','XJ','F-Pace','E-Pace','I-Pace','F-Type'],
  Volvo: ['S60','S90','V60','XC40','XC60','XC90','EX30','EX90'],
  Peugeot: ['208','301','308','2008','3008','5008','508','Partner','Landtrek'],
  Renault: ['Logan','Sandero','Megane','Duster','Captur','Koleos','Talisman','Dokker'],
  'Škoda': ['Fabia','Octavia','Superb','Kamiq','Karoq','Kodiaq','Scala'],
  Opel: ['Astra','Insignia','Corsa','Grandland','Crossland','Mokka'],
  Fiat: ['Tipo','500','Doblo','Fullback'],
  MG: ['MG3','MG5','MG6','MG7','ZS','HS','RX5','RX8','GT','One','Whale','Marvel R'],
  Chery: ['Arrizo 5','Arrizo 6','Tiggo 2','Tiggo 4','Tiggo 7','Tiggo 8','Tiggo 9','Omoda 5','Exeed TXL','Exeed VX'],
  Changan: ['Alsvin','Eado','CS35','CS55','CS75','CS85','CS95','UNI-K','UNI-T','UNI-V','Hunter'],
  Geely: ['Emgrand','Coolray','Azkarra','Tugella','Okavango','Monjaro','Starray','GX3'],
  Haval: ['H6','H9','Jolion','Dargo','Big Dog','H2'],
  BYD: ['Song','Han','Tang','Qin','Seal','Atto 3','Dolphin','Yuan','Seagull'],
  'Great Wall': ['Wingle 5','Wingle 7','Poer','Pao'],
  JAC: ['S3','S4','S7','J7','T6','T8','Refine'],
  Isuzu: ['D-Max','MU-X','NPR','NQR','Trooper'],
  Tesla: ['Model 3','Model Y','Model S','Model X','Cybertruck'],
  Bentley: ['Continental GT','Flying Spur','Bentayga'],
  'Rolls-Royce': ['Ghost','Phantom','Cullinan','Wraith','Dawn','Spectre'],
  Maserati: ['Ghibli','Quattroporte','Levante','Grecale','MC20'],
  Ferrari: ['488','812','F8','Roma','Portofino','SF90','296','Purosangue'],
  Lamborghini: ['Huracán','Aventador','Urus','Revuelto'],
  Bestune: ['T77','T99','B70','T55'],
  Jetour: ['X70','X90','Dashing','T2'],
  Hongqi: ['H5','H9','HS5','HS7','E-HS9'],
  Daihatsu: ['Terios','Sirion','Gran Max'],
  Other: [],
}

export const BRAND_LIST = Object.keys(BRANDS).sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))

/* ============ ڕەنگەکان ============ */
export const COLORS: { ku: string; hex: string }[] = [
  { ku: 'سپی', hex: '#F4F5F7' },
  { ku: 'سپی مرواری', hex: '#EDE8DC' },
  { ku: 'ڕەش', hex: '#111315' },
  { ku: 'ڕەشی مات', hex: '#26282B' },
  { ku: 'زیوی', hex: '#C3C7CC' },
  { ku: 'خۆڵەمێشی', hex: '#7C838B' },
  { ku: 'خۆڵەمێشی تاریک', hex: '#4A5057' },
  { ku: 'شین', hex: '#1E4FA3' },
  { ku: 'ئاسمانی', hex: '#5FA8E0' },
  { ku: 'شینی تاریک', hex: '#152A52' },
  { ku: 'سوور', hex: '#C22B24' },
  { ku: 'شەرابی', hex: '#6E1A22' },
  { ku: 'سەوز', hex: '#2C6B45' },
  { ku: 'سەوزی زەیتوونی', hex: '#5A6238' },
  { ku: 'زەرد', hex: '#E8C33C' },
  { ku: 'پرتەقاڵی', hex: '#DE7328' },
  { ku: 'قاوەیی', hex: '#6B4A32' },
  { ku: 'شەکری (بەیج)', hex: '#D9C7A7' },
  { ku: 'تەنی (چەمپەین)', hex: '#C6B295' },
  { ku: 'زێڕی', hex: '#C9A227' },
  { ku: 'مۆر', hex: '#5B3A86' },
  { ku: 'بەنەوشەیی', hex: '#8E6BB5' },
  { ku: 'ڕەنگی تر', hex: '#8A8F98' },
]

export const BODY_TYPES = ['بەرز', 'نزم', 'پاس', 'پیکاب']
export const FUELS = ['بەنزین', 'دیزەل', 'هایبرید', 'کارەبایی', 'گاز']
export const TRANSMISSIONS = ['ئۆتۆماتیک', 'مانیوال', 'CVT', 'نیوە ئۆتۆماتیک']
export const DRIVES = ['کشانی پێشەوە (FWD)', 'کشانی دواوە (RWD)', 'چوار کش (4WD/AWD)']
export const CYLINDERS = ['3 سلندەر', '4 سلندەر', '5 سلندەر', '6 سلندەر', '8 سلندەر', '10 سلندەر', '12 سلندەر', 'کارەبایی']
export const ORIGINS = ['خەلیجی', 'ئەمریکی', 'کەنەدی', 'ئەوروپی', 'کۆریایی', 'یابانی', 'چینی', 'ڕووسی', 'عێراقی (وارد)', 'نەزانراو']
export const CITIES = ['هەولێر', 'سلێمانی', 'دهۆک', 'کەرکووک', 'زاخۆ', 'ڕانیە', 'کۆیە', 'سۆران', 'حەلەبجە', 'دووکان', 'شەقڵاوە', 'ئاکرێ', 'بەغدا', 'موسڵ', 'بەسرە', 'شاری تر']

export const CAR_STATUS: Record<string, { ku: string; cls: string }> = {
  available: { ku: 'بەردەستە', cls: 'bg-ok/15 text-ok border-ok/30' },
  reserved: { ku: 'حیجزکراوە', cls: 'bg-warn/15 text-warn border-warn/30' },
  workshop: { ku: 'لە وۆرکشۆپ', cls: 'bg-info/15 text-info border-info/30' },
  sold: { ku: 'فرۆشراوە', cls: 'bg-muted/15 text-muted border-line' },
}

/* ============ پارچەکانی جەستەی ئۆتۆمبێل ============ */
export const PART_STATES: Record<PartState, { ku: string; hex: string; short: string }> = {
  original: { ku: 'ئۆرجینال / سەلیم', hex: '#2FA96B', short: 'ئۆرجینال' },
  painted: { ku: 'بۆیاغ کراوە', hex: '#E8A838', short: 'بۆیاغ' },
  putty: { ku: 'معجون / ماستیک', hex: '#D9762B', short: 'معجون' },
  dented: { ku: 'ناوگرتووە / کوتراوە', hex: '#E0563F', short: 'ناوگرتن' },
  replaced: { ku: 'گۆڕدراوە', hex: '#B23AE0', short: 'گۆڕاو' },
  scratched: { ku: 'خەراشەی هەیە', hex: '#4E90E2', short: 'خەراشە' },
}
export const PART_STATE_KEYS = Object.keys(PART_STATES) as PartState[]

export interface BodyPart {
  key: string
  ku: string
  group: 'front' | 'rear' | 'right' | 'left' | 'top' | 'glass' | 'struct'
}

export const BODY_PARTS: BodyPart[] = [
  { key: 'bumperF', ku: 'دەعامی پێشەوە', group: 'front' },
  { key: 'bonnet', ku: 'بۆنیت', group: 'front' },
  { key: 'fenderFR', ku: 'چەمەڵەغی پێشەوەی ڕاست', group: 'right' },
  { key: 'fenderFL', ku: 'چەمەڵەغی پێشەوەی چەپ', group: 'left' },
  { key: 'doorFR', ku: 'دەرگای پێشەوەی ڕاست', group: 'right' },
  { key: 'doorFL', ku: 'دەرگای پێشەوەی چەپ', group: 'left' },
  { key: 'doorRR', ku: 'دەرگای دواوەی ڕاست', group: 'right' },
  { key: 'doorRL', ku: 'دەرگای دواوەی چەپ', group: 'left' },
  { key: 'quarterRR', ku: 'چەمەڵەغی دواوەی ڕاست', group: 'right' },
  { key: 'quarterRL', ku: 'چەمەڵەغی دواوەی چەپ', group: 'left' },
  { key: 'roof', ku: 'سەقف', group: 'top' },
  { key: 'trunk', ku: 'سندووق (شەنتە)', group: 'rear' },
  { key: 'bumperR', ku: 'دەعامی دواوە', group: 'rear' },
  { key: 'pillarR', ku: 'ستوونی ڕاست', group: 'struct' },
  { key: 'pillarL', ku: 'ستوونی چەپ', group: 'struct' },
  { key: 'chassis', ku: 'شاسی', group: 'struct' },
  { key: 'glassF', ku: 'شووشەی پێشەوە', group: 'glass' },
  { key: 'glassR', ku: 'شووشەی دواوە', group: 'glass' },
]

export const EXPENSE_CATEGORIES = [
  'کرێی پێشانگا',
  'مووچەی کارمەند',
  'کارەبا و ئاو',
  'ئینتەرنێت و تەلەفۆن',
  'ڕیکلام و بانگەشە',
  'سووتەمەنی و گواستنەوە',
  'خواردن و چێشتخانە',
  'پاککردنەوە',
  'مەکتەبی و پرینت',
  'باج و ڕەسم',
  'چاککردنەوەی گشتی',
  'خەرجی تر',
]

export const TX_CATEGORY_KU: Record<string, string> = {
  car_buy: 'کڕینی ئۆتۆمبێل',
  car_cost: 'تێچووی ئۆتۆمبێل',
  car_sell: 'فرۆشتنی ئۆتۆمبێل',
  installment: 'وەرگرتنی قیست',
  expense: 'خەرجی',
  capital: 'زیادکردنی سەرمایە',
  withdraw: 'دەرهێنانی پارە',
  commission: 'کۆمیشن',
  partner: 'پشکی شەریک',
  debt_in: 'وەرگرتنی قەرزی کۆن',
  debt_out: 'دانەوەی قەرزی کۆن',
  exchange_transfer: 'گواستنەوە بۆ سەراف',
  exchange_return: 'وەرگرتنەوە لە سەراف',
  cash_exchange_out: 'ئیکسچێنج — دەرچوو',
  cash_exchange_in: 'ئیکسچێنج — وەرگیراو',
  contract_refund: 'گەڕاندنەوەی پارەی عەقد',
  hawala: 'حەواڵەکردن',
  hawala_cancel: 'هەڵوەشاندنەوەی حەواڵە',
  other: 'شتی تر',
}

export const ROLE_KU: Record<string, string> = {
  owner: 'خاوەن پێشانگا',
  manager: 'بەڕێوەبەر',
  seller: 'فرۆشیار',
  accountant: 'ژمێریار',
  viewer: 'تەنها بینین',
}

export const DEFAULT_TERMS = [
  'فرۆشیار دان بەوەدا دەنێت کە ئۆتۆمبێلەکە موڵکی خۆیەتی و هیچ گرەنتی و قەرزێکی لەسەر نییە.',
  'کڕیار ئۆتۆمبێلەکەی بینیوە و سەیری کردووە و بە دۆخی ئێستای وەریگرتووە.',
  'دوای واژووی ئەم عەقدە، هەموو بەرپرسیارێتییەکی یاسایی و ترافیکی ئۆتۆمبێلەکە دەکەوێتە سەر کڕیار.',
  'هەر کێشەیەکی پێشووی ئۆتۆمبێلەکە (لادان، حجز، جینایی) بەرپرسیارێتی فرۆشیارە.',
  'گۆڕینی ناوی ئۆتۆمبێلەکە لە بەڕێوەبەرایەتی هاتوچۆ ئەرکی هەردوولایە بەپێی ڕێککەوتن.',
  'ئەم عەقدە بە دوو نوسخە ئامادەکراوە، هەر لایەک نوسخەیەکی لەلایە.',
]

export const DEFAULT_TERMS_AR = [
  'يقر البائع بأن السيارة ملكه الخاص وليس عليها أي رهن أو دين.',
  'اطلع المشتري على السيارة وعاينها وقبلها بحالتها الراهنة.',
  'بعد توقيع هذا العقد تنتقل كامل المسؤولية القانونية والمرورية للسيارة إلى المشتري.',
  'أي مشكلة سابقة تخص السيارة (مخالفة، حجز، قضية جنائية) تقع على مسؤولية البائع.',
  'نقل ملكية السيارة في مديرية المرور من واجب الطرفين حسب الاتفاق.',
  'حرر هذا العقد من نسختين بيد كل طرف نسخة.',
]
