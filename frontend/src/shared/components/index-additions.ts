// Add these lines to frontend/src/shared/components/index.ts (the barrel
// from Member 4.1). Don't create a second barrel file — just append.

export { Nav } from "./Nav";
export { EmptyState } from "./EmptyState";
export { DataTable } from "./DataTable";
export { LeaveRequestRow } from "./LeaveRequestRow";
export type { NavProps } from "./Nav";
export type { EmptyStateProps } from "./EmptyState";
export type { DataTableProps } from "./DataTable";
export type { LeaveRequestRowProps } from "./LeaveRequestRow";
export type {
  Role,
  NavLinkItem,
  DataTableColumn,
  LeaveStatus,
  LeaveRequestSummary,
} from "./types";
