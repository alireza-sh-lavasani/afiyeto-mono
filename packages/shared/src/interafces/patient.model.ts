export interface IPatient {
  education?: string;
  emmergencyContact?: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  gender: string;
  maritalStatus: string;
  uniqueGovID?: string;
  examinations?: any;
  birthDate: Date;
  patientId?: string;
  tmpPatientId?: string;
  image?: {
    uri?: string;
    base64?: string;
  };

  // --- Contact & Identity ---
  phoneNumber?: string;
  ethnicity?: string;
  nationality?: string;
  occupation?: string;
  bloodType?: string;

  // --- Permanent Residence ---
  residenceZoba?: string;
  residenceSubZoba?: string;
  residenceVillage?: string;

  // --- Social Determinants of Health ---
  householdSize?: number;
  waterSource?: string;
  sanitationType?: string;

  // --- Medical History ---
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];

  // --- Disability / Functional Limitations ---
  disabilities?: string[];

  // --- Reproductive Health ---
  isPregnant?: boolean;
  pregnancyDueDate?: string;
  numberOfPregnancies?: number; // Gravida
  numberOfLiveBirths?: number; // Parity
}
