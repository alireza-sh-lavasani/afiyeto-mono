import { z } from 'zod';

export const PatientSchema = z.object({
  _id: z.string(), // PouchDB document ID
  _rev: z.string().optional(), // PouchDB revision
  type: z.literal('patient'),
  
  // Real demographic fields matching IPatient
  uniqueGovID: z.string().optional(),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  birthDate: z.union([
    z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
    z.date(),
  ]),
  gender: z.enum(['male', 'female', 'other']),
  maritalStatus: z.enum(['single', 'married']).optional(),
  education: z.string().optional(),
  
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(1, 'Emergency contact phone is required'),
    relationship: z.string().optional(),
  }).optional(),
  
  emmergencyContact: z.string().optional(), // Flat emergency contact string
  image: z.object({
    uri: z.string().optional(),
    base64: z.string().optional(),
  }).optional(),
  
  photoBase64: z.string().optional(), // Photo capture data uri
  patientId: z.string().optional(),   // Permanent sequential patient ID
  tmpPatientId: z.string().optional(), // Temporary patient ID generated offline
  examinations: z.array(z.string()).optional(), // Array of examination IDs linked to patient

  // --- Contact & Identity ---
  phoneNumber: z.string().optional(),
  ethnicity: z.string().optional(), // Suggested enums + free text
  nationality: z.string().optional(), // Default 'Eritrean'
  occupation: z.string().optional(), // Suggested categories + free text
  bloodType: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'])
    .optional(),

  // --- Permanent Residence ---
  residenceZoba: z.string().optional(),
  residenceSubZoba: z.string().optional(),
  residenceVillage: z.string().optional(),

  // --- Social Determinants of Health ---
  householdSize: z.number().int().min(1).optional(),
  waterSource: z
    .enum(['piped', 'well', 'river', 'rainwater', 'tanker', 'other'])
    .optional(),
  sanitationType: z
    .enum(['flush', 'pit_latrine', 'open_defecation', 'other'])
    .optional(),

  // --- Medical History (persistent across visits) ---
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),

  // --- Disability / Functional Limitations (WHO-aligned) ---
  disabilities: z.array(z.string()).optional(),

  // --- Reproductive Health ---
  isPregnant: z.boolean().optional(),
  pregnancyDueDate: z.string().optional(),
  numberOfPregnancies: z.number().int().min(0).optional(), // Gravida
  numberOfLiveBirths: z.number().int().min(0).optional(), // Parity

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Patient = z.infer<typeof PatientSchema>;
