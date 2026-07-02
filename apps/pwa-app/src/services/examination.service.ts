import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { Examination, EIdType } from '@afiyet/shared';
import { examinationsDb, patientsDb } from '../db/pouchdb.ts';
import { usePatientService } from './patient.service.ts';

export const useExaminationService = (patientId: string, idType: EIdType) => {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(false);
  const { getPatientById } = usePatientService();

  const getExaminationById = useCallback(async (examinationId: string): Promise<Examination | undefined> => {
    try {
      const result = await examinationsDb.allDocs({ include_docs: true });
      return result.rows
        .map(row => row.doc)
        .find((doc): doc is Examination => !!doc && doc.type === 'examination' && doc.examinationId === examinationId);
    } catch (error) {
      console.error('Error getting examination by ID:', error);
      return undefined;
    }
  }, []);

  const getPatientExaminations = useCallback(async (): Promise<Examination[]> => {
    try {
      setLoading(true);
      const patient = await getPatientById(patientId);
      if (!patient) return [];

      const result = await examinationsDb.allDocs({ include_docs: true });
      const allExams = result.rows
        .map(row => row.doc)
        .filter((doc): doc is Examination => !!doc && doc.type === 'examination');

      // Filter by the patient's examinations list
      const patientExams = (patient.examinations || [])
        .map(examId => allExams.find(e => e.examinationId === examId))
        .filter((e): e is Examination => !!e)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setExaminations(patientExams);
      return patientExams;
    } catch (error) {
      console.error('Error loading patient examinations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [patientId, getPatientById]);

  const createExamination = async (examinationData: Omit<Examination, '_id' | 'type' | 'createdAt' | 'updatedAt' | 'examinationId'>): Promise<Examination> => {
    try {
      const examinationId = nanoid();
      const _id = nanoid();

      const newExamination: Examination = {
        ...examinationData as any,
        _id,
        examinationId,
        type: 'examination' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Write examination to local DB (Sync engine will automatically sync this change to CouchDB)
      await examinationsDb.put(newExamination);

      // 2. Link examination to patient document
      const patient = await getPatientById(patientId);
      if (patient) {
        const updatedPatient = {
          ...patient,
          examinations: [...(patient.examinations || []), examinationId],
          updatedAt: new Date().toISOString(),
        };
        await patientsDb.put(updatedPatient);
        // Alert that patient list might have changed
        window.dispatchEvent(new CustomEvent('afiyet_data_changed'));
      }

      console.log('[Examination Service] Examination document created and linked to patient.');
      getPatientExaminations();
      return newExamination;
    } catch (error) {
      console.error('Error creating examination:', error);
      throw error;
    }
  };

  const updateExamination = async (id: string, examinationData: Partial<Examination>) => {
    try {
      const existingExam = await getExaminationById(id);
      if (!existingExam) {
        throw new Error('Examination not found');
      }

      const updatedExam: Examination = {
        ...existingExam,
        ...examinationData as any,
        updatedAt: new Date().toISOString(),
      };

      await examinationsDb.put(updatedExam);

      console.log('[Examination Service] Updated examination saved.');
      getPatientExaminations();
    } catch (error) {
      console.error('Error updating examination:', error);
      throw error;
    }
  };

  const deleteExamination = async (id: string) => {
    try {
      const existingExam = await getExaminationById(id);
      if (!existingExam) {
        throw new Error('Examination not found');
      }

      await examinationsDb.remove(existingExam._id, existingExam._rev!);

      // Unlink from patient
      const patient = await getPatientById(patientId);
      if (patient) {
        const updatedPatient = {
          ...patient,
          examinations: (patient.examinations || []).filter(examId => examId !== existingExam.examinationId),
          updatedAt: new Date().toISOString(),
        };
        await patientsDb.put(updatedPatient);
        window.dispatchEvent(new CustomEvent('afiyet_data_changed'));
      }

      console.log('[Examination Service] Deleted examination.');
      getPatientExaminations();
    } catch (error) {
      console.error('Error deleting examination:', error);
      throw error;
    }
  };

  // Re-fetch patient examinations when global data updates
  useEffect(() => {
    getPatientExaminations();

    const handleRefresh = () => {
      getPatientExaminations();
    };

    window.addEventListener('afiyet_data_changed', handleRefresh);

    return () => {
      window.removeEventListener('afiyet_data_changed', handleRefresh);
    };
  }, [getPatientExaminations]);

  return {
    examinations,
    loading,
    getPatientExaminations,
    getExaminationById,
    createExamination,
    updateExamination,
    deleteExamination,
  };
};
