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
}
