// Sidebar information architecture. Labels are i18n keys resolved in the Sidebar.

export type NavItem = { key: string; href: string };
export type NavGroup = { key: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    key: "overview",
    items: [
      { key: "mdDashboard", href: "/" },
      { key: "graph", href: "/graph" },
      { key: "dataFeeds", href: "/data" },
    ],
  },
  {
    key: "coalFuel",
    items: [
      { key: "coalDashboard", href: "/coal" },
      { key: "rakeLedger", href: "/coal/ledger" },
      { key: "claims", href: "/coal/claims" },
      { key: "demurrage", href: "/coal/demurrage" },
      { key: "blending", href: "/coal/blending" },
      { key: "stockyard", href: "/coal/stockyard" },
      { key: "coalSources", href: "/coal/sources" },
      { key: "coalReports", href: "/coal/reports" },
    ],
  },
  {
    key: "capitalProjects",
    items: [
      { key: "controlTower", href: "/projects" },
      { key: "clearances", href: "/projects/clearances" },
      { key: "rmTracker", href: "/projects/rm" },
      { key: "retenders", href: "/projects/retenders" },
      { key: "boardReporting", href: "/projects/reporting" },
    ],
  },
  {
    key: "contractsProcurement",
    items: [
      { key: "contractsRepo", href: "/contracts" },
      { key: "guarantees", href: "/contracts/guarantees" },
      { key: "vendors", href: "/contracts/vendors" },
      { key: "spend", href: "/contracts/spend" },
      { key: "inventory", href: "/contracts/inventory" },
    ],
  },
  {
    key: "plantOperations",
    items: [
      { key: "fleet", href: "/plants" },
      { key: "outages", href: "/plants/outages" },
      { key: "maintenance", href: "/plants/maintenance" },
      { key: "safety", href: "/plants/safety" },
      { key: "emissions", href: "/plants/emissions" },
      { key: "hydro", href: "/plants/hydro" },
      { key: "solar", href: "/plants/solar" },
    ],
  },
  {
    key: "legal",
    items: [
      { key: "matters", href: "/legal" },
      { key: "legalIntel", href: "/legal/intelligence" },
    ],
  },
  {
    key: "workforce",
    items: [
      { key: "retirementWave", href: "/workforce" },
      { key: "knowledge", href: "/workforce/knowledge" },
      { key: "contractLabour", href: "/workforce/contract-labour" },
      { key: "pipeline", href: "/workforce/pipeline" },
      { key: "skills", href: "/workforce/skills" },
    ],
  },
  {
    key: "regulatoryAudit",
    items: [
      { key: "tariffFiling", href: "/regulatory" },
      { key: "truingUp", href: "/regulatory/truing-up" },
      { key: "auditParas", href: "/regulatory/audit-paras" },
      { key: "closeBooks", href: "/regulatory/close" },
      { key: "costing", href: "/regulatory/costing" },
    ],
  },
  {
    key: "settings",
    items: [{ key: "settings", href: "/settings" }],
  },
];

export const PLANTS = ["ALL", "RTPS", "BTPS", "YTPS", "HYDRO", "PSP"] as const;
export type PlantCode = (typeof PLANTS)[number];
