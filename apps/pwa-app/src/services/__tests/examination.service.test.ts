import { renderHook, act } from '@testing-library/react';
import { useExaminationService } from '../examination.service.ts';
import { examinationsDb, patientsDb } from '../../db/pouchdb.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EIdType, Examination } from '@afiyet/shared';

vi.mock('../../db/pouchdb.ts', () => {
  return {
    patientsDb: {
      put: vi.fn().mockResolvedValue({ ok: true }),
      allDocs: vi.fn().mockResolvedValue({
        rows: [
          {
            doc: {
              _id: 'patient123',
              type: 'patient',
              patientId: 'JD900101XYZ1234',
              fullName: 'John Doe',
              birthDate: '1990-01-01T00:00:00.000Z',
              examinations: [],
            },
          },
        ],
      }),
    },
    examinationsDb: {
      put: vi.fn().mockResolvedValue({ ok: true }),
      allDocs: vi.fn().mockResolvedValue({ rows: [] }),
    },
  };
});

describe('Examination Service Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new examination and link it to the patient', async () => {
    const { result } = renderHook(() => useExaminationService('patient123', EIdType.PERMANENT));

    const examDataInput = {
      zoba: 'Anseba',
      subZoba: 'Keren',
      localDistrict: 'District A',
      longitude: '38.9',
      latitude: '15.3',
      address: 'Clinic Keren',
      temperature: '37.2',
      bloodPressureSystolic: '120',
      bloodPressureDiastolic: '80',
      heartRate: '75',
      respiratoryRate: '16',
      oxygenSaturation: '98',
      bloodSugar: '95',
      weight: '70',
      height: '175',
      bmi: '22.9',
      muac: '28',
      painScale: 2,
      dehydrationLevel: 'none',
      consciousnessLevel: 'alert',
      rapidTests: {
        malariaRdt: { performed: true, result: 'negative', parasiteType: 'unknown' },
        hivTest: { performed: false, result: 'non_reactive' },
        hbvTest: { performed: false, result: 'negative' },
        hcvTest: { performed: false, result: 'negative' },
        urineDipstick: {
          performed: false,
          glucose: 'negative',
          protein: 'negative',
          blood: 'negative',
          leukocytes: 'negative',
          nitrites: 'negative',
          ketones: 'negative',
        },
        pregnancyTest: { performed: false, result: 'negative' },
        hemoglobin: { performed: true, value: 14.2 },
        bloodTyping: { performed: false, type: 'unknown' },
      },
      clinicalAssessment: {
        chiefComplaint: 'Routine checkup',
        clinicalNotes: 'Patient doing fine',
        provisionalDiagnosis: [],
        icdCodes: [],
        severity: 'mild',
        treatmentGiven: 'None',
        prescriptions: [],
        referralNeeded: false,
        referralFacility: '',
        referralReason: '',
        followUpDate: '',
        followUpNotes: '',
      },
      reproductiveHealth: {
        isPregnant: false,
        breastfeedingStatus: 'none',
        lastMenstrualPeriod: '',
        gestationalWeeks: '',
        fetalHeartRate: '',
        fundalHeight: '',
      },
      notes: 'Test notes',
    };

    let createdExam!: Examination;
    await act(async () => {
      createdExam = await result.current.createExamination(examDataInput as any);
    });

    expect(createdExam).toBeDefined();
    expect(createdExam.examinationId).toBeDefined();
    expect(createdExam.type).toBe('examination');
    expect(createdExam.rapidTests!.hemoglobin!.value).toBe(14.2);

    // Verify PouchDB writes:
    // 1. Examination put
    expect(examinationsDb.put).toHaveBeenCalledTimes(1);
    expect(examinationsDb.put).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'examination',
        examinationId: createdExam.examinationId,
        temperature: '37.2',
      })
    );

    // 2. Patient put (linking the examinationId to patient document)
    expect(patientsDb.put).toHaveBeenCalledTimes(1);
    expect(patientsDb.put).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'patient123',
        fullName: 'John Doe',
        examinations: [createdExam.examinationId],
      })
    );
  });
});
