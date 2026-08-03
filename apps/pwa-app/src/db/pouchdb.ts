import PouchDB from 'pouchdb-browser';
import { Patient, Examination, ICustomEntry, IICD10Entry, ICD10_CODES } from '@afiyet/shared';

// 1. Initialize local databases
export const patientsDb = new PouchDB<Patient>('afiyet_patients', { auto_compaction: true });
export const examinationsDb = new PouchDB<Examination>('afiyet_examinations', { auto_compaction: true });
export const customEntriesDb = new PouchDB<ICustomEntry>('afiyet_custom_entries', { auto_compaction: true });
export const icd10Db = new PouchDB<IICD10Entry & { _id: string; _rev?: string }>('afiyet_icd10', { auto_compaction: true });

// 2. Resolve remote CouchDB Base URL from environment variables
const COUCHDB_BASE_URL = import.meta.env.VITE_COUCHDB_BASE_URL || 'http://192.168.0.113:5984';
const COUCHDB_PATIENTS_URL = `${COUCHDB_BASE_URL}/afiyet_patients`;
const COUCHDB_EXAMINATIONS_URL = `${COUCHDB_BASE_URL}/afiyet_examinations`;
const COUCHDB_CUSTOM_ENTRIES_URL = `${COUCHDB_BASE_URL}/afiyet_custom_entries`;
const COUCHDB_ICD10_URL = `${COUCHDB_BASE_URL}/afiyet_icd10`;

console.log(`CouchDB Base URL: ${COUCHDB_BASE_URL}`);
console.log(`CouchDB Patients Remote URL: ${COUCHDB_PATIENTS_URL}`);
console.log(`CouchDB Examinations Remote URL: ${COUCHDB_EXAMINATIONS_URL}`);
console.log(`CouchDB Custom Entries Remote URL: ${COUCHDB_CUSTOM_ENTRIES_URL}`);
console.log(`CouchDB ICD-10 Remote URL: ${COUCHDB_ICD10_URL}`);

export type TSyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

let patientSyncState: TSyncStatus = 'synced';
let examSyncState: TSyncStatus = 'synced';
let customEntriesSyncState: TSyncStatus = 'synced';
let icd10SyncState: TSyncStatus = 'synced';

const dispatchSyncStatus = () => {
  if (!navigator.onLine) {
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'offline' }));
    return;
  }
  if (
    patientSyncState === 'error' ||
    examSyncState === 'error' ||
    customEntriesSyncState === 'error' ||
    icd10SyncState === 'error'
  ) {
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'error' }));
    return;
  }
  if (
    patientSyncState === 'syncing' ||
    examSyncState === 'syncing' ||
    customEntriesSyncState === 'syncing' ||
    icd10SyncState === 'syncing'
  ) {
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'syncing' }));
    return;
  }
  window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'synced' }));
};

// 3. Initiate native bidirectional synchronization
let remotePatientsDb: any = null;
let remoteExaminationsDb: any = null;
let remoteCustomEntriesDb: any = null;
let remoteIcd10Db: any = null;

let patientSync: any;
let examSync: any;
let customEntriesSync: any;
let icd10Sync: any;

function initRemoteDbs() {
  remotePatientsDb = new PouchDB(COUCHDB_PATIENTS_URL);
  remoteExaminationsDb = new PouchDB(COUCHDB_EXAMINATIONS_URL);
  remoteCustomEntriesDb = new PouchDB(COUCHDB_CUSTOM_ENTRIES_URL);
  remoteIcd10Db = new PouchDB(COUCHDB_ICD10_URL);
}

function setupSyncHandlers(syncInstance: any, dbName: string, stateSetter: (state: TSyncStatus) => void) {
  return syncInstance
    .on('change', (info: any) => {
      console.log(`[PouchDB Sync] [${dbName}] Documents changed/synced successfully:`, info);
      window.dispatchEvent(new CustomEvent('afiyet_data_changed'));
    })
    .on('paused', (err: any) => {
      if (err) {
        console.error(`[PouchDB Sync] [${dbName}] Replication paused due to connection error (Check CORS/Network):`, err);
        stateSetter('error');
      } else {
        console.log(`[PouchDB Sync] [${dbName}] Replication paused. Databases are fully up-to-date.`);
        stateSetter('synced');
      }
      dispatchSyncStatus();
    })
    .on('active', () => {
      console.log(`[PouchDB Sync] [${dbName}] Replication active (transferring data)...`);
      stateSetter('syncing');
      dispatchSyncStatus();
    })
    .on('error', (err: any) => {
      console.error(`[PouchDB Sync] [${dbName}] Critical replication error:`, err);
      stateSetter('error');
      dispatchSyncStatus();
    });
}

// Seed test patients and clinical visits if database is empty
export async function seedTestPatientsAndVisits() {
  try {
    const info = await patientsDb.info();
    if (info.doc_count <= 1) {
      console.log('[PouchDB Seed] Seeding Male & Female test patients (Mild & Critical cases)...');

      const patients = [
        {
          _id: 'patient_dawit_berhane_01',
          type: 'patient',
          fullName: 'Dawit Berhane',
          gender: 'male',
          dob: '1998-05-14',
          patientId: 'DB-19980514-MILD01',
          nationalId: 'NAT-77481',
          maritalStatus: 'single',
          createdAt: new Date().toISOString()
        },
        {
          _id: 'patient_saba_yohannes_02',
          type: 'patient',
          fullName: 'Saba Yohannes',
          gender: 'female',
          dob: '2023-01-20',
          patientId: 'SY-20230120-CRIT02',
          nationalId: 'NAT-99312',
          maritalStatus: 'single',
          createdAt: new Date().toISOString()
        },
        {
          _id: 'patient_abeba_haile_03',
          type: 'patient',
          fullName: 'Abeba Haile',
          gender: 'female',
          dob: '1992-11-03',
          patientId: 'AH-19921103-MILD03',
          nationalId: 'NAT-44109',
          maritalStatus: 'married',
          createdAt: new Date().toISOString()
        },
        {
          _id: 'patient_yemane_tecle_04',
          type: 'patient',
          fullName: 'Yemane Tecle',
          gender: 'male',
          dob: '1965-08-19',
          patientId: 'YT-19650819-CRIT04',
          nationalId: 'NAT-11205',
          maritalStatus: 'married',
          createdAt: new Date().toISOString()
        }
      ];

      const exams = [
        {
          _id: 'exam_dawit_mild_01',
          type: 'examination',
          patientId: 'patient_dawit_berhane_01',
          createdAt: new Date().toISOString(),
          vitals: { temperature: 37.0, heartRate: 72, systolicBp: 120, diastolicBp: 80 },
          chiefComplaint: 'Mild rhinitis, sneezing, and low-grade fatigue for 2 days.',
          symptoms: ['Sneezing', 'Nasal Congestion', 'Mild Fatigue'],
          notes: 'Patient alert, normal hydration. Mild seasonal rhinitis without fever.'
        },
        {
          _id: 'exam_saba_critical_02',
          type: 'examination',
          patientId: 'patient_saba_yohannes_02',
          createdAt: new Date().toISOString(),
          vitals: { temperature: 39.8, heartRate: 160, systolicBp: 75, diastolicBp: 45 },
          chiefComplaint: 'Severe dehydrating diarrhea, repeated vomiting, floppy limp body, high fever.',
          symptoms: ['Vomiting', 'Severe Diarrhea', 'Lethargy', 'Sunken Eyes', 'High Fever'],
          notes: 'PEDIATRIC EMERGENCY: Child is floppy, lethargic, unable to drink fluids. Suspected severe dehydration and severe malaria.'
        },
        {
          _id: 'exam_abeba_mild_03',
          type: 'examination',
          patientId: 'patient_abeba_haile_03',
          createdAt: new Date().toISOString(),
          vitals: { temperature: 36.8, heartRate: 68, systolicBp: 115, diastolicBp: 75 },
          chiefComplaint: 'Mild localized skin rash on left forearm after gardening.',
          symptoms: ['Localized Skin Rash', 'Mild Itching'],
          notes: 'Mild contact dermatitis. No systemic signs, airway involvement, or fever.'
        },
        {
          _id: 'exam_yemane_critical_04',
          type: 'examination',
          patientId: 'patient_yemane_tecle_04',
          createdAt: new Date().toISOString(),
          vitals: { temperature: 38.5, heartRate: 125, systolicBp: 85, diastolicBp: 50 },
          chiefComplaint: 'Crushing substernal chest pain radiating to left jaw, severe dyspnea, diaphoresis.',
          symptoms: ['Chest Pain', 'Shortness of Breath', 'Cold Sweats', 'Hypotension'],
          notes: 'ACUTE CARDIAC EMERGENCY: Suspected Acute Coronary Syndrome / Myocardial Infarction. Requires immediate IV access and urgent hospital transfer.'
        }
      ];

      await patientsDb.bulkDocs(patients);
      await examinationsDb.bulkDocs(exams);
      console.log('[PouchDB Seed] Successfully seeded 4 test patients & visits.');
    }
  } catch (err) {
    console.error('[PouchDB Seed] Error seeding test patients:', err);
  }
}

// Seed the ICD-10 database on first load if it is empty
export async function seedICD10Database() {
  try {
    const info = await icd10Db.info();
    if (info.doc_count === 0) {
      console.log('[ICD-10] Seeding offline ICD-10 database with presets...');
      const docs = ICD10_CODES.map((entry) => ({
        _id: `icd10_${entry.code.replace(/\./g, '_')}`,
        code: entry.code,
        description: entry.description,
        category: entry.category,
      }));
      await icd10Db.bulkDocs(docs);
      console.log(`[ICD-10] Seeded ${docs.length} ICD-10 codes successfully.`);
    } else {
      console.log(`[ICD-10] Database already contains ${info.doc_count} codes.`);
    }
  } catch (err) {
    console.error('[ICD-10] Failed to seed database:', err);
  }
}

// Start default live background sync
export function startLiveSync() {
  console.log('[PouchDB Sync] Initializing live background replication loops...');
  
  if (patientSync) patientSync.cancel();
  if (examSync) examSync.cancel();
  if (customEntriesSync) customEntriesSync.cancel();
  if (icd10Sync) icd10Sync.cancel();

  // Fresh remote instances clear browser-cached socket errors/CORS blocks on reconnect
  initRemoteDbs();

  // Seed the ICD-10 database and test patients
  seedICD10Database();
  seedTestPatientsAndVisits();

  patientSync = PouchDB.sync(patientsDb, remotePatientsDb, {
    live: true,
    retry: true,
  });
  setupSyncHandlers(patientSync, 'Patients', (status) => {
    patientSyncState = status;
  });

  examSync = PouchDB.sync(examinationsDb, remoteExaminationsDb, {
    live: true,
    retry: true,
  });
  setupSyncHandlers(examSync, 'Examinations', (status) => {
    examSyncState = status;
  });

  customEntriesSync = PouchDB.sync(customEntriesDb, remoteCustomEntriesDb, {
    live: true,
    retry: true,
  });
  setupSyncHandlers(customEntriesSync, 'CustomEntries', (status) => {
    customEntriesSyncState = status;
  });

  icd10Sync = PouchDB.sync(icd10Db, remoteIcd10Db, {
    live: true,
    retry: true,
  });
  setupSyncHandlers(icd10Sync, 'ICD10', (status) => {
    icd10SyncState = status;
  });
}

// Force a manual synchronization (for debug/verification)
export async function forceManualSync() {
  console.warn('[PouchDB Sync] Manual resync requested by user. Temporarily pausing auto-replication...');
  
  // 1. Cancel the current background sync instances
  if (patientSync) patientSync.cancel();
  if (examSync) examSync.cancel();
  if (customEntriesSync) customEntriesSync.cancel();
  if (icd10Sync) icd10Sync.cancel();

  // Fresh remote instances clear browser-cached socket errors/CORS blocks on reconnect
  initRemoteDbs();

  window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'syncing' }));

  try {
    console.log('[PouchDB Sync] Performing manual one-shot sync for Patients...');
    await PouchDB.sync(patientsDb, remotePatientsDb, { live: false });
    console.log('[PouchDB Sync] Patients database sync complete.');

    console.log('[PouchDB Sync] Performing manual one-shot sync for Examinations...');
    await PouchDB.sync(examinationsDb, remoteExaminationsDb, { live: false });
    console.log('[PouchDB Sync] Examinations database sync complete.');

    console.log('[PouchDB Sync] Performing manual one-shot sync for Custom Entries...');
    await PouchDB.sync(customEntriesDb, remoteCustomEntriesDb, { live: false });
    console.log('[PouchDB Sync] Custom Entries database sync complete.');

    console.log('[PouchDB Sync] Performing manual one-shot sync for ICD-10 Codes...');
    await PouchDB.sync(icd10Db, remoteIcd10Db, { live: false });
    console.log('[PouchDB Sync] ICD-10 Codes database sync complete.');

    console.log('[PouchDB Sync] Manual sync succeeded.');
    
    // Dispatch success notifications & reload views
    window.dispatchEvent(new CustomEvent('afiyet_data_changed'));
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'synced' }));
    window.dispatchEvent(new CustomEvent('afiyet_sync_toast', {
      detail: { type: 'success', message: 'Synchronization completed! Local data is now up-to-date with server.' }
    }));
  } catch (error: any) {
    console.error('[PouchDB Sync] Manual sync failed:', error);
    
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'error' }));
    window.dispatchEvent(new CustomEvent('afiyet_sync_toast', {
      detail: { type: 'error', message: `Sync failed: ${error.message || 'Check database server connection & CORS permissions.'}` }
    }));
  } finally {
    // 2. Restart background auto-replication
    startLiveSync();
  }
}

export function stopLiveSync() {
  console.log('[PouchDB Sync] Cancelling active replication loops due to offline status.');
  if (patientSync) {
    patientSync.cancel();
    patientSync = null;
  }
  if (examSync) {
    examSync.cancel();
    examSync = null;
  }
  if (customEntriesSync) {
    customEntriesSync.cancel();
    customEntriesSync = null;
  }
  if (icd10Sync) {
    icd10Sync.cancel();
    icd10Sync = null;
  }
  patientSyncState = 'offline';
  examSyncState = 'offline';
  customEntriesSyncState = 'offline';
  icd10SyncState = 'offline';
  dispatchSyncStatus();
}

export default {
  patientsDb,
  examinationsDb,
  customEntriesDb,
  icd10Db,
  seedICD10Database,
  forceManualSync,
  startLiveSync,
  stopLiveSync,
};
