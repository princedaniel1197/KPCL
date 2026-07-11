// Vendor performance scoring [D3] — feeds the entity graph [H3].
// score = 40% on-time + 25% (1−rejection) + 20% (1−LD incidence) + 15% (1−dispute rate)

import type { Vendor } from "@/lib/types";
import { VENDOR_WEIGHTS, type VendorWeights } from "./norms";

export type VendorGrade = "A" | "B" | "C" | "D" | "E";

export interface VendorScore {
  vendorId: string;
  score: number; // 0-100
  grade: VendorGrade;
  components: { onTime: number; rejection: number; ld: number; dispute: number };
}

export function scoreVendor(v: Vendor, w: VendorWeights = VENDOR_WEIGHTS): VendorScore {
  const ldIncidence = v.contractsCount > 0 ? Math.min(1, v.ldIncidents / v.contractsCount) : 0;
  const disputeRate = v.contractsCount > 0 ? Math.min(1, v.disputeCount / v.contractsCount) : 0;
  const parts = {
    onTime: w.onTime * v.onTimePct,
    rejection: w.rejection * (100 - v.rejectionRatePct),
    ld: w.ld * (1 - ldIncidence) * 100,
    dispute: w.dispute * (1 - disputeRate) * 100,
  };
  const score = parts.onTime + parts.rejection + parts.ld + parts.dispute;
  return { vendorId: v.id, score, grade: gradeFor(score), components: parts };
}

export function gradeFor(score: number): VendorGrade {
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  if (score >= 55) return "D";
  return "E";
}
