import { z } from 'zod';

export const ExaminationSchema = z.object({
  _id: z.string(), // PouchDB document ID
  _rev: z.string().optional(), // PouchDB revision
  type: z.literal('examination'),
  examinationId: z.string(), // Reference ID
  patientId: z.string(), // Reference to patient _id

  // --- Legacy Location (Flat properties stored in DB) ---
  zoba: z.string(),
  subZoba: z.string(),
  localDistrict: z.string(),
  longitude: z.string(),
  latitude: z.string(),
  address: z.string(),

  // --- Legacy Vitals (Flat properties stored in DB) ---
  temperature: z.string(),
  bloodPressureSystolic: z.string(),
  bloodPressureDiastolic: z.string(),
  heartRate: z.string(),
  respiratoryRate: z.string(),
  oxygenSaturation: z.string(),
  bloodSugar: z.string(),

  // --- Legacy Symptoms (Flat boolean fields stored in DB) ---
  hasFever: z.boolean().default(false),
  hasHeadache: z.boolean().default(false),
  hasDizziness: z.boolean().default(false),
  hasNausea: z.boolean().default(false),
  hasFatigue: z.boolean().default(false),
  hasWeightLoss: z.boolean().default(false),
  hasSweating: z.boolean().default(false),
  hasCough: z.boolean().default(false),
  hasShortnessOfBreath: z.boolean().default(false),
  hasSoreThroat: z.boolean().default(false),
  hasChestPain: z.boolean().default(false),
  hasVomiting: z.boolean().default(false),
  hasDiarrhea: z.boolean().default(false),
  hasStomachPain: z.boolean().default(false),
  hasConstipation: z.boolean().default(false),
  hasAppetiteLoss: z.boolean().default(false),
  hasMusclePain: z.boolean().default(false),
  hasJointPain: z.boolean().default(false),
  hasBackPain: z.boolean().default(false),
  hasNeckPain: z.boolean().default(false),
  hasNumbness: z.boolean().default(false),
  hasSeizures: z.boolean().default(false),
  hasDifficultySpeaking: z.boolean().default(false),
  hasRash: z.boolean().default(false),
  hasItching: z.boolean().default(false),
  hasBruising: z.boolean().default(false),
  hasPainfulUrination: z.boolean().default(false),
  hasFrequentUrination: z.boolean().default(false),
  hasBloodInUrine: z.boolean().default(false),
  hasEarPain: z.boolean().default(false),
  hasHearingLoss: z.boolean().default(false),
  hasNasalCongestion: z.boolean().default(false),
  hasRunnyNose: z.boolean().default(false),
  hasSneezing: z.boolean().default(false),
  hasEyePain: z.boolean().default(false),
  hasRedEye: z.boolean().default(false),
  hasBlurredVision: z.boolean().default(false),
  hasVisionLoss: z.boolean().default(false),

  // --- Nested Vitals Schema (WHO/HL7 Clinical Alignment) ---
  vitals: z.object({
    temperature: z.number().min(30).max(45), // Celsius
    bloodPressure: z.object({
      systolic: z.number().min(50).max(250),
      diastolic: z.number().min(30).max(150),
    }),
    heartRate: z.number().min(30).max(220), // bpm
    oxygenSaturation: z.number().min(50).max(100), // %

    // --- Extended Vitals ---
    weight: z.number().min(0.5).max(300).optional(), // kg
    height: z.number().min(20).max(250).optional(), // cm
    bmi: z.number().optional(), // Auto-calculated
    muac: z.number().min(5).max(40).optional(), // Mid-Upper Arm Circumference (cm)
    painScale: z.number().int().min(0).max(10).optional(), // 0-10 scale
    dehydrationLevel: z
      .enum(['none', 'mild', 'moderate', 'severe'])
      .optional(),
    consciousnessLevel: z
      .enum(['alert', 'verbal', 'pain', 'unresponsive'])
      .optional(), // AVPU scale
  }),

  // --- Legacy nested symptoms (kept for schema consistency) ---
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
  }).optional(),

  // --- Rapid Test Results ---
  rapidTests: z
    .object({
      malariaRdt: z
        .object({
          performed: z.boolean().default(false),
          result: z.enum(['positive', 'negative', 'invalid']).optional(),
          parasiteType: z
            .enum(['p_falciparum', 'p_vivax', 'mixed', 'unknown'])
            .optional(),
        })
        .optional(),
      hivTest: z
        .object({
          performed: z.boolean().default(false),
          result: z
            .enum(['reactive', 'non_reactive', 'indeterminate'])
            .optional(),
        })
        .optional(),
      hbvTest: z
        .object({
          performed: z.boolean().default(false),
          result: z.enum(['positive', 'negative']).optional(),
        })
        .optional(),
      hcvTest: z
        .object({
          performed: z.boolean().default(false),
          result: z.enum(['positive', 'negative']).optional(),
        })
        .optional(),
      urineDipstick: z
        .object({
          performed: z.boolean().default(false),
          glucose: z
            .enum(['negative', 'trace', '1+', '2+', '3+', '4+'])
            .optional(),
          protein: z
            .enum(['negative', 'trace', '1+', '2+', '3+', '4+'])
            .optional(),
          blood: z.enum(['negative', 'trace', '1+', '2+', '3+']).optional(),
          leukocytes: z
            .enum(['negative', 'trace', '1+', '2+', '3+'])
            .optional(),
          nitrites: z.enum(['positive', 'negative']).optional(),
          ketones: z.enum(['negative', 'trace', '1+', '2+', '3+']).optional(),
        })
        .optional(),
      pregnancyTest: z
        .object({
          performed: z.boolean().default(false),
          result: z.enum(['positive', 'negative', 'invalid']).optional(),
        })
        .optional(),
      hemoglobin: z
        .object({
          performed: z.boolean().default(false),
          value: z.number().min(1).max(25).optional(), // g/dL (HemoCue)
        })
        .optional(),
      bloodTyping: z
        .object({
          performed: z.boolean().default(false),
          type: z
            .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
            .optional(),
        })
        .optional(),
    })
    .optional(),

  // --- Clinical Assessment & Diagnosis ---
  clinicalAssessment: z
    .object({
      chiefComplaint: z.string().optional(),
      clinicalNotes: z.string().optional(),
      provisionalDiagnosis: z.array(z.string()).optional(),
      icdCodes: z.array(z.string()).optional(), // ICD-10 codes
      severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
      treatmentGiven: z.string().optional(),
      prescriptions: z.array(z.string()).optional(),
      referralNeeded: z.boolean().optional(),
      referralFacility: z.string().optional(),
      referralReason: z.string().optional(),
      followUpDate: z.string().optional(),
      followUpNotes: z.string().optional(),
    })
    .optional(),

  // --- Reproductive Health ---
  reproductiveHealth: z
    .object({
      isPregnant: z.boolean().optional(),
      gestationalWeeks: z.number().int().min(0).max(45).optional(),
      lastMenstrualPeriod: z.string().optional(),
      fetalHeartRate: z.number().min(60).max(200).optional(), // Doppler
      fundalHeight: z.number().min(0).max(50).optional(), // cm
      breastfeedingStatus: z
        .enum(['exclusive', 'mixed', 'none', 'not_applicable'])
        .optional(),
    })
    .optional(),

  // --- Lesion/Wound Photos ---
  clinicalPhotos: z
    .array(
      z.object({
        base64: z.string(),
        label: z.string().optional(), // e.g. "left arm rash"
        capturedAt: z.string(),
      })
    )
    .optional(),

  notes: z.string().optional(),
  examinerId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Examination = z.infer<typeof ExaminationSchema>;
