export type ReportTargetType = 1 | 2;
export type ReportReasonCategory = 1 | 2 | 3 | 4 | 5 | 6;

export interface ReportRequest {
  targetId: string;
  targetType: ReportTargetType;
  reasonCategory: ReportReasonCategory;
  description: string;
}

export interface ReportReasonOption {
  label: string;
  value: ReportReasonCategory;
}
