// Chart palette in the ivory-ledger inks. Kept in a plain (non-client) module
// so server components can read the string values and pass them as props to the
// client chart components without crossing the RSC client-manifest boundary.

export const PALETTE = {
  ink: "#2A2418",
  gold: "#C9A84C",
  muted: "#7A7260",
  faint: "#A39B87",
  danger: "#8C3B2E",
  success: "#5B6E3A",
  warning: "#A9762B",
  info: "#5C6B7A",
  wash: "#EFE9DA",
} as const;
