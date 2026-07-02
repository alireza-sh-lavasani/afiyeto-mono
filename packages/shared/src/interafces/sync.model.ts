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
