/** The requisition form's fixed vocabulary, sourced from ZingHR. */
export interface MasterData {
  departments: string[];
  /** department -> its sections */
  departmentSections: Record<string, string[]>;
  /** Every sub-section — the fallback when a department+section pair has no mapping. */
  subSections: string[];
  /** "Department||Section" -> its sub-sections */
  sectionSubSections: Record<string, string[]>;
  designations: string[];
  /** designation -> the grades valid for it */
  designationGrades: Record<string, string[]>;
  zones: string[];
  /** DBL business verticals, picked after the unit. */
  linesOfBusiness: string[];
  /** Why the person being replaced left. */
  separationReasons: string[];
  /** building -> its bookable interview rooms, e.g. "Head Office" -> ["Room-301", …]. */
  meetingRooms: Record<string, string[]>;
  /** Fixed terms HR attaches to an appointment (bonus, salary review, tax). */
  specialNotes: string[];
  /** DBL office and factory addresses, as printed on offer letters. */
  jobLocations: string[];
}
