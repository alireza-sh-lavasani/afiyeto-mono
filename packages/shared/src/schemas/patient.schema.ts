import { z } from 'zod';

export const PatientSchema = z.object({
  _id: z.string(), // PouchDB document ID
  _rev: z.string().optional(), // PouchDB revision
  type: z.literal('patient'),
  governmentId: z.string().min(1, 'Government ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  gender: z.enum(['male', 'female', 'other']),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(1, 'Emergency contact phone is required'),
    relationship: z.string().optional(),
  }),
  photoBase64: z.string().optional(), // Photo capture data uri
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Patient = z.infer<typeof PatientSchema>;
