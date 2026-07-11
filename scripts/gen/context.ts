// Shared constants for the synthetic world. Every counterparty that carries
// fault is FICTIONAL. Real public anchors (plant names, capacities) only.

import type { Colliery } from "@/lib/types";

export const MONTHS = ((): string[] => {
  // Six months ending last month, computed at generation time.
  const now = new Date();
  const out: string[] = [];
  for (let i = 6; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
})();

export const AS_OF = ((): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
})();

export function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/* ── Plants & units ──────────────────────────────────────────── */

export const THERMAL = ["RTPS", "BTPS", "YTPS"] as const;

// 9 generating units (representative demo fleet).
export const UNITS = [
  { id: "RTPS-U1", plant: "RTPS", capacityMW: 210, commissioned: 1985 },
  { id: "RTPS-U2", plant: "RTPS", capacityMW: 210, commissioned: 1986 },
  { id: "RTPS-U5", plant: "RTPS", capacityMW: 210, commissioned: 1994 },
  { id: "RTPS-U8", plant: "RTPS", capacityMW: 250, commissioned: 2010 },
  { id: "BTPS-U1", plant: "BTPS", capacityMW: 500, commissioned: 2008 },
  { id: "BTPS-U2", plant: "BTPS", capacityMW: 500, commissioned: 2012 },
  { id: "BTPS-U3", plant: "BTPS", capacityMW: 700, commissioned: 2017 },
  { id: "YTPS-U1", plant: "YTPS", capacityMW: 800, commissioned: 2017 },
  { id: "YTPS-U2", plant: "YTPS", capacityMW: 800, commissioned: 2018 },
] as const;

/* ── Collieries (fictionalized) ──────────────────────────────── */
// STORY anchors: W-3 grade slippage; M-5 2.2% transit loss route;
// S-7 chronic 4% under-loading; M-2 FSA at 78% ACQ.

export const COLLIERIES: Colliery[] = [
  { id: "W-3", name: "WCL — Colliery W-3", company: "Western Collieries (fictional)", state: "Maharashtra", typicalGrade: "G8", distanceKm: 740, freightPerTonne: 1210, siding: "Majri Exchange Yard" },
  { id: "W-1", name: "WCL — Colliery W-1", company: "Western Collieries (fictional)", state: "Maharashtra", typicalGrade: "G9", distanceKm: 705, freightPerTonne: 1180, siding: "Bhandara Road" },
  { id: "M-2", name: "MCL — Colliery M-2", company: "Mahanadi Collieries (fictional)", state: "Odisha", typicalGrade: "G11", distanceKm: 1260, freightPerTonne: 1490, siding: "Talcher Outer" },
  { id: "M-5", name: "MCL — Colliery M-5", company: "Mahanadi Collieries (fictional)", state: "Odisha", typicalGrade: "G12", distanceKm: 1310, freightPerTonne: 1520, siding: "Angul West" },
  { id: "S-7", name: "SCCL — Colliery S-7", company: "Singareni Collieries (fictional)", state: "Telangana", typicalGrade: "G10", distanceKm: 480, freightPerTonne: 890, siding: "Ramagundam South Siding" },
  { id: "K-1", name: "Captive Block K-1", company: "KPCL captive (fictional allocation)", state: "Odisha", typicalGrade: "G10", distanceKm: 1290, freightPerTonne: 1500, siding: "Baitarani Loading Point" },
];

/* ── Fictional contractors / vendors ─────────────────────────── */

export const KEY_VENDORS = {
  DECCAN: { id: "V-0001", name: "Deccan EPC Ltd" }, // grade-D EPC slipping everywhere
  CAUVERY: { id: "V-0002", name: "Cauvery Engineering Pvt Ltd" },
  TUNGABHADRA: { id: "V-0003", name: "Tungabhadra Constructions" },
  MALNAD: { id: "V-0004", name: "Malnad Infra Projects" }, // grade-E still winning awards
  HOYSALA: { id: "V-0005", name: "Hoysala Electricals" },
  KAVERI_LOG: { id: "V-0006", name: "Kaveri Logistics & Handling" },
  SLV: { id: "V-0007", name: "SLV Enterprises" }, // labour contractor with wage/EPF issues
  VINDHYA: { id: "V-0008", name: "Vindhya Boiler Services" },
} as const;

export const VENDOR_NAME_PARTS = {
  first: [
    "Sharada", "Krishna", "Bhadra", "Netravati", "Kalyani", "Chalukya", "Vijaya", "Rashtrakuta",
    "Hemavati", "Kumudvathi", "Agastya", "Basava", "Kittur", "Mandovi", "Sahyadri", "Nandi",
    "Chamundi", "Kudremukh", "Ghataprabha", "Malaprabha", "Varada", "Panchaganga", "Uttara",
    "Sangama", "Amrutha", "Keladi", "Hampi", "Badami", "Aihole", "Pattadakal", "Kalburgi",
    "Bidar", "Belur", "Halebidu", "Shravana", "Talakadu", "Srirangapatna", "Melukote", "Udupi",
  ],
  second: [
    "Engineering", "EPC", "Constructions", "Infra", "Electricals", "Fabricators", "Industrial Services",
    "Projects", "Enterprises", "Boiler Works", "Power Services", "Conveyors", "Instrumentation",
    "Mechanicals", "Erectors", "Turnkey Systems", "Utilities", "Ash Handling", "Hydraulics", "Controls",
  ],
  suffix: ["Pvt Ltd", "Ltd", "LLP", "& Co", "Industries"],
};

export const BANKS = [
  "Canara Bank", "State Bank of India", "Union Bank of India", "Bank of Baroda",
  "Karnataka Bank", "Punjab National Bank", "Indian Bank", "IDBI Bank",
];

export const LAW_FIRMS = [
  "Rao & Raghavan Associates", "Hegde Chambers", "Kulkarni & Desai", "Shastri Law Partners",
  "Nayak & Nayak", "Iyengar Legal", "Bhat & Kamath Advocates", "Menon Chambers of Law",
];

export const COUNSEL = [
  "Sr Adv B. R. Prabhakar", "Adv Meera Kulkarni", "Sr Adv K. Nagaraj", "Adv Deepa Hegde",
  "Adv S. Chandrashekar", "Sr Adv Vani Rao", "Adv Prakash Naik", "Adv Rukmini Shastri",
  "Adv Girish Kamath", "Sr Adv T. Ananthapadmanabha",
];

/* ── People name pools (Kannada / Indian) ────────────────────── */

export const FIRST_NAMES = [
  "Manjunath", "Shivakumar", "Basavaraj", "Nagaraj", "Prakash", "Ravi", "Suresh", "Mahesh",
  "Venkatesh", "Girish", "Harish", "Umesh", "Ramesh", "Santosh", "Vinay", "Kiran",
  "Lokesh", "Chandrashekar", "Gururaj", "Ananda", "Mallikarjun", "Siddharth", "Raghavendra",
  "Srinivas", "Krishnamurthy", "Dinesh", "Ganesh", "Madhukar", "Puttaswamy", "Shankar",
  "Lakshmi", "Savitha", "Bhagya", "Geetha", "Sudha", "Vani", "Meera", "Roopa", "Asha",
  "Shobha", "Padma", "Rekha", "Anitha", "Kavitha", "Deepa", "Suma", "Pallavi", "Nandini",
  "Chaitra", "Bhavana", "Sowmya", "Rashmi", "Veena", "Jyothi", "Manjula", "Sharada",
] as const;

export const LAST_NAMES = [
  "Gowda", "Hegde", "Kulkarni", "Rao", "Shetty", "Naik", "Patil", "Desai", "Bhat",
  "Kamath", "Shastri", "Iyer", "Iyengar", "Murthy", "Swamy", "Reddy", "Angadi",
  "Biradar", "Hiremath", "Katti", "Kattimani", "Mathad", "Nadagouda", "Sajjan",
  "Tavarageri", "Yaligar", "Chavan", "Jadhav", "Kumbar", "Badiger", "Ganiger",
] as const;

export const CADRES = ["Technical", "Engineering", "Operations", "Finance", "Admin", "Environment", "Stores"] as const;

export const STATIONS: { code: "RTPS" | "BTPS" | "YTPS" | "HYDRO" | "PSP" | "CORP"; headcount: number }[] = [
  { code: "RTPS", headcount: 1580 },
  { code: "BTPS", headcount: 1080 },
  { code: "YTPS", headcount: 890 },
  { code: "HYDRO", headcount: 720 },
  { code: "PSP", headcount: 70 },
  { code: "CORP", headcount: 260 },
];
