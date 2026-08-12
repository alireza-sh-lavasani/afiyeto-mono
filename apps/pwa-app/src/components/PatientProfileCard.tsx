import React from 'react';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Patient, beautifyId } from '@afiyet/shared';
import { User, Phone, Home, Heart } from 'lucide-react';
import { translatePreset } from './PersonalInfoForm.tsx';

interface PatientProfileCardProps {
  patient: Patient;
}

export const PatientProfileCard: React.FC<PatientProfileCardProps> = ({ patient }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-8 flex flex-col gap-6 shadow-xl">
      {/* Top Section: Photo and Basic Name */}
      <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-border">
        {/* Patient Avatar */}
        <div className="flex flex-col items-center gap-3 shrink-0 text-center">
          <div className="h-24 w-24 rounded-full border-2 border-primary/20 overflow-hidden bg-secondary flex items-center justify-center shadow-inner">
            {patient.image?.base64 ? (
              <img src={patient.image.base64} alt={patient.fullName} className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10 text-muted-foreground/60" />
            )}
          </div>
          <div className="flex flex-col items-center">
            <h4 className="font-bold text-lg text-foreground">{patient.fullName || '-'}</h4>
            {patient.isPregnant && (
              <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-pink-500/10 border border-pink-500/20 text-pink-400">
                {t('examinationForm.reproductiveHealth.isPregnant', { defaultValue: 'Pregnant' })}
              </span>
            )}
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-6 text-sm md:border-l border-border pt-6 md:pt-0 md:pl-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('personalInfo.patientId')}</span>
            <span className="font-mono text-foreground bg-background px-2 py-0.5 rounded border border-border w-fit">
              {patient.patientId ? beautifyId(patient.patientId) : '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('personalInfo.tmpPatientId')}</span>
            <span className="font-mono text-foreground bg-background px-2 py-0.5 rounded border border-border w-fit">
              {patient.tmpPatientId ? beautifyId(patient.tmpPatientId) : '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('personalInfo.uniqueGovID')}</span>
            <span className="font-medium text-foreground">{patient.uniqueGovID || '-'}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('personalInfo.gender')}</span>
            <span className="font-medium text-foreground capitalize">
              {patient.gender ? t(`personalInfo.${patient.gender}`, { defaultValue: patient.gender }) : '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('personalInfo.birthDate')}</span>
            <span className="font-medium text-foreground">{moment(patient.birthDate).format('DD MMM YYYY')}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('miniProfile.education')}</span>
            <span className="font-medium text-foreground">
              {patient.education ? t(`personalInfo.educationLevels.${patient.education}`, { defaultValue: patient.education }) : '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('personalInfo.maritalStatus')}</span>
            <span className="font-medium text-foreground capitalize">
              {patient.maritalStatus ? t(`personalInfo.${patient.maritalStatus}`, { defaultValue: patient.maritalStatus }) : '-'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('personalInfo.bloodType')}</span>
            <span className="font-medium text-foreground uppercase">
              {patient.bloodType ? t(`personalInfo.bloodTypes.${patient.bloodType}`, { defaultValue: patient.bloodType }) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        {/* Contact & Permanent Residence */}
        <div className="bg-background/20 border border-border/80 rounded-xl p-4 space-y-3">
          <h5 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-1.5">
            <Home className="h-4 w-4" />
            <span>{t('personalInfo.sectionContactResidence', { defaultValue: 'Contact & Residence' })}</span>
          </h5>
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.phoneNumber')}</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground/60" />
                {patient.phoneNumber || '-'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.emmergencyContact')}</span>
              <span className="font-medium text-foreground">{patient.emmergencyContact || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.nationality')}</span>
              <span className="font-medium text-foreground">{patient.nationality || 'Eritrean'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.ethnicity')}</span>
              <span className="font-medium text-foreground">
                {patient.ethnicity ? translatePreset('ethnicity', patient.ethnicity, t) : '-'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.occupation')}</span>
              <span className="font-medium text-foreground">
                {patient.occupation ? translatePreset('occupation', patient.occupation, t) : '-'}
              </span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.sectionResidence')}</span>
              <span className="font-medium text-foreground">
                {patient.residenceVillage || '-'}
                {patient.residenceSubZoba ? `, ${patient.residenceSubZoba}` : ''}
                {patient.residenceZoba ? `, ${patient.residenceZoba}` : ''}
              </span>
            </div>
            {patient.householdSize && (
              <div className="flex flex-col col-span-2 grid grid-cols-2 border-t border-border/40 pt-2 mt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.householdSize')}</span>
                  <span className="font-medium text-foreground">
                    {patient.householdSize} {t('personalInfo.members', { defaultValue: 'members' })}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.waterSanitation', { defaultValue: 'Water / Sanitation' })}</span>
                  <span className="font-medium text-foreground capitalize">
                    {(patient.waterSource ? t(`personalInfo.waterSources.${patient.waterSource}`, { defaultValue: patient.waterSource }) : '-') } / {(patient.sanitationType ? t(`personalInfo.sanitationTypes.${patient.sanitationType}`, { defaultValue: patient.sanitationType.replace('_', ' ') }) : '-')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical History & Obstetric History */}
        <div className="bg-background/20 border border-border/80 rounded-xl p-4 space-y-4">
          <h5 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5 border-b border-border/60 pb-1.5">
            <Heart className="h-4 w-4" />
            <span>{t('personalInfo.sectionMedicalHistory')}</span>
          </h5>
          <div className="space-y-3">
            {/* Allergies */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.allergies')}</span>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {patient.allergies.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold rounded">
                      {translatePreset('allergy', tag, t)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{t('personalInfo.noKnownAllergies', { defaultValue: 'No known allergies' })}</span>
              )}
            </div>

            {/* Chronic Conditions */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.chronicConditions')}</span>
              {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {patient.chronicConditions.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold rounded">
                      {translatePreset('chronic_condition', tag, t)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{t('personalInfo.noChronicConditions', { defaultValue: 'No chronic conditions recorded' })}</span>
              )}
            </div>

            {/* Disabilities */}
            {patient.disabilities && patient.disabilities.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.disabilities')}</span>
                <div className="flex flex-wrap gap-1">
                  {patient.disabilities.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold rounded">
                      {translatePreset('disability', tag, t)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Obstetric History for Females */}
            {patient.gender === 'female' && (patient.numberOfPregnancies || patient.numberOfLiveBirths || patient.isPregnant) && (
              <div className="border-t border-border/40 pt-3 mt-2 grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.numberOfPregnancies')}</span>
                  <span className="font-semibold text-foreground">{patient.numberOfPregnancies ?? '-'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.numberOfLiveBirths')}</span>
                  <span className="font-semibold text-foreground">{patient.numberOfLiveBirths ?? '-'}</span>
                </div>
                {patient.isPregnant && patient.pregnancyDueDate && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('personalInfo.pregnancyDueDate')}</span>
                    <span className="font-medium text-pink-400">{moment(patient.pregnancyDueDate).format('DD MMM YYYY')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfileCard;
