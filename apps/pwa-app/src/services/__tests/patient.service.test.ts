import { renderHook, act } from '@testing-library/react';
import { usePatientService } from '../patient.service.ts';
import { Patient } from '@afiyet/shared';
import { patientsDb } from '../../db/pouchdb.ts';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pouchdb databases
vi.mock('../../db/pouchdb.ts', () => {
  return {
    patientsDb: {
      put: vi.fn().mockResolvedValue({ ok: true }),
      allDocs: vi.fn().mockResolvedValue({
        rows: [
          {
            doc: {
              _id: 'doc1',
              type: 'patient',
              fullName: 'John Doe',
              birthDate: '1990-01-01T00:00:00.000Z',
              gender: 'male',
              phoneNumber: '1234567890',
              residenceZoba: 'Anseba',
              residenceSubZoba: 'Keren',
              residenceVillage: 'Keren City',
              householdSize: 4,
              createdAt: '2026-07-09T10:00:00.000Z',
              updatedAt: '2026-07-09T10:00:00.000Z',
              examinations: [],
              tmpPatientId: 'JD900101XYZ1234',
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

describe('Patient Service Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully get all patients', async () => {
    const { result } = renderHook(() => usePatientService());

    let patientsList!: Patient[];
    await act(async () => {
      patientsList = await result.current.getAllPatients();
    });

    expect(patientsDb.allDocs).toHaveBeenCalledWith({ include_docs: true });
    expect(patientsList).toBeDefined();
    expect(patientsList.length).toBe(1);
    expect(patientsList[0].fullName).toBe('John Doe');
  });

  it('should successfully create a new patient doc and write it to PouchDB', async () => {
    const { result } = renderHook(() => usePatientService());

    const patientDataInput = {
      fullName: 'Alice Smith',
      birthDate: '1995-05-15',
      gender: 'female' as const,
      phoneNumber: '9876543210',
      nationality: 'Eritrean',
      bloodType: 'a_positive' as const,
      residenceZoba: 'Debub' as any,
      residenceSubZoba: 'Mendefera' as any,
      residenceVillage: 'Mendefera Village',
      householdSize: '5' as any,
      waterSource: 'piped_water',
      sanitationType: 'flush_toilet',
      isPregnant: true,
      pregnancyDueDate: '2026-11-20',
      numberOfPregnancies: '1' as any,
      numberOfLiveBirths: '0' as any,
      allergies: ['Penicillin'],
      chronicConditions: ['Asthma'],
      currentMedications: ['Albuterol inhaler'],
      disabilities: [] as any,
    };

    let createdPatient!: Patient;
    await act(async () => {
      createdPatient = await result.current.createPatient(patientDataInput as any);
    });

    expect(createdPatient).toBeDefined();
    expect(createdPatient.fullName).toBe('Alice Smith');
    expect(createdPatient.tmpPatientId).toBeDefined();
    // Initials check (Alice Smith born 1995-05-15 should start with AS950515)
    expect(createdPatient.tmpPatientId!.substring(0, 10)).toBe('AS19950515');
    expect(createdPatient.type).toBe('patient');
    expect(createdPatient.isPregnant).toBe(true);

    // Verify PouchDB write
    expect(patientsDb.put).toHaveBeenCalledTimes(1);
    expect(patientsDb.put).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Alice Smith',
        type: 'patient',
        isPregnant: true,
        tmpPatientId: expect.any(String),
      })
    );
  });
});
