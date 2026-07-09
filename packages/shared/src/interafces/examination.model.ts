export interface IExamination {
  examinationId: string;

  // --- Location ---
  zoba: string;
  subZoba: string;
  address: string;
  latitude: string;
  localDistrict: string;
  longitude: string;

  // --- Core Vitals ---
  bloodPressureDiastolic: string;
  bloodPressureSystolic: string;
  bloodSugar: string;
  heartRate: string;
  oxygenSaturation: string;
  respiratoryRate: string;
  temperature: string;

  // --- Extended Vitals ---
  weight?: string;
  height?: string;
  bmi?: string;
  muac?: string; // Mid-Upper Arm Circumference (cm)
  painScale?: number; // 0-10
  dehydrationLevel?: string; // none | mild | moderate | severe
  consciousnessLevel?: string; // AVPU: alert | verbal | pain | unresponsive

  // --- Symptoms (boolean flags) ---
  hasFever: boolean;
  hasHeadache: boolean;
  hasDizziness: boolean;
  hasNausea: boolean;
  hasFatigue: boolean;
  hasWeightLoss: boolean;
  hasSweating: boolean;
  hasCough: boolean;
  hasShortnessOfBreath: boolean;
  hasSoreThroat: boolean;
  hasChestPain: boolean;
  hasVomiting: boolean;
  hasDiarrhea: boolean;
  hasStomachPain: boolean;
  hasConstipation: boolean;
  hasAppetiteLoss: boolean;
  hasMusclePain: boolean;
  hasJointPain: boolean;
  hasBackPain: boolean;
  hasNeckPain: boolean;
  hasNumbness: boolean;
  hasSeizures: boolean;
  hasDifficultySpeaking: boolean;
  hasRash: boolean;
  hasItching: boolean;
  hasBruising: boolean;
  hasPainfulUrination: boolean;
  hasFrequentUrination: boolean;
  hasBloodInUrine: boolean;
  hasEarPain: boolean;
  hasHearingLoss: boolean;
  hasNasalCongestion: boolean;
  hasRunnyNose: boolean;
  hasSneezing: boolean;
  hasEyePain: boolean;
  hasRedEye: boolean;
  hasBlurredVision: boolean;
  hasVisionLoss: boolean;

  // --- Rapid Test Results ---
  rapidTests?: {
    malariaRdt?: {
      performed: boolean;
      result?: 'positive' | 'negative' | 'invalid';
      parasiteType?: 'p_falciparum' | 'p_vivax' | 'mixed' | 'unknown';
    };
    hivTest?: {
      performed: boolean;
      result?: 'reactive' | 'non_reactive' | 'indeterminate';
    };
    hbvTest?: {
      performed: boolean;
      result?: 'positive' | 'negative';
    };
    hcvTest?: {
      performed: boolean;
      result?: 'positive' | 'negative';
    };
    urineDipstick?: {
      performed: boolean;
      glucose?: string;
      protein?: string;
      blood?: string;
      leukocytes?: string;
      nitrites?: string;
      ketones?: string;
    };
    pregnancyTest?: {
      performed: boolean;
      result?: 'positive' | 'negative' | 'invalid';
    };
    hemoglobin?: {
      performed: boolean;
      value?: number; // g/dL
    };
    bloodTyping?: {
      performed: boolean;
      type?: string;
    };
  };

  // --- Clinical Assessment & Diagnosis ---
  clinicalAssessment?: {
    chiefComplaint?: string;
    clinicalNotes?: string;
    provisionalDiagnosis?: string[];
    icdCodes?: string[];
    severity?: 'mild' | 'moderate' | 'severe' | 'critical';
    treatmentGiven?: string;
    prescriptions?: string[];
    referralNeeded?: boolean;
    referralFacility?: string;
    referralReason?: string;
    followUpDate?: string;
    followUpNotes?: string;
  };

  // --- Reproductive Health ---
  reproductiveHealth?: {
    isPregnant?: boolean;
    gestationalWeeks?: number;
    lastMenstrualPeriod?: string;
    fetalHeartRate?: number;
    fundalHeight?: number;
    breastfeedingStatus?: 'exclusive' | 'mixed' | 'none' | 'not_applicable';
  };

  // --- Clinical Photos (lesions, wounds, infections) ---
  clinicalPhotos?: Array<{
    base64: string;
    label?: string;
    capturedAt: string;
  }>;
}
