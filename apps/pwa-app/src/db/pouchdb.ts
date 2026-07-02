import PouchDB from 'pouchdb-browser';
import { Patient, Examination } from '@afiyet/shared';

// 1. Initialize local databases
export const patientsDb = new PouchDB<Patient>('afiyet_patients', { auto_compaction: true });
export const examinationsDb = new PouchDB<Examination>('afiyet_examinations', { auto_compaction: true });

// 2. Resolve remote CouchDB URLs from environment variables
const COUCHDB_PATIENTS_URL = import.meta.env.VITE_COUCHDB_PATIENTS_URL || 'http://192.168.0.113:5984/afiyet_patients';
const COUCHDB_EXAMINATIONS_URL = import.meta.env.VITE_COUCHDB_EXAMINATIONS_URL || 'http://192.168.0.113:5984/afiyet_examinations';

console.log(`CouchDB Patients Remote URL: ${COUCHDB_PATIENTS_URL}`);
console.log(`CouchDB Examinations Remote URL: ${COUCHDB_EXAMINATIONS_URL}`);

export type TSyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

let patientSyncState: TSyncStatus = 'synced';
let examSyncState: TSyncStatus = 'synced';

const dispatchSyncStatus = () => {
  if (!navigator.onLine) {
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'offline' }));
    return;
  }
  if (patientSyncState === 'error' || examSyncState === 'error') {
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'error' }));
    return;
  }
  if (patientSyncState === 'syncing' || examSyncState === 'syncing') {
    window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'syncing' }));
    return;
  }
  window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'synced' }));
};

// 3. Initiate native bidirectional synchronization
const remotePatientsDb = new PouchDB(COUCHDB_PATIENTS_URL);
const remoteExaminationsDb = new PouchDB(COUCHDB_EXAMINATIONS_URL);

const patientSync = PouchDB.sync(patientsDb, remotePatientsDb, {
  live: true,
  retry: true,
});

patientSync
  .on('change', (info) => {
    console.log('[PouchDB Sync] Patients changed:', info);
    // Notify lists to refresh
    window.dispatchEvent(new CustomEvent('afiyet_data_changed'));
  })
  .on('paused', (err) => {
    console.log('[PouchDB Sync] Patients sync paused (up-to-date)');
    patientSyncState = err ? 'error' : 'synced';
    dispatchSyncStatus();
  })
  .on('active', () => {
    console.log('[PouchDB Sync] Patients sync active');
    patientSyncState = 'syncing';
    dispatchSyncStatus();
  })
  .on('error', (err) => {
    console.error('[PouchDB Sync] Patients sync error:', err);
    patientSyncState = 'error';
    dispatchSyncStatus();
  });

const examSync = PouchDB.sync(examinationsDb, remoteExaminationsDb, {
  live: true,
  retry: true,
});

examSync
  .on('change', (info) => {
    console.log('[PouchDB Sync] Examinations changed:', info);
    // Notify lists to refresh
    window.dispatchEvent(new CustomEvent('afiyet_data_changed'));
  })
  .on('paused', (err) => {
    console.log('[PouchDB Sync] Examinations sync paused (up-to-date)');
    examSyncState = err ? 'error' : 'synced';
    dispatchSyncStatus();
  })
  .on('active', () => {
    console.log('[PouchDB Sync] Examinations sync active');
    examSyncState = 'syncing';
    dispatchSyncStatus();
  })
  .on('error', (err) => {
    console.error('[PouchDB Sync] Examinations sync error:', err);
    examSyncState = 'error';
    dispatchSyncStatus();
  });

// Handle browser network reconnect events to trigger check
window.addEventListener('online', () => {
  dispatchSyncStatus();
});
window.addEventListener('offline', () => {
  dispatchSyncStatus();
});

export default { patientsDb, examinationsDb };
