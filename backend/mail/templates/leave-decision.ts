export interface LeaveDecisionMailOptions {
  requesterName: string;
  status: "approved" | "rejected";
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  decisionReason?: string;
}

export function getLeaveDecisionEmailTemplate(options: LeaveDecisionMailOptions) {
  const isApproved = options.status === "approved";
  return {
    subject: `Leave Request ${isApproved ? "Approved" : "Rejected"} - ${options.leaveTypeName}`,
    text: `Hello ${options.requesterName},\n\nYour leave request for ${options.leaveTypeName} from ${options.startDate} to ${options.endDate} has been ${options.status}.\n\n${!isApproved && options.decisionReason ? `Reason for rejection: ${options.decisionReason}\n\n` : ""}Regards,\nLeave Request System`,
  };
}
