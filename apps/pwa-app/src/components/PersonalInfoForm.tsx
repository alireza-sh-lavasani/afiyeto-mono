import React, { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Patient, EIdType } from '@afiyet/shared';
import { usePatientService } from '../services/patient.service.ts';
import { useNavigate } from '@tanstack/react-router';
import { Camera, RefreshCw, CheckCircle2, User, ArrowLeft } from 'lucide-react';

interface PersonalInfoFormProps {
  mode: 'create' | 'edit';
  patientData?: Patient;
}

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ mode, patientData }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createPatient, updatePatient } = usePatientService();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Camera capture states
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(
    patientData?.image?.base64 || null
  );
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: mode === 'edit' && patientData ? {
      uniqueGovID: patientData.uniqueGovID || '',
      fullName: patientData.fullName || '',
      birthDate: patientData.birthDate ? moment(patientData.birthDate).format('YYYY-MM-DD') : '',
      gender: patientData.gender || 'male',
      emmergencyContact: patientData.emmergencyContact || '',
      education: patientData.education || '',
      maritalStatus: patientData.maritalStatus || 'single',
    } : {
      uniqueGovID: '',
      fullName: '',
      birthDate: '',
      gender: 'male',
      emmergencyContact: '',
      education: '',
      maritalStatus: 'single',
    }
  });

  const birthDate = watch('birthDate');

  // Trigger web cam feed
  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 240, height: 240 },
        audio: false
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
      streamRef.current.getTracks().forEach(track => track.stop());
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
      
      const payload = {
        ...data,
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
          onClick={() => navigate({ to: '/' })}
          className="p-2 rounded-lg bg-secondary hover:bg-slate-700 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === 'create' ? t('personalInfo.formTitle') : 'Update Patient Profile'}
          </h2>
          <span className="text-xs text-muted-foreground">Clinical Demographic Form</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
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

        {/* Form Inputs Grid */}
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
                rules={{ required: true }}
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
                <span className="text-xs text-red-400">{t('personalInfo.requiredField')}</span>
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
                rules={{ required: true }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="date"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    className={`bg-background border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 transition-all ${
                      errors.birthDate 
                        ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500' 
                        : 'border-border focus:border-primary focus:ring-primary'
                    }`}
                  />
                )}
              />
              {errors.birthDate && (
                <span className="text-xs text-red-400">{t('personalInfo.requiredField')}</span>
              )}
            </div>

            {/* Gender Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center">
                <span>{t('personalInfo.gender')}</span>
                <span className="text-red-500 ml-1 font-bold">*</span>
              </label>
              <Controller
                control={control}
                name="gender"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                      value === 'male'
                        ? 'bg-primary/10 border-sky-500/50 text-primary shadow-md shadow-sky-500/5'
                        : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                    }`}>
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

                    <label className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                      value === 'female'
                        ? 'bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-md shadow-pink-500/5'
                        : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                    }`}>
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
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Emergency Contact */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('personalInfo.emmergencyContact')}
              </label>
              <Controller
                control={control}
                name="emmergencyContact"
                render={({ field: { onChange, onBlur, value } }) => (
                  <input
                    type="tel"
                    onBlur={onBlur}
                    onChange={onChange}
                    value={value}
                    className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="Enter phone number"
                  />
                )}
              />
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
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                      value === 'single'
                        ? 'bg-primary/10 border-sky-500/50 text-primary shadow-md shadow-sky-500/5'
                        : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                    }`}>
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

                    <label className={`flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-semibold cursor-pointer transition-all ${
                      value === 'married'
                        ? 'bg-primary/10 border-sky-500/50 text-primary shadow-md shadow-sky-500/5'
                        : 'border-border bg-background/40 text-muted-foreground hover:border-border'
                    }`}>
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
            </div>
          </div>
        </div>

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
export default PersonalInfoForm;
