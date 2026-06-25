export interface BdJobsLocation {
  id: number;
  name: string;
  parentLocationId: number;
}

export interface BdJobsCategory {
  id: number;
  name: string;
}

export interface BdJobsEduLevel {
  id: number;
  name: string;
}

export interface BdJobsDegree {
  id: number;
  name: string;
}

export interface BdJobsIndustry {
  id: string;
  name: string;
}

export interface BdJobsSkill {
  id: number;
  name: string;
}

export type BdJobsEmploymentStatus =
  | 'full_time'
  | 'part_time'
  | 'contractual'
  | 'internship'
  | 'freelance';

export type BdJobsWorkplace = 'wfo' | 'wfh';
export type BdJobsGender = 'all' | 'male' | 'female' | 'others';

export interface BdJobsFormData {
  jobTitle: string;
  vacancyNo: number;
  locationIds: number[];
  locationNames: string[];
  categoryId: number | null;
  categoryName: string;
  employmentStatus: BdJobsEmploymentStatus[];
  workplace: BdJobsWorkplace[];
  salaryMin: number | null;
  salaryMax: number | null;
  showSalary: boolean;
  jobDescription: string;
  preferredGender: BdJobsGender;
  ageMin: number | null;
  ageMax: number | null;
  experienceYears: number | null;
  educationLevelId: number | null;
  educationLevelName: string;
  educationDegreeId: number | null;
  educationDegreeName: string;
  educationConcentration: string;
  industryExperience: { id: string; name: string }[];
  skills: { id: number; name: string }[];
  additionalRequirements: string;
  restrictAge: boolean;
  restrictGender: boolean;
  restrictExperience: boolean;
  applyOnline: boolean;
  publishLinkedIn: boolean;
}

export interface BdJobsPost {
  id: string;
  requisitionId: string;
  bdJobsJobId: string | null;
  status: 'draft' | 'posted' | 'failed';
  formData: BdJobsFormData;
  errorMessage: string | null;
  postedAt: string | null;
  note?: string;
}
