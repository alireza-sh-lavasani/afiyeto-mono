import { generatePatientIdInitials } from '@afiyet/shared';
import { patientsDb } from './couch.js';
import { generatePatientId, clearSequenceCache } from './id-generator.js';

let queuePromise = Promise.resolve();

/**
 * Reconciles temporary patient IDs with permanent sequential IDs
 */
async function handlePatientIdReconciliation(doc: any) {
  const patientName = doc.name || doc.fullName || '';
  const birthDate = doc.birthDate;

  if (!patientName || !birthDate) {
    console.warn(`[Couch Daemon] Document ${doc._id} is missing name or birthDate. Skipping.`);
    return;
  }

  try {
    // 1. Generate new permanent ID
    const newPatientId = await generatePatientId(patientName, birthDate);
    
    // 2. Refresh document metadata or get latest to minimize conflicts
    let latestDoc = doc;
    try {
      latestDoc = await patientsDb.get(doc._id);
    } catch (err) {
      console.warn(`[Couch Daemon] Could not fetch latest doc for ${doc._id}, using change feed doc.`);
    }

    if (latestDoc.patientId) {
      console.log(`[Couch Daemon] Patient ${doc._id} already has patientId: ${latestDoc.patientId}. Skipping.`);
      return;
    }

    // 3. Update document with permanent ID
    const updatedDoc = {
      ...latestDoc,
      patientId: newPatientId,
      updatedAt: new Date().toISOString(),
    };

    await patientsDb.insert(updatedDoc);
    console.log(`[Couch Daemon] Successfully reconciled patient doc ${doc._id} -> permanent ID: ${newPatientId}`);
  } catch (error: any) {
    // Clear cache on conflicts so we don't leak sequence numbers
    const { namePart, dateKey } = generatePatientIdInitials(patientName, birthDate);
    clearSequenceCache(namePart, dateKey);

    if (error.statusCode === 409) {
      console.warn(`[Couch Daemon] Conflict updating document ${doc._id}. Retrying on next changes stream tick.`);
    } else {
      console.error(`[Couch Daemon] Error reconciling patient ${doc._id}:`, error);
    }
  }
}

/**
 * Starts the CouchDB changes feed listener
 */
export function startCouchDaemon() {
  console.log('[Couch Daemon] Starting background listener on patient changes feed...');
  
  const feed = patientsDb.follow({
    since: 'now',
    include_docs: true,
  });

  feed.on('change', (change) => {
    const doc = change.doc;
    if (doc && doc.type === 'patient' && !doc.patientId && doc.tmpPatientId) {
      console.log(`[Couch Daemon] Detected patient document needing reconciliation: ${doc._id}`);
      // Push execution to the sequential async queue
      queuePromise = queuePromise.then(() => handlePatientIdReconciliation(doc));
    }
  });

  feed.on('error', (err) => {
    console.error('[Couch Daemon] Changes feed encountered an error:', err);
  });

  feed.follow();
  console.log('[Couch Daemon] Background listener is active.');
}
