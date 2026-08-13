import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { EIdType, ICD10_CODES, IICD10Entry } from '@afiyet/shared';
import { useExaminationService } from '../services/examination.service.ts';
import { usePatientService } from '../services/patient.service.ts';
import { zobas, subZobas, EZoba } from './zobas.ts';
import { InfoButton } from './InfoButton.tsx';
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
  const { getPatientById } = usePatientService();
  const [patientDoc, setPatientDoc] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    if (patientId) {
      getPatientById(patientId)
        .then((p) => {
          if (isMounted && p) setPatientDoc(p);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [patientId, getPatientById]);

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

  const [activeExamId, setActiveExamId] = useState<string | undefined>(
    mode === 'edit' ? examinationId : undefined
  );
  const activeExamIdRef = useRef<string | undefined>(activeExamId);
  activeExamIdRef.current = activeExamId;

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutoSave = useCallback((data: any) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      const tempNum = parseFloat(data.temperature);
      const bpSystolicNum = parseInt(data.bloodPressureSystolic, 10);
      const bpDiastolicNum = parseInt(data.bloodPressureDiastolic, 10);
      const hrNum = parseInt(data.heartRate, 10);
      const o2Num = parseInt(data.oxygenSaturation, 10);

      const payload = {
        ...data,
        clinicalPhotos,
        weight: data.weight || undefined,
        height: data.height || undefined,
        bmi: data.bmi || undefined,
        muac: data.muac || undefined,
        painScale: data.painScale,
        dehydrationLevel: data.dehydrationLevel,
        consciousnessLevel: data.consciousnessLevel,
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

      try {
        if (!activeExamIdRef.current) {
          console.log('[Autosave] Creating examination draft...');
          const newExam = await createExamination(payload);
          setActiveExamId(newExam.examinationId);
        } else {
          console.log('[Autosave] Updating examination draft:', activeExamIdRef.current);
          await updateExamination(activeExamIdRef.current, payload);
        }
      } catch (error) {
        console.error('[Autosave] Error auto-saving examination:', error);
      }
    }, 1000);
  }, [createExamination, updateExamination, clinicalPhotos]);

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
            zoba: examinationFormData.zoba || 'MAEKEL',
            subZoba: examinationFormData.subZoba || 'BERIKH',
            localDistrict: examinationFormData.localDistrict || 'Clinic District',
            longitude: examinationFormData.longitude || '38.93',
            latitude: examinationFormData.latitude || '15.33',
            address: examinationFormData.address || 'Default Clinic Address',
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
            zoba: 'MAEKEL',
            subZoba: 'BERIKH',
            localDistrict: 'Clinic District',
            longitude: '38.93',
            latitude: '15.33',
            address: 'Default Clinic Address',
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

  const formValues = watch();

  useEffect(() => {
    const hasPhotos = clinicalPhotos.length > 0;
    const shouldSave = isDirty || hasPhotos;
    if (!shouldSave) return;

    triggerAutoSave(formValues);
  }, [formValues, clinicalPhotos, isDirty, triggerAutoSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

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

      if (!activeExamIdRef.current) {
        await createExamination(payload);
      } else {
        await updateExamination(activeExamIdRef.current, payload);
      }
      navigate({ to: `/patients/${patientId}/visits` });
    } catch (error) {
      console.error('[Examination Form] Error submitting examination:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFormError = (errors: any) => {
    console.log('[Examination Form] Form validation errors:', errors);
    window.dispatchEvent(
      new CustomEvent('afiyet_sync_toast', {
        detail: {
          type: 'error',
          message: t('validation.formHasErrors'),
        },
      })
    );
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
            {mode === 'create' ? t('examinationForm.formTitle') : t('examinationForm.formTitleEdit')}
          </h2>
          <span className="text-xs text-muted-foreground">{t('examinationForm.formSubtitle')}</span>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-8">

        {/* 2. Vital Signs Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Activity className="h-5 w-5" />
            <h3 className="font-bold text-foreground">{t('examinationForm.vitalsCard.title')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.vitalsCard.temperature')} (°C)</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
                <InfoButton translationKey="examinationForm.vitalsCard.temperatureInfo" label={t('examinationForm.vitalsCard.temperature')} />
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
                    placeholder={t('examinationForm.vitalsCard.temperaturePlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.vitalsCard.bpSystolic')} (mmHg)</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
                <InfoButton translationKey="examinationForm.vitalsCard.bpSystolicInfo" label={t('examinationForm.vitalsCard.bpSystolic')} />
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
                    placeholder={t('examinationForm.vitalsCard.bpSystolicPlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.vitalsCard.bpDiastolic')} (mmHg)</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
                <InfoButton translationKey="examinationForm.vitalsCard.bpDiastolicInfo" label={t('examinationForm.vitalsCard.bpDiastolic')} />
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
                    placeholder={t('examinationForm.vitalsCard.bpDiastolicPlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.vitalsCard.heartRate')} (bpm)</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
                <InfoButton translationKey="examinationForm.vitalsCard.heartRateInfo" label={t('examinationForm.vitalsCard.heartRate')} />
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
                    placeholder={t('examinationForm.vitalsCard.heartRatePlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.vitalsCard.respiratoryRate')} (breaths/min)</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
                <InfoButton translationKey="examinationForm.vitalsCard.respiratoryRateInfo" label={t('examinationForm.vitalsCard.respiratoryRate')} />
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
                    placeholder={t('examinationForm.vitalsCard.respiratoryRatePlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.vitalsCard.spo2')} (%)</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
                <InfoButton translationKey="examinationForm.vitalsCard.spo2Info" label={t('examinationForm.vitalsCard.spo2')} />
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
                    placeholder={t('examinationForm.vitalsCard.spo2Placeholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.vitalsCard.bloodSugar')} (mg/dL)</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
                <InfoButton translationKey="examinationForm.vitalsCard.bloodSugarInfo" label={t('examinationForm.vitalsCard.bloodSugar')} />
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
                    placeholder={t('examinationForm.vitalsCard.bloodSugarPlaceholder')}
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
            <h3 className="font-bold text-foreground">{t('examinationForm.extendedVitalsCard.title')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.extendedVitalsCard.weight')} (kg)</span>
                <InfoButton translationKey="examinationForm.extendedVitalsCard.weightInfo" label={t('examinationForm.extendedVitalsCard.weight')} />
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
                    placeholder={t('examinationForm.extendedVitalsCard.weightPlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.extendedVitalsCard.height')} (cm)</span>
                <InfoButton translationKey="examinationForm.extendedVitalsCard.heightInfo" label={t('examinationForm.extendedVitalsCard.height')} />
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
                    placeholder={t('examinationForm.extendedVitalsCard.heightPlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.extendedVitalsCard.bmi')}</span>
                <InfoButton translationKey="examinationForm.extendedVitalsCard.bmiInfo" label={t('examinationForm.extendedVitalsCard.bmi')} />
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.extendedVitalsCard.muac')} (cm)</span>
                <InfoButton translationKey="examinationForm.extendedVitalsCard.muacInfo" label={t('examinationForm.extendedVitalsCard.muac')} />
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
                    placeholder={t('examinationForm.extendedVitalsCard.muacPlaceholder')}
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex justify-between items-center">
                <span className="flex items-center">
                  <span>{t('examinationForm.extendedVitalsCard.painScale')} (0-10)</span>
                  <InfoButton translationKey="examinationForm.extendedVitalsCard.painScaleInfo" label={t('examinationForm.extendedVitalsCard.painScale')} />
                </span>
                <span className="font-bold text-primary">{painScale ?? 0}</span>
              </label>
              <Controller
                control={control}
                name="painScale"
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-xs text-emerald-400">{t('examinationForm.extendedVitalsCard.painScaleLow')}</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={value ?? 0}
                      onChange={(e) => onChange(parseInt(e.target.value, 10))}
                      className="flex-1 accent-primary bg-secondary h-2 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-red-500">{t('examinationForm.extendedVitalsCard.painScaleHigh')}</span>
                  </div>
                )}
              />
            </div>

            {/* Dehydration Level */}
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.extendedVitalsCard.dehydration')}</span>
                <InfoButton translationKey="examinationForm.extendedVitalsCard.dehydrationInfo" label={t('examinationForm.extendedVitalsCard.dehydration')} />
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
                        {t('examinationForm.extendedVitalsCard.dehydrationLevels.' + level)}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Consciousness (AVPU) */}
            <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.extendedVitalsCard.consciousness')}</span>
                <InfoButton translationKey="examinationForm.extendedVitalsCard.consciousnessInfo" label={t('examinationForm.extendedVitalsCard.consciousness')} />
              </label>
              <Controller
                control={control}
                name="consciousnessLevel"
                render={({ field: { onChange, value } }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'alert', labelKey: 'alert' },
                      { key: 'verbal', labelKey: 'verbal' },
                      { key: 'pain', labelKey: 'pain' },
                      { key: 'unresponsive', labelKey: 'unresponsive' },
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
                        {t('examinationForm.extendedVitalsCard.avpu.' + avpu.labelKey)}
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
            <h3 className="font-bold text-foreground">{t('examinationForm.rapidTestsCard.title')}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Malaria Test Card */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center">
                  <span>{t('examinationForm.rapidTestsCard.malariaRdt')}</span>
                  <InfoButton translationKey="examinationForm.rapidTestsCard.malariaRdtInfo" label={t('examinationForm.rapidTestsCard.malariaRdt')} />
                </span>
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
                      <span>{t('examinationForm.rapidTestsCard.performed')}</span>
                    </label>
                  )}
                />
              </div>
              {malariaPerformed && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.result')}</span>
                    <Controller
                      control={control}
                      name="rapidTests.malariaRdt.result"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="negative">{t('examinationForm.rapidTestsCard.negative')}</option>
                          <option value="positive">{t('examinationForm.rapidTestsCard.positive')}</option>
                          <option value="invalid">{t('examinationForm.rapidTestsCard.invalid')}</option>
                        </select>
                      )}
                    />
                  </div>
                  {malariaResult === 'positive' && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.species')}</span>
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
                            <option value="unknown">{t('examinationForm.rapidTestsCard.unknown')}</option>
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
                <span className="text-xs font-bold text-foreground flex items-center">
                  <span>{t('examinationForm.rapidTestsCard.hivTest')}</span>
                  <InfoButton translationKey="examinationForm.rapidTestsCard.hivTestInfo" label={t('examinationForm.rapidTestsCard.hivTest')} />
                </span>
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
                      <span>{t('examinationForm.rapidTestsCard.performed')}</span>
                    </label>
                  )}
                />
              </div>
              {hivPerformed && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.result')}</span>
                  <Controller
                    control={control}
                    name="rapidTests.hivTest.result"
                    render={({ field: { onChange, value } }) => (
                      <select
                        value={value || 'non_reactive'}
                        onChange={onChange}
                        className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                      >
                        <option value="non_reactive">{t('examinationForm.rapidTestsCard.nonReactive')}</option>
                        <option value="reactive">{t('examinationForm.rapidTestsCard.reactive')}</option>
                        <option value="indeterminate">{t('examinationForm.rapidTestsCard.indeterminate')}</option>
                      </select>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Hepatitis B & C */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center">
                  <span>{t('examinationForm.rapidTestsCard.hbvHcvTest')}</span>
                  <InfoButton translationKey="examinationForm.rapidTestsCard.hbvHcvTestInfo" label={t('examinationForm.rapidTestsCard.hbvHcvTest')} />
                </span>
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
                        <span>{t('examinationForm.rapidTestsCard.hbv')}</span>
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
                        <span>{t('examinationForm.rapidTestsCard.hcv')}</span>
                      </label>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {hbvPerformed && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.hbv')} {t('examinationForm.rapidTestsCard.result')}</span>
                    <Controller
                      control={control}
                      name="rapidTests.hbvTest.result"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="negative">{t('examinationForm.rapidTestsCard.negative')}</option>
                          <option value="positive">{t('examinationForm.rapidTestsCard.positive')}</option>
                        </select>
                      )}
                    />
                  </div>
                )}
                {hcvPerformed && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.hcv')} {t('examinationForm.rapidTestsCard.result')}</span>
                    <Controller
                      control={control}
                      name="rapidTests.hcvTest.result"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'negative'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="negative">{t('examinationForm.rapidTestsCard.negative')}</option>
                          <option value="positive">{t('examinationForm.rapidTestsCard.positive')}</option>
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
                <span className="text-xs font-bold text-foreground flex items-center">
                  <span>{t('examinationForm.rapidTestsCard.pregnancyTest')}</span>
                  <InfoButton translationKey="examinationForm.rapidTestsCard.pregnancyTestInfo" label={t('examinationForm.rapidTestsCard.pregnancyTest')} />
                </span>
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
                      <span>{t('examinationForm.rapidTestsCard.performed')}</span>
                    </label>
                  )}
                />
              </div>
              {pregPerformed && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.result')}</span>
                  <Controller
                    control={control}
                    name="rapidTests.pregnancyTest.result"
                    render={({ field: { onChange, value } }) => (
                      <select
                        value={value || 'negative'}
                        onChange={onChange}
                        className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                      >
                        <option value="negative">{t('examinationForm.rapidTestsCard.negative')}</option>
                        <option value="positive">{t('examinationForm.rapidTestsCard.positive')}</option>
                        <option value="invalid">{t('examinationForm.rapidTestsCard.invalid')}</option>
                      </select>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Hemoglobin & Blood Typing */}
            <div className="bg-background/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center">
                  <span>{t('examinationForm.rapidTestsCard.hemoglobinTyping')}</span>
                  <InfoButton translationKey="examinationForm.rapidTestsCard.hemoglobinTypingInfo" label={t('examinationForm.rapidTestsCard.hemoglobinTyping')} />
                </span>
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
                        <span>{t('examinationForm.rapidTestsCard.hemoglobin')}</span>
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
                        <span>{t('examinationForm.rapidTestsCard.typing')}</span>
                      </label>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {hemoPerformed && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.hbValue')}</span>
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
                          placeholder={t('examinationForm.rapidTestsCard.hbValuePlaceholder')}
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
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">{t('examinationForm.rapidTestsCard.bloodGroup')}</span>
                    <Controller
                      control={control}
                      name="rapidTests.bloodTyping.type"
                      render={({ field: { onChange, value } }) => (
                        <select
                          value={value || 'unknown'}
                          onChange={onChange}
                          className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                        >
                          <option value="unknown">{t('examinationForm.rapidTestsCard.unknown')}</option>
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
                <span className="text-xs font-bold text-foreground flex items-center">
                  <span>{t('examinationForm.rapidTestsCard.urineDipstick')}</span>
                  <InfoButton translationKey="examinationForm.rapidTestsCard.urineDipstickInfo" label={t('examinationForm.rapidTestsCard.urineDipstick')} />
                </span>
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
                      <span>{t('examinationForm.rapidTestsCard.performed')}</span>
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
              <h3 className="font-bold text-foreground">{t('examinationForm.clinicalAssessmentCard.title')}</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAiGuideOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 text-xs font-semibold transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              {t('examinationForm.clinicalAssessmentCard.aiGuidance')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Chief Complaint */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.chiefComplaint')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.chiefComplaintInfo" label={t('examinationForm.clinicalAssessmentCard.chiefComplaint')} />
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
                    placeholder={t('examinationForm.clinicalAssessmentCard.chiefComplaintPlaceholder')}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>

            {/* Clinical Notes */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.clinicalNotes')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.clinicalNotesInfo" label={t('examinationForm.clinicalAssessmentCard.clinicalNotes')} />
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
                    placeholder={t('examinationForm.clinicalAssessmentCard.clinicalNotesPlaceholder')}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>

            {/* Provisional Diagnosis */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.provisionalDiagnosis')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.provisionalDiagnosisInfo" label={t('examinationForm.clinicalAssessmentCard.provisionalDiagnosis')} />
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.provisionalDiagnosis"
                render={({ field: { onChange, value } }) => (
                  <SimpleTagInput
                    value={value || []}
                    onChange={onChange}
                    placeholder={t('examinationForm.clinicalAssessmentCard.provisionalDiagnosisPlaceholder')}
                  />
                )}
              />
            </div>

            {/* ICD-10 Search & Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.icd10')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.icd10Info" label={t('examinationForm.clinicalAssessmentCard.icd10')} />
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.severity')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.severityInfo" label={t('examinationForm.clinicalAssessmentCard.severity')} />
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.severity"
                render={({ field: { onChange, value } }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'mild', labelKey: 'mild', color: 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10' },
                      { key: 'moderate', labelKey: 'moderate', color: 'border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10' },
                      { key: 'severe', labelKey: 'severe', color: 'border-orange-500/20 text-orange-400 hover:bg-orange-500/10' },
                      { key: 'critical', labelKey: 'critical', color: 'border-red-500/20 text-red-400 hover:bg-red-500/10' },
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
                        {t('examinationForm.clinicalAssessmentCard.severities.' + sev.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Treatment & Prescriptions */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.treatmentGiven')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.treatmentGivenInfo" label={t('examinationForm.clinicalAssessmentCard.treatmentGiven')} />
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
                    placeholder={t('examinationForm.clinicalAssessmentCard.treatmentGivenPlaceholder')}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.prescriptions')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.prescriptionsInfo" label={t('examinationForm.clinicalAssessmentCard.prescriptions')} />
              </label>
              <Controller
                control={control}
                name="clinicalAssessment.prescriptions"
                render={({ field: { onChange, value } }) => (
                  <SimpleTagInput
                    value={value || []}
                    onChange={onChange}
                    placeholder={t('examinationForm.clinicalAssessmentCard.prescriptionsPlaceholder')}
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
              <span className="text-sm font-semibold text-foreground flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.referralNeeded')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.referralNeededInfo" label={t('examinationForm.clinicalAssessmentCard.referralNeeded')} />
              </span>
            </div>

            {referralNeeded && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                    <span>{t('examinationForm.clinicalAssessmentCard.referralFacility')}</span>
                    <InfoButton translationKey="examinationForm.clinicalAssessmentCard.referralFacilityInfo" label={t('examinationForm.clinicalAssessmentCard.referralFacility')} />
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
                        placeholder={t('examinationForm.clinicalAssessmentCard.referralFacilityPlaceholder')}
                        className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
                      />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                    <span>{t('examinationForm.clinicalAssessmentCard.referralReason')}</span>
                    <InfoButton translationKey="examinationForm.clinicalAssessmentCard.referralReasonInfo" label={t('examinationForm.clinicalAssessmentCard.referralReason')} />
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
                        placeholder={t('examinationForm.clinicalAssessmentCard.referralReasonPlaceholder')}
                        className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
                      />
                    )}
                  />
                </div>
              </>
            )}

            {/* Follow up */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.followUpDate')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.followUpDateInfo" label={t('examinationForm.clinicalAssessmentCard.followUpDate')} />
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.clinicalAssessmentCard.followUpNotes')}</span>
                <InfoButton translationKey="examinationForm.clinicalAssessmentCard.followUpNotesInfo" label={t('examinationForm.clinicalAssessmentCard.followUpNotes')} />
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
                    placeholder={t('examinationForm.clinicalAssessmentCard.followUpNotesPlaceholder')}
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
            <h3 className="font-bold text-foreground">{t('examinationForm.reproductiveHealthCard.title')}</h3>
          </div>
          <span className="text-[10px] text-muted-foreground block border-b border-border/40 pb-2">
            {t('examinationForm.reproductiveHealthCard.subtitle')}
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
              <span className="text-sm font-semibold text-foreground flex items-center">
                <span>{t('examinationForm.reproductiveHealthCard.isPregnant')}</span>
                <InfoButton translationKey="examinationForm.reproductiveHealthCard.isPregnantInfo" label={t('examinationForm.reproductiveHealthCard.isPregnant')} />
              </span>
            </div>

            {/* Breastfeeding Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.reproductiveHealthCard.breastfeeding')}</span>
                <InfoButton translationKey="examinationForm.reproductiveHealthCard.breastfeedingInfo" label={t('examinationForm.reproductiveHealthCard.breastfeeding')} />
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
                    <option value="not_applicable">{t('examinationForm.reproductiveHealthCard.breastfeedingOptions.notApplicable')}</option>
                    <option value="exclusive">{t('examinationForm.reproductiveHealthCard.breastfeedingOptions.exclusive')}</option>
                    <option value="mixed">{t('examinationForm.reproductiveHealthCard.breastfeedingOptions.mixed')}</option>
                    <option value="none">{t('examinationForm.reproductiveHealthCard.breastfeedingOptions.none')}</option>
                  </select>
                )}
              />
            </div>

            {/* LMP Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('examinationForm.reproductiveHealthCard.lastMenstrualPeriod')}</span>
                <InfoButton translationKey="examinationForm.reproductiveHealthCard.lastMenstrualPeriodInfo" label={t('examinationForm.reproductiveHealthCard.lastMenstrualPeriod')} />
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                    <span>{t('examinationForm.reproductiveHealthCard.gestationalWeeks')}</span>
                    <InfoButton translationKey="examinationForm.reproductiveHealthCard.gestationalWeeksInfo" label={t('examinationForm.reproductiveHealthCard.gestationalWeeks')} />
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
                        placeholder={t('examinationForm.reproductiveHealthCard.gestationalWeeksPlaceholder')}
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                    <span>{t('examinationForm.reproductiveHealthCard.fetalHeartRate')}</span>
                    <InfoButton translationKey="examinationForm.reproductiveHealthCard.fetalHeartRateInfo" label={t('examinationForm.reproductiveHealthCard.fetalHeartRate')} />
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
                        placeholder={t('examinationForm.reproductiveHealthCard.fetalHeartRatePlaceholder')}
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                    <span>{t('examinationForm.reproductiveHealthCard.fundalHeight')}</span>
                    <InfoButton translationKey="examinationForm.reproductiveHealthCard.fundalHeightInfo" label={t('examinationForm.reproductiveHealthCard.fundalHeight')} />
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
                        placeholder={t('examinationForm.reproductiveHealthCard.fundalHeightPlaceholder')}
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
            <h3 className="font-bold text-foreground">{t('examinationForm.clinicalPhotosCard.title')}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('examinationForm.clinicalPhotosCard.description')}
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={photoLabel}
                onChange={(e) => setPhotoLabel(e.target.value)}
                placeholder={t('examinationForm.clinicalPhotosCard.labelPlaceholder')}
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none"
              />
              {!showCamera ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-secondary border border-border text-foreground hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Camera className="h-4 w-4" />
                  <span>{t('examinationForm.clinicalPhotosCard.openCamera')}</span>
                </button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={captureAndCompressPhoto}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-all"
                  >
                    {t('examinationForm.clinicalPhotosCard.snapAndCrop')}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-secondary border border-border text-foreground hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all"
                  >
                    {t('visit.formNavigation.prevStep', { defaultValue: 'Cancel' })}
                  </button>
                </div>
              )}
            </div>

            {showCamera && (
              <div className="flex flex-col items-center gap-4 bg-background p-4 rounded-2xl border border-border">
                <video ref={videoRef} autoPlay playsInline className="h-60 w-80 rounded-xl bg-card object-cover border border-border" />
                <span className="text-[10px] text-muted-foreground animate-pulse">{t('examinationForm.clinicalPhotosCard.positionCamera')}</span>
              </div>
            )}

            {/* Horizontal gallery list */}
            {clinicalPhotos.length > 0 && (
              <div className="flex flex-wrap gap-4 p-4 bg-background/50 border border-border/80 rounded-xl overflow-x-auto">
                {clinicalPhotos.map((photo, idx) => (
                  <div key={idx} className="relative w-28 group shrink-0 border border-border rounded-xl p-1 bg-card">
                    <img
                      src={photo.base64}
                      alt={photo.label || t('examinationForm.clinicalPhotosCard.untagged')}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <div className="p-1 text-[9px] text-muted-foreground font-semibold truncate">
                      {photo.label || t('examinationForm.clinicalPhotosCard.untagged')}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-md"
                      title={t('examinationForm.clinicalPhotosCard.deletePhoto')}
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
          age: patientDoc?.birthDate
            ? Math.floor((new Date().getTime() - new Date(patientDoc.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : undefined,
          sex: patientDoc?.gender,
          vitals: {
            temperature: watch('temperature'),
            bloodPressure: `${watch('bloodPressureSystolic') || ''}/${watch('bloodPressureDiastolic') || ''}`,
            heartRate: watch('heartRate'),
            respiratoryRate: watch('respiratoryRate'),
            oxygenSaturation: watch('oxygenSaturation'),
            bloodSugar: watch('bloodSugar'),
            weight: watch('weight'),
            height: watch('height'),
            muac: watch('muac'),
            avpu: watch('consciousnessLevel'),
          },
          symptoms: [
            watch('hasFever') && 'Fever',
            watch('hasHeadache') && 'Headache',
            watch('hasDizziness') && 'Dizziness',
            watch('hasNausea') && 'Nausea',
            watch('hasFatigue') && 'Fatigue',
            watch('hasWeightLoss') && 'Weight Loss',
            watch('hasSweating') && 'Sweating',
            watch('hasCough') && 'Cough',
            watch('hasShortnessOfBreath') && 'Shortness of Breath',
            watch('hasSoreThroat') && 'Sore Throat',
            watch('hasChestPain') && 'Chest Pain',
            watch('hasVomiting') && 'Vomiting',
            watch('hasDiarrhea') && 'Diarrhea',
            watch('hasStomachPain') && 'Stomach Pain',
            watch('hasConstipation') && 'Constipation',
            watch('hasAppetiteLoss') && 'Appetite Loss',
            watch('hasMusclePain') && 'Muscle Pain',
            watch('hasPainfulUrination') && 'Painful Urination',
            watch('hasFrequentUrination') && 'Frequent Urination',
            watch('hasBloodInUrine') && 'Blood in Urine',
            watch('hasEarPain') && 'Ear Pain',
            watch('hasHearingLoss') && 'Hearing Loss',
            watch('hasNasalCongestion') && 'Nasal Congestion',
            watch('hasRunnyNose') && 'Runny Nose',
            watch('hasSneezing') && 'Sneezing',
            watch('hasEyePain') && 'Eye Pain',
            watch('hasRedEye') && 'Red Eye',
            watch('hasBlurredVision') && 'Blurred Vision',
            watch('hasVisionLoss') && 'Vision Loss',
          ].filter(Boolean) as string[],
          chiefComplaint: watch('clinicalAssessment.chiefComplaint'),
          icd10Codes: watch('clinicalAssessment.icdCodes'),
          notes: watch('clinicalAssessment.clinicalNotes'),
        }}
      />
    </div>
  );
};

export default ExaminationForm;
