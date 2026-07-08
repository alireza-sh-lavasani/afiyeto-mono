import { generatePatientIdInitials } from '@afiyet/shared';
import { patientsDb } from './couch.js';

// Local sequence cache to prevent race conditions during concurrent replication batches
const sequenceCache = new Map<string, number>();

/**
 * Helper to clear cache entry if a document insert fails (e.g. on conflict)
 */
export function clearSequenceCache(namePart: string, dateKey: string) {
  const cacheKey = `${namePart}:${dateKey}`;
  sequenceCache.delete(cacheKey);
  console.log(`[ID Generator] Cleared sequence cache for: ${cacheKey}`);
}

/**
 * Generates a unique, sequential patient ID based on name initials and birth date
 */
export async function generatePatientId(fullName: string, birthDateIso: string): Promise<string> {
  const { namePart, dateKey } = generatePatientIdInitials(fullName, birthDateIso);
  const cacheKey = `${namePart}:${dateKey}`;

  // 1. Check in-memory sequence cache first
  if (sequenceCache.has(cacheKey)) {
    const nextSeq = sequenceCache.get(cacheKey)! + 1;
    sequenceCache.set(cacheKey, nextSeq);
    const generatedId = `${namePart}${dateKey}${nextSeq}`;
    console.log(`[ID Generator] Generated sequential ID from cache: ${generatedId}`);
    return generatedId;
  }

  // 2. If not cached, query CouchDB view to find the maximum existing sequence number
  try {
    const response = await patientsDb.view('sequences', 'by_initials_date', {
      startkey: [namePart, dateKey, {}], // {} is the highest value in CouchDB sorting representation
      endkey: [namePart, dateKey],
      descending: true,
      limit: 1,
    });

    let maxSeq = 999; // Default starting sequence minus one (so the next is 1000)

    if (response.rows.length > 0) {
      const highestKey = response.rows[0].key as unknown as [string, string, number];
      if (Array.isArray(highestKey) && highestKey.length === 3 && typeof highestKey[2] === 'number') {
        maxSeq = highestKey[2];
      }
    }

    const nextSeq = maxSeq + 1;
    sequenceCache.set(cacheKey, nextSeq);
    const generatedId = `${namePart}${dateKey}${nextSeq}`;
    console.log(`[ID Generator] Generated sequential ID from CouchDB View: ${generatedId}`);
    return generatedId;
  } catch (error) {
    console.error(`[ID Generator] Error querying sequences view for ${cacheKey}:`, error);
    throw error;
  }
}
