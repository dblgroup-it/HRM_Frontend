import { z } from 'zod';

const facilityItemSchema = z.object({
  requested: z.boolean().default(false),
  option: z.string().optional(),
  note: z.string().optional(),
});

/**
 * Transport carries more than a yes/no: a shared run and a dedicated car are
 * different commitments, a dedicated car is a choice of vehicle, and none of
 * it can be arranged without knowing where the person is picked up from.
 */
const transportFacilitySchema = facilityItemSchema.extend({
  vehicleType: z.string().optional(),
  pickupLocation: z.string().optional(),
});

const facilitiesSchema = z.object({
  laptopDesktop: facilityItemSchema,
  transport: transportFacilitySchema,
  dormitory: facilityItemSchema,
  seating: facilityItemSchema,
});

export const requisitionSchema = z
  .object({
    // A · Vacancy Information
    designation: z.string().min(2, 'Designation is required'),
    /**
     * Other levels this post may be filled at — "Senior Executive" raised
     * alongside "Assistant Manager" when the level depends on who is found.
     * Which one a candidate is actually hired at is settled during onboarding.
     */
    alternateDesignations: z.array(z.string().min(1)).optional().default([]),
    /** The requisitioner's declaration: 'new' headcount or 'existing' (Replace). */
    requirementType: z.enum(['existing', 'new']),
    requiredPosts: z.coerce
      .number({ message: 'Enter a number' })
      .int()
      .min(1, 'At least 1'),
    // Auto-filled from the organogram; 0 for a brand-new (unsanctioned) role.
    totalVacantPosts: z.coerce
      .number({ message: 'Enter a number' })
      .int()
      .min(0, 'Cannot be negative'),
    unitFactory: z.string().min(1, 'Select a unit / factory'),
    lineOfBusiness: z.string().min(1, 'Select a line of business'),
    department: z.string().min(1, 'Select a department'),
    section: z.string().optional(),
    subSection: z.string().optional(),
    /**
     * Everyone this requisition replaces — three leavers, one requisition to
     * refill the line. Each carries their own reason and vacancy date, because
     * people rarely leave on the same day for the same reason.
     */
    replacements: z
      .array(
        z.object({
          employeeName: z.string().optional().default(''),
          employeeCode: z.string().optional().default(''),
          separationReason: z.string().optional().default(''),
          vacantDate: z.string().optional().default(''),
          remarks: z.string().optional().default(''),
        })
      )
      .optional()
      .default([]),
    // The first replaced employee, kept so existing readers keep working.
    replaceOfName: z.string().optional(),
    replaceOfEmployeeCode: z.string().optional(),
    separationReason: z.string().optional(),
    replacementRemarks: z.string().optional(),
    placeOfPosting: z.string().min(2, 'Place of posting is required'),
    vacantDate: z.string().optional(),
    neededDate: z.string().optional(),
    priority: z.enum(['top', 'moderate', 'ordinary']),
    employmentNature: z.enum(['permanent', 'temporary', 'contractual']),
    contractualPurpose: z.string().optional(),

    // B · Job Analysis
    jobDescription: z.string().min(5, 'Provide a job description'),
    education: z.string().min(2, 'Education & training is required'),
    experience: z.string().min(2, 'Experience requirement is required'),
    others: z.string().optional(),

    // C · Logistics Requirement
    facilities: facilitiesSchema,

    // E · Group HR
    preferredSources: z
      .array(z.enum(['job_advertisement', 'headhunting', 'cv_bank']))
      .optional()
      .default([]),
  })
  .refine(
    (data) =>
      data.employmentNature === 'permanent' ||
      (data.contractualPurpose && data.contractualPurpose.trim().length > 1),
    {
      message: 'State the purpose for temporary / contractual roles',
      path: ['contractualPurpose'],
    }
  )
  .refine(
    (data) =>
      data.requirementType !== 'existing' ||
      (data.replacements ?? []).some((r) => r.employeeName.trim().length > 1),
    {
      message: 'Name at least one employee being replaced',
      path: ['replacements'],
    }
  )
  .refine(
    (data) =>
      data.requirementType !== 'existing' ||
      (data.replacements ?? [])
        .filter((r) => r.employeeName.trim().length > 1)
        .every((r) => r.separationReason.trim().length > 0),
    {
      // Every named person, not just the first: a sheet listing three leavers
      // with one reason between them is not auditable.
      message: 'Give a reason for leaving for each person listed',
      path: ['replacements'],
    }
  );

export type RequisitionFormValues = z.input<typeof requisitionSchema>;
export type RequisitionFormOutput = z.output<typeof requisitionSchema>;
