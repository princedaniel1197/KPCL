// EN / ಕನ್ನಡ dictionary. The header toggle flips nav, KPI labels and page titles.
// Keys are stable identifiers; add here, use via t(lang, key).

export type Lang = "en" | "kn";

type Entry = { en: string; kn: string };

const dict: Record<string, Entry> = {
  appName: { en: "Sentinel", kn: "ಸೆಂಟಿನೆಲ್" },
  tagline: { en: "Oversight & Intelligence Ledger", kn: "ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ಗುಪ್ತಚರ ಲೆಡ್ಜರ್" },

  // Nav groups
  overview: { en: "Overview", kn: "ಅವಲೋಕನ" },
  coalFuel: { en: "Coal & Fuel", kn: "ಕಲ್ಲಿದ್ದಲು ಮತ್ತು ಇಂಧನ" },
  capitalProjects: { en: "Capital Projects", kn: "ಬಂಡವಾಳ ಯೋಜನೆಗಳು" },
  contractsProcurement: { en: "Contracts & Procurement", kn: "ಗುತ್ತಿಗೆ ಮತ್ತು ಖರೀದಿ" },
  plantOperations: { en: "Plant Operations", kn: "ಸ್ಥಾವರ ಕಾರ್ಯಾಚರಣೆ" },
  legal: { en: "Legal", kn: "ಕಾನೂನು" },
  workforce: { en: "Workforce", kn: "ಕಾರ್ಯಪಡೆ" },
  regulatoryAudit: { en: "Regulatory & Audit", kn: "ನಿಯಂತ್ರಣ ಮತ್ತು ಲೆಕ್ಕಪರಿಶೋಧನೆ" },
  graph: { en: "Entity Graph", kn: "ಘಟಕ ನಕ್ಷೆ" },
  dataFeeds: { en: "Data Feeds", kn: "ದತ್ತಾಂಶ ಮೂಲಗಳು" },
  settings: { en: "Settings", kn: "ಸಂಯೋಜನೆಗಳು" },

  // Nav items
  mdDashboard: { en: "MD Dashboard", kn: "ಎಂ.ಡಿ. ಫಲಕ" },
  coalDashboard: { en: "Coal Dashboard", kn: "ಕಲ್ಲಿದ್ದಲು ಫಲಕ" },
  rakeLedger: { en: "Rake Ledger", kn: "ರೇಕ್ ಲೆಡ್ಜರ್" },
  claims: { en: "Claims & Recovery", kn: "ಹಕ್ಕು ಮತ್ತು ವಸೂಲಿ" },
  demurrage: { en: "Demurrage & Logistics", kn: "ಡೆಮರೇಜ್ ಮತ್ತು ಸಾಗಣೆ" },
  blending: { en: "Blending Optimizer", kn: "ಮಿಶ್ರಣ ಸೂತ್ರ" },
  stockyard: { en: "Stockyard", kn: "ದಾಸ್ತಾನು ಅಂಗಳ" },
  coalSources: { en: "Source League", kn: "ಮೂಲಗಳ ಪಟ್ಟಿ" },
  coalReports: { en: "Monthly Reports", kn: "ಮಾಸಿಕ ವರದಿಗಳು" },
  controlTower: { en: "Control Tower", kn: "ನಿಯಂತ್ರಣ ಗೋಪುರ" },
  clearances: { en: "Clearance Gates", kn: "ಅನುಮತಿ ದ್ವಾರಗಳು" },
  rmTracker: { en: "R&M Tracker", kn: "ನವೀಕರಣ ಜಾಡು" },
  retenders: { en: "Re-tenders", kn: "ಮರು ಟೆಂಡರ್" },
  boardReporting: { en: "Board Reporting", kn: "ಮಂಡಳಿ ವರದಿ" },
  contractsRepo: { en: "Contract Repository", kn: "ಗುತ್ತಿಗೆ ಭಂಡಾರ" },
  guarantees: { en: "Bank Guarantees", kn: "ಬ್ಯಾಂಕ್ ಖಾತರಿಗಳು" },
  vendors: { en: "Vendor Scorecards", kn: "ಮಾರಾಟಗಾರರ ಅಂಕಪಟ್ಟಿ" },
  spend: { en: "Spend Analytics", kn: "ವೆಚ್ಚ ವಿಶ್ಲೇಷಣೆ" },
  inventory: { en: "Spares & Inventory", kn: "ಬಿಡಿಭಾಗ ದಾಸ್ತಾನು" },
  fleet: { en: "Fleet Ledger", kn: "ಘಟಕಗಳ ಲೆಡ್ಜರ್" },
  outages: { en: "Outage Register", kn: "ಸ್ಥಗಿತ ದಾಖಲೆ" },
  maintenance: { en: "Maintenance Queue", kn: "ನಿರ್ವಹಣಾ ಸರದಿ" },
  safety: { en: "Safety & Incidents", kn: "ಸುರಕ್ಷತೆ" },
  emissions: { en: "Emissions", kn: "ಹೊರಸೂಸುವಿಕೆ" },
  hydro: { en: "Hydro", kn: "ಜಲವಿದ್ಯುತ್" },
  solar: { en: "Solar", kn: "ಸೌರ" },
  matters: { en: "Matters & Cases", kn: "ಮೊಕದ್ದಮೆಗಳು" },
  legalIntel: { en: "Litigation Intelligence", kn: "ವ್ಯಾಜ್ಯ ಗುಪ್ತಚರ" },
  retirementWave: { en: "Retirement Wave", kn: "ನಿವೃತ್ತಿ ಅಲೆ" },
  knowledge: { en: "Knowledge Continuity", kn: "ಜ್ಞಾನ ನಿರಂತರತೆ" },
  contractLabour: { en: "Contract Labour", kn: "ಗುತ್ತಿಗೆ ಕಾರ್ಮಿಕರು" },
  pipeline: { en: "Recruitment Pipeline", kn: "ನೇಮಕಾತಿ ಸಾಲು" },
  skills: { en: "Skills Matrix", kn: "ಕೌಶಲ್ಯ ನಕ್ಷೆ" },
  tariffFiling: { en: "KERC Filing", kn: "ಕೆಇಆರ್‌ಸಿ ಸಲ್ಲಿಕೆ" },
  truingUp: { en: "Truing-up", kn: "ಲೆಕ್ಕ ಹೊಂದಾಣಿಕೆ" },
  auditParas: { en: "Audit Paras", kn: "ಲೆಕ್ಕಪರಿಶೋಧನಾ ಕಂಡಿಕೆಗಳು" },
  closeBooks: { en: "Close the Books", kn: "ಲೆಕ್ಕ ಮುಕ್ತಾಯ" },
  costing: { en: "Station Costing", kn: "ಸ್ಥಾವರ ವೆಚ್ಚ" },

  // Common KPI / table labels
  atRisk: { en: "At risk across the corporation", kn: "ನಿಗಮದಾದ್ಯಂತ ಅಪಾಯದಲ್ಲಿರುವ ಮೊತ್ತ" },
  coalLeakage: { en: "Coal leakage (6 mo)", kn: "ಕಲ್ಲಿದ್ದಲು ಸೋರಿಕೆ (೬ ತಿಂ)" },
  projectDivergence: { en: "Projects diverging", kn: "ವ್ಯತ್ಯಾಸದ ಯೋಜನೆಗಳು" },
  ldUnclaimed: { en: "LD accrued, unclaimed", kn: "ಹಕ್ಕು ಸಲ್ಲಿಸದ ಎಲ್‌ಡಿ" },
  bgsExpiring: { en: "BGs expiring ≤30 d", kn: "೩೦ ದಿನದೊಳಗೆ ಮುಗಿಯುವ ಬಿ.ಜಿ." },
  parasOverdue: { en: "Paras past COPU clock", kn: "ಗಡುವು ಮೀರಿದ ಕಂಡಿಕೆಗಳು" },
  retirements24: { en: "Retirements ≤24 mo", kn: "೨೪ ತಿಂಗಳೊಳಗಿನ ನಿವೃತ್ತಿ" },
  prudenceAtRisk: { en: "Prudence ₹ at risk", kn: "ಪ್ರೂಡೆನ್ಸ್ ಅಪಾಯದ ಮೊತ್ತ" },
  allPlants: { en: "All plants", kn: "ಎಲ್ಲಾ ಸ್ಥಾವರಗಳು" },
  period: { en: "Period", kn: "ಅವಧಿ" },
  plant: { en: "Plant", kn: "ಸ್ಥಾವರ" },
  status: { en: "Status", kn: "ಸ್ಥಿತಿ" },
  value: { en: "Value", kn: "ಮೌಲ್ಯ" },
  search: { en: "Search entities…", kn: "ಹುಡುಕಿ…" },
  syntheticNote: {
    en: "Synthetic demonstration data — no representation about any actual supplier, contractor, railway, or employee.",
    kn: "ಸಂಶ್ಲೇಷಿತ ಪ್ರದರ್ಶನ ದತ್ತಾಂಶ — ಯಾವುದೇ ನೈಜ ಪೂರೈಕೆದಾರ, ಗುತ್ತಿಗೆದಾರ, ರೈಲ್ವೆ ಅಥವಾ ನೌಕರರ ಬಗ್ಗೆ ಯಾವುದೇ ಪ್ರತಿನಿಧಿತ್ವವಿಲ್ಲ.",
  },
  generated: { en: "Generated", kn: "ರಚಿಸಲಾಗಿದೆ" },
};

export function t(lang: Lang, key: string): string {
  const e = dict[key];
  if (!e) return key;
  return e[lang];
}

export const dictionary = dict;
