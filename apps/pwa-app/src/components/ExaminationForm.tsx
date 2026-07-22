import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { EIdType, ICD10_CODES, IICD10Entry } from '@afiyet/shared';
import { useExaminationService } from '../services/examination.service.ts';
import { zobas, subZobas, EZoba } from './zobas.ts';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Activity,
  ShieldAlert,
  Scale,
  FlaskConical,
  Stethoscope,
  Baby,
  Camera,
  X,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ClinicalAiGuideModal } from './ClinicalAiGuideModal';

interface ExaminationFormProps {
  mode: 'create' | 'edit';
  patientId: string;
  idType: EIdType;
  examinationId?: string;
  examinationFormData?: any;
}

interface ExaminationFormValues {
  zoba: string;
  subZoba: string;
  localDistrict: string;
  longitude: string;
  latitude: string;
  address: string;

  temperature: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  heartRate: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  bloodSugar: string;

  weight: string;
  height: string;
  bmi: string;
  muac: string;
  painScale: number;
  dehydrationLevel: string;
  consciousnessLevel: string;

  rapidTests: {
    malariaRdt: { performed: boolean; result: string; parasiteType: string };
    hivTest: { performed: boolean; result: string };
    hbvTest: { performed: boolean; result: string };
    hcvTest: { performed: boolean; result: string };
    urineDipstick: {
      performed: boolean;
      glucose: string;
      protein: string;
      blood: string;
      leukocytes: string;
      nitrites: string;
      ketones: string;
    };
    pregnancyTest: { performed: boolean; result: string };
    hemoglobin: { performed: boolean; value: string | number };
    bloodTyping: { performed: boolean; type: string };
  };

  clinicalAssessment: {
    chiefComplaint: string;
    clinicalNotes: string;
    provisionalDiagnosis: string[];
    icdCodes: string[];
    severity: string;
    treatmentGiven: string;
    prescriptions: string[];
    referralNeeded: boolean;
    referralFacility: string;
    referralReason: string;
    followUpDate: string;
    followUpNotes: string;
  };

  reproductiveHealth: {
    isPregnant: boolean;
    breastfeedingStatus: string;
    lastMenstrualPeriod: string;
    gestationalWeeks: string | number;
    fetalHeartRate: string | number;
    fundalHeight: string | number;
  };

  notes: string;
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
}

// ----------------------------------------------------
// LOCAL HELPER COMPONENT: SIMPLE TAG INPUT
// ----------------------------------------------------
interface SimpleTagInputProps {
  value: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}

const SimpleTagInput: React.FC<SimpleTagInputProps> = ({ value = [], onChange, placeholder }) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputVal('');
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(value.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-background/50 border border-border/80 rounded-xl">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 border border-sky-500/20 text-primary text-xs rounded"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="hover:text-red-400 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 bg-secondary hover:bg-slate-700 border border-border rounded-xl text-xs font-semibold text-foreground transition-all"
        >
          Add
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// LOCAL HELPER COMPONENT: SEARCHABLE ICD-10 INPUT
// ----------------------------------------------------
interface ICD10SearchProps {
  value: string[];
  onChange: (val: string[]) => void;
}

const ICD10Search: React.FC<ICD10SearchProps> = ({ value = [], onChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IICD10Entry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const lower = trimmed.toLowerCase();
    const filtered = ICD10_CODES.filter(
      (entry) =>
        entry.code.toLowerCase().includes(lower) ||
        entry.description.toLowerCase().includes(lower)
    ).slice(0, 10);
    setResults(filtered);
  }, [query]);

  const handleSelect = (entry: IICD10Entry) => {
    const codeStr = `${entry.code} - ${entry.description}`;
    if (!value.includes(codeStr)) {
      onChange([...value, codeStr]);
    }
    setQuery('');
    setShowDropdown(false);
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(value.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2 relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-background/50 border border-border/80 rounded-xl">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="hover:text-red-400 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Search ICD-10 by code or description..."
        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
      />

      {showDropdown && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-2xl z-30 max-h-60 overflow-y-auto">
          {results.map((entry) => (
            <button
              key={entry.code}
              type="button"
              onClick={() => handleSelect(entry)}
              className="w-full text-left px-4 py-2 text-xs hover:bg-secondary text-foreground border-b border-border/40 last:border-b-0"
            >
              <span className="font-bold text-primary mr-2">{entry.code}</span>
              <span>{entry.description}</span>
              <span className="text-[10px] text-muted-foreground block font-light">
                {entry.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const [isAiGuideOpen, setIsAiGuideOpen] = useState(false);

  // Camera states for clinical photo capture
  const [showCamera, setShowCamera] = useState(false);
  const [photoLabel, setPhotoLabel] = useState('');
  const [clinicalPhotos, setClinicalPhotos] = useState<any[]>(
    examinationFormData?.clinicalPhotos || []
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check browser permissions.');
      setShowCamera(false);
    }
  };

  const captureAndCompressPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // Target 640x640 square crop
      const size = Math.min(video.videoWidth, video.videoHeight) || 480;
      canvas.width = 640;
      canvas.height = 640;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 640, 640);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality compression
        
        setClinicalPhotos([
          ...clinicalPhotos,
          {
            base64: dataUrl,
            label: photoLabel.trim() || undefined,
            capturedAt: new Date().toISOString(),
          },
        ]);
        
        setPhotoLabel('');
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const removePhoto = (index: number) => {
    setClinicalPhotos(clinicalPhotos.filter((_, i) => i !== index));
  };

  // Form State Setup
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ExaminationFormValues>({
    defaultValues:
      mode === 'edit' && examinationFormData
        ? {
            ...examinationFormData,
            weight: examinationFormData.weight || '',
            height: examinationFormData.height || '',
            bmi: examinationFormData.bmi || '',
            muac: examinationFormData.muac || '',
            painScale: examinationFormData.painScale ?? 0,
            dehydrationLevel: examinationFormData.dehydrationLevel || 'none',
            consciousnessLevel: examinationFormData.consciousnessLevel || 'alert',
            // Rapid tests mapping
            rapidTests: {
              malariaRdt: { performed: false, result: 'negative', parasiteType: 'unknown', ...examinationFormData.rapidTests?.malariaRdt },
              hivTest: { performed: false, result: 'non_reactive', ...examinationFormData.rapidTests?.hivTest },
              hbvTest: { performed: false, result: 'negative', ...examinationFormData.rapidTests?.hbvTest },
              hcvTest: { performed: false, result: 'negative', ...examinationFormData.rapidTests?.hcvTest },
              urineDipstick: { performed: false, glucose: 'negative', protein: 'negative', blood: 'negative', leukocytes: 'negative', nitrites: 'negative', ketones: 'negative', ...examinationFormData.rapidTests?.urineDipstick },
              pregnancyTest: { performed: false, result: 'negative', ...examinationFormData.rapidTests?.pregnancyTest },
              hemoglobin: { performed: false, value: '', ...examinationFormData.rapidTests?.hemoglobin },
              bloodTyping: { performed: false, type: 'unknown', ...examinationFormData.rapidTests?.bloodTyping },
            },
            // Clinical assessment mapping
            clinicalAssessment: {
              chiefComplaint: '',
              clinicalNotes: '',
              provisionalDiagnosis: [],
              icdCodes: [],
              severity: 'mild',
              treatmentGiven: '',
              prescriptions: [],
              referralNeeded: false,
              referralFacility: '',
              referralReason: '',
              followUpDate: '',
              followUpNotes: '',
              ...examinationFormData.clinicalAssessment,
            },
            // Reproductive health mapping
            reproductiveHealth: {
              isPregnant: false,
              gestationalWeeks: '',
              lastMenstrualPeriod: '',
              fetalHeartRate: '',
              fundalHeight: '',
              breastfeedingStatus: 'not_applicable',
              ...examinationFormData.reproductiveHealth,
            },
          }
        : {
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
            // Symptoms
            hasFever: false,
            hasHeadache: false,
            hasDizziness: false,
            hasNausea: false,
            hasFatigue: false,
            hasWeightLoss: false,
            hasSweating: false,
            hasCough: false,
            hasShortnessOfBreath: false,
            hasSoreThroat: false,
            hasChestPain: false,
            hasVomiting: false,
            hasDiarrhea: false,
            hasStomachPain: false,
            hasConstipation: false,
            hasAppetiteLoss: false,
            hasMusclePain: false,
            hasJointPain: false,
            hasBackPain: false,
            hasNeckPain: false,
            hasNumbness: false,
            hasSeizures: false,
            hasDifficultySpeaking: false,
            hasRash: false,
            hasItching: false,
            hasBruising: false,
            hasPainfulUrination: false,
            hasFrequentUrination: false,
            hasBloodInUrine: false,
            hasEarPain: false,
            hasHearingLoss: false,
            hasNasalCongestion: false,
            hasRunnyNose: false,
            hasSneezing: false,
            hasEyePain: false,
            hasRedEye: false,
            hasBlurredVision: false,
            hasVisionLoss: false,
            // Extended Vitals
            weight: '',
            height: '',
            bmi: '',
            muac: '',
            painScale: 0,
            dehydrationLevel: 'none',
            consciousnessLevel: 'alert',
            // Rapid tests defaults
            rapidTests: {
              malariaRdt: { performed: false, result: 'negative', parasiteType: 'unknown' },
              hivTest: { performed: false, result: 'non_reactive' },
              hbvTest: { performed: false, result: 'negative' },
              hcvTest: { performed: false, result: 'negative' },
              urineDipstick: { performed: false, glucose: 'negative', protein: 'negative', blood: 'negative', leukocytes: 'negative', nitrites: 'negative', ketones: 'negative' },
              pregnancyTest: { performed: false, result: 'negative' },
              hemoglobin: { performed: false, value: '' },
              bloodTyping: { performed: false, type: 'unknown' },
            },
            // Clinical assessment defaults
            clinicalAssessment: {
              chiefComplaint: '',
              clinicalNotes: '',
              provisionalDiagnosis: [],
              icdCodes: [],
              severity: 'mild',
              treatmentGiven: '',
              prescriptions: [],
              referralNeeded: false,
              referralFacility: '',
              referralReason: '',
              followUpDate: '',
              followUpNotes: '',
            },
            // Reproductive Health defaults
            reproductiveHealth: {
              isPregnant: false,
              gestationalWeeks: '',
              lastMenstrualPeriod: '',
              fetalHeartRate: '',
              fundalHeight: '',
              breastfeedingStatus: 'not_applicable',
            },
          },
  });

  const weight = watch('weight');
  const height = watch('height');
  const painScale = watch('painScale');
  const bpSystolic = watch('bloodPressureSystolic');
  const referralNeeded = watch('clinicalAssessment.referralNeeded');
  const repIsPregnant = watch('reproductiveHealth.isPregnant');

  // Watch individual test performed triggers to show sub-forms
  const malariaPerformed = watch('rapidTests.malariaRdt.performed');
  const malariaResult = watch('rapidTests.malariaRdt.result');
  const hivPerformed = watch('rapidTests.hivTest.performed');
  const hbvPerformed = watch('rapidTests.hbvTest.performed');
  const hcvPerformed = watch('rapidTests.hcvTest.performed');
  const urinePerformed = watch('rapidTests.urineDipstick.performed');
  const pregPerformed = watch('rapidTests.pregnancyTest.performed');
  const hemoPerformed = watch('rapidTests.hemoglobin.performed');
  const bloodTypingPerformed = watch('rapidTests.bloodTyping.performed');

  // Auto-calculate BMI
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (w > 0 && h > 0) {
      const calculatedBmi = (w / Math.pow(h / 100, 2)).toFixed(1);
      setValue('bmi', calculatedBmi);
    } else {
      setValue('bmi', '');
    }
  }, [weight, height, setValue]);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      const tempNum = parseFloat(data.temperature);
      const bpSystolicNum = parseInt(data.bloodPressureSystolic, 10);
      const bpDiastolicNum = parseInt(data.bloodPressureDiastolic, 10);
      const hrNum = parseInt(data.heartRate, 10);
      const o2Num = parseInt(data.oxygenSaturation, 10);

      const payload = {
        ...data,
        clinicalPhotos,
        // Flat vitals backup for older displays
        weight: data.weight || undefined,
        height: data.height || undefined,
        bmi: data.bmi || undefined,
        muac: data.muac || undefined,
        painScale: data.painScale,
        dehydrationLevel: data.dehydrationLevel,
        consciousnessLevel: data.consciousnessLevel,

        // Structure it to strictly align with packages/shared/src/schemas/examination.schema.ts
        vitals: {
          temperature: isNaN(tempNum) ? 37 : tempNum,
          bloodPressure: {
            systolic: isNaN(bpSystolicNum) ? 120 : bpSystolicNum,
            diastolic: isNaN(bpDiastolicNum) ? 80 : bpDiastolicNum,
          },
          heartRate: isNaN(hrNum) ? 75 : hrNum,
          oxygenSaturation: isNaN(o2Num) ? 98 : o2Num,
          weight: data.weight ? parseFloat(data.weight) : undefined,
          height: data.height ? parseFloat(data.height) : undefined,
          bmi: data.bmi ? parseFloat(data.bmi) : undefined,
          muac: data.muac ? parseFloat(data.muac) : undefined,
          painScale: parseInt(data.painScale, 10),
          dehydrationLevel: data.dehydrationLevel,
          consciousnessLevel: data.consciousnessLevel,
        },
      };

      if (mode === 'create') {
        await createExamination(payload);
      } else if (mode === 'edit' && examinationId) {
        await updateExamination(examinationId, payload);
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
          type="button"
          onClick={() => navigate({ to: `/patients/${patientId}/visits` })}
          className="p-2 rounded-lg bg-secondary hover:bg-slate-700 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === 'create' ? t('examinationForm.formTitle') : 'Update Visit Records'}
          </h2>
          <span className="text-xs text-muted-foreground">Clinical Vitals, Outbreak Screening & Assessment</span>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* 1. Location Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            <h3 className="font-bold text-foreground">{t('examinationForm.locationCard.title')}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('examinationForm.locationCard.description')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.zoba.label')} <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="zoba"
                rules={{ required: t('validation.zobaRequired') }}
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={(e) => {
                      const v = e.target.value as EZoba;
                      onChange(v);
                      setSelectedZoba(v);
                      setValue('subZoba', '');
                    }}
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.zoba ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  >
                    <option value="">{t('examinationForm.locationCard.zoba.button')}</option>
                    {zobas.map((z) => (
                      <option key={z.value} value={z.value}>
                        {z.title}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.zoba && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.zoba.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.subZoba.label')} <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="subZoba"
                rules={{ required: t('validation.subZobaRequired') }}
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
                    {selectedZoba &&
                      subZobas[selectedZoba].map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.title}
                        </option>
                      ))}
                  </select>
                )}
              />
              {errors.subZoba && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.subZoba.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.localDistrict')} <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="localDistrict"
                rules={{ required: t('validation.districtRequired') }}
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
              {errors.localDistrict && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.localDistrict.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.longitude')} <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="longitude"
                rules={{
                  required: t('validation.longitudeRequired'),
                  pattern: { value: /^-?\d+(\.\d+)?$/, message: t('validation.coordinateFormat') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="e.g. 38.92"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.longitude ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.longitude && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.longitude.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.latitude')} <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="latitude"
                rules={{
                  required: t('validation.latitudeRequired'),
                  pattern: { value: /^-?\d+(\.\d+)?$/, message: t('validation.coordinateFormat') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="e.g. 15.33"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.latitude ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.latitude && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.latitude.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.locationCard.address')} <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="address"
                rules={{ required: t('validation.addressRequired') }}
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
              {errors.address && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.address.message}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Vital Signs Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Activity className="h-5 w-5" />
            <h3 className="font-bold text-foreground">{t('examinationForm.vitalsCard.title')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.temperature')} (°C) <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="temperature"
                rules={{
                  required: t('validation.temperatureRequired'),
                  validate: {
                    min: (v) => !v || parseFloat(v as any) >= 30 || t('validation.temperatureMin'),
                    max: (v) => !v || parseFloat(v as any) <= 45 || t('validation.temperatureMax'),
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value ?? ''}
                    placeholder="36.5"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.temperature ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.temperature && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.temperature.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                BP Systolic (mmHg) <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="bloodPressureSystolic"
                rules={{
                  required: t('validation.bpSystolicRequired'),
                  min: { value: 50, message: t('validation.bpSystolicMin') },
                  max: { value: 250, message: t('validation.bpSystolicMax') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="50"
                    max="250"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="120"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.bloodPressureSystolic ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.bloodPressureSystolic && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.bloodPressureSystolic.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                BP Diastolic (mmHg) <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="bloodPressureDiastolic"
                rules={{
                  required: t('validation.bpDiastolicRequired'),
                  min: { value: 30, message: t('validation.bpDiastolicMin') },
                  max: { value: 150, message: t('validation.bpDiastolicMax') },
                  validate: (val) => {
                    if (val && bpSystolic && parseInt(val, 10) >= parseInt(bpSystolic, 10)) {
                      return t('validation.bpDiastolicLimit');
                    }
                    return true;
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="30"
                    max="150"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="80"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.bloodPressureDiastolic ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.bloodPressureDiastolic && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.bloodPressureDiastolic.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.heartRate')} (bpm) <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="heartRate"
                rules={{
                  required: t('validation.heartRateRequired'),
                  min: { value: 30, message: t('validation.heartRateMin') },
                  max: { value: 220, message: t('validation.heartRateMax') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="30"
                    max="220"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="75"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.heartRate ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.heartRate && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.heartRate.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Respiratory Rate (breaths/min) <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="respiratoryRate"
                rules={{
                  required: t('validation.respiratoryRateRequired'),
                  min: { value: 5, message: t('validation.respiratoryRateMin') },
                  max: { value: 60, message: t('validation.respiratoryRateMax') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="5"
                    max="60"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="16"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.respiratoryRate ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.respiratoryRate && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.respiratoryRate.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Oxygen Saturation (%) <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="oxygenSaturation"
                rules={{
                  required: t('validation.spo2Required'),
                  min: { value: 50, message: t('validation.spo2Min') },
                  max: { value: 100, message: t('validation.spo2Max') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="50"
                    max="100"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="98"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.oxygenSaturation ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.oxygenSaturation && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.oxygenSaturation.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('examinationForm.vitalsCard.bloodSugar')} (mg/dL) <span className="text-red-500 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="bloodSugar"
                rules={{
                  required: t('validation.bloodSugarRequired'),
                  validate: {
                    min: (v) => !v || parseInt(v as any, 10) >= 20 || t('validation.bloodSugarMin'),
                    max: (v) => !v || parseInt(v as any, 10) <= 600 || t('validation.bloodSugarMax'),
                  }
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="20"
                    max="600"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value ?? ''}
                    placeholder="95"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.bloodSugar ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.bloodSugar && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.bloodSugar.message}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Extended Vitals Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Scale className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Extended Vitals & Measurements</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Weight (kg)
              </label>
              <Controller
                control={control}
                name="weight"
                rules={{
                  min: { value: 0.5, message: t('validation.weightMin') },
                  max: { value: 300, message: t('validation.weightMax') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="300"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="e.g. 70"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.weight ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.weight && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.weight.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Height (cm)
              </label>
              <Controller
                control={control}
                name="height"
                rules={{
                  min: { value: 20, message: t('validation.heightMin') },
                  max: { value: 250, message: t('validation.heightMax') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="20"
                    max="250"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="e.g. 175"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.height ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.height && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.height.message}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                BMI (Auto)
              </label>
              <Controller
                control={control}
                name="bmi"
                render={({ field: { value } }) => (
                  <input
                    type="text"
                    readOnly
                    value={value || ''}
                    placeholder="-"
                    className="bg-background/40 border border-border/50 rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed outline-none"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                MUAC (cm) — Malnutrition Screen
              </label>
              <Controller
                control={control}
                name="muac"
                rules={{
                  min: { value: 5, message: t('validation.muacMin') },
                  max: { value: 40, message: t('validation.muacMax') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="40"
                    onBlur={onBlur}
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    placeholder="e.g. 23"
                    className={`bg-background border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.muac ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.muac && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.muac.message}</span>
                </span>
              )}
            </div>

            {/* Pain Scale (0-10 Slider) */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex justify-between">
                <span>Pain Scale (0-10)</span>
                <span className="font-bold text-primary">{painScale ?? 0}</span>
              </label>
              <Controller
                control={control}
                name="painScale"
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-xs text-emerald-400">None</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={value ?? 0}
                      onChange={(e) => onChange(parseInt(e.target.value, 10))}
                      className="flex-1 accent-primary bg-secondary h-2 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-red-500">Severe</span>
                  </div>
                )}
              />
            </div>

            {/* Dehydration Level */}
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Dehydration Level
              </label>
              <Controller
                control={control}
                name="dehydrationLevel"
                render={({ field: { onChange, value } }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {['none', 'mild', 'moderate', 'severe'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onChange(level)}
                        className={`py-2 px-1 text-[10px] font-semibold border rounded-lg transition-all capitalize ${
                          value === level
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'border-border bg-background/20 text-muted-foreground'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Consciousness (AVPU) */}
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Consciousness Level (AVPU)
              </label>
              <Controller
                control={control}
                name="consciousnessLevel"
                render={({ field: { onChange, value } }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'alert', label: 'Alert' },
                      { key: 'verbal', label: 'Verbal' },
                      { key: 'pain', label: 'Pain' },
                      { key: 'unresponsive', label: 'Unres.' },
                    ].map((avpu) => (
                      <button
                        key={avpu.key}
                        type="button"
                        onClick={() => onChange(avpu.key)}
                        className={`py-2 px-1 text-[10px] font-semibold border rounded-lg transition-all ${
                          value === avpu.key
                            ? 'bg-red-500/10 border-red-500/40 text-red-400'
                            : 'border-border bg-background/20 text-muted-foreground'
                        }`}
                      >
                        {avpu.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        </div>

        {/* 4. Symptoms Checklist Section */}
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
                      name={symp.key as any}
                      render={({ field: { onChange, value } }) => (
                        <label
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                            value
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                              : 'bg-background/20 border-border/80 text-muted-foreground hover:border-border'
                          }`}
                        >
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

        {/* 5. Rapid Test Results Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-purple-400">
            <FlaskConical className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Rapid Test Results (Portable Kits)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Malaria Test Card */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground">Malaria RDT</span>
                <Controller
                  control={control}
                  name="rapidTests.malariaRdt.performed"
                  render={({ field: { onChange, value } }) => (
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                      />
                      <span>Performed</span>
                    </label>
                  )}
                />
              </div>
              {malariaPerformed && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Result</span>
                    <Controller
                      control={control}
                      name="rapidTests.malariaRdt.result"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="positive">Positive</option>
                          <option value="invalid">Invalid</option>
                        </select>
                      )}
                    />
                  </div>
                  {malariaResult === 'positive' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Species</span>
                      <Controller
                        control={control}
                        name="rapidTests.malariaRdt.parasiteType"
                        render={({ field: { onChange, value } }) => (
                          <select
                            value={value || 'unknown'}
                            onChange={onChange}
                            className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                          >
                            <option value="p_falciparum">P. falciparum</option>
                            <option value="p_vivax">P. vivax</option>
                            <option value="mixed">Mixed</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* HIV Test Card */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground">HIV Screening RDT</span>
                <Controller
                  control={control}
                  name="rapidTests.hivTest.performed"
                  render={({ field: { onChange, value } }) => (
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                      />
                      <span>Performed</span>
                    </label>
                  )}
                />
              </div>
              {hivPerformed && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Result</span>
                  <Controller
                    control={control}
                    name="rapidTests.hivTest.result"
                    render={({ field: { onChange, value } }) => (
                      <select
                        value={value || 'non_reactive'}
                        onChange={onChange}
                        className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                      >
                        <option value="non_reactive">Non-Reactive</option>
                        <option value="reactive">Reactive (Ref. Central)</option>
                        <option value="indeterminate">Indeterminate</option>
                      </select>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Hepatitis B & C */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground">Hep B & Hep C (HBV/HCV)</span>
                <div className="flex gap-3">
                  <Controller
                    control={control}
                    name="rapidTests.hbvTest.performed"
                    render={({ field: { onChange, value } }) => (
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => onChange(e.target.checked)}
                          className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                        />
                        <span>HBV</span>
                      </label>
                    )}
                  />
                  <Controller
                    control={control}
                    name="rapidTests.hcvTest.performed"
                    render={({ field: { onChange, value } }) => (
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => onChange(e.target.checked)}
                          className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                        />
                        <span>HCV</span>
                      </label>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {hbvPerformed && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">HBV Result</span>
                    <Controller
                      control={control}
                      name="rapidTests.hbvTest.result"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="positive">Positive</option>
                        </select>
                      )}
                    />
                  </div>
                )}
                {hcvPerformed && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">HCV Result</span>
                    <Controller
                      control={control}
                      name="rapidTests.hcvTest.result"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="positive">Positive</option>
                        </select>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Pregnancy Test Card */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground">hCG Pregnancy Test</span>
                <Controller
                  control={control}
                  name="rapidTests.pregnancyTest.performed"
                  render={({ field: { onChange, value } }) => (
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                      />
                      <span>Performed</span>
                    </label>
                  )}
                />
              </div>
              {pregPerformed && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">Result</span>
                  <Controller
                    control={control}
                    name="rapidTests.pregnancyTest.result"
                    render={({ field: { onChange, value } }) => (
                      <select
                        value={value || 'negative'}
                        onChange={onChange}
                        className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                      >
                        <option value="negative">Negative</option>
                        <option value="positive">Positive</option>
                        <option value="invalid">Invalid</option>
                      </select>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Hemoglobin & Blood Typing */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground">Hemoglobin & Typing</span>
                <div className="flex gap-3">
                  <Controller
                    control={control}
                    name="rapidTests.hemoglobin.performed"
                    render={({ field: { onChange, value } }) => (
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => onChange(e.target.checked)}
                          className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                        />
                        <span>Hemoglobin</span>
                      </label>
                    )}
                  />
                  <Controller
                    control={control}
                    name="rapidTests.bloodTyping.performed"
                    render={({ field: { onChange, value } }) => (
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => onChange(e.target.checked)}
                          className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                        />
                        <span>Typing</span>
                      </label>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {hemoPerformed && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Hb Value (g/dL)</span>
                    <Controller
                      control={control}
                      name="rapidTests.hemoglobin.value"
                      rules={{
                        required: t('validation.hbRequired'),
                        min: { value: 1, message: t('validation.hbMin') },
                        max: { value: 25, message: t('validation.hbMax') },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="25"
                          onBlur={onBlur}
                          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={value ?? ''}
                          placeholder="e.g. 13.5"
                          className={`bg-background border rounded-lg p-1 text-xs text-foreground focus:outline-none transition-all ${
                            errors.rapidTests?.hemoglobin?.value ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                          }`}
                        />
                      )}
                    />
                    {errors.rapidTests?.hemoglobin?.value && (
                      <span className="text-[9px] text-red-400 mt-0.5 flex items-center gap-0.5">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{errors.rapidTests.hemoglobin.value.message}</span>
                      </span>
                    )}
                  </div>
                )}
                {bloodTypingPerformed && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Blood Group</span>
                    <Controller
                      control={control}
                      name="rapidTests.bloodTyping.type"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'unknown'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="unknown">Unknown</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Urine Dipstick Card */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground">Urine Dipstick (10-Parameter)</span>
                <Controller
                  control={control}
                  name="rapidTests.urineDipstick.performed"
                  render={({ field: { onChange, value } }) => (
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-3.5 w-3.5 rounded bg-secondary text-primary border-border focus:ring-0"
                      />
                      <span>Performed</span>
                    </label>
                  )}
                />
              </div>
              {urinePerformed && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
                  {/* Glucose */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Glucose</span>
                    <Controller
                      control={control}
                      name="rapidTests.urineDipstick.glucose"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1 text-[10px] text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="trace">Trace</option>
                          <option value="1+">1+</option>
                          <option value="2+">2+</option>
                          <option value="3+">3+</option>
                          <option value="4+">4+</option>
                        </select>
                      )}
                    />
                  </div>
                  {/* Protein */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Protein</span>
                    <Controller
                      control={control}
                      name="rapidTests.urineDipstick.protein"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1 text-[10px] text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="trace">Trace</option>
                          <option value="1+">1+</option>
                          <option value="2+">2+</option>
                          <option value="3+">3+</option>
                          <option value="4+">4+</option>
                        </select>
                      )}
                    />
                  </div>
                  {/* Blood */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Blood</span>
                    <Controller
                      control={control}
                      name="rapidTests.urineDipstick.blood"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1 text-[10px] text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="trace">Trace</option>
                          <option value="1+">1+</option>
                          <option value="2+">2+</option>
                          <option value="3+">3+</option>
                        </select>
                      )}
                    />
                  </div>
                  {/* Leukocytes */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Leukocytes</span>
                    <Controller
                      control={control}
                      name="rapidTests.urineDipstick.leukocytes"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1 text-[10px] text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="trace">Trace</option>
                          <option value="1+">1+</option>
                          <option value="2+">2+</option>
                          <option value="3+">3+</option>
                        </select>
                      )}
                    />
                  </div>
                  {/* Nitrites */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Nitrites</span>
                    <Controller
                      control={control}
                      name="rapidTests.urineDipstick.nitrites"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1 text-[10px] text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="positive">Positive</option>
                        </select>
                      )}
                    />
                  </div>
                  {/* Ketones */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold">Ketones</span>
                    <Controller
                      control={control}
                      name="rapidTests.urineDipstick.ketones"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1 text-[10px] text-foreground focus:outline-none"
                        >
                          <option value="negative">Negative</option>
                          <option value="trace">Trace</option>
                          <option value="1+">1+</option>
                          <option value="2+">2+</option>
                          <option value="3+">3+</option>
                        </select>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6. Clinical Assessment Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between gap-2 text-blue-400">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <h3 className="font-bold text-foreground">Clinical Assessment & Diagnosis</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAiGuideOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-semibold transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              Get AI Guidance
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Chief Complaint */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Chief Complaint
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.chiefComplaint"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value || ''}
                    placeholder="Primary reason for seeking care..."
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>

            {/* Clinical Notes */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Clinical Examination Notes
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.clinicalNotes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <textarea
                    rows={4}
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value || ''}
                    placeholder="Observations, signs, cardiovascular/pulmonary sounds..."
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>

            {/* Provisional Diagnosis */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Provisional Diagnosis (Symptoms / Syndromes)
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.provisionalDiagnosis"
                render={({ field: { onChange, value } }) => (
                  <SimpleTagInput
                    value={value || []}
                    onChange={onChange}
                    placeholder="Add diagnosis..."
                  />
                )}
              />
            </div>

            {/* ICD-10 Search & Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                ICD-10 Disease Classification (Offline Lookup)
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.icdCodes"
                render={({ field: { onChange, value } }) => (
                  <ICD10Search value={value || []} onChange={onChange} />
                )}
              />
            </div>

            {/* Severity Level */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Condition Severity
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.severity"
                render={({ field: { onChange, value } }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'mild', label: 'Mild', color: 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10' },
                      { key: 'moderate', label: 'Moderate', color: 'border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10' },
                      { key: 'severe', label: 'Severe', color: 'border-orange-500/20 text-orange-400 hover:bg-orange-500/10' },
                      { key: 'critical', label: 'Critical', color: 'border-red-500/20 text-red-400 hover:bg-red-500/10' },
                    ].map((sev) => (
                      <button
                        key={sev.key}
                        type="button"
                        onClick={() => onChange(sev.key)}
                        className={`py-2.5 px-2 text-xs font-bold border rounded-xl transition-all ${
                          value === sev.key
                            ? sev.key === 'mild'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : sev.key === 'moderate'
                              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                              : sev.key === 'severe'
                              ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                              : 'bg-red-500/20 border-red-500 text-red-400'
                            : `border-border bg-background/20 text-muted-foreground ${sev.color}`
                        }`}
                      >
                        {sev.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Treatment & Prescriptions */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Immediate Treatment Given (Medication or Care)
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.treatmentGiven"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value || ''}
                    placeholder="e.g. Paracetamol 500mg PO, IV saline bolus..."
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Prescribed Medications
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.prescriptions"
                render={({ field: { onChange, value } }) => (
                  <SimpleTagInput
                    value={value || []}
                    onChange={onChange}
                    placeholder="Type prescription and press Enter (e.g. Coartem 20/120 1 tab PO BID x3d)..."
                  />
                )}
              />
            </div>

            {/* Referral Toggle */}
            <div className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 h-fit md:col-span-2">
              <Controller
                control={control}
                name="clinicalAssessment.referralNeeded"
                render={({ field: { onChange, value } }) => (
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => {
                      onChange(e.target.checked);
                      if (!e.target.checked) {
                        setValue('clinicalAssessment.referralFacility', '');
                        setValue('clinicalAssessment.referralReason', '');
                      }
                    }}
                    className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
                  />
                )}
              />
              <span className="text-sm font-semibold text-foreground">Patient Requires Referral to Secondary/Zonal Hospital</span>
            </div>

            {referralNeeded && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Referral Facility
                  </label>
                  <Controller
                    control={control}
                    name="clinicalAssessment.referralFacility"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <input
                        type="text"
                        onBlur={onBlur}
                        onChange={onChange}
                        value={value || ''}
                        placeholder="e.g. Keren Zonal Hospital"
                        className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Reason for Referral
                  </label>
                  <Controller
                    control={control}
                    name="clinicalAssessment.referralReason"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <input
                        type="text"
                        onBlur={onBlur}
                        onChange={onChange}
                        value={value || ''}
                        placeholder="e.g. Severe respiratory distress requiring oxygen/X-ray"
                        className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
                      />
                    )}
                  />
                </div>
              </>
            )}

            {/* Follow up */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Follow-up Visit Date
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.followUpDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="date"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value || ''}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Follow-up Instructions
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.followUpNotes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value || ''}
                    placeholder="e.g. Return if fever persists >48 hours..."
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* 7. Reproductive Health Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-pink-400">
            <Baby className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Reproductive Health (Maternal Monitoring)</h3>
          </div>
          <span className="text-[10px] text-muted-foreground block border-b border-border/40 pb-2">
            Applicable for female patients of childbearing age. Fill when relevant.
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Pregnancy Checkbox */}
            <div className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 h-fit">
              <Controller
                control={control}
                name="reproductiveHealth.isPregnant"
                render={({ field: { onChange, value } }) => (
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => {
                      onChange(e.target.checked);
                      if (!e.target.checked) {
                        setValue('reproductiveHealth.gestationalWeeks', '');
                        setValue('reproductiveHealth.fetalHeartRate', '');
                        setValue('reproductiveHealth.fundalHeight', '');
                      }
                    }}
                    className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
                  />
                )}
              />
              <span className="text-sm font-semibold text-foreground">Patient is Pregnant</span>
            </div>

            {/* Breastfeeding Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Lactation / Breastfeeding
              </label>
              <Controller
                control={control}
                name="reproductiveHealth.breastfeedingStatus"
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value || 'not_applicable'}
                    onChange={onChange}
                    className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none"
                  >
                    <option value="not_applicable">Not Applicable</option>
                    <option value="exclusive">Exclusive Breastfeeding</option>
                    <option value="mixed">Mixed Feeding</option>
                    <option value="none">No Breastfeeding</option>
                  </select>
                )}
              />
            </div>

            {/* LMP Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Last Menstrual Period (LMP)
              </label>
              <Controller
                control={control}
                name="reproductiveHealth.lastMenstrualPeriod"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="date"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value || ''}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
                  />
                )}
              />
            </div>

            {/* Gestational Weeks (if pregnant) */}
            {repIsPregnant && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Gestational Age (weeks)
                  </label>
                  <Controller
                    control={control}
                    name="reproductiveHealth.gestationalWeeks"
                    rules={{
                      min: { value: 0, message: t('validation.negativeLimit') },
                      max: { value: 45, message: t('validation.weeksLimit') },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <input
                        type="number"
                        min="0"
                        max="45"
                        onBlur={onBlur}
                        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        value={value ?? ''}
                        placeholder="e.g. 24"
                        className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                          errors.reproductiveHealth?.gestationalWeeks ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                        }`}
                      />
                    )}
                  />
                  {errors.reproductiveHealth?.gestationalWeeks && (
                    <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.reproductiveHealth.gestationalWeeks.message}</span>
                    </span>
                  )}
                </div>

                {/* Fetal Heart Rate */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Fetal Heart Rate (bpm) — Doppler
                  </label>
                  <Controller
                    control={control}
                    name="reproductiveHealth.fetalHeartRate"
                    rules={{
                      min: { value: 60, message: t('validation.fetalHeartRateMin') },
                      max: { value: 200, message: t('validation.fetalHeartRateMax') },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <input
                        type="number"
                        min="60"
                        max="200"
                        onBlur={onBlur}
                        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        value={value ?? ''}
                        placeholder="e.g. 145"
                        className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                          errors.reproductiveHealth?.fetalHeartRate ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                        }`}
                      />
                    )}
                  />
                  {errors.reproductiveHealth?.fetalHeartRate && (
                    <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.reproductiveHealth.fetalHeartRate.message}</span>
                    </span>
                  )}
                </div>

                {/* Fundal Height */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Symphysis-Fundal Height (cm)
                  </label>
                  <Controller
                    control={control}
                    name="reproductiveHealth.fundalHeight"
                    rules={{
                      min: { value: 0, message: t('validation.negativeLimit') },
                      max: { value: 50, message: t('validation.fundalHeightMax') },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <input
                        type="number"
                        min="0"
                        max="50"
                        onBlur={onBlur}
                        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        value={value ?? ''}
                        placeholder="e.g. 24"
                        className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                          errors.reproductiveHealth?.fundalHeight ? 'border-red-500/80 focus:ring-red-500' : 'border-border focus:border-primary'
                        }`}
                      />
                    )}
                  />
                  {errors.reproductiveHealth?.fundalHeight && (
                    <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.reproductiveHealth.fundalHeight.message}</span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 8. Clinical Photos Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <Camera className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Clinical Photography (Wounds, Lesions, Rash)</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Acquire and store encrypted local images of lesions, infections, or injuries for serial tracking.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={photoLabel}
                onChange={(e) => setPhotoLabel(e.target.value)}
                placeholder="Enter photo label (e.g. Right foot wound, left ear rash)..."
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
              />
              {!showCamera ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-secondary border border-border text-foreground hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Camera className="h-4 w-4" />
                  <span>Open Camera</span>
                </button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={captureAndCompressPhoto}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    Snap & Auto-Crop
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-secondary border border-border text-foreground hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {showCamera && (
              <div className="flex flex-col items-center gap-4 bg-background p-4 rounded-2xl border border-border">
                <video ref={videoRef} autoPlay playsInline className="h-60 w-80 rounded-xl bg-card object-cover border border-border" />
                <span className="text-[10px] text-muted-foreground animate-pulse">Position camera, then Snap to capture centered square crop</span>
              </div>
            )}

            {/* Horizontal gallery list */}
            {clinicalPhotos.length > 0 && (
              <div className="flex flex-wrap gap-4 p-4 bg-background/50 border border-border/80 rounded-xl overflow-x-auto">
                {clinicalPhotos.map((photo, idx) => (
                  <div key={idx} className="relative w-28 group shrink-0 border border-border rounded-xl p-1 bg-card">
                    <img
                      src={photo.base64}
                      alt={photo.label || 'Clinical Photo'}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <div className="p-1 text-[9px] text-muted-foreground font-semibold truncate">
                      {photo.label || 'Untagged Photo'}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-md"
                      title="Delete Photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      <ClinicalAiGuideModal
        isOpen={isAiGuideOpen}
        onClose={() => setIsAiGuideOpen(false)}
        examData={{
          patientId,
          vitals: {
            temperature: watch('vitals.temperature'),
            bloodPressure: `${watch('vitals.systolicBP') || ''}/${watch('vitals.diastolicBP') || ''}`,
            heartRate: watch('vitals.heartRate'),
            respiratoryRate: watch('vitals.respiratoryRate')
          },
          chiefComplaint: watch('clinicalAssessment.chiefComplaint'),
          notes: watch('clinicalAssessment.clinicalNotes')
        }}
      />
    </div>
  );
};

export default ExaminationForm;
