import { z } from 'zod';

export const ExaminationSchema = z.object({
  _id: z.string(), // PouchDB document ID
  _rev: z.string().optional(), // PouchDB revision
  type: z.literal('examination'),
  patientId: z.string(), // Reference to patient _id
  vitals: z.object({
    temperature: z.number().min(30).max(45), // Celsius
    bloodPressure: z.object({
      systolic: z.number().min(50).max(250),
      diastolic: z.number().min(30).max(150),
    }),
    heartRate: z.number().min(30).max(220), // bpm
    oxygenSaturation: z.number().min(50).max(100), // %
  }),
  symptoms: z.object({
    fever: z.boolean().default(false),
    headache: z.boolean().default(false),
    fatigue: z.boolean().default(false),
    cough: z.boolean().default(false),
    shortnessOfBreath: z.boolean().default(false),
    nausea: z.boolean().default(false),
    vomiting: z.boolean().default(false),
    diarrhea: z.boolean().default(false),
    dizziness: z.boolean().default(false),
    seizures: z.boolean().default(false),
  }),
  notes: z.string().optional(),
  examinerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Examination = z.infer<typeof ExaminationSchema>;
