import { z } from 'zod';

export const requisitionSchema = z
  .object({
    // A · Vacancy Information
    designation: z.string().min(2, 'Designation is required'),
    /** Origin of the requisition (drives Factory-HR / SBU steps). */
    source: z.enum(['factory', 'ho']),
    /** Auto-derived from the organogram seat lookup. */
    requirementType: z.enum(['existing', 'new']),
    requiredPosts: z.coerce
      .number({ message: 'Enter a number' })
      .int()
      .min(1, 'At least 1'),
    totalVacantPosts: z.coerce
      .number({ message: 'Enter a number' })
      .int()
      .min(1, 'At least 1'),
    unitFactory: z.string().min(1, 'Select a unit / factory'),
    department: z.string().min(1, 'Select a department / section'),
    placeOfPosting: z.string().min(2, 'Place of posting is required'),
    vacantDate: z.string().optional(),
    whenNeededDate: z.string().optional(),
    priority: z.enum(['top', 'moderate', 'ordinary']),
    employmentNature: z.enum(['permanent', 'temporary', 'contractual']),
    contractualPurpose: z.string().optional(),

    // B · Job Analysis
    jobDescription: z.string().min(5, 'Provide a job description'),
    education: z.string().min(2, 'Education & training is required'),
    experience: z.string().min(2, 'Experience requirement is required'),
    others: z.string().optional(),

    // C · Logistics Requirement
    computer: z.enum(['not_applicable', 'desktop', 'laptop']),
    computerReason: z.string().optional(),
    seating: z.enum(['existing', 'new']),

    // E · Group HR
    preferredSources: z
      .array(z.enum(['job_advertisement', 'headhunting', 'referral', 'cv_bank']))
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
  );

export type RequisitionFormValues = z.input<typeof requisitionSchema>;
export type RequisitionFormOutput = z.output<typeof requisitionSchema>;
