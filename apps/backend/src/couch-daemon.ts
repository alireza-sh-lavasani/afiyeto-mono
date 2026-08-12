import { generatePatientIdInitials } from '@afiyet/shared';
import { patientsDb } from './couch.js';
import { generatePatientId, clearSequenceCache } from './id-generator.js';

let queuePromise = Promise.resolve();

/**
 * Reconciles temporary patient IDs with permanent sequential IDs
 */
async function handlePatientIdReconciliation(doc: any) {
  let firstName = doc.firstName || '';
  let lastName = doc.lastName || '';
  const birthDate = doc.birthDate;

  if (!birthDate) {
    console.warn(`[Couch Daemon] Document ${doc._id} is missing birthDate. Skipping.`);
    return;
  }

  if (!firstName || !lastName) {
    const fullName = doc.fullName || doc.name || '';
    if (!fullName) {
      console.warn(`[Couch Daemon] Document ${doc._id} is missing name/firstName/lastName. Skipping.`);
      return;
    }
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  try {
    // 1. Generate new permanent ID
    const newPatientId = await generatePatientId(firstName, lastName, birthDate);
    
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
    const { namePart, dateKey } = generatePatientIdInitials(firstName, lastName, birthDate);
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
  
  const feed = patientsDb.changesReader.start({
    since: 'now',
    includeDocs: true,
  });

  feed.on('change', (change: any) => {
    const doc = change.doc;
    if (doc) {
      const rev = change.changes?.[0]?.rev || 'unknown';
      console.log(`[Couch Daemon] [Change Event] Received update for docId: ${doc._id}, type: ${doc.type || 'unknown'}, rev: ${rev}`);
      
      if (doc.type === 'patient' && !doc.patientId && doc.tmpPatientId) {
        console.log(`[Couch Daemon] [Action Required] Patient document ${doc._id} (tmpPatientId: ${doc.tmpPatientId}) is missing a permanent sequential ID. Enqueuing for reconciliation...`);
        // Push execution to the sequential async queue
        queuePromise = queuePromise.then(() => handlePatientIdReconciliation(doc));
      }
    }
  });

  feed.on('error', (err: any) => {
    console.error('[Couch Daemon] Changes feed encountered an error:', err);
  });

  console.log('[Couch Daemon] Background listener is active.');
}
