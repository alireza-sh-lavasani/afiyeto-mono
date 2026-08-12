import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { Patient, generatePatientIdInitials } from '@afiyet/shared';
import { patientsDb } from '../db/pouchdb.ts';

// Simple random alphanumeric suffix generator matching randomId(7)
const generateRandomSuffix = (length: number = 7): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const usePatientService = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  const getAllPatients = useCallback(async (): Promise<Patient[]> => {
    try {
      setLoading(true);
      const result = await patientsDb.allDocs({ include_docs: true });
      const patientsList = result.rows
        .map(row => row.doc)
        .filter((doc): doc is Patient & { _rev: string } => !!doc && doc.type === 'patient')
        .sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        });
      
      setPatients(patientsList);
      return patientsList;
    } catch (error) {
      console.error('Error fetching patients from PouchDB:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getPatientById = useCallback(async (id: string): Promise<Patient | undefined> => {
    try {
      const result = await patientsDb.allDocs({ include_docs: true });
      return result.rows
        .map(row => row.doc)
        .find((doc): doc is Patient & { _rev: string } => 
          !!doc && 
          doc.type === 'patient' && 
          (doc.patientId === id || doc.tmpPatientId === id || doc._id === id)
        );
    } catch (error) {
      console.error('Error getting patient by ID:', error);
      return undefined;
    }
  }, []);

  const createPatient = async (patientData: Omit<Patient, '_id' | 'type' | 'createdAt' | 'updatedAt' | 'examinations' | 'tmpPatientId'> & { birthDate: string }): Promise<Patient> => {
    try {
      let firstName = patientData.firstName || '';
      let lastName = patientData.lastName || '';
      if (!firstName && !lastName && (patientData as any).fullName) {
        const parts = (patientData as any).fullName.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      // 1. Generate initials and temporary patient ID
      const { namePart, dateKey } = generatePatientIdInitials(
        firstName,
        lastName,
        patientData.birthDate
      );
      const tmpPatientId = `${namePart}${dateKey}${generateRandomSuffix(7)}`;

      // 2. Prepare patient document
      const _id = nanoid();
      const newPatient: Patient = {
        ...patientData as any,
        _id,
        type: 'patient' as const,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        birthDate: new Date(patientData.birthDate),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        examinations: [] as any,
        tmpPatientId,
      };

      // 3. Put to PouchDB (Sync engine will automatically sync this change to CouchDB)
      await patientsDb.put(newPatient);

      console.log('[Patient Service] New patient document written to PouchDB');
      getAllPatients(); // Update react state
      return newPatient;
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  };

  const updatePatient = async (id: string, patientData: Partial<Patient> & { birthDate?: string }) => {
    try {
      const existingPatient = await getPatientById(id);
      if (!existingPatient) {
        throw new Error('Patient not found');
      }

      // Convert date string if provided
      const birthDate = patientData.birthDate ? new Date(patientData.birthDate) : existingPatient.birthDate;

      let fullName = existingPatient.fullName;
      if (patientData.firstName !== undefined || patientData.lastName !== undefined) {
        const first = patientData.firstName !== undefined ? patientData.firstName : existingPatient.firstName;
        const last = patientData.lastName !== undefined ? patientData.lastName : existingPatient.lastName;
        fullName = `${first || ''} ${last || ''}`.trim();
      }

      const updatedPatient: Patient = {
        ...existingPatient,
        ...patientData as any,
        fullName,
        birthDate,
        updatedAt: new Date().toISOString(),
      };

      await patientsDb.put(updatedPatient);

      console.log('[Patient Service] Updated patient record saved.');
      getAllPatients();
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      const existingPatient = await getPatientById(id);
      if (!existingPatient) {
        throw new Error('Patient not found');
      }

      await patientsDb.remove(existingPatient._id, existingPatient._rev!);

      console.log('[Patient Service] Deleted patient record.');
      getAllPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  };

  // Re-fetch patients whenever database changes occur globally
  useEffect(() => {
    getAllPatients();

    const handleRefresh = () => {
      getAllPatients();
    };

    window.addEventListener('afiyet_data_changed', handleRefresh);

    return () => {
      window.removeEventListener('afiyet_data_changed', handleRefresh);
    };
  }, [getAllPatients]);

  return {
    patients,
    loading,
    getAllPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
  };
};
