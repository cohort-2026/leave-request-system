import { api } from "../../services/api";

export interface LeaveBalance {
  leaveType: string;
  totalAllowance: number;
  usedDays: number;
  daysRemaining: number;
  remainingDays?: number; // support both naming
}

export const getLeaveBalances = async (): Promise<LeaveBalance[]> => {
  const { data } = await api.get('/leave/balances');
  const list = Array.isArray(data) ? data : data.balances || data.data || [];
  return list.map((b: any) => ({
    leaveType: b.leaveType,
    totalAllowance: b.totalAllowance ?? b.total ?? 0,
    usedDays: b.usedDays ?? b.used ?? 0,
    daysRemaining: b.daysRemaining ?? b.remainingDays ?? b.remaining ?? 0,
  }));
};