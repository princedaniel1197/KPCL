// Typed accessors over the generated world. JSON is imported statically so it
// bundles into the server build (no fs at runtime — deploys clean to Vercel).

import type {
  AuditPara, BankGuarantee, CloseTask, CoalClaim, Colliery, Contract, DataFeed,
  EmissionMonth, Employee, Fsa, GenUnit, Incident, InspectionReport,
  LabourContractor, LegalMatter, Meta, Outage, Project, Rake, RecruitmentDrive,
  Reservoir, SanctionRow, SkillArea, SolarMonth, Spare, Stockpile, TariffYear, Vendor,
} from "./types";

import metaJson from "@/data/meta.json";
import collieriesJson from "@/data/collieries.json";
import rakesJson from "@/data/rakes.json";
import fsasJson from "@/data/fsas.json";
import stockpilesJson from "@/data/stockpiles.json";
import claimsJson from "@/data/claims.json";
import projectsJson from "@/data/projects.json";
import vendorsJson from "@/data/vendors.json";
import contractsJson from "@/data/contracts.json";
import bgsJson from "@/data/bgs.json";
import sparesJson from "@/data/spares.json";
import unitsJson from "@/data/units.json";
import outagesJson from "@/data/outages.json";
import emissionsJson from "@/data/emissions.json";
import reservoirsJson from "@/data/reservoirs.json";
import solarJson from "@/data/solar.json";
import incidentsJson from "@/data/incidents.json";
import employeesJson from "@/data/employees.json";
import labourContractorsJson from "@/data/labour-contractors.json";
import drivesJson from "@/data/drives.json";
import sanctionsJson from "@/data/sanctions.json";
import skillAreasJson from "@/data/skill-areas.json";
import legalMattersJson from "@/data/legal-matters.json";
import tariffYearsJson from "@/data/tariff-years.json";
import auditParasJson from "@/data/audit-paras.json";
import inspectionReportsJson from "@/data/inspection-reports.json";
import closeTasksJson from "@/data/close-tasks.json";
import dataFeedsJson from "@/data/data-feeds.json";

export const meta = metaJson as Meta;
export const AS_OF = meta.generatedAt;
export const collieries = collieriesJson as Colliery[];
export const rakes = rakesJson as Rake[];
export const fsas = fsasJson as Fsa[];
export const stockpiles = stockpilesJson as Stockpile[];
export const claims = claimsJson as CoalClaim[];
export const projects = projectsJson as Project[];
export const vendors = vendorsJson as Vendor[];
export const contracts = contractsJson as Contract[];
export const bgs = bgsJson as BankGuarantee[];
export const spares = sparesJson as Spare[];
export const units = unitsJson as GenUnit[];
export const outages = outagesJson as Outage[];
export const emissions = emissionsJson as EmissionMonth[];
export const reservoirs = reservoirsJson as Reservoir[];
export const solar = solarJson as SolarMonth[];
export const incidents = incidentsJson as Incident[];
export const employees = employeesJson as Employee[];
export const labourContractors = labourContractorsJson as LabourContractor[];
export const drives = drivesJson as RecruitmentDrive[];
export const sanctions = sanctionsJson as SanctionRow[];
export const skillAreas = skillAreasJson as SkillArea[];
export const legalMatters = legalMattersJson as LegalMatter[];
export const tariffYears = tariffYearsJson as TariffYear[];
export const auditParas = auditParasJson as AuditPara[];
export const inspectionReports = inspectionReportsJson as InspectionReport[];
export const closeTasks = closeTasksJson as CloseTask[];
export const dataFeeds = dataFeedsJson as DataFeed[];

export const vendorById = new Map(vendors.map((v) => [v.id, v]));
export const collieryById = new Map(collieries.map((c) => [c.id, c]));
export const projectById = new Map(projects.map((p) => [p.id, p]));
export const contractById = new Map(contracts.map((c) => [c.id, c]));
export const unitById = new Map(units.map((u) => [u.id, u]));
