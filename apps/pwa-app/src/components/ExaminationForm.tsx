import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { EIdType } from '@afiyet/shared';
import { useExaminationService } from '../services/examination.service.ts';
import { zobas, subZobas, EZoba } from './zobas.ts';
import { ArrowLeft, RefreshCw, CheckCircle2, MapPin, Activity, ShieldAlert } from 'lucide-react';

interface ExaminationFormProps {
  mode: 'create' | 'edit';
  patientId: string;
  idType: EIdType;
  examinationId?: string;
  examinationFormData?: any;
}

export const ExaminationForm: React.FC<ExaminationFormProps> = ({
  mode,
  patientId,
  idType,
  examinationId,
  examinationFormData,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createExamination, updateExamination } = useExaminationService(patientId, idType);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedZoba, setSelectedZoba] = useState<EZoba | ''>(
    examinationFormData?.zoba || ''
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: mode === 'edit' && examinationFormData ? examinationFormData : {
      zoba: '',
      subZoba: '',
      localDistrict: '',
      longitude: '',
      latitude: '',
      address: '',
      temperature: '',
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      bloodSugar: '',
      // Symptoms default values (false)
      hasFever: false, hasHeadache: false, hasDizziness: false, hasNausea: false, hasFatigue: false,
      hasWeightLoss: false, hasSweating: false, hasCough: false, hasShortnessOfBreath: false,
      hasSoreThroat: false, hasChestPain: false, hasVomiting: false, hasDiarrhea: false,
      hasStomachPain: false, hasConstipation: false, hasAppetiteLoss: false, hasMusclePain: false,
      hasJointPain: false, hasBackPain: false, hasNeckPain: false, hasNumbness: false,
      hasSeizures: false, hasDifficultySpeaking: false, hasRash: false, hasItching: false,
      hasBruising: false, hasPainfulUrination: false, hasFrequentUrination: false,
      hasBloodInUrine: false, hasEarPain: false, hasHearingLoss: false, hasNasalCongestion: false,
      hasRunnyNose: false, hasSneezing: false, hasEyePain: false, hasRedEye: false,
      hasBlurredVision: false, hasVisionLoss: false,
    }
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (mode === 'create') {
        await createExamination(data);
      } else if (mode === 'edit' && examinationId) {
        if (isDirty) {
          await updateExamination(examinationId, data);
        }
      }
      navigate({ to: `/patients/${patientId}/visits` });
    } catch (error) {
      console.error('[Examination Form] Error submitting examination:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="max-w-5xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border pb-5">
        <button 
          onClick={() => navigate({ to: `/patients/${patientId}/visits` })}
          className="p-2 rounded-lg bg-secondary hover:bg-slate-700 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === 'create' ? t('examinationForm.formTitle') : 'Update Visit Records'}
          </h2>
          <span className="text-xs text-muted-foreground">Clinical Vitals and Symptoms Assessment</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Location Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            <h3 className="font-bold text-foreground">{t('examinationForm.locationCard.title')}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('examinationForm.locationCard.description')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
            {/* Zoba Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.zoba.label')}
              </label>
              <Controller
                control={control}
                name="zoba"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value as EZoba;
                      onChange(v);
                      setSelectedZoba(v);
                      setValue('subZoba', ''); // Reset sub-zoba
                    }}
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.zoba ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  >
                    <option value="">{t('examinationForm.locationCard.zoba.button')}</option>
                    {zobas.map(z => (
                      <option key={z.value} value={z.value}>{z.title}</option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Sub Zoba Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.subZoba.label')}
              </label>
              <Controller
                control={control}
                name="subZoba"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={onChange}
                    disabled={!selectedZoba}
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all disabled:opacity-40 ${
                      errors.subZoba ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  >
                    <option value="">{t('examinationForm.locationCard.subZoba.button')}</option>
                    {selectedZoba && subZobas[selectedZoba].map(s => (
                      <option key={s.value} value={s.value}>{s.title}</option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Local District */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.localDistrict')}
              </label>
              <Controller
                control={control}
                name="localDistrict"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="Enter Local District"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.localDistrict ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* Longitude */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.longitude')}
              </label>
              <Controller
                control={control}
                name="longitude"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="0.00"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.longitude ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* Latitude */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.latitude')}
              </label>
              <Controller
                control={control}
                name="latitude"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="0.00"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.latitude ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.address')}
              </label>
              <Controller
                control={control}
                name="address"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="Full Clinical Address"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.address ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Vital Signs Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Activity className="h-5 w-5" />
            <h3 className="font-bold text-foreground">{t('examinationForm.vitalsCard.title')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2">
            {/* Temperature */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.temperature')} (°C)
              </label>
              <Controller
                control={control}
                name="temperature"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="36.5"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.temperature ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* BP Systolic */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.bloodPressureSystolic')} (mmHg)
              </label>
              <Controller
                control={control}
                name="bloodPressureSystolic"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="120"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.bloodPressureSystolic ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* BP Diastolic */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.bloodPressureDiastolic')} (mmHg)
              </label>
              <Controller
                control={control}
                name="bloodPressureDiastolic"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="80"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.bloodPressureDiastolic ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* Heart Rate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.heartRate')} (bpm)
              </label>
              <Controller
                control={control}
                name="heartRate"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="75"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.heartRate ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* Respiratory Rate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.respiratoryRate')} (breath/min)
              </label>
              <Controller
                control={control}
                name="respiratoryRate"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="16"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.respiratoryRate ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* Oxygen Saturation */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.oxygenSaturation')} (%)
              </label>
              <Controller
                control={control}
                name="oxygenSaturation"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="98"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.oxygenSaturation ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>

            {/* Blood Sugar */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.bloodSugar')} (mg/dl)
              </label>
              <Controller
                control={control}
                name="bloodSugar"
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="95"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.bloodSugar ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Symptoms Checklist Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldAlert className="h-5 w-5" />
            <h3 className="font-bold text-foreground">{t('examinationForm.currentCondition.title')}</h3>
          </div>

          <div className="space-y-6 pt-2">
            {symptomGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
                <h4 className="text-sm font-semibold text-primary mb-3">{group.title}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.symptoms.map((symp) => (
                    <Controller
                      key={symp.key}
                      control={control}
                      name={symp.key}
                      render={({ field: { onChange, value } }) => (
                        <label className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          value 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                            : 'bg-background/20 border-border/80 text-muted-foreground hover:border-border'
                        }`}>
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => onChange(e.target.checked)}
                            className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary focus:ring-offset-slate-950"
                          />
                          <span className="select-none">{symp.label}</span>
                        </label>
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Form */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || (mode === 'edit' && !isDirty)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary transition-all shadow-lg shadow-primary/20"
          >
            {isSubmitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>{isSubmitting ? t('personalInfo.isSubmitting') : t('personalInfo.submit')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default ExaminationForm;
