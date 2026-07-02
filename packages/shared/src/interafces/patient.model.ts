export interface IPatient {
  education?: string;
  emmergencyContact?: string;
  fullName: string;
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
}
