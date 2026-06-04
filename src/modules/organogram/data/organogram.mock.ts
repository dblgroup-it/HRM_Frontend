import type { OrganogramSeat } from '../types/organogram.types';

/**
 * Sanctioned seats per unit / department / designation.
 * Seeded from the JTML (Jinnat Textile Mills Ltd · Yarn Division) organogram.
 * `vacant = sanctioned − filled` drives the New vs Replacement decision.
 */
export const MOCK_SEATS: OrganogramSeat[] = [
  // --- Jinnat Textile Mills Ltd ------------------------------------------
  { id: 's_jtml_1', unit: 'Jinnat Textile Mills Ltd', department: 'Production & QC', designation: 'Assistant Production Officer', category: 'officer', sanctioned: 6, filled: 3 },
  { id: 's_jtml_2', unit: 'Jinnat Textile Mills Ltd', department: 'Production & QC', designation: 'Production Officer', category: 'officer', sanctioned: 6, filled: 6 },
  { id: 's_jtml_3', unit: 'Jinnat Textile Mills Ltd', department: 'Production & QC', designation: 'Senior Officer - Production', category: 'officer', sanctioned: 4, filled: 4 },
  { id: 's_jtml_4', unit: 'Jinnat Textile Mills Ltd', department: 'Quality', designation: 'Quality Officer', category: 'officer', sanctioned: 4, filled: 4 },
  { id: 's_jtml_5', unit: 'Jinnat Textile Mills Ltd', department: 'Quality', designation: 'Quality Assistant Manager', category: 'officer', sanctioned: 2, filled: 1 },
  { id: 's_jtml_6', unit: 'Jinnat Textile Mills Ltd', department: 'Maintenance', designation: 'Maintenance Engineer', category: 'officer', sanctioned: 3, filled: 2 },
  { id: 's_jtml_7', unit: 'Jinnat Textile Mills Ltd', department: 'Utility', designation: 'Assistant Engineer - Utility', category: 'officer', sanctioned: 3, filled: 3 },
  { id: 's_jtml_8', unit: 'Jinnat Textile Mills Ltd', department: 'Human Resources', designation: 'HR Officer', category: 'officer', sanctioned: 3, filled: 3 },
  { id: 's_jtml_9', unit: 'Jinnat Textile Mills Ltd', department: 'Human Resources', designation: 'HR Assistant Manager', category: 'officer', sanctioned: 1, filled: 1 },
  { id: 's_jtml_10', unit: 'Jinnat Textile Mills Ltd', department: 'Accounts & Finance', designation: 'Accounts Officer', category: 'officer', sanctioned: 2, filled: 1 },
  { id: 's_jtml_11', unit: 'Jinnat Textile Mills Ltd', department: 'IT & Systems', designation: 'IT Officer', category: 'officer', sanctioned: 2, filled: 2 },
  { id: 's_jtml_12', unit: 'Jinnat Textile Mills Ltd', department: 'IT & Systems', designation: 'Jr. Executive - IT', category: 'officer', sanctioned: 1, filled: 1 },
  { id: 's_jtml_13', unit: 'Jinnat Textile Mills Ltd', department: 'Store', designation: 'Store Officer', category: 'officer', sanctioned: 2, filled: 2 },
  { id: 's_jtml_14', unit: 'Jinnat Textile Mills Ltd', department: 'Admin, Safety & Security', designation: 'Security Officer', category: 'officer', sanctioned: 2, filled: 1 },
  { id: 's_jtml_15', unit: 'Jinnat Textile Mills Ltd', department: 'Production & QC', designation: 'Machine Operator', category: 'worker', sanctioned: 159, filled: 156 },

  // --- Jinnat Apparels Ltd -----------------------------------------------
  { id: 's_jal_1', unit: 'Jinnat Apparels Ltd', department: 'Merchandising', designation: 'Senior Merchandiser', category: 'officer', sanctioned: 4, filled: 4 },
  { id: 's_jal_2', unit: 'Jinnat Apparels Ltd', department: 'Merchandising', designation: 'Merchandiser', category: 'officer', sanctioned: 8, filled: 6 },
  { id: 's_jal_3', unit: 'Jinnat Apparels Ltd', department: 'Production', designation: 'Production Manager', category: 'officer', sanctioned: 2, filled: 2 },
  { id: 's_jal_4', unit: 'Jinnat Apparels Ltd', department: 'Compliance', designation: 'Compliance Officer', category: 'officer', sanctioned: 3, filled: 2 },

  // --- Matin Spinning Mills Ltd ------------------------------------------
  { id: 's_msm_1', unit: 'Matin Spinning Mills Ltd', department: 'Maintenance', designation: 'Electrical Maintenance Engineer', category: 'officer', sanctioned: 4, filled: 4 },
  { id: 's_msm_2', unit: 'Matin Spinning Mills Ltd', department: 'Spinning', designation: 'Spinning Officer', category: 'officer', sanctioned: 6, filled: 5 },

  // --- DBL Group — Head Office -------------------------------------------
  { id: 's_ho_1', unit: 'DBL Group — Head Office', department: 'Human Resources', designation: 'HR Business Partner', category: 'officer', sanctioned: 4, filled: 3 },
  { id: 's_ho_2', unit: 'DBL Group — Head Office', department: 'IT & Systems', designation: 'Software Engineer', category: 'officer', sanctioned: 6, filled: 6 },
  { id: 's_ho_3', unit: 'DBL Group — Head Office', department: 'Finance & Accounts', designation: 'Financial Analyst', category: 'officer', sanctioned: 3, filled: 2 },
];
