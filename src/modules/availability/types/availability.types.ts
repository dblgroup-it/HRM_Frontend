/** Somebody's absence, as the server keeps it: a dated period, not a flag. */
export interface LeavePeriod {
  id: string;
  startsAt: string;
  /** Null = until further notice, ended by hand. */
  endsAt: string | null;
  note: string | null;
  /** Whole days left, counting today. Null on an open-ended absence. */
  daysLeft: number | null;
}

export interface AvailabilityStatus {
  onLeave: boolean;
  leave: LeavePeriod | null;
}

/** One requisition whose job analysis moves on its own. */
export interface HandoverJobAnalysis {
  id: string;
  code: string;
  designation: string;
  unitFactory: string;
  /** Null = nobody left in that unit's queue, so Head of Talent Acquisition picks it up. */
  nextAssignee: { id: string; name: string } | null;
}

/** One requisition being recruited, and who could take it. */
export interface HandoverRecruiting {
  id: string;
  code: string;
  designation: string;
  unitFactory: string;
  status: string;
  candidates: {
    id: string;
    name: string;
    employeeCode: string;
    onLeave: boolean;
  }[];
}

/** What would move if this person went on leave right now. */
export interface LeaveHandover {
  jobAnalyses: HandoverJobAnalysis[];
  recruiting: HandoverRecruiting[];
}

export interface StartLeaveInput {
  days?: number;
  /** ISO date — the last day away, inclusive. */
  until?: string;
  note?: string;
  /** Stand-ins for requisitions being recruited, one per requisition. */
  covers?: { requisitionId: string; coverRecruiterId: string }[];
}
