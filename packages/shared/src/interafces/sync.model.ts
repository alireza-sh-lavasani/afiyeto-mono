import { EIdType, ESyncEntity, ESyncOperation } from '../enums/sync.enum.ts';
import { IExamination } from './examination.model.ts';

export interface ISyncBaseDto {
  entity: ESyncEntity;
  operation: ESyncOperation;
  data: any;
  metaData?: any;
}

export interface ISyncCreatePatientData {
  education?: string;
  emmergencyContact?: string;
  fullName: string;
  gender: string;
  maritalStatus: string;
  uniqueGovID?: string;
  birthDate: Date;
  tmpPatientId: string;

  // --- New demographic fields ---
  phoneNumber?: string;
  ethnicity?: string;
  nationality?: string;
  occupation?: string;
  bloodType?: string;

  // --- Permanent Residence ---
  residenceZoba?: string;
  residenceSubZoba?: string;
  residenceVillage?: string;

  // --- Social Determinants ---
  householdSize?: number;
  waterSource?: string;
  sanitationType?: string;

  // --- Medical History ---
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];

  // --- Disability ---
  disabilities?: string[];

  // --- Reproductive ---
  isPregnant?: boolean;
  pregnancyDueDate?: string;
  numberOfPregnancies?: number;
  numberOfLiveBirths?: number;
}

export interface ISyncCreatePatientDto extends ISyncBaseDto {
  data: ISyncCreatePatientData;
}

export interface ISyncUpdatePatientData {
  education?: string;
  emmergencyContact?: string;
  fullName?: string;
  gender?: string;
  maritalStatus?: string;
  uniqueGovID?: string;
  examinations?: any;
  birthDate?: Date;

  // --- New demographic fields ---
  phoneNumber?: string;
  ethnicity?: string;
  nationality?: string;
  occupation?: string;
  bloodType?: string;

  // --- Permanent Residence ---
  residenceZoba?: string;
  residenceSubZoba?: string;
  residenceVillage?: string;

  // --- Social Determinants ---
  householdSize?: number;
  waterSource?: string;
  sanitationType?: string;

  // --- Medical History ---
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];

  // --- Disability ---
  disabilities?: string[];

  // --- Reproductive ---
  isPregnant?: boolean;
  pregnancyDueDate?: string;
  numberOfPregnancies?: number;
  numberOfLiveBirths?: number;
}

export interface ISyncUpdatePatientDto extends ISyncBaseDto {
  data: ISyncUpdatePatientData;
}

export interface ISyncDeletePatientData {
  tmpPatientId?: string;
  patientId?: string;
}

export interface ISyncDeletePatientDto extends ISyncBaseDto {
  data: ISyncDeletePatientData;
}

export interface ISyncCreateExaminationMetaData {
  patientId: string;
  idType: EIdType;
}

export interface ISyncCreateExaminationDto extends ISyncBaseDto {
  metaData: ISyncCreateExaminationMetaData;
  data: IExamination;
}
