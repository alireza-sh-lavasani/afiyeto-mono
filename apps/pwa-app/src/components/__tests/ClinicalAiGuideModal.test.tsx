import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  ClinicalAiGuideModal,
  PatientExaminationData,
  buildClinicalRagQuery,
  evaluateClinicalGuide,
} from '../ClinicalAiGuideModal';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OfflineRAGService
vi.mock('../../services/rag.service', () => {
  return {
    OfflineRAGService: {
      getInstance: () => ({
        init: vi.fn().mockResolvedValue(true),
        getEmbedding: vi.fn().mockResolvedValue(new Float32Array(768).fill(0.1)),
        searchGuidelines: vi.fn().mockResolvedValue([
          {
            score: 0.92,
            document: {
              id: 'doc_1',
              title: 'WHO Community Health Worker Emergency Guidelines',
              content: 'Pre-referral oxygen and Artesunate administration for severe malaria and respiratory distress.',
            },
          },
          {
            score: 0.88,
            document: {
              id: 'doc_2',
              title: 'StatPearls Severe Acute Malnutrition (SAM) & Pneumonia Protocol',
              content: 'Cautious rehydration (ReSoMal) and antibiotic management in pediatric SAM.',
            },
          },
        ]),
        generateCompletion: vi.fn().mockImplementation(async (messages, onToken) => {
          if (typeof onToken === 'function') {
            onToken('Streamed clinical guidance token.');
          }
          return 'Streamed clinical guidance token.';
        }),
      }),
    },
  };
});

describe('ClinicalAiGuideModal RAG Query & Educational Inference Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // SCENARIO 1: MILD / ROUTINE CLINICAL SCENARIO (LOW SEVERITY)
  // =========================================================================
  const scenario1MildData: PatientExaminationData = {
    patientId: 'pat_mild_001',
    fullName: 'Tekle Berhane',
    age: 24,
    sex: 'male',
    uniqueGovID: 'ERI-998822',
    education: 'Secondary School',
    maritalStatus: 'single',
    occupation: 'Farmer',
    ethnicity: 'Tigrinya',
    nationality: 'Eritrean',
    location: 'Anseba, Keren, Zagher',
    householdSize: 4,
    waterSource: 'piped',
    sanitationType: 'flush',
    bloodType: 'O+',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    disabilities: [],
    isPregnant: false,
    vitals: {
      temperature: '37.5',
      bloodPressure: '120/80',
      heartRate: '72',
      respiratoryRate: '16',
      oxygenSaturation: '98',
      bloodSugar: '95',
      weight: '68',
      height: '175',
      muac: '26.0',
      capillaryRefill: '1.5',
      avpu: 'Alert',
    },
    symptoms: ['Runny Nose', 'Sneezing', 'Mild Sore Throat'],
    chiefComplaint: 'Nasal congestion and mild sore throat for 2 days',
    icd10Codes: ['J00'],
    notes: 'Normal chest expansion, clear breath sounds bilaterally, no acute distress.',
  };

  it('Scenario 1: Formats ALL Patient & Examination form fields into the RAG query string', () => {
    const query = buildClinicalRagQuery(scenario1MildData);

    // Verify Patient Form Demographics
    expect(query).toContain('Name: Tekle Berhane');
    expect(query).toContain('Age: 24yo');
    expect(query).toContain('Sex/Gender: male');
    expect(query).toContain('National ID: ERI-998822');
    expect(query).toContain('Education Level: Secondary School');
    expect(query).toContain('Occupation: Farmer');
    expect(query).toContain('Ethnicity: Tigrinya');
    expect(query).toContain('Residence/Zoba: Anseba, Keren, Zagher');

    // Verify SDOH
    expect(query).toContain('Household Size: 4');
    expect(query).toContain('Drinking Water Source: piped');
    expect(query).toContain('Sanitation/Latrine Type: flush');

    // Verify Medical History
    expect(query).toContain('Blood Group: O+');
    expect(query).toContain('Allergies: NKDA');
    expect(query).toContain('Pre-existing Conditions: None');

    // Verify Vitals & Symptoms
    expect(query).toContain('Temp 37.5°C');
    expect(query).toContain('BP 120/80mmHg');
    expect(query).toContain('HR 72bpm');
    expect(query).toContain('RR 16/min');
    expect(query).toContain('SpO2 98%');
    expect(query).toContain('Blood Sugar 95mg/dL');
    expect(query).toContain('MUAC 26.0cm');
    expect(query).toContain('Consciousness Level (AVPU): Alert');
    expect(query).toContain('Runny Nose, Sneezing, Mild Sore Throat');
    expect(query).toContain('J00');
  });

  it('Scenario 1: Generates a LOW severity educational response for routine upper respiratory infection', () => {
    const guide = evaluateClinicalGuide(scenario1MildData, ['WHO Community Guidelines']);
    expect(guide.severity_assessment).toBe('LOW');
    expect(guide.disposition_recommendation).toBe('LOCAL_TREATMENT');
    expect(guide.educational_summary.pathophysiology_pearl).toContain('viral colonization');
    expect(guide.educational_summary.clinical_mechanism).toContain('Vitals are fully stable');
    expect(guide.differential_diagnoses[0].friendly_title).toContain('Common Cold');
    expect(guide.recommended_treatments[0].medication_name).toContain('Oral Fluid Therapy');
  });

  // =========================================================================
  // SCENARIO 2: MODERATE SEVERITY SCENARIO (PREGNANT FEMALE WITH FEVER & VOMITING)
  // =========================================================================
  const scenario2ModerateData: PatientExaminationData = {
    patientId: 'pat_mod_002',
    fullName: 'Amina Said',
    age: 28,
    sex: 'female',
    uniqueGovID: 'ERI-445511',
    education: 'Primary School',
    maritalStatus: 'married',
    occupation: 'Homemaker',
    ethnicity: 'Tigre',
    nationality: 'Eritrean',
    location: 'Gash-Barka, Barentu, Agordat',
    householdSize: 6,
    waterSource: 'well',
    sanitationType: 'pit_latrine',
    bloodType: 'A+',
    allergies: ['Penicillin'],
    chronicConditions: ['Mild Asthma'],
    currentMedications: ['Salbutamol Inhaler'],
    disabilities: [],
    isPregnant: true,
    pregnancyDueDate: '2026-11-15',
    gravida: 3,
    parity: 2,
    vitals: {
      temperature: '38.8',
      bloodPressure: '110/70',
      heartRate: '104',
      respiratoryRate: '22',
      oxygenSaturation: '96',
      bloodSugar: '105',
      weight: '62',
      height: '160',
      muac: '23.5',
      capillaryRefill: '2.0',
      avpu: 'Alert',
    },
    symptoms: ['Fever', 'Headache', 'Chills', 'Nausea', 'Vomiting', 'Fatigue', 'Muscle Pain'],
    chiefComplaint: 'High body fever, chills, and vomiting for 3 days in 24-week pregnant female',
    icd10Codes: ['B50.9', 'O98.6'],
    notes: 'Conscious, oriented, mild palmar pallor, uterine fundus 24cm, fetal heart rate 145bpm.',
  };

  it('Scenario 2: Formats ALL Reproductive Health & Chronic Condition fields into RAG query', () => {
    const query = buildClinicalRagQuery(scenario2ModerateData);

    expect(query).toContain('Name: Amina Said');
    expect(query).toContain('Age: 28yo');
    expect(query).toContain('Pregnancy Status: Pregnant');
    expect(query).toContain('Estimated Due Date: 2026-11-15');
    expect(query).toContain('Gravida (Total Pregnancies): 3');
    expect(query).toContain('Parity (Live Births): 2');
    expect(query).toContain('Allergies: Penicillin');
    expect(query).toContain('Pre-existing Conditions: Mild Asthma');
    expect(query).toContain('Current Home Medications: Salbutamol Inhaler');
    expect(query).toContain('Drinking Water Source: well');
    expect(query).toContain('Sanitation/Latrine Type: pit_latrine');
    expect(query).toContain('Temp 38.8°C');
    expect(query).toContain('HR 104bpm');
    expect(query).toContain('B50.9, O98.6');
  });

  it('Scenario 2: Evaluates HIGH severity & referral recommendation due to Gestational Malaria pyrexia', () => {
    const guide = evaluateClinicalGuide(scenario2ModerateData, ['StatPearls Gestational Malaria']);

    expect(guide.severity_assessment).toBe('HIGH');
    expect(guide.disposition_recommendation).toBe('REFERRAL_RECOMMENDED');
    expect(guide.differential_diagnoses[0].friendly_title).toContain('Maternal Malaria');
    expect(guide.differential_diagnoses[0].clinical_term).toContain('Plasmodium Falciparum');
    expect(guide.recommended_treatments[0].medication_name).toContain('Coartem');
    expect(guide.recommended_treatments[0].friendly_notes).toContain('If patient vomits within 30 minutes');
  });

  // =========================================================================
  // SCENARIO 3: CRITICAL RED-FLAG EMERGENCY SCENARIO (PEDIATRIC SAM + PNEUMONIA)
  // =========================================================================
  const scenario3CriticalData: PatientExaminationData = {
    patientId: 'pat_crit_003',
    fullName: 'Yonas Idris',
    age: 4,
    sex: 'male',
    uniqueGovID: 'ERI-112233',
    education: 'None',
    maritalStatus: 'single',
    occupation: 'Child',
    ethnicity: 'Saho',
    nationality: 'Eritrean',
    location: 'Debub, Mendefera, Adi Quala',
    householdSize: 8,
    waterSource: 'river',
    sanitationType: 'open_defecation',
    bloodType: 'B+',
    allergies: [],
    chronicConditions: ['Recurrent Chest Infections'],
    currentMedications: [],
    disabilities: [],
    isPregnant: false,
    vitals: {
      temperature: '39.6',
      bloodPressure: '75/45',
      heartRate: '148',
      respiratoryRate: '54',
      oxygenSaturation: '88',
      bloodSugar: '55',
      weight: '11.2',
      height: '92',
      muac: '11.2',
      capillaryRefill: '4.0',
      avpu: 'Pain',
    },
    symptoms: ['Fever', 'Cough', 'Shortness of Breath', 'Vomiting', 'Fatigue', 'Appetite Loss'],
    chiefComplaint: 'Severe difficulty breathing, lethargy, high fever, and inability to drink fluids',
    icd10Codes: ['J18.9', 'E43'],
    notes: 'Child is obtunded, responds only to painful stimuli. Severe lower chest wall indrawing, nasal flaring, grunting, bilateral crackles, MUAC 11.2cm.',
  };

  it('Scenario 3: Formats ALL Critical Pediatric & SAM Vitals fields into RAG query', () => {
    const query = buildClinicalRagQuery(scenario3CriticalData);

    expect(query).toContain('Name: Yonas Idris');
    expect(query).toContain('Age: 4yo');
    expect(query).toContain('Drinking Water Source: river');
    expect(query).toContain('Sanitation/Latrine Type: open_defecation');
    expect(query).toContain('Temp 39.6°C');
    expect(query).toContain('RR 54/min');
    expect(query).toContain('SpO2 88%');
    expect(query).toContain('MUAC 11.2cm');
    expect(query).toContain('Capillary Refill 4.0s');
    expect(query).toContain('Consciousness Level (AVPU): Pain');
    expect(query).toContain('J18.9, E43');
    expect(query).toContain('Severe lower chest wall indrawing');
  });

  it('Scenario 3: Triggers CRITICAL severity, urgent pre-referral protocol, and educational SAM briefing', () => {
    const guide = evaluateClinicalGuide(scenario3CriticalData, [
      'WHO Community Health Worker Emergency Guidelines',
      'StatPearls Severe Acute Malnutrition (SAM) & Pneumonia Protocol',
    ]);

    expect(guide.severity_assessment).toBe('CRITICAL');
    expect(guide.disposition_recommendation).toBe('REFERRAL_RECOMMENDED');
    expect(guide.educational_summary.pathophysiology_pearl).toContain('Severe Acute Malnutrition');
    expect(guide.educational_summary.clinical_mechanism).toContain('SpO2 88%');
    expect(guide.differential_diagnoses[0].friendly_title).toContain('Severe Pneumonia');
    expect(guide.recommended_treatments[0].medication_name).toContain('Oxygen Therapy');
    expect(guide.warning_signs_to_watch.length).toBeGreaterThan(0);
    expect(guide.chw_teaching_points.length).toBeGreaterThan(0);
  });

  it('Renders ClinicalAiGuideModal correctly with full educational UI sections when opened', async () => {
    render(
      <ClinicalAiGuideModal
        isOpen={true}
        onClose={vi.fn()}
        examData={scenario3CriticalData}
      />
    );

    // Verify modal header & educational briefing render
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Volunteer Clinical AI Guide & Educator/i })).toBeInTheDocument();
      expect(screen.getByText(/Educational Clinical Briefing/i)).toBeInTheDocument();
      expect(screen.getByText(/Severe Pneumonia & Severe Malnutrition/i)).toBeInTheDocument();
      expect(screen.getByText(/Volunteer Learning & Family Teaching Points/i)).toBeInTheDocument();
    });
  });
});
