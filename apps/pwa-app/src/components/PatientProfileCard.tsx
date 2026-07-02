import React from 'react';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Patient, beautifyId } from '@afiyet/shared';
import { User } from 'lucide-react';

interface PatientProfileCardProps {
  patient: Patient;
}

export const PatientProfileCard: React.FC<PatientProfileCardProps> = ({ patient }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-xl">
      {/* Patient Avatar */}
      <div className="flex flex-col items-center gap-3 shrink-0 text-center">
        <div className="h-24 w-24 rounded-full border-2 border-sky-500/20 overflow-hidden bg-slate-800 flex items-center justify-center shadow-inner">
          {patient.image?.base64 ? (
            <img src={patient.image.base64} alt={patient.fullName} className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-slate-600" />
          )}
        </div>
        <h4 className="font-bold text-lg text-slate-100">{patient.fullName || '-'}</h4>
      </div>

      {/* Profile Details Grid */}
      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 text-sm border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('personalInfo.patientId')}</span>
          <span className="font-mono text-slate-200 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/80 w-fit">
            {patient.patientId ? beautifyId(patient.patientId) : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('personalInfo.tmpPatientId')}</span>
          <span className="font-mono text-slate-200 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/80 w-fit">
            {patient.tmpPatientId ? beautifyId(patient.tmpPatientId) : '-'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('personalInfo.uniqueGovID')}</span>
          <span className="font-medium text-slate-200">{patient.uniqueGovID || '-'}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('personalInfo.emmergencyContact')}</span>
          <span className="font-medium text-slate-200">{patient.emmergencyContact || '-'}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('personalInfo.gender')}</span>
          <span className="font-medium text-slate-200 capitalize">{patient.gender || '-'}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('personalInfo.birthDate')}</span>
          <span className="font-medium text-slate-200">{moment(patient.birthDate).format('DD MMM YYYY')}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('miniProfile.education')}</span>
          <span className="font-medium text-slate-200">{patient.education || '-'}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('personalInfo.maritalStatus')}</span>
          <span className="font-medium text-slate-200 capitalize">{patient.maritalStatus || '-'}</span>
        </div>
      </div>
    </div>
  );
};
export default PatientProfileCard;
