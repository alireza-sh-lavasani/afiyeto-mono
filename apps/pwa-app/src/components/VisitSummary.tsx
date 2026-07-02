import React from 'react';
import { useTranslation } from 'react-i18next';
import { Examination } from '@afiyet/shared';
import { MapPin, Activity, ShieldAlert, Check, X } from 'lucide-react';

interface VisitSummaryProps {
  examination: Examination;
}

export const VisitSummary: React.FC<VisitSummaryProps> = ({ examination }) => {
  const { t } = useTranslation();

  const symptomGroups = [
    {
      title: t('visitSummary.symptoms.titles.0') || 'General Symptoms',
      symptoms: [
        { key: 'hasFever', label: t('visitSummary.symptoms.hasFever') },
        { key: 'hasHeadache', label: t('visitSummary.symptoms.hasHeadache') },
        { key: 'hasDizziness', label: t('visitSummary.symptoms.hasDizziness') },
        { key: 'hasNausea', label: t('visitSummary.symptoms.hasNausea') },
        { key: 'hasFatigue', label: t('visitSummary.symptoms.hasFatigue') },
        { key: 'hasWeightLoss', label: t('visitSummary.symptoms.hasWeightLoss') },
        { key: 'hasSweating', label: t('visitSummary.symptoms.hasSweating') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.1') || 'Respiratory Symptoms',
      symptoms: [
        { key: 'hasCough', label: t('visitSummary.symptoms.hasCough') },
        { key: 'hasShortnessOfBreath', label: t('visitSummary.symptoms.hasShortnessOfBreath') },
        { key: 'hasSoreThroat', label: t('visitSummary.symptoms.hasSoreThroat') },
        { key: 'hasChestPain', label: t('visitSummary.symptoms.hasChestPain') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.2') || 'Gastrointestinal Symptoms',
      symptoms: [
        { key: 'hasVomiting', label: t('visitSummary.symptoms.hasVomiting') },
        { key: 'hasDiarrhea', label: t('visitSummary.symptoms.hasDiarrhea') },
        { key: 'hasStomachPain', label: t('visitSummary.symptoms.hasStomachPain') },
        { key: 'hasConstipation', label: t('visitSummary.symptoms.hasConstipation') },
        { key: 'hasAppetiteLoss', label: t('visitSummary.symptoms.hasAppetiteLoss') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.3') || 'Musculoskeletal Symptoms',
      symptoms: [
        { key: 'hasMusclePain', label: t('visitSummary.symptoms.hasMusclePain') },
        { key: 'hasJointPain', label: t('visitSummary.symptoms.hasJointPain') },
        { key: 'hasBackPain', label: t('visitSummary.symptoms.hasBackPain') },
        { key: 'hasNeckPain', label: t('visitSummary.symptoms.hasNeckPain') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.4') || 'Neurological Symptoms',
      symptoms: [
        { key: 'hasNumbness', label: t('visitSummary.symptoms.hasNumbness') },
        { key: 'hasSeizures', label: t('visitSummary.symptoms.hasSeizures') },
        { key: 'hasDifficultySpeaking', label: t('visitSummary.symptoms.hasDifficultySpeaking') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.5') || 'Dermatological Symptoms',
      symptoms: [
        { key: 'hasRash', label: t('visitSummary.symptoms.hasRash') },
        { key: 'hasItching', label: t('visitSummary.symptoms.hasItching') },
        { key: 'hasBruising', label: t('visitSummary.symptoms.hasBruising') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.6') || 'Urinary Symptoms',
      symptoms: [
        { key: 'hasPainfulUrination', label: t('visitSummary.symptoms.hasPainfulUrination') },
        { key: 'hasFrequentUrination', label: t('visitSummary.symptoms.hasFrequentUrination') },
        { key: 'hasBloodInUrine', label: t('visitSummary.symptoms.hasBloodInUrine') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.7') || 'ENT Symptoms',
      symptoms: [
        { key: 'hasEarPain', label: t('visitSummary.symptoms.hasEarPain') },
        { key: 'hasHearingLoss', label: t('visitSummary.symptoms.hasHearingLoss') },
        { key: 'hasNasalCongestion', label: t('visitSummary.symptoms.hasNasalCongestion') },
        { key: 'hasRunnyNose', label: t('visitSummary.symptoms.hasRunnyNose') },
        { key: 'hasSneezing', label: t('visitSummary.symptoms.hasSneezing') },
      ],
    },
    {
      title: t('visitSummary.symptoms.titles.8') || 'Eye Symptoms',
      symptoms: [
        { key: 'hasEyePain', label: t('visitSummary.symptoms.hasEyePain') },
        { key: 'hasRedEye', label: t('visitSummary.symptoms.hasRedEye') },
        { key: 'hasBlurredVision', label: t('visitSummary.symptoms.hasBlurredVision') },
        { key: 'hasVisionLoss', label: t('visitSummary.symptoms.hasVisionLoss') },
      ],
    },
  ];

  if (!examination) {
    return <div className="text-center py-6 text-slate-400">Loading visit summary details...</div>;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-8">
      {/* 1. Location details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sky-400 border-b border-slate-800 pb-3">
          <MapPin className="h-5 w-5" />
          <h3 className="font-bold text-lg text-slate-200">{t('examinationForm.locationCard.title')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.locationCard.zoba.label')}</span>
            <span className="text-slate-200 font-medium">{examination.zoba || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.locationCard.subZoba.label')}</span>
            <span className="text-slate-200 font-medium">{examination.subZoba || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.locationCard.localDistrict')}</span>
            <span className="text-slate-200 font-medium">{examination.localDistrict || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.locationCard.longitude')}</span>
            <span className="text-slate-200 font-medium">{examination.longitude || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.locationCard.latitude')}</span>
            <span className="text-slate-200 font-medium">{examination.latitude || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5 col-span-2 md:col-span-3">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.locationCard.address')}</span>
            <span className="text-slate-200 font-medium">{examination.address || '-'}</span>
          </div>
        </div>
      </div>

      {/* 2. Vitals details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 border-b border-slate-800 pb-3">
          <Activity className="h-5 w-5" />
          <h3 className="font-bold text-lg text-slate-200">{t('examinationForm.vitalsCard.title')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.vitalsCard.temperature')}</span>
            <span className="text-slate-200 font-medium">{examination.temperature ? `${examination.temperature} °C` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.vitalsCard.bloodPressureSystolic')}</span>
            <span className="text-slate-200 font-medium">{examination.bloodPressureSystolic ? `${examination.bloodPressureSystolic} mmHg` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.vitalsCard.bloodPressureDiastolic')}</span>
            <span className="text-slate-200 font-medium">{examination.bloodPressureDiastolic ? `${examination.bloodPressureDiastolic} mmHg` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.vitalsCard.heartRate')}</span>
            <span className="text-slate-200 font-medium">{examination.heartRate ? `${examination.heartRate} bpm` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.vitalsCard.respiratoryRate')}</span>
            <span className="text-slate-200 font-medium">{examination.respiratoryRate ? `${examination.respiratoryRate} breath/min` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.vitalsCard.oxygenSaturation')}</span>
            <span className="text-slate-200 font-medium">{examination.oxygenSaturation ? `${examination.oxygenSaturation} %` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">{t('examinationForm.vitalsCard.bloodSugar')}</span>
            <span className="text-slate-200 font-medium">{examination.bloodSugar ? `${examination.bloodSugar} mg/dl` : '-'}</span>
          </div>
        </div>
      </div>

      {/* 3. Symptoms checked */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-500 border-b border-slate-800 pb-3">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="font-bold text-lg text-slate-200">{t('examinationForm.currentCondition.title')}</h3>
        </div>

        <div className="space-y-6 pt-2">
          {symptomGroups.map((group, idx) => {
            // Check if this group has at least one checked symptom
            const checkedCount = group.symptoms.filter(s => examination[s.key as keyof Examination]).length;

            return (
              <div key={idx} className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                  <span>{group.title}</span>
                  {checkedCount > 0 && (
                    <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-semibold">
                      {checkedCount} Checked
                    </span>
                  )}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.symptoms.map((symptom) => {
                    const isChecked = Boolean(examination[symptom.key as keyof Examination]);
                    return (
                      <div 
                        key={symptom.key} 
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-xs font-semibold select-none ${
                          isChecked 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                            : 'bg-slate-950/20 border-slate-800/80 text-slate-600'
                        }`}
                      >
                        {isChecked ? (
                          <Check className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-slate-800 shrink-0" />
                        )}
                        <span>{symptom.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default VisitSummary;
