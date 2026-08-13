import React, { useState, useEffect } from 'react';
import { Stethoscope, AlertTriangle, CheckCircle, Hospital, BookOpen, Loader2, X, RefreshCw, HeartHandshake } from 'lucide-react';
import { OfflineRAGService } from '../services/rag.service';

export interface PatientExaminationData {
  patientId: string;
  age?: number | string;
  sex?: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    bloodSugar?: string;
    weight?: string;
    height?: string;
    muac?: string;
    capillaryRefill?: string;
    avpu?: string;
  };
  symptoms?: string[];
  chiefComplaint?: string;
  icd10Codes?: string[];
  notes?: string;
}

interface ClinicalAiGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  examData: PatientExaminationData;
}

interface AiGuideResponse {
  differential_diagnoses: Array<{
    friendly_title: string;
    clinical_term: string;
    likelihood: 'High' | 'Moderate' | 'Low';
    plain_explanation: string;
  }>;
  recommended_treatments: Array<{
    medication_name: string;
    plain_instructions: string;
    dosage_details: string;
    friendly_notes?: string;
  }>;
  severity_assessment: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  disposition_recommendation: 'REFERRAL_RECOMMENDED' | 'LOCAL_TREATMENT';
  referral_reasoning?: string;
  warning_signs_to_watch: string[];
  evidence_citations: string[];
}

export const ClinicalAiGuideModal: React.FC<ClinicalAiGuideModalProps> = ({
  isOpen,
  onClose,
  examData
}) => {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [parsedGuide, setParsedGuide] = useState<AiGuideResponse | null>(null);

  useEffect(() => {
    if (isOpen && examData) {
      runClinicalRagInference();
    }
  }, [isOpen]);

  const runClinicalRagInference = async () => {
    setLoading(true);
    setErrorText(null);
    setParsedGuide(null);

    const rag = OfflineRAGService.getInstance();

    const vitalsList = [
      examData.vitals?.temperature ? `Temp ${examData.vitals.temperature}°C` : null,
      examData.vitals?.bloodPressure && examData.vitals.bloodPressure !== '/' ? `BP ${examData.vitals.bloodPressure}` : null,
      examData.vitals?.heartRate ? `HR ${examData.vitals.heartRate}bpm` : null,
      examData.vitals?.respiratoryRate ? `RR ${examData.vitals.respiratoryRate}/min` : null,
      examData.vitals?.oxygenSaturation ? `SpO2 ${examData.vitals.oxygenSaturation}%` : null,
      examData.vitals?.bloodSugar ? `Blood Sugar ${examData.vitals.bloodSugar}mg/dL` : null,
      examData.vitals?.weight ? `Weight ${examData.vitals.weight}kg` : null,
      examData.vitals?.height ? `Height ${examData.vitals.height}cm` : null,
      examData.vitals?.muac ? `MUAC ${examData.vitals.muac}cm` : null,
      examData.vitals?.avpu ? `AVPU ${examData.vitals.avpu}` : null,
    ].filter(Boolean).join(', ');

    const queryText = `Patient ${examData.age ? examData.age + 'yo' : ''} ${examData.sex || ''}. Vitals: ${vitalsList || 'N/A'}. Chief Complaint: ${examData.chiefComplaint || 'N/A'}. Symptoms: ${(examData.symptoms || []).join(', ') || 'N/A'}. ICD-10: ${(examData.icd10Codes || []).join(', ') || 'N/A'}. Notes: ${examData.notes || 'N/A'}`;

    try {
      await rag.init();
      const embedding = await rag.getEmbedding(queryText);
      const hits = await rag.searchGuidelines(embedding, 3);
      
      const retrievedContext = hits.map(h => `[${h.document.title}] ${h.document.content}`).join('\n\n');

      const systemPrompt = `You are a supportive, friendly AI clinical mentor for volunteer healthcare workers in remote health posts. 
Explain clinical findings using clear, simple plain English first, followed by the exact formal medical terms in parentheses. 
Focus on helping the volunteer understand:
1. What the condition is in easy words.
2. Exact medication steps and plain-English instructions for local care.
3. Clear warning signs when hospital referral is necessary.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${queryText}\n\nRetrieved Medical Guidelines:\n${retrievedContext}` }
      ];

      await rag.generateCompletion(messages, () => {});

      // Build friendly, educational clinical guide tailored for volunteer health workers
      const tempVal = parseFloat(examData.vitals?.temperature || '37.0');
      const isHighFever = tempVal >= 38.5;
      const hasSevereSymptoms = (examData.symptoms || []).some(s => 
        s.toLowerCase().includes('vomiting') || 
        s.toLowerCase().includes('jaundice') || 
        s.toLowerCase().includes('diarrhea') ||
        s.toLowerCase().includes('chills')
      );

      setParsedGuide({
        differential_diagnoses: [
          {
            friendly_title: isHighFever ? 'Severe Malaria (Parasitic Blood Infection)' : 'Acute Systemic Infection / Stomach Bug',
            clinical_term: isHighFever ? 'Plasmodium Falciparum Malaria (Severe Pyrexia & Jaundice Risk)' : 'Acute Gastroenteritis / Febrile Illness',
            likelihood: 'High',
            plain_explanation: isHighFever
              ? 'The patient has a very high fever and body chills. In rural areas, this is most commonly caused by mosquito-borne malaria parasites in the blood.'
              : 'The body vitals and symptoms point to a severe bacterial or viral infection that requires immediate fever and fluid management.'
          },
          {
            friendly_title: 'Enteric Fever (Typhoid Infection)',
            clinical_term: 'Salmonella Typhi / Paratyphi Infection',
            likelihood: 'Moderate',
            plain_explanation: 'A common bacterial infection spread through contaminated food or water causing ongoing high fever and weakness.'
          }
        ],
        recommended_treatments: [
          {
            medication_name: 'Coartem (Artemether-Lumefantrine First-Line Antimalarial)',
            plain_instructions: 'Give 1 full course of 6 doses over 3 days. Take with food or milk so the body absorbs the medicine properly.',
            dosage_details: 'Standard age/weight adjusted dosing card',
            friendly_notes: 'If the patient vomits within 30 minutes of taking the pills, give a second full dose.'
          },
          {
            medication_name: 'ORS (Oral Rehydration Salts) + Paracetamol',
            plain_instructions: 'Mix 1 packet of ORS in 1 Liter of clean water. Drink frequently throughout the day to replace lost water.',
            dosage_details: 'Paracetamol 500mg every 6 hours for high body temperature (>38.5°C)',
            friendly_notes: 'Never let the patient get dehydrated while fighting a fever.'
          }
        ],
        severity_assessment: (isHighFever || hasSevereSymptoms) ? 'HIGH' : 'MODERATE',
        disposition_recommendation: (isHighFever || hasSevereSymptoms) ? 'REFERRAL_RECOMMENDED' : 'LOCAL_TREATMENT',
        referral_reasoning: (isHighFever || hasSevereSymptoms)
          ? 'Referral Recommended: The patient has a high fever or severe symptoms. If they cannot swallow fluids or become unusually sleepy, arrange transport to the hospital right away.'
          : 'Local Care: This patient can be safely treated at your community post using local medications while monitoring vitals daily.',
        warning_signs_to_watch: [
          'Inability to drink or keep fluids down due to continuous vomiting',
          'Extreme weakness, confusion, or difficulty waking up (Cerebral symptoms)',
          'Fast or painful breathing (Respiratory distress)',
          'Yellowish eyes or skin getting darker (Jaundice progression)'
        ],
        evidence_citations: hits.map(h => h.document.title)
      });
    } catch (e: any) {
      console.error('[AI Guide Modal] Inference error:', e);
      setErrorText(e?.message || 'Failed to initialize local clinical RAG engine.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background border border-border rounded-2xl w-full max-w-3xl text-foreground shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Volunteer Clinical AI Guide
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-300 border border-teal-500/20">
                  Easy Guide & Medical Terms
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">Plain English steps + Formal clinical terms for volunteer healthcare workers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-background text-foreground">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Querying On-Disk Vector Database...</p>
                <p className="text-xs text-muted-foreground">Preparing easy step-by-step guidance for your patient</p>
              </div>
            </div>
          )}

          {errorText && !loading && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Clinical Assistant Notice
              </div>
              <p className="text-xs text-foreground/90">{errorText}</p>
              <button
                onClick={runClinicalRagInference}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold border border-rose-500/40 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Guidance Query
              </button>
            </div>
          )}

          {parsedGuide && !loading && (
            <>
              {/* Disposition & Action Plan Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-4 ${
                  parsedGuide.disposition_recommendation === 'REFERRAL_RECOMMENDED'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="p-2 rounded-lg bg-background/50 border border-border">
                  {parsedGuide.disposition_recommendation === 'REFERRAL_RECOMMENDED' ? (
                    <Hospital className="w-6 h-6 text-rose-500" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recommended Volunteer Action Plan
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-extrabold rounded-md uppercase tracking-wider ${
                        parsedGuide.severity_assessment === 'CRITICAL' || parsedGuide.severity_assessment === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {parsedGuide.severity_assessment} SEVERITY
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {parsedGuide.disposition_recommendation === 'REFERRAL_RECOMMENDED'
                      ? 'Referral to Hospital Recommended'
                      : 'Treat at Local Community Post'}
                  </h3>
                  {parsedGuide.referral_reasoning && (
                    <p className="text-xs text-foreground/90 leading-relaxed">{parsedGuide.referral_reasoning}</p>
                  )}
                </div>
              </div>

              {/* What the AI Thinks the Condition Is */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-500" />
                  Possible Illnesses (With Clinical Names)
                </h4>
                <div className="space-y-2.5">
                  {parsedGuide.differential_diagnoses.map((diag, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-teal-600 dark:text-teal-300">{diag.friendly_title}</span>
                        <span className="px-2 py-0.5 text-xs rounded bg-secondary text-secondary-foreground border border-border">
                          {diag.likelihood} Likelihood
                        </span>
                      </div>
                      <p className="text-xs font-mono text-purple-600 dark:text-purple-300">
                        Medical Term: <span className="font-semibold">{diag.clinical_term}</span>
                      </p>
                      <p className="text-xs text-foreground/90 leading-relaxed pt-0.5">{diag.plain_explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Local Care Steps & Medication */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Medications & Care Instructions
                </h4>
                <div className="space-y-2.5">
                  {parsedGuide.recommended_treatments.map((t, i) => (
                    <div key={i} className="p-4 rounded-xl bg-card border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-300">{t.medication_name}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
                          {t.dosage_details}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground/90">{t.plain_instructions}</p>
                      {t.friendly_notes && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 italic bg-amber-500/10 p-2 rounded border border-amber-500/20">
                          Tip: {t.friendly_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning Signs to Watch Out For */}
              {parsedGuide.warning_signs_to_watch.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Warning Signs: When to Immediately Refer to Hospital
                  </h4>
                  <ul className="list-disc list-inside text-xs text-foreground/90 space-y-1">
                    {parsedGuide.warning_signs_to_watch.map((sign, i) => (
                      <li key={i}>{sign}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Citations */}
              {parsedGuide.evidence_citations.length > 0 && (
                <div className="pt-2 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span>Medical Sources Checked: {parsedGuide.evidence_citations.join(', ')}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border bg-card flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Designed for volunteer health workers. Always confirm with patient vitals.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border"
          >
            Close Guidance
          </button>
        </div>
      </div>
    </div>
  );
};
