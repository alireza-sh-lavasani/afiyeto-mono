import PouchDB from 'pouchdb-browser';
import { Patient, Examination } from '@afiyet/shared';

// 1. Initialize local databases
export const patientsDb = new PouchDB<Patient>('afiyet_patients', { auto_compaction: true });
export const examinationsDb = new PouchDB<Examination>('afiyet_examinations', { auto_compaction: true });

// 2. Resolve remote CouchDB Base URL from environment variables
const COUCHDB_BASE_URL = import.meta.env.VITE_COUCHDB_BASE_URL || 'http://192.168.0.113:5984';
const COUCHDB_PATIENTS_URL = `${COUCHDB_BASE_URL}/afiyet_patients`;
const COUCHDB_EXAMINATIONS_URL = `${COUCHDB_BASE_URL}/afiyet_examinations`;

console.log(`CouchDB Base URL: ${COUCHDB_BASE_URL}`);
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

let patientSync: any;
let examSync: any;

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

// Start default live background sync
export function startLiveSync() {
  console.log('[PouchDB Sync] Initializing live background replication loops...');
  
  if (patientSync) patientSync.cancel();
  if (examSync) examSync.cancel();

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
}

// Force a manual synchronization (for debug/verification)
export async function forceManualSync() {
  console.warn('[PouchDB Sync] Manual resync requested by user. Temporarily pausing auto-replication...');
  
  // 1. Cancel the current background sync instances
  if (patientSync) patientSync.cancel();
  if (examSync) examSync.cancel();

  window.dispatchEvent(new CustomEvent('afiyet_sync_status', { detail: 'syncing' }));

  try {
    console.log('[PouchDB Sync] Performing manual one-shot sync for Patients...');
    await PouchDB.sync(patientsDb, remotePatientsDb, { live: false });
    console.log('[PouchDB Sync] Patients database sync complete.');

    console.log('[PouchDB Sync] Performing manual one-shot sync for Examinations...');
    await PouchDB.sync(examinationsDb, remoteExaminationsDb, { live: false });
    console.log('[PouchDB Sync] Examinations database sync complete.');

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
  patientSyncState = 'offline';
  examSyncState = 'offline';
  dispatchSyncStatus();
}

export default { patientsDb, examinationsDb, forceManualSync, startLiveSync, stopLiveSync };
