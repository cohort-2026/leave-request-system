// frontend/src/shared/components/types.ts
//
// Shared types for the Member 4.2 components (Nav, EmptyState, DataTable,
// LeaveRequestRow). Kept in one file so the components can import from a
// single place and so Member 4.1 / 4.3 can reuse them if needed.

import type { ReactNode } from "react";

export type Role = "employee" | "manager" | "admin";

export interface NavLinkItem {
  label: string;
  href: string;
}

/** Column definition for DataTable's default (tabular) rendering mode. */
export interface DataTableColumn<T> {
  /** Unique key for this column, also used as the React key. */
  key: string;
  /** Header text shown in <th>. */
  header: string;
  /** Renders the cell content for a given row. */
  render: (item: T) => ReactNode;
  /** Optional className applied to every <td> in this column. */
  className?: string;
}

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequestSummary {
  id: string;
  requesterName: string;
  leaveType: string;
  startDate: string; // ISO date string, formatting is the caller's job
  endDate: string;
  status: LeaveStatus;
  note?: string;
}
