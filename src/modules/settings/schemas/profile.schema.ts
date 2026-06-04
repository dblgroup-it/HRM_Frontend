import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(6, 'Enter a valid phone number'),
  jobTitle: z.string().min(2, 'Job title is required'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
