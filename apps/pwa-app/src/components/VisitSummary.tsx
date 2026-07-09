import React from 'react';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Examination } from '@afiyet/shared';
import {
  MapPin,
  Activity,
  ShieldAlert,
  Check,
  X,
  Scale,
  FlaskConical,
  Stethoscope,
  Baby,
  Camera,
  AlertTriangle,
} from 'lucide-react';

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
    return <div className="text-center py-6 text-muted-foreground">Loading visit summary details...</div>;
  }

  // Check which rapid tests were performed to conditionally show them
  const malariaPerformed = examination.rapidTests?.malariaRdt?.performed;
  const hivPerformed = examination.rapidTests?.hivTest?.performed;
  const hbvPerformed = examination.rapidTests?.hbvTest?.performed;
  const hcvPerformed = examination.rapidTests?.hcvTest?.performed;
  const urinePerformed = examination.rapidTests?.urineDipstick?.performed;
  const pregPerformed = examination.rapidTests?.pregnancyTest?.performed;
  const hemoPerformed = examination.rapidTests?.hemoglobin?.performed;
  const typingPerformed = examination.rapidTests?.bloodTyping?.performed;

  const anyTestPerformed =
    malariaPerformed ||
    hivPerformed ||
    hbvPerformed ||
    hcvPerformed ||
    urinePerformed ||
    pregPerformed ||
    hemoPerformed ||
    typingPerformed;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl space-y-8">
      {/* 1. Location details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary border-b border-border pb-3">
          <MapPin className="h-5 w-5" />
          <h3 className="font-bold text-lg text-foreground">{t('examinationForm.locationCard.title')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.locationCard.zoba.label')}</span>
            <span className="text-foreground font-medium">{examination.zoba || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.locationCard.subZoba.label')}</span>
            <span className="text-foreground font-medium">{examination.subZoba || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.locationCard.localDistrict')}</span>
            <span className="text-foreground font-medium">{examination.localDistrict || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.locationCard.longitude')}</span>
            <span className="text-foreground font-medium">{examination.longitude || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.locationCard.latitude')}</span>
            <span className="text-foreground font-medium">{examination.latitude || '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5 col-span-2 md:col-span-3">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.locationCard.address')}</span>
            <span className="text-foreground font-medium">{examination.address || '-'}</span>
          </div>
        </div>
      </div>

      {/* 2. Vitals details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 border-b border-border pb-3">
          <Activity className="h-5 w-5" />
          <h3 className="font-bold text-lg text-foreground">{t('examinationForm.vitalsCard.title')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.vitalsCard.temperature')}</span>
            <span className="text-foreground font-medium">{examination.temperature ? `${examination.temperature} °C` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.vitalsCard.bloodPressureSystolic')}</span>
            <span className="text-foreground font-medium">{examination.bloodPressureSystolic ? `${examination.bloodPressureSystolic} mmHg` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.vitalsCard.bloodPressureDiastolic')}</span>
            <span className="text-foreground font-medium">{examination.bloodPressureDiastolic ? `${examination.bloodPressureDiastolic} mmHg` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.vitalsCard.heartRate')}</span>
            <span className="text-foreground font-medium">{examination.heartRate ? `${examination.heartRate} bpm` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.vitalsCard.respiratoryRate')}</span>
            <span className="text-foreground font-medium">{examination.respiratoryRate ? `${examination.respiratoryRate} breath/min` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.vitalsCard.oxygenSaturation')}</span>
            <span className="text-foreground font-medium">{examination.oxygenSaturation ? `${examination.oxygenSaturation} %` : '-'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-semibold">{t('examinationForm.vitalsCard.bloodSugar')}</span>
            <span className="text-foreground font-medium">{examination.bloodSugar ? `${examination.bloodSugar} mg/dL` : '-'}</span>
          </div>
        </div>
      </div>

      {/* 3. Extended Vitals Section */}
      {(examination.vitals?.weight || examination.vitals?.height || examination.vitals?.muac || examination.vitals?.painScale !== undefined) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 border-b border-border pb-3">
            <Scale className="h-5 w-5" />
            <h3 className="font-bold text-lg text-foreground">Extended Measurements</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            {examination.vitals?.weight && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Weight</span>
                <span className="text-foreground font-medium">{examination.vitals.weight} kg</span>
              </div>
            )}
            {examination.vitals?.height && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Height</span>
                <span className="text-foreground font-medium">{examination.vitals.height} cm</span>
              </div>
            )}
            {examination.vitals?.bmi && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Calculated BMI</span>
                <span className={`font-bold px-2 py-0.5 rounded w-fit text-xs ${
                  examination.vitals.bmi < 18.5
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : examination.vitals.bmi < 25
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {examination.vitals.bmi}
                </span>
              </div>
            )}
            {examination.vitals?.muac && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">MUAC (Arm Circum.)</span>
                <span className={`font-semibold text-foreground px-2 py-0.5 rounded w-fit ${
                  examination.vitals.muac < 11.5
                    ? 'bg-red-500/10 text-red-400 font-bold'
                    : examination.vitals.muac < 12.5
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {examination.vitals.muac} cm
                </span>
              </div>
            )}
            {examination.vitals?.painScale !== undefined && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Pain Intensity</span>
                <span className="text-foreground font-medium">{examination.vitals.painScale} / 10</span>
              </div>
            )}
            {examination.vitals?.dehydrationLevel && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Dehydration</span>
                <span className={`font-medium capitalize ${
                  examination.vitals.dehydrationLevel === 'severe'
                    ? 'text-red-400 font-bold'
                    : examination.vitals.dehydrationLevel === 'moderate'
                    ? 'text-orange-400'
                    : examination.vitals.dehydrationLevel === 'mild'
                    ? 'text-yellow-400'
                    : 'text-emerald-400'
                }`}>{examination.vitals.dehydrationLevel}</span>
              </div>
            )}
            {examination.vitals?.consciousnessLevel && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Consciousness (AVPU)</span>
                <span className={`font-medium capitalize ${
                  examination.vitals.consciousnessLevel === 'alert' ? 'text-emerald-400' : 'text-red-400 font-bold'
                }`}>{examination.vitals.consciousnessLevel}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Symptoms checked */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-500 border-b border-border pb-3">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="font-bold text-lg text-foreground">{t('examinationForm.currentCondition.title')}</h3>
        </div>

        <div className="space-y-6 pt-2">
          {symptomGroups.map((group, idx) => {
            const checkedCount = group.symptoms.filter((s) => examination[s.key as keyof Examination]).length;

            return (
              <div key={idx} className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
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
                            : 'bg-background/20 border-border/80 text-muted-foreground/60'
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

      {/* 5. Rapid Test Results Section */}
      {anyTestPerformed && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-purple-400 border-b border-border pb-3">
            <FlaskConical className="h-5 w-5" />
            <h3 className="font-bold text-lg text-foreground">Rapid Test Diagnostics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Malaria */}
            {malariaPerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Malaria RDT</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    Result:{' '}
                    <span className={examination.rapidTests?.malariaRdt?.result === 'positive' ? 'text-red-400' : 'text-emerald-400'}>
                      {examination.rapidTests?.malariaRdt?.result?.toUpperCase()}
                    </span>
                  </div>
                  {examination.rapidTests?.malariaRdt?.parasiteType &&
                    examination.rapidTests?.malariaRdt?.result === 'positive' && (
                      <span className="text-[10px] text-muted-foreground block italic">
                        Species: {examination.rapidTests?.malariaRdt?.parasiteType?.replace('_', '. ')}
                      </span>
                    )}
                </div>
                <FlaskConical className="h-6 w-6 text-purple-400/50" />
              </div>
            )}

            {/* HIV */}
            {hivPerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">HIV Screening</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    Result:{' '}
                    <span className={examination.rapidTests?.hivTest?.result === 'reactive' ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                      {examination.rapidTests?.hivTest?.result?.replace('_', ' ')?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <FlaskConical className="h-6 w-6 text-purple-400/50" />
              </div>
            )}

            {/* Hepatitis B */}
            {hbvPerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Hepatitis B (HBV)</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    Result:{' '}
                    <span className={examination.rapidTests?.hbvTest?.result === 'positive' ? 'text-red-400' : 'text-emerald-400'}>
                      {examination.rapidTests?.hbvTest?.result?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <FlaskConical className="h-6 w-6 text-purple-400/50" />
              </div>
            )}

            {/* Hepatitis C */}
            {hcvPerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Hepatitis C (HCV)</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    Result:{' '}
                    <span className={examination.rapidTests?.hcvTest?.result === 'positive' ? 'text-red-400' : 'text-emerald-400'}>
                      {examination.rapidTests?.hcvTest?.result?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <FlaskConical className="h-6 w-6 text-purple-400/50" />
              </div>
            )}

            {/* Pregnancy */}
            {pregPerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Pregnancy Test (hCG)</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    Result:{' '}
                    <span className={examination.rapidTests?.pregnancyTest?.result === 'positive' ? 'text-pink-400' : 'text-muted-foreground'}>
                      {examination.rapidTests?.pregnancyTest?.result?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <Baby className="h-6 w-6 text-pink-400/50" />
              </div>
            )}

            {/* Hemoglobin */}
            {hemoPerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Hemoglobin (HemoCue)</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    Value:{' '}
                    <span className={`font-bold ${
                      (examination.rapidTests?.hemoglobin?.value ?? 14) < 11 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {examination.rapidTests?.hemoglobin?.value} g/dL
                    </span>
                  </div>
                </div>
                <FlaskConical className="h-6 w-6 text-purple-400/50" />
              </div>
            )}

            {/* Blood Typing */}
            {typingPerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Blood Grouping</span>
                  <div className="text-sm font-semibold text-foreground mt-0.5">
                    Type: <span className="font-bold text-primary">{examination.rapidTests?.bloodTyping?.type}</span>
                  </div>
                </div>
                <FlaskConical className="h-6 w-6 text-purple-400/50" />
              </div>
            )}

            {/* Urine Dipstick */}
            {urinePerformed && (
              <div className="bg-background/20 border border-border/80 rounded-xl p-4 space-y-2 md:col-span-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block border-b border-border/40 pb-1">
                  Urine Dipstick Panel
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Glucose</span>
                    <span className={`font-medium ${examination.rapidTests?.urineDipstick?.glucose !== 'negative' ? 'text-amber-400 font-bold' : ''}`}>
                      {examination.rapidTests?.urineDipstick?.glucose}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Protein</span>
                    <span className={`font-medium ${examination.rapidTests?.urineDipstick?.protein !== 'negative' ? 'text-amber-400 font-bold' : ''}`}>
                      {examination.rapidTests?.urineDipstick?.protein}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Blood</span>
                    <span className={`font-medium ${examination.rapidTests?.urineDipstick?.blood !== 'negative' ? 'text-red-400 font-bold' : ''}`}>
                      {examination.rapidTests?.urineDipstick?.blood}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Leukocytes</span>
                    <span className={`font-medium ${examination.rapidTests?.urineDipstick?.leukocytes !== 'negative' ? 'text-amber-400' : ''}`}>
                      {examination.rapidTests?.urineDipstick?.leukocytes}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Nitrites</span>
                    <span className={`font-medium ${examination.rapidTests?.urineDipstick?.nitrites === 'positive' ? 'text-red-400 font-bold' : ''}`}>
                      {examination.rapidTests?.urineDipstick?.nitrites}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Ketones</span>
                    <span className={`font-medium ${examination.rapidTests?.urineDipstick?.ketones !== 'negative' ? 'text-amber-400' : ''}`}>
                      {examination.rapidTests?.urineDipstick?.ketones}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Clinical Assessment Section */}
      {examination.clinicalAssessment && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-400 border-b border-border pb-3">
            <Stethoscope className="h-5 w-5" />
            <h3 className="font-bold text-lg text-foreground">Clinical Assessment & Diagnosis</h3>
          </div>
          <div className="space-y-4 text-sm">
            {examination.clinicalAssessment.chiefComplaint && (
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">Chief Complaint</span>
                <span className="text-foreground text-sm italic">
                  "{examination.clinicalAssessment.chiefComplaint}"
                </span>
              </div>
            )}

            {examination.clinicalAssessment.clinicalNotes && (
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">Clinical Findings / Notes</span>
                <p className="text-foreground leading-relaxed bg-background/30 p-3 rounded-lg border border-border/40">
                  {examination.clinicalAssessment.clinicalNotes}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Diagnosis Badges */}
              {examination.clinicalAssessment.provisionalDiagnosis &&
                examination.clinicalAssessment.provisionalDiagnosis.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block mb-1">
                      Provisional Diagnosis
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {examination.clinicalAssessment.provisionalDiagnosis.map((diag) => (
                        <span key={diag} className="px-2 py-0.5 bg-primary/10 border border-sky-500/20 text-primary text-xs rounded">
                          {diag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* ICD-10 Badges */}
              {examination.clinicalAssessment.icdCodes &&
                examination.clinicalAssessment.icdCodes.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground font-semibold block mb-1">
                      ICD-10 Disease Classification
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {examination.clinicalAssessment.icdCodes.map((code) => (
                        <span key={code} className="px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded font-medium">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-border/40 pt-3">
              {examination.clinicalAssessment.severity && (
                <div>
                  <span className="text-xs text-muted-foreground font-semibold block">Severity</span>
                  <span className={`font-bold capitalize text-xs px-2 py-0.5 rounded w-fit block mt-1 ${
                    examination.clinicalAssessment.severity === 'critical'
                      ? 'bg-red-600/20 text-red-500 border border-red-500/30'
                      : examination.clinicalAssessment.severity === 'severe'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : examination.clinicalAssessment.severity === 'moderate'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {examination.clinicalAssessment.severity}
                  </span>
                </div>
              )}

              {examination.clinicalAssessment.treatmentGiven && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground font-semibold block">Administered Treatment</span>
                  <span className="font-medium text-foreground">{examination.clinicalAssessment.treatmentGiven}</span>
                </div>
              )}
            </div>

            {/* Prescriptions */}
            {examination.clinicalAssessment.prescriptions &&
              examination.clinicalAssessment.prescriptions.length > 0 && (
                <div className="bg-background/20 border border-border/60 p-3 rounded-xl space-y-1.5">
                  <span className="text-xs text-muted-foreground font-semibold block">Prescribed Medications</span>
                  <div className="flex flex-col gap-1">
                    {examination.clinicalAssessment.prescriptions.map((rx, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="font-mono text-foreground">{rx}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Referral */}
            {examination.clinicalAssessment.referralNeeded && (
              <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                    Urgent Hospital Referral Issued
                  </span>
                  <div className="text-sm">
                    Target Facility:{' '}
                    <span className="font-semibold text-foreground">
                      {examination.clinicalAssessment.referralFacility || '-'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Reason: {examination.clinicalAssessment.referralReason || '-'}
                  </div>
                </div>
              </div>
            )}

            {/* Follow up */}
            {examination.clinicalAssessment.followUpDate && (
              <div className="bg-secondary/40 border border-border p-3 rounded-xl flex justify-between text-xs">
                <div>
                  <span className="text-muted-foreground block">Follow-up Schedule</span>
                  <span className="font-semibold text-foreground">
                    {moment(examination.clinicalAssessment.followUpDate).format('DD MMM YYYY')}
                  </span>
                </div>
                {examination.clinicalAssessment.followUpNotes && (
                  <div className="text-right max-w-xs">
                    <span className="text-muted-foreground block">Follow-up Instructions</span>
                    <span className="text-foreground">{examination.clinicalAssessment.followUpNotes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Reproductive Health Section */}
      {examination.reproductiveHealth && (examination.reproductiveHealth.isPregnant || examination.reproductiveHealth.breastfeedingStatus !== 'not_applicable') && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-pink-400 border-b border-border pb-3">
            <Baby className="h-5 w-5" />
            <h3 className="font-bold text-lg text-foreground">Maternal & Reproductive Monitoring</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground font-semibold">Pregnancy Status</span>
              <span className={`font-semibold ${examination.reproductiveHealth.isPregnant ? 'text-pink-400 font-bold' : 'text-muted-foreground'}`}>
                {examination.reproductiveHealth.isPregnant ? 'Pregnant' : 'Not Pregnant'}
              </span>
            </div>

            {examination.reproductiveHealth.isPregnant && (
              <>
                {examination.reproductiveHealth.gestationalWeeks && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-semibold">Gestational Age</span>
                    <span className="text-foreground font-semibold">
                      {examination.reproductiveHealth.gestationalWeeks} weeks
                    </span>
                  </div>
                )}
                {examination.reproductiveHealth.fetalHeartRate && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-semibold">Fetal Heart Rate</span>
                    <span className="text-foreground font-medium">
                      {examination.reproductiveHealth.fetalHeartRate} bpm
                    </span>
                  </div>
                )}
                {examination.reproductiveHealth.fundalHeight && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-semibold">Fundal Height</span>
                    <span className="text-foreground font-medium">
                      {examination.reproductiveHealth.fundalHeight} cm
                    </span>
                  </div>
                )}
              </>
            )}

            {examination.reproductiveHealth.lastMenstrualPeriod && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">LMP</span>
                <span className="text-foreground font-medium">
                  {moment(examination.reproductiveHealth.lastMenstrualPeriod).format('DD MMM YYYY')}
                </span>
              </div>
            )}

            {examination.reproductiveHealth.breastfeedingStatus && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-semibold">Lactation Status</span>
                <span className="text-foreground capitalize font-medium">
                  {examination.reproductiveHealth.breastfeedingStatus.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Clinical Photos Section */}
      {examination.clinicalPhotos && examination.clinicalPhotos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-rose-400 border-b border-border pb-3">
            <Camera className="h-5 w-5" />
            <h3 className="font-bold text-lg text-foreground">Clinical Documentation Photos</h3>
          </div>
          <div className="flex flex-wrap gap-4 p-4 bg-background/50 border border-border/80 rounded-xl overflow-x-auto">
            {examination.clinicalPhotos.map((photo, idx) => (
              <div key={idx} className="w-40 border border-border rounded-xl p-1 bg-card shrink-0 shadow-lg">
                <a href={photo.base64} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photo.base64}
                    alt={photo.label || 'Clinical documentation'}
                    className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                  />
                </a>
                <div className="p-2 space-y-0.5">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {photo.label || 'Clinical Photo'}
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    Captured: {moment(photo.capturedAt).format('DD MMM, HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitSummary;
