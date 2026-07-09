import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import {
  Patient,
  ETHNICITY_PRESETS,
  OCCUPATION_PRESETS,
  ALLERGY_PRESETS,
  CHRONIC_CONDITION_PRESETS,
  DISABILITY_PRESETS,
  WATER_SOURCE_OPTIONS,
  SANITATION_OPTIONS,
  BLOOD_TYPE_OPTIONS,
} from '@afiyet/shared';
import { usePatientService } from '../services/patient.service.ts';
import { useCustomEntries } from '../services/custom-entries.service.ts';
import { zobas, subZobas, EZoba } from './zobas.ts';
import { useNavigate } from '@tanstack/react-router';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  User,
  ArrowLeft,
  Phone,
  Home,
  Droplets,
  Heart,
  Baby,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';

interface PersonalInfoFormProps {
  mode: 'create' | 'edit';
  patientData?: Patient;
}

interface PatientFormValues {
  uniqueGovID: string;
  fullName: string;
  birthDate: string;
  gender: string;
  emmergencyContact: string;
  education: string;
  maritalStatus: string;
  phoneNumber: string;
  ethnicity: string;
  nationality: string;
  occupation: string;
  bloodType: string;
  residenceZoba: string;
  residenceSubZoba: string;
  residenceVillage: string;
  householdSize: string;
  waterSource: string;
  sanitationType: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  disabilities: string[];
  isPregnant: boolean;
  pregnancyDueDate: string;
  numberOfPregnancies: string;
  numberOfLiveBirths: string;
}

// ----------------------------------------------------
// LOCAL HELPER COMPONENT: TAG INPUT (FOR ALLERGIES/CONDITIONS/DISABILITIES)
// ----------------------------------------------------
interface TagInputProps {
  presets: readonly string[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}

const TagInput: React.FC<TagInputProps> = ({ presets, value = [], onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(value.filter((t) => t !== tagToRemove));
  };

  const handlePresetClick = (preset: string) => {
    if (!value.includes(preset)) {
      onChange([...value, preset]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-border/80 rounded-xl min-h-[42px] items-center">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-sky-500/20 text-primary text-xs font-semibold rounded-lg"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="hover:text-red-400 focus:outline-none transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Group */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2.5 bg-secondary border border-border text-foreground hover:bg-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Preset Suggestions */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
          {presets
            .filter((preset) => !value.includes(preset))
            .map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="px-2.5 py-1 bg-secondary/50 hover:bg-secondary border border-border/65 text-[10px] font-medium text-muted-foreground hover:text-foreground rounded-lg transition-all"
              >
                {preset}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ mode, patientData }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createPatient, updatePatient } = usePatientService();
  const { addCustomValue, getMergedOptions } = useCustomEntries();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Camera capture states
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(
    patientData?.image?.base64 || null
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Custom text input mode triggers for combo selects
  const [customEthnicityActive, setCustomEthnicityActive] = useState(false);
  const [customEthnicityValue, setCustomEthnicityValue] = useState('');
  const [customOccupationActive, setCustomOccupationActive] = useState(false);
  const [customOccupationValue, setCustomOccupationValue] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PatientFormValues>({
    defaultValues:
      mode === 'edit' && patientData
        ? {
            uniqueGovID: patientData.uniqueGovID || '',
            fullName: patientData.fullName || '',
            birthDate: patientData.birthDate
              ? moment(patientData.birthDate).format('YYYY-MM-DD')
              : '',
            gender: patientData.gender || 'male',
            emmergencyContact: patientData.emmergencyContact || '',
            education: patientData.education || '',
            maritalStatus: patientData.maritalStatus || 'single',
            phoneNumber: patientData.phoneNumber || '',
            ethnicity: patientData.ethnicity || '',
            nationality: patientData.nationality || 'Eritrean',
            occupation: patientData.occupation || '',
            bloodType: patientData.bloodType || 'unknown',
            residenceZoba: patientData.residenceZoba || '',
            residenceSubZoba: patientData.residenceSubZoba || '',
            residenceVillage: patientData.residenceVillage || '',
            householdSize: patientData.householdSize?.toString() || '',
            waterSource: patientData.waterSource || '',
            sanitationType: patientData.sanitationType || '',
            allergies: patientData.allergies || [],
            chronicConditions: patientData.chronicConditions || [],
            currentMedications: patientData.currentMedications || [],
            disabilities: patientData.disabilities || [],
            isPregnant: patientData.isPregnant || false,
            pregnancyDueDate: patientData.pregnancyDueDate
              ? moment(patientData.pregnancyDueDate).format('YYYY-MM-DD')
              : '',
            numberOfPregnancies: patientData.numberOfPregnancies?.toString() || '',
            numberOfLiveBirths: patientData.numberOfLiveBirths?.toString() || '',
          }
        : {
            uniqueGovID: '',
            fullName: '',
            birthDate: '',
            gender: 'male',
            emmergencyContact: '',
            education: '',
            maritalStatus: 'single',
            phoneNumber: '',
            ethnicity: '',
            nationality: 'Eritrean',
            occupation: '',
            bloodType: 'unknown',
            residenceZoba: '',
            residenceSubZoba: '',
            residenceVillage: '',
            householdSize: '',
            waterSource: '',
            sanitationType: '',
            allergies: [],
            chronicConditions: [],
            currentMedications: [],
            disabilities: [],
            isPregnant: false,
            pregnancyDueDate: '',
            numberOfPregnancies: '',
            numberOfLiveBirths: '',
          },
  });

  const birthDate = watch('birthDate');
  const gender = watch('gender');
  const isPregnant = watch('isPregnant');
  const selectedZoba = watch('residenceZoba') as EZoba | '';

  // Get combined presets + user-created custom entries from hook
  const mergedEthnicityOptions = getMergedOptions('ethnicity', ETHNICITY_PRESETS);
  const mergedOccupationOptions = getMergedOptions('occupation', OCCUPATION_PRESETS);

  // Trigger web cam feed
  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 240, height: 240 },
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

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 240, 240);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
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

  const clearPhoto = () => {
    setCapturedImage(null);
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      // Save custom values to database asynchronously so they appear as dropdown options in future
      if (customEthnicityActive && customEthnicityValue.trim()) {
        await addCustomValue('ethnicity', customEthnicityValue);
      }
      if (customOccupationActive && customOccupationValue.trim()) {
        await addCustomValue('occupation', customOccupationValue);
      }

      const payload = {
        ...data,
        ethnicity: customEthnicityActive ? customEthnicityValue.trim() : data.ethnicity,
        occupation: customOccupationActive ? customOccupationValue.trim() : data.occupation,
        householdSize: data.householdSize ? parseInt(data.householdSize, 10) : undefined,
        numberOfPregnancies: data.numberOfPregnancies ? parseInt(data.numberOfPregnancies, 10) : undefined,
        numberOfLiveBirths: data.numberOfLiveBirths ? parseInt(data.numberOfLiveBirths, 10) : undefined,
        image: capturedImage ? { base64: capturedImage } : undefined,
      };

      if (mode === 'create') {
        await createPatient(payload);
      } else if (mode === 'edit' && patientData) {
        const hasFormChanged = isDirty || capturedImage !== (patientData?.image?.base64 || null);
        if (hasFormChanged) {
          await updatePatient(patientData.patientId || patientData.tmpPatientId || '', payload);
        }
      }

      navigate({ to: '/' });
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border pb-5">
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          className="p-2 rounded-lg bg-secondary hover:bg-slate-700 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === 'create' ? t('personalInfo.formTitle') : 'Update Patient Profile'}
          </h2>
          <span className="text-xs text-muted-foreground">Clinical Demographic & Medical Intake</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Photo Section */}
        <div className="flex flex-col items-center sm:flex-row gap-6 bg-background/40 p-5 rounded-2xl border border-border/80">
          <div className="relative h-28 w-28 rounded-full border border-border/80 overflow-hidden bg-secondary flex items-center justify-center shrink-0">
            {capturedImage ? (
              <img src={capturedImage} alt="Patient Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-12 w-12 text-muted-foreground/60" />
            )}
          </div>

          <div className="flex-1 flex flex-col gap-2.5 text-center sm:text-left">
            <span className="font-semibold text-sm text-foreground">Patient Portrait Image</span>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Capture a face photograph using the tablet camera to store in the local offline database record.
            </p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {!showCamera ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-semibold hover:bg-slate-700 text-foreground transition-all"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{capturedImage ? 'Recapture' : 'Take Photo'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-3 py-1.5 rounded-lg bg-primary text-xs font-bold hover:bg-primary/90 text-white transition-all shadow-md shadow-primary/10"
                  >
                    Snap Frame
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs hover:bg-slate-700 text-foreground transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {capturedImage && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 text-red-400 transition-all"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Video feed overlay */}
        {showCamera && (
          <div className="flex flex-col items-center gap-4 bg-background p-4 rounded-2xl border border-border">
            <video ref={videoRef} autoPlay playsInline className="h-60 w-60 rounded-xl bg-card object-cover border border-border" />
            <span className="text-[10px] text-muted-foreground animate-pulse">Live stream feeding...</span>
          </div>
        )}

        {/* Core Profile Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-primary border-b border-border pb-2">
            Intake Basics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Gov ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('personalInfo.uniqueGovID')}
                </label>
                <Controller
                  control={control}
                  name="uniqueGovID"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <input
                      type="text"
                      onBlur={onBlur}
                      onChange={onChange}
                      value={value}
                      className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="Enter National ID Number"
                    />
                  )}
                />
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                  <span>{t('personalInfo.fullName')}</span>
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="fullName"
                  rules={{
                    required: t('validation.nameRequired'),
                    minLength: { value: 2, message: t('validation.nameMinLength') },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <input
                      type="text"
                      onBlur={onBlur}
                      onChange={onChange}
                      value={value}
                      className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-slate-600 focus:outline-none focus:ring-1 transition-all ${
                        errors.fullName
                          ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                          : 'border-border focus:border-primary focus:ring-primary'
                      }`}
                      placeholder="Enter Full Name"
                    />
                  )}
                />
                {errors.fullName && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.fullName.message}</span>
                  </span>
                )}
              </div>

              {/* Birth Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                  <span>{t('personalInfo.birthDate')}</span>
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="birthDate"
                  rules={{
                    required: t('validation.birthDateRequired'),
                    validate: (val) => {
                      if (moment(val).isAfter(moment())) {
                        return t('validation.birthDateFuture');
                      }
                      return true;
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <input
                      type="date"
                      onBlur={onBlur}
                      onChange={onChange}
                      value={value}
                      max={moment().format('YYYY-MM-DD')}
                      className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 transition-all ${
                        errors.birthDate
                          ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500'
                          : 'border-border focus:border-primary focus:ring-primary'
                      }`}
                    />
                  )}
                />
                {errors.birthDate && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.birthDate.message}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Gender Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                  <span>{t('personalInfo.gender')}</span>
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="gender"
                  rules={{ required: t('validation.genderRequired') }}
                  render={({ field: { onChange, value } }) => (
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                          value === 'male'
                            ? 'bg-primary/10 border-sky-500/50 text-primary shadow-md shadow-sky-500/5'
                            : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={value === 'male'}
                          onChange={() => onChange('male')}
                          className="hidden"
                        />
                        <span>{t('personalInfo.male')}</span>
                      </label>

                      <label
                        className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                          value === 'female'
                            ? 'bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-md shadow-pink-500/5'
                            : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={value === 'female'}
                          onChange={() => onChange('female')}
                          className="hidden"
                        />
                        <span>{t('personalInfo.female')}</span>
                      </label>
                    </div>
                  )}
                />
                {errors.gender && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.gender.message}</span>
                  </span>
                )}
              </div>

              {/* Education select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('personalInfo.education')}
                </label>
                <Controller
                  control={control}
                  name="education"
                  render={({ field: { onChange, value } }) => (
                    <select
                      value={value}
                      onChange={onChange}
                      className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="">{t('personalInfo.education')}</option>
                      <option value="None">{t('personalInfo.educationLevels.none')}</option>
                      <option value="School">{t('personalInfo.educationLevels.school')}</option>
                      <option value="High School">{t('personalInfo.educationLevels.highSchool')}</option>
                      <option value="Undergraduate">{t('personalInfo.educationLevels.undergraduate')}</option>
                      <option value="Postgraduate">{t('personalInfo.educationLevels.postgraduate')}</option>
                    </select>
                  )}
                />
              </div>

              {/* Marital Status */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                  <span>{t('personalInfo.maritalStatus')}</span>
                  <span className="text-red-500 ml-1 font-bold">*</span>
                </label>
                <Controller
                  control={control}
                  name="maritalStatus"
                  rules={{ required: t('validation.maritalStatusRequired') }}
                  render={({ field: { onChange, value } }) => (
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                          value === 'single'
                            ? 'bg-primary/10 border-sky-500/50 text-primary shadow-md shadow-sky-500/5'
                            : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="maritalStatus"
                          value="single"
                          checked={value === 'single'}
                          onChange={() => onChange('single')}
                          className="hidden"
                        />
                        <span>{t('personalInfo.single')}</span>
                      </label>

                      <label
                        className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                          value === 'married'
                            ? 'bg-primary/10 border-sky-500/50 text-primary shadow-md shadow-sky-500/5'
                            : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="maritalStatus"
                          value="married"
                          checked={value === 'married'}
                          onChange={() => onChange('married')}
                          className="hidden"
                        />
                        <span>{t('personalInfo.married')}</span>
                      </label>
                    </div>
                  )}
                />
                {errors.maritalStatus && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.maritalStatus.message}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 1. Contact & Identity Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-primary border-b border-border pb-2">
            <Phone className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Contact & Identity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Phone Number
              </label>
              <Controller
                control={control}
                name="phoneNumber"
                rules={{
                  pattern: {
                    value: /^[+]*[0-9]{7,15}$/,
                    message: t('validation.phoneFormat'),
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="tel"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="Enter phone number"
                    className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.phoneNumber ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.phoneNumber && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.phoneNumber.message}</span>
                </span>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('personalInfo.emmergencyContact')}
              </label>
              <Controller
                control={control}
                name="emmergencyContact"
                rules={{
                  pattern: {
                    value: /^[+]*[0-9]{7,15}$/,
                    message: t('validation.phoneFormat'),
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="tel"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-slate-600 focus:outline-none transition-all ${
                      errors.emmergencyContact ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                    placeholder="Enter emergency phone number"
                  />
                )}
              />
              {errors.emmergencyContact && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{errors.emmergencyContact.message}</span>
                </span>
              )}
            </div>

            {/* Nationality */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Nationality
              </label>
              <Controller
                control={control}
                name="nationality"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="Nationality"
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>

            {/* Blood Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Blood Type
              </label>
              <Controller
                control={control}
                name="bloodType"
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={onChange}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    {BLOOD_TYPE_OPTIONS.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Ethnicity Select (Combo Option) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Ethnicity
              </label>
              <div className="space-y-2">
                {!customEthnicityActive ? (
                  <Controller
                    control={control}
                    name="ethnicity"
                    render={({ field: { onChange, value } }) => (
                      <div className="flex gap-2">
                        <select
                          value={value}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomEthnicityActive(true);
                              onChange('');
                            } else {
                              onChange(e.target.value);
                            }
                          }}
                          className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                        >
                          <option value="">Select Ethnicity</option>
                          {mergedEthnicityOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom...</option>
                        </select>
                      </div>
                    )}
                  />
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type custom ethnicity..."
                      value={customEthnicityValue}
                      onChange={(e) => setCustomEthnicityValue(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomEthnicityActive(false);
                        setCustomEthnicityValue('');
                      }}
                      className="px-3 bg-secondary border border-border text-foreground hover:bg-slate-700 rounded-xl text-xs font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Occupation Select (Combo Option) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Occupation
              </label>
              <div className="space-y-2">
                {!customOccupationActive ? (
                  <Controller
                    control={control}
                    name="occupation"
                    render={({ field: { onChange, value } }) => (
                      <div className="flex gap-2">
                        <select
                          value={value}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomOccupationActive(true);
                              onChange('');
                            } else {
                              onChange(e.target.value);
                            }
                          }}
                          className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                        >
                          <option value="">Select Occupation</option>
                          {mergedOccupationOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="__custom__">+ Enter Custom...</option>
                        </select>
                      </div>
                    )}
                  />
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type custom occupation..."
                      value={customOccupationValue}
                      onChange={(e) => setCustomOccupationValue(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomOccupationActive(false);
                        setCustomOccupationValue('');
                      }}
                      className="px-3 bg-secondary border border-border text-foreground hover:bg-slate-700 rounded-xl text-xs font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Permanent Residence Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-primary border-b border-border pb-2">
            <Home className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Permanent Residence</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Zoba */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Zoba
              </label>
              <Controller
                control={control}
                name="residenceZoba"
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={(e) => {
                      onChange(e.target.value);
                      setValue('residenceSubZoba', ''); // Reset subzoba
                    }}
                    className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Zoba</option>
                    {zobas.map((z) => (
                      <option key={z.value} value={z.value}>
                        {z.title}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Sub Zoba */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sub Zoba
              </label>
              <Controller
                control={control}
                name="residenceSubZoba"
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={onChange}
                    disabled={!selectedZoba}
                    className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-40"
                  >
                    <option value="">Select Sub Zoba</option>
                    {selectedZoba &&
                      subZobas[selectedZoba].map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.title}
                        </option>
                      ))}
                  </select>
                )}
              />
            </div>

            {/* Village / Locality */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Village / Locality
              </label>
              <Controller
                control={control}
                name="residenceVillage"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="text"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="Enter Village / Town"
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* 3. Social & Environmental Factors Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-primary border-b border-border pb-2">
            <Droplets className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Social & Environmental Factors</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Household Size */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Household Size (1-100)
              </label>
              <Controller
                control={control}
                name="householdSize"
                rules={{
                  min: { value: 1, message: t('validation.householdSizeMin') },
                  max: { value: 100, message: t('validation.householdSizeMax') },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="number"
                    min="1"
                    max="100"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    placeholder="e.g. 5"
                    className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                      errors.householdSize ? 'border-red-500/80' : 'border-border focus:border-primary'
                    }`}
                  />
                )}
              />
              {errors.householdSize && (
                <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.householdSize.message}</span>
                </span>
              )}
            </div>

            {/* Water Source */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Water Source
              </label>
              <Controller
                control={control}
                name="waterSource"
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={onChange}
                    className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Water Source</option>
                    {WATER_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Sanitation Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Sanitation Type
              </label>
              <Controller
                control={control}
                name="sanitationType"
                render={({ field: { onChange, value } }) => (
                  <select
                    value={value}
                    onChange={onChange}
                    className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Sanitation Type</option>
                    {SANITATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>
        </div>

        {/* 4. Medical History Section */}
        <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 text-primary border-b border-border pb-2">
            <Heart className="h-5 w-5" />
            <h3 className="font-bold text-foreground">Medical History</h3>
          </div>
          <div className="space-y-4 pt-2">
            {/* Allergies */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Allergies
              </label>
              <Controller
                control={control}
                name="allergies"
                render={({ field: { onChange, value } }) => (
                  <TagInput
                    presets={ALLERGY_PRESETS}
                    value={value}
                    onChange={onChange}
                    placeholder="Type an allergy and press Enter..."
                  />
                )}
              />
            </div>

            {/* Chronic Conditions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Chronic Conditions
              </label>
              <Controller
                control={control}
                name="chronicConditions"
                render={({ field: { onChange, value } }) => (
                  <TagInput
                    presets={CHRONIC_CONDITION_PRESETS}
                    value={value}
                    onChange={onChange}
                    placeholder="Type a condition and press Enter..."
                  />
                )}
              />
            </div>

            {/* Current Medications */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Current Medications
              </label>
              <Controller
                control={control}
                name="currentMedications"
                render={({ field: { onChange, value } }) => (
                  <TagInput
                    presets={[]}
                    value={value}
                    onChange={onChange}
                    placeholder="Type a medication and press Enter..."
                  />
                )}
              />
            </div>

            {/* Disabilities / Functional Limitations */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Disabilities / Functional Limitations (WHO ICF-aligned)
              </label>
              <Controller
                control={control}
                name="disabilities"
                render={({ field: { onChange, value } }) => (
                  <TagInput
                    presets={DISABILITY_PRESETS}
                    value={value}
                    onChange={onChange}
                    placeholder="Type a limitation/disability and press Enter..."
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* 5. Reproductive Health Section (Shown only for females) */}
        {gender === 'female' && (
          <div className="bg-background/40 border border-slate-850 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-primary border-b border-border pb-2">
              <Baby className="h-5 w-5" />
              <h3 className="font-bold text-foreground">Reproductive Health</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Is Pregnant Checkbox */}
              <div className="flex items-center gap-3 bg-background border border-border rounded-xl px-4 py-3 h-fit">
                <Controller
                  control={control}
                  name="isPregnant"
                  render={({ field: { onChange, value } }) => (
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(e) => {
                        onChange(e.target.checked);
                        if (!e.target.checked) setValue('pregnancyDueDate', '');
                      }}
                      className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
                    />
                  )}
                />
                <span className="text-sm font-semibold text-foreground">Currently Pregnant</span>
              </div>

              {/* Due Date (conditional) */}
              {isPregnant && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Expected Due Date (Max 9 months out)
                  </label>
                  <Controller
                    control={control}
                    name="pregnancyDueDate"
                    rules={{
                      validate: (val) => {
                        if (!val) return true;
                        const date = moment(val);
                        const maxFuture = moment().add(9, 'months');
                        if (date.isBefore(moment(), 'day')) {
                          return t('validation.dueDatePast');
                        }
                        if (date.isAfter(maxFuture)) {
                          return t('validation.dueDateLimit');
                        }
                        return true;
                      },
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <input
                        type="date"
                        onBlur={onBlur}
                        onChange={onChange}
                        value={value}
                        min={moment().format('YYYY-MM-DD')}
                        max={moment().add(9, 'months').format('YYYY-MM-DD')}
                        className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                          errors.pregnancyDueDate ? 'border-red-500/80' : 'border-border focus:border-primary'
                        }`}
                      />
                    )}
                  />
                  {errors.pregnancyDueDate && (
                    <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.pregnancyDueDate.message}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Gravida */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Number of Pregnancies (Gravida) (0-30)
                </label>
                <Controller
                  control={control}
                  name="numberOfPregnancies"
                  rules={{
                    min: { value: 0, message: t('validation.negativeLimit') },
                    max: { value: 30, message: t('validation.pregnanciesLimit') },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <input
                      type="number"
                      min="0"
                      max="30"
                      onBlur={onBlur}
                      onChange={onChange}
                      value={value}
                      placeholder="e.g. 2"
                      className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                        errors.numberOfPregnancies ? 'border-red-500/80' : 'border-border focus:border-primary'
                      }`}
                    />
                  )}
                />
                {errors.numberOfPregnancies && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.numberOfPregnancies.message}</span>
                  </span>
                )}
              </div>

              {/* Parity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Number of Live Births (Parity) (0-30)
                </label>
                <Controller
                  control={control}
                  name="numberOfLiveBirths"
                  rules={{
                    min: { value: 0, message: t('validation.negativeLimit') },
                    max: { value: 30, message: t('validation.liveBirthsLimit') },
                    validate: (val) => {
                      const gravidaVal = watch('numberOfPregnancies');
                      if (val && gravidaVal) {
                        const par = parseInt(val, 10);
                        const grav = parseInt(gravidaVal, 10);
                        if (par > grav) {
                          return t('validation.liveBirthsExceedPregnancies');
                        }
                      }
                      return true;
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <input
                      type="number"
                      min="0"
                      max="30"
                      onBlur={onBlur}
                      onChange={onChange}
                      value={value}
                      placeholder="e.g. 2"
                      className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none transition-all ${
                        errors.numberOfLiveBirths ? 'border-red-500/80' : 'border-border focus:border-primary'
                      }`}
                    />
                  )}
                />
                {errors.numberOfLiveBirths && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.numberOfLiveBirths.message}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !birthDate}
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

export const PersonalInfoFormWrapper = PersonalInfoForm;
export default PersonalInfoForm;
