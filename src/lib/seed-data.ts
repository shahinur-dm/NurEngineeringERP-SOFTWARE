/**
 * Canonical demo catalog for Nur Engineering ERP (EEE equipment).
 * Product ← ProductSupplier → Contact(supplier) is the source of truth for supplier prices.
 */

export const DEMO_ADMIN = {
  email: "admin@ditpharma.bd",
  password: "admin123",
  name: "সিস্টেম অ্যাডমিন",
  phone: "01700000000",
};

/** Legacy + username aliases that must still unlock the demo admin. */
export const DEMO_ADMIN_ALIASES = [
  DEMO_ADMIN.email,
  "admin@greenpharma.bd",
  "admin@nureng.bd",
  "admin@nurengineering.bd",
  "admin",
];

/** Fixed catalog suppliers used on product cards (stable mobiles = stable identity) */
export const CATALOG_SUPPLIERS = [
  {
    name: "Alamin Electronics",
    nameBn: "আলামিন ইলেকট্রনিক্স",
    mobile: "01810000001",
    address: "Elephant Road, Dhaka",
    city: "Dhaka",
  },
  {
    name: "VoltLab Traders",
    nameBn: "ভোল্টল্যাব ট্রেডার্স",
    mobile: "01810000002",
    address: "Nawabpur, Dhaka",
    city: "Dhaka",
  },
  {
    name: "Circuit Hub BD",
    nameBn: "সার্কিট হাব বিডি",
    mobile: "01810000003",
    address: "Agrabad, Chittagong",
    city: "Chittagong",
  },
] as const;

export const EXTRA_SUPPLIERS = [
  { name: "TechParts Import", nameBn: "টেকপার্টস ইমপোর্ট", mobile: "01820000011", address: "Motijheel, Dhaka", city: "Dhaka" },
  { name: "Maker Supply Co.", nameBn: "মেকার সাপ্লাই কো.", mobile: "01820000012", address: "Sylhet Sadar", city: "Sylhet" },
  { name: "LabCore Distributors", nameBn: "ল্যাবকোর ডিস্ট্রিবিউটরস", mobile: "01820000013", address: "Rajshahi", city: "Rajshahi" },
  { name: "EEE Tools BD", nameBn: "ইইই টুলস বিডি", mobile: "01820000014", address: "Khulna", city: "Khulna" },
  { name: "Sensor World", nameBn: "সেন্সর ওয়ার্ল্ড", mobile: "01820000015", address: "Gazipur", city: "Gazipur" },
  { name: "GreenWire Components", nameBn: "গ্রিনওয়্যার কম্পোনেন্টস", mobile: "01820000016", address: "Tongi, Gazipur", city: "Gazipur" },
  { name: "PowerTech BD", nameBn: "পাওয়ারটেক বিডি", mobile: "01820000017", address: "Bogura", city: "Bogura" },
  { name: "BoardCraft Supply", nameBn: "বোর্ডক্রাফট সাপ্লাই", mobile: "01820000018", address: "Comilla", city: "Comilla" },
] as const;

/** Category → preferred alternate supplier name (different per product family) */
export const CATEGORY_ALT_SUPPLIER: Record<string, string> = {
  Motors: "EEE Tools BD",
  Microcontrollers: "TechParts Import",
  "Meters & Instruments": "LabCore Distributors",
  Sensors: "Sensor World",
  "Lab Tools": "Maker Supply Co.",
  "Power Supply": "PowerTech BD",
  "Kits & Boards": "BoardCraft Supply",
  "Wiring & Connectors": "GreenWire Components",
};

export const LOCATIONS = [
  { name: "Dhanmondi HQ Store", code: "LOC001", address: "Road 5, Dhanmondi, Dhaka", phone: "01711000001" },
  { name: "Mirpur Warehouse", code: "LOC002", address: "Mirpur-10, Dhaka", phone: "01711000002" },
  { name: "Chittagong Branch", code: "LOC003", address: "Agrabad, Chittagong", phone: "01711000003" },
  { name: "Sylhet Outlet", code: "LOC004", address: "Zindabazar, Sylhet", phone: "01711000004" },
  { name: "Rajshahi Depot", code: "LOC005", address: "Shaheb Bazar, Rajshahi", phone: "01711000005" },
  { name: "Uttara Stock Point", code: "LOC006", address: "Sector 7, Uttara, Dhaka", phone: "01711000006" },
] as const;

export const CATEGORIES = [
  { name: "Motors", nameBn: "মোটর" },
  { name: "Microcontrollers", nameBn: "মাইক্রোকন্ট্রোলার" },
  { name: "Meters & Instruments", nameBn: "মিটার ও ইনস্ট্রুমেন্ট" },
  { name: "Sensors", nameBn: "সেন্সর" },
  { name: "Lab Tools", nameBn: "ল্যাব টুলস" },
  { name: "Power Supply", nameBn: "পাওয়ার সাপ্লাই" },
  { name: "Kits & Boards", nameBn: "কিট ও বোর্ড" },
  { name: "Wiring & Connectors", nameBn: "ওয়্যারিং ও কানেক্টর" },
] as const;

export const BRANDS = [
  "DIT Lab",
  "CircuitCraft",
  "VoltLab BD",
  "TechGear BD",
  "MakerEEE",
  "LabCore",
  "Arduino Compatible",
  "ESP Official",
] as const;

export const UNITS = [
  { name: "Piece", shortName: "Pcs" },
  { name: "Set", shortName: "Set" },
  { name: "Kit", shortName: "Kit" },
  { name: "Box", shortName: "Box" },
  { name: "Pack", shortName: "Pack" },
  { name: "Module", shortName: "Mod" },
  { name: "Board", shortName: "Brd" },
  { name: "Pair", shortName: "Pair" },
] as const;

export type ProductSeed = {
  name: string;
  nameBn: string;
  sku: string;
  category: string;
  brand: string;
  purchasePrice: number;
  sellPrice: number;
  alertQty: number;
  /** Relative price factors vs purchasePrice for catalog suppliers [0],[1],[2] */
  supplierFactors?: [number, number, number];
};

export const PRODUCTS: ProductSeed[] = [
  { name: "DC Motor 6V", nameBn: "ডিসি মোটর ৬ভি", sku: "101", category: "Motors", brand: "DIT Lab", purchasePrice: 120, sellPrice: 180, alertQty: 20 },
  { name: "DC Motor 12V", nameBn: "ডিসি মোটর ১২ভি", sku: "102", category: "Motors", brand: "DIT Lab", purchasePrice: 180, sellPrice: 260, alertQty: 20 },
  { name: "DC Motor 24V", nameBn: "ডিসি মোটর ২৪ভি", sku: "103", category: "Motors", brand: "VoltLab BD", purchasePrice: 320, sellPrice: 450, alertQty: 15 },
  { name: "Arduino Uno Kit Clone", nameBn: "আরডুইনো উনো কিট Clone", sku: "105", category: "Microcontrollers", brand: "Arduino Compatible", purchasePrice: 850, sellPrice: 1150, alertQty: 12, supplierFactors: [0.94, 1, 1.06] },
  { name: "Arduino Uno Kit Official", nameBn: "আরডুইনো উনো কিট Official", sku: "106", category: "Microcontrollers", brand: "Arduino Compatible", purchasePrice: 3200, sellPrice: 4200, alertQty: 8, supplierFactors: [0.95, 1, 1.1] },
  { name: "Arduino Uno Kit R3", nameBn: "আরডুইনো উনো কিট R3", sku: "107", category: "Microcontrollers", brand: "CircuitCraft", purchasePrice: 1100, sellPrice: 1450, alertQty: 10 },
  { name: "ESP32 Dev Kit WROOM", nameBn: "ইএসপি৩২ ডেভ কিট WROOM", sku: "108", category: "Microcontrollers", brand: "ESP Official", purchasePrice: 650, sellPrice: 890, alertQty: 15 },
  { name: "ESP32 Dev Kit WROVER", nameBn: "ইএসপি৩২ ডেভ কিট WROVER", sku: "109", category: "Microcontrollers", brand: "ESP Official", purchasePrice: 780, sellPrice: 1050, alertQty: 12 },
  { name: "Breadboard 400 pt", nameBn: "ব্রেডবোর্ড 400 pt", sku: "110", category: "Kits & Boards", brand: "MakerEEE", purchasePrice: 90, sellPrice: 140, alertQty: 30 },
  { name: "Breadboard 830 pt", nameBn: "ব্রেডবোর্ড 830 pt", sku: "104", category: "Kits & Boards", brand: "MakerEEE", purchasePrice: 160, sellPrice: 240, alertQty: 25 },
  { name: "Digital Multimeter Basic", nameBn: "ডিজিটাল মাল্টিমিটার Basic", sku: "111", category: "Meters & Instruments", brand: "LabCore", purchasePrice: 450, sellPrice: 650, alertQty: 10 },
  { name: "Digital Multimeter Auto-range", nameBn: "ডিজিটাল মাল্টিমিটার Auto-range", sku: "112", category: "Meters & Instruments", brand: "LabCore", purchasePrice: 980, sellPrice: 1350, alertQty: 8 },
  { name: "Clamp Meter AC/DC", nameBn: "ক্ল্যাম্প মিটার AC/DC", sku: "113", category: "Meters & Instruments", brand: "TechGear BD", purchasePrice: 2200, sellPrice: 2950, alertQty: 6 },
  { name: "Soldering Iron 40W", nameBn: "সোল্ডারিং আয়রন ৪০ডব্লিউ", sku: "114", category: "Lab Tools", brand: "TechGear BD", purchasePrice: 350, sellPrice: 520, alertQty: 15 },
  { name: "Soldering Iron 60W", nameBn: "সোল্ডারিং আয়রন ৬০ডব্লিউ", sku: "115", category: "Lab Tools", brand: "TechGear BD", purchasePrice: 480, sellPrice: 690, alertQty: 12 },
  { name: "Wire Stripper Pro", nameBn: "ওয়্যার স্ট্রিপার Pro", sku: "116", category: "Lab Tools", brand: "DIT Lab", purchasePrice: 280, sellPrice: 420, alertQty: 18 },
  { name: "Power Supply 0-30V", nameBn: "পাওয়ার সাপ্লাই ০-৩০ভি", sku: "117", category: "Power Supply", brand: "VoltLab BD", purchasePrice: 4500, sellPrice: 5800, alertQty: 5 },
  { name: "Power Supply 5A Bench", nameBn: "পাওয়ার সাপ্লাই ৫এ Bench", sku: "118", category: "Power Supply", brand: "VoltLab BD", purchasePrice: 6200, sellPrice: 7900, alertQty: 4 },
  { name: "Servo Motor SG90", nameBn: "সার্ভো মোটর SG90", sku: "119", category: "Motors", brand: "MakerEEE", purchasePrice: 140, sellPrice: 210, alertQty: 40 },
  { name: "Servo Motor MG996", nameBn: "সার্ভো মোটর MG996", sku: "120", category: "Motors", brand: "MakerEEE", purchasePrice: 420, sellPrice: 590, alertQty: 20 },
  { name: "Relay Module 4-ch", nameBn: "রিলে মডিউল ৪-চ্যানেল", sku: "121", category: "Kits & Boards", brand: "CircuitCraft", purchasePrice: 220, sellPrice: 340, alertQty: 25 },
  { name: "Relay Module 8-ch", nameBn: "রিলে মডিউল ৮-চ্যানেল", sku: "122", category: "Kits & Boards", brand: "CircuitCraft", purchasePrice: 380, sellPrice: 520, alertQty: 18 },
  { name: "Current Sensor ACS712 20A", nameBn: "কারেন্ট সেন্সর ACS712 ২০এ", sku: "123", category: "Sensors", brand: "CircuitCraft", purchasePrice: 180, sellPrice: 270, alertQty: 30 },
  { name: "Current Sensor ACS712 30A", nameBn: "কারেন্ট সেন্সর ACS712 ৩০এ", sku: "124", category: "Sensors", brand: "CircuitCraft", purchasePrice: 210, sellPrice: 310, alertQty: 25 },
  { name: "Resistor Kit 1/4W", nameBn: "রেজিস্টর কিট ১/৪ডব্লিউ", sku: "125", category: "Kits & Boards", brand: "DIT Lab", purchasePrice: 250, sellPrice: 380, alertQty: 20 },
  { name: "LED Assortment 500 pcs", nameBn: "এলইডি অ্যাসোর্টমেন্ট ৫০০ পিস", sku: "126", category: "Kits & Boards", brand: "DIT Lab", purchasePrice: 320, sellPrice: 480, alertQty: 15 },
  { name: "Oscilloscope Probe 10x", nameBn: "অসিলোস্কোপ প্রোব ১০এক্স", sku: "127", category: "Meters & Instruments", brand: "LabCore", purchasePrice: 1100, sellPrice: 1550, alertQty: 10 },
  { name: "Function Generator DDS", nameBn: "ফাংশন জেনারেটর DDS", sku: "128", category: "Meters & Instruments", brand: "LabCore", purchasePrice: 8500, sellPrice: 11200, alertQty: 3 },
  { name: "PLC Trainer Board Basic", nameBn: "পিএলসি ট্রেইনার বোর্ড Basic", sku: "129", category: "Kits & Boards", brand: "LabCore", purchasePrice: 15000, sellPrice: 19500, alertQty: 2 },
  { name: "Transformer 12V", nameBn: "ট্রান্সফরমার ১২ভি", sku: "130", category: "Power Supply", brand: "VoltLab BD", purchasePrice: 380, sellPrice: 550, alertQty: 15 },
  { name: "Transformer 24V", nameBn: "ট্রান্সফরমার ২৪ভি", sku: "131", category: "Power Supply", brand: "VoltLab BD", purchasePrice: 520, sellPrice: 720, alertQty: 12 },
  { name: "Induction Motor 0.5 HP", nameBn: "ইন্ডাকশন মোটর ০.৫ এইচপি", sku: "132", category: "Motors", brand: "TechGear BD", purchasePrice: 7800, sellPrice: 9800, alertQty: 3 },
  { name: "Induction Motor 1 HP", nameBn: "ইন্ডাকশন মোটর ১ এইচপি", sku: "133", category: "Motors", brand: "TechGear BD", purchasePrice: 12500, sellPrice: 15800, alertQty: 2 },
  { name: "PCB Etching Kit Starter", nameBn: "পিসিবি এচিং কিট Starter", sku: "134", category: "Lab Tools", brand: "MakerEEE", purchasePrice: 950, sellPrice: 1350, alertQty: 8 },
  { name: "Jumper Wire Pack M-M", nameBn: "জাম্পার ওয়্যার প্যাক M-M", sku: "135", category: "Wiring & Connectors", brand: "DIT Lab", purchasePrice: 80, sellPrice: 130, alertQty: 50 },
  { name: "Jumper Wire Pack M-F", nameBn: "জাম্পার ওয়্যার প্যাক M-F", sku: "136", category: "Wiring & Connectors", brand: "DIT Lab", purchasePrice: 85, sellPrice: 140, alertQty: 50 },
];

export const CUSTOMER_GROUPS = [
  { name: "Retail", discountPercent: 0 },
  { name: "Dealer", discountPercent: 5 },
  { name: "Wholesale", discountPercent: 8 },
  { name: "VIP Campus", discountPercent: 10 },
  { name: "Corporate", discountPercent: 12 },
] as const;

export const ROLES = [
  { name: "Admin", permissions: ["all"] },
  { name: "Manager", permissions: ["pos", "sales", "stock", "purchases", "reports"] },
  { name: "Cashier", permissions: ["pos", "sales"] },
  { name: "Accountant", permissions: ["accounts", "reports"] },
  { name: "Warehouse", permissions: ["stock", "purchases"] },
  { name: "Viewer", permissions: ["reports"] },
] as const;

export const ACCOUNTS = [
  { name: "Main Cash", type: "cash" as const, accountNo: "CASH-01", openingBalance: 50000, balance: 125000 },
  { name: "DBBL Business", type: "bank" as const, accountNo: "DBBL-4421", openingBalance: 200000, balance: 485000 },
  { name: "bKash Merchant", type: "bkash" as const, accountNo: "01700000000", openingBalance: 10000, balance: 42000 },
  { name: "Nagad Business", type: "nagad" as const, accountNo: "01800000000", openingBalance: 8000, balance: 18500 },
  { name: "Rocket Merchant", type: "rocket" as const, accountNo: "01900000000", openingBalance: 5000, balance: 9200 },
] as const;

export const LEDGER_ACCOUNTS = [
  { code: "1000", name: "Cash on Hand", nameBn: "হাতে নগদ", type: "asset" as const },
  { code: "1100", name: "Inventory Asset", nameBn: "ইনভেন্টরি সম্পদ", type: "asset" as const },
  { code: "1200", name: "Accounts Receivable", nameBn: "প্রাপ্য হিসাব", type: "asset" as const },
  { code: "2000", name: "Accounts Payable", nameBn: "প্রদেয় হিসাব", type: "liability" as const },
  { code: "3000", name: "Owner Equity", nameBn: "মালিকানার ইকুইটি", type: "equity" as const },
  { code: "4000", name: "Sales Income", nameBn: "বিক্রয় আয়", type: "income" as const },
  { code: "4100", name: "Service Income", nameBn: "সার্ভিস আয়", type: "income" as const },
  { code: "5000", name: "Cost of Goods Sold", nameBn: "বিক্রীত পণ্যের ব্যয়", type: "expense" as const },
  { code: "5100", name: "Purchase Expense", nameBn: "ক্রয় ব্যয়", type: "expense" as const },
  { code: "5200", name: "Salary Expense", nameBn: "বেতন ব্যয়", type: "expense" as const },
] as const;

export const EXPENSE_CATEGORIES = [
  "Transport",
  "Utility",
  "Salary",
  "Marketing",
  "Maintenance",
  "Office",
  "Rent",
  "Fuel",
  "Internet",
  "Training",
] as const;

export function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function offerPrices(
  purchasePrice: number,
  factors: [number, number, number] = [0.92, 1, 1.08],
) {
  return factors.map((f) => Math.max(1, Math.round(purchasePrice * f)));
}
