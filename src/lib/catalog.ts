import type { PartState } from './types'

/* ============ براندەکان و مۆدێلەکان ============ */
export const BRANDS: Record<string, string[]> = {
  Toyota: ['Corolla','Corolla Cross','Camry','Yaris','Yaris Cross','Avalon','Aurion','Belta','Echo','Solara','Matrix','Verso','Land Cruiser','Land Cruiser 300','Land Cruiser 200','Land Cruiser 100','Land Cruiser 79','Land Cruiser 76','Land Cruiser 71','Prado','Prado TXL','FJ Cruiser','RAV4','Highlander','Fortuner','Hilux','Hilux Revo','Tundra','Tacoma','Sequoia','4Runner','C-HR','Crown','Supra','Prius','Rush','Raize','Avanza','Veloz','Innova','Hiace','Coaster','Venza','Sienna','Alphard','Vellfire','Previa','Granvia','Urban Cruiser','bZ4X','Zelas','Dyna','Land Cruiser Pickup'],
  Lexus: ['ES','ES 350','IS','GS','LS','RX','RX 350','RX 450h','NX','UX','GX','GX 460','GX 550','LX','LX 570','LX 600','LC','RC','RZ','TX','LM','CT','HS','SC','LFA'],
  Kia: ['Rio','Rio X','Pegas','Cerato','K3','K5','K7','K8','K9','Optima','Forte','Sephia','Spectra','Cadenza','Opirus','Sportage','Sorento','Seltos','Sonet','Telluride','Mohave','Carnival','Carens','Picanto','Morning','Ray','Soul','Stinger','Bongo','EV6','EV9','Niro','Xceed','Ceed'],
  Hyundai: ['Accent','Verna','Solaris','Getz','Excel','Elantra','Avante','Sonata','Azera','Grandeur','Equus','Centennial','i10','i20','i30','i40','Matrix','Trajet','Terracan','Tucson','Santa Fe','Santa Cruz','Palisade','Creta','Venue','Bayon','Alcazar','Kona','Veloster','Genesis','Staria','Starex','H1','H100','Porter','County','Ioniq','Ioniq 5','Ioniq 6','Nexo'],
  Genesis: ['G70','G80','G90','GV60','GV70','GV80','GV90'],
  Nissan: ['Sunny','Almera','Sentra','Tiida','Versa','Micra','Altima','Maxima','Teana','Patrol','Patrol Safari','Safari','Pathfinder','Xterra','X-Trail','Rogue','Kicks','Juke','Qashqai','Murano','Armada','Terra','Navara','Frontier','Titan','Urvan','Magnite','Ariya','Z','350Z','370Z','GT-R','Sylphy'],
  Infiniti: ['Q50','Q60','Q70','QX50','QX55','QX56','QX60','QX70','QX80','FX35','FX45','G35','G37','M37'],
  Honda: ['Civic','Accord','City','Fit','Jazz','Insight','Legend','Prelude','S2000','CR-V','HR-V','BR-V','WR-V','ZR-V','Vezel','Freed','Pilot','Passport','Odyssey','Ridgeline','Element','Crosstour','e:NS1'],
  Mazda: ['2','3','5','6','Premacy','MPV','CX-3','CX-30','CX-5','CX-50','CX-60','CX-7','CX-8','CX-9','CX-90','MX-5','MX-30','RX-7','RX-8','Tribute','BT-50'],
  Mitsubishi: ['Lancer','Lancer EX','Galant','Attrage','Mirage','Colt','Space Star','Grandis','Eclipse','Eclipse Cross','Outlander','Endeavor','Pajero','Pajero Sport','Montero','Montero Sport','Nativa','L200','Triton','ASX','Xpander','Canter','Fuso'],
  Suzuki: ['Swift','Baleno','Ciaz','Dzire','Celerio','Alto','Ignis','SX4','S-Cross','Vitara','Grand Vitara','Jimny','Ertiga','XL7','APV','Fronx','Wagon R','Every','Carry'],
  Subaru: ['Impreza','Legacy','Outback','Forester','XV','Crosstrek','WRX','STI','Ascent','BRZ','Levorg','Tribeca'],
  Chevrolet: ['Aveo','Sonic','Cobalt','Optra','Cruze','Malibu','Impala','Caprice','Lumina','Corsica','Camaro','Corvette','Captiva','Equinox','Traverse','Blazer','Trailblazer','Tracker','Trax','Groove','Tahoe','Suburban','Silverado','Silverado 1500','Silverado 2500','Silverado 3500','Colorado','Astro','Express','Epica','Spark','Bolt','Menlo'],
  GMC: ['Sierra','Sierra 1500','Sierra 2500','Sierra 3500','Sierra Denali','Denali','Yukon','Yukon XL','Yukon Denali','Acadia','Acadia Denali','Terrain','Terrain Denali','Canyon','Envoy','Jimmy','Safari','Sonoma','Savana','Suburban','Hummer EV'],
  Hummer: ['H1','H2','H3','H3T','EV'],
  Cadillac: ['ATS','CTS','CT4','CT5','CT6','STS','DTS','SRX','XT4','XT5','XT6','XTS','Escalade','Escalade ESV','Lyriq','Seville','Deville'],
  Buick: ['Enclave','Encore','Envision','LaCrosse','Regal','Verano','Century','Park Avenue','Rendezvous'],
  Ford: ['Focus','Fiesta','Fusion','Mondeo','Taurus','Escort','Crown Victoria','Mustang','Puma','Kuga','Escape','Edge','Flex','Explorer','Expedition','Excursion','Bronco','Bronco Sport','Everest','Territory','Ecosport','Maverick','Ranger','F-150','F-250','F-350','F-450','Raptor','Transit','Transit Connect','Windstar','Freestar'],
  Lincoln: ['MKZ','MKS','MKC','MKX','MKT','Corsair','Nautilus','Aviator','Navigator','Continental','Town Car'],
  Dodge: ['Charger','Challenger','Durango','Journey','Dart','Neon','Nitro','Avenger','Stratus','Intrepid','Magnum','Viper','Caravan','Grand Caravan','Ram 1500','Ram 2500','Ram 3500'],
  Ram: ['1500','2500','3500','ProMaster','Rampage'],
  Jeep: ['Wrangler','Wrangler Rubicon','Wrangler Sahara','Grand Cherokee','Grand Cherokee L','Cherokee','Liberty','Compass','Renegade','Gladiator','Commander','Patriot','Wagoneer','Grand Wagoneer','Avenger'],
  Chrysler: ['300','300C','200','Pacifica','Voyager','Town & Country','Sebring','PT Cruiser'],
  'Mercedes-Benz': ['A-Class','B-Class','C-Class','E-Class','S-Class','CLA','CLK','CLS','SLK','SLC','SL','SLS','AMG GT','GLA','GLB','GLC','GLC Coupe','GLE','GLE Coupe','GLK','GLS','GL','ML','R-Class','G-Class','Maybach S','Maybach GLS','EQA','EQB','EQC','EQE','EQS','Sprinter','Vito','Viano','V-Class','Citan','Actros','Axor','Atego'],
  BMW: ['1 Series','2 Series','3 Series','3 GT','4 Series','5 Series','5 GT','6 Series','6 GT','7 Series','8 Series','X1','X2','X3','X3 M','X4','X5','X5 M','X6','X6 M','X7','XM','Z3','Z4','M2','M3','M4','M5','M8','i3','i4','i5','i7','i8','iX','iX3'],
  Audi: ['A1','A3','A4','A5','A6','A7','A8','Q2','Q3','Q4 e-tron','Q5','Q7','Q8','e-tron','e-tron GT','TT','R8','S3','S4','S5','S6','S8','SQ5','SQ7','RS3','RS5','RS6','RS7','RSQ8'],
  Volkswagen: ['Golf','Golf GTI','Jetta','Bora','Lavida','Passat','Polo','Arteon','Scirocco','Beetle','Tiguan','Touareg','Teramont','Atlas','Touran','Sharan','T-Roc','T-Cross','ID.4','ID.6','Caddy','Amarok','Transporter','Crafter'],
  Porsche: ['911','911 Turbo','911 GT3','718 Cayman','718 Boxster','Cayman GT4','Panamera','Macan','Macan S','Cayenne','Cayenne Coupe','Taycan'],
  'Land Rover': ['Range Rover','Range Rover Vogue','Range Rover Autobiography','Range Rover Sport','Range Rover Velar','Range Rover Evoque','Discovery','Discovery Sport','LR3','LR4','Defender','Freelander'],
  Jaguar: ['XE','XF','XJ','XK','S-Type','X-Type','F-Pace','E-Pace','I-Pace','F-Type'],
  Volvo: ['S40','S60','S80','S90','V40','V60','V90','XC40','XC60','XC70','XC90','EX30','EX90','C40'],
  Mini: ['Cooper','Cooper S','Clubman','Countryman','Paceman','Convertible'],
  'Alfa Romeo': ['Giulia','Giulietta','Stelvio','Tonale','159','MiTo'],
  Peugeot: ['206','207','208','301','307','308','407','508','2008','3008','5008','Partner','Landtrek','Expert','Boxer','Rifter'],
  Renault: ['Logan','Sandero','Symbol','Clio','Megane','Fluence','Duster','Captur','Kadjar','Koleos','Talisman','Dokker','Kangoo','Master','Trafic'],
  'Citroën': ['C3','C4','C5','C5 Aircross','Berlingo','Jumper','Jumpy'],
  'Škoda': ['Fabia','Rapid','Octavia','Superb','Kamiq','Karoq','Kodiaq','Scala','Enyaq'],
  Seat: ['Ibiza','Leon','Arona','Ateca','Tarraco'],
  Opel: ['Astra','Corsa','Insignia','Vectra','Zafira','Antara','Grandland','Crossland','Mokka','Vivaro'],
  Fiat: ['Tipo','500','500X','Punto','Panda','Doblo','Ducato','Fullback','Linea'],
  MG: ['MG3','MG5','MG6','MG7','ZS','HS','RX5','RX8','GT','One','Whale','Marvel R','Cyberster','4','5'],
  Chery: ['QQ','Arrizo 5','Arrizo 6','Arrizo 8','Tiggo 2','Tiggo 3','Tiggo 4','Tiggo 7','Tiggo 8','Tiggo 9','Omoda 5','Omoda C5','Exeed TXL','Exeed VX','Exeed LX','Fulwin'],
  Changan: ['Alsvin','Eado','Raeton','CS15','CS35','CS55','CS75','CS85','CS95','UNI-K','UNI-T','UNI-V','Hunter','Oshan X7','Lumin'],
  Geely: ['Emgrand','Emgrand X7','Coolray','Azkarra','Tugella','Okavango','Monjaro','Starray','Preface','Atlas','GX3','Binyue','Icon'],
  Haval: ['H1','H2','H6','H9','Jolion','Dargo','Big Dog','F7','F7x','Xiaolong'],
  BYD: ['F3','Song','Song Plus','Han','Tang','Qin','Qin Plus','Seal','Seal U','Atto 3','Dolphin','Yuan','Yuan Plus','Seagull','Destroyer 05'],
  'Great Wall': ['Wingle 5','Wingle 7','Poer','Pao','Cannon','Steed'],
  Tank: ['300','400','500','700'],
  JAC: ['S2','S3','S4','S7','J7','T6','T8','T9','Refine','Sunray'],
  Jetour: ['X70','X70 Plus','X90','X90 Plus','Dashing','T2','Traveller'],
  Bestune: ['T33','T55','T77','T90','T99','B70','B90','E01'],
  Hongqi: ['H5','H6','H9','HS3','HS5','HS7','E-HS9','E-QM5','LS7'],
  Dongfeng: ['AX7','T5 Evo','Rich 6','Glory 580','Fengon 500','Nammi'],
  FAW: ['Bestune T77','Besturn B50','Junpai','Tiger','Hongqi H5'],
  GAC: ['GS3','GS4','GS8','Emzoom','Empow','Aion S','Aion Y','M8'],
  Wuling: ['Almaz','Cortez','Confero','Bingo','Air EV'],
  Foton: ['Tunland','Aumark','View','Sauvana','Toano'],
  Isuzu: ['D-Max','MU-X','Rodeo','Trooper','Ascender','NPR','NQR','FVR','Elf','Forward'],
  Hino: ['300','500','700','Dutro','Ranger'],
  Maxus: ['T60','T70','T90','D90','G10','V80','Deliver 9'],
  Tesla: ['Model 3','Model Y','Model S','Model X','Cybertruck','Roadster'],
  Polestar: ['1','2','3','4'],
  Lucid: ['Air','Gravity'],
  Rivian: ['R1T','R1S'],
  NIO: ['ES6','ES8','ET5','ET7','EC6'],
  Xpeng: ['P7','G3','G6','G9','X9'],
  Zeekr: ['001','007','009','X'],
  'Li Auto': ['L6','L7','L8','L9','Mega'],
  Bentley: ['Continental GT','Continental Flying Spur','Flying Spur','Bentayga','Mulsanne','Arnage','Azure'],
  'Rolls-Royce': ['Ghost','Phantom','Cullinan','Wraith','Dawn','Spectre','Silver Shadow'],
  Maserati: ['Ghibli','Quattroporte','Levante','Grecale','GranTurismo','MC20'],
  Ferrari: ['488','812','F8','Roma','Portofino','SF90','296','Purosangue','California','458','F430'],
  Lamborghini: ['Huracán','Aventador','Gallardo','Murciélago','Urus','Revuelto'],
  'Aston Martin': ['DB9','DB11','DB12','Vantage','DBS','DBX','Rapide'],
  McLaren: ['570S','600LT','650S','720S','750S','765LT','Artura','GT'],
  Lotus: ['Emira','Evora','Exige','Eletre'],
  Daihatsu: ['Terios','Sirion','Materia','Gran Max','Hijet','Rocky','Xenia'],
  SsangYong: ['Actyon','Korando','Kyron','Musso','Rexton','Tivoli'],
  Daewoo: ['Lanos','Nubira','Leganza','Matiz','Espero','Cielo'],
  Lada: ['Niva','Granta','Vesta','Priora','Largus','2107'],
  UAZ: ['Patriot','Hunter','Pickup','452'],
  Tata: ['Xenon','Telcoline','Safari','Nexon'],
  Mahindra: ['Scorpio','XUV500','XUV700','Bolero','Pik Up'],
  Acura: ['TL','TLX','RL','RLX','MDX','RDX','ZDX','ILX','NSX'],
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
