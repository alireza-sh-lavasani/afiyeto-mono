import nano from 'nano';
import dotenv from 'dotenv';

dotenv.config();

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://127.0.0.1:5984';
const COUCHDB_USER = process.env.COUCHDB_USER || 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD || 'password';

// Initialize Nano with auth
const couch = nano({
  url: COUCHDB_URL,
  requestDefaults: {
    auth: {
      username: COUCHDB_USER,
      password: COUCHDB_PASSWORD,
    },
  },
});

export const PATIENTS_DB_NAME = 'afiyet_patients';
export const EXAMINATIONS_DB_NAME = 'afiyet_examinations';
export const CUSTOM_ENTRIES_DB_NAME = 'afiyet_custom_entries';
export const ICD10_DB_NAME = 'afiyet_icd10';

export const patientsDb = couch.use(PATIENTS_DB_NAME);
export const examinationsDb = couch.use(EXAMINATIONS_DB_NAME);
export const customEntriesDb = couch.use(CUSTOM_ENTRIES_DB_NAME);
export const icd10Db = couch.use(ICD10_DB_NAME);

// Design Document for Patient ID Sequences View
const SEQUENCE_DESIGN_DOC_ID = '_design/sequences';
const sequenceDesignDoc = {
  _id: SEQUENCE_DESIGN_DOC_ID,
  views: {
    by_initials_date: {
      map: `function (doc) {
        if (doc.type === 'patient' && doc.patientId) {
          var namePart = doc.patientId.substring(0, 2);
          var dateKey = doc.patientId.substring(2, 10);
          var seqStr = doc.patientId.substring(10);
          var seqNum = parseInt(seqStr, 10);
          if (!isNaN(seqNum)) {
            emit([namePart, dateKey, seqNum], null);
          }
        }
      }`
    }
  }
};

/**
 * Ensures a database exists. If not, creates it.
 */
async function ensureDbExists(dbName: string) {
  try {
    const dbList = await couch.db.list();
    if (!dbList.includes(dbName)) {
      console.log(`[CouchDB] Database '${dbName}' does not exist. Creating...`);
      await couch.db.create(dbName);
      console.log(`[CouchDB] Database '${dbName}' created successfully.`);
    } else {
      console.log(`[CouchDB] Database '${dbName}' verified.`);
    }
  } catch (error) {
    console.error(`[CouchDB] Error verifying/creating database '${dbName}':`, error);
    throw error;
  }
}

/**
 * Ensures the sequences design document exists in the patients database.
 */
async function ensureDesignDocExists() {
  try {
    try {
      const existingDoc = await patientsDb.get(SEQUENCE_DESIGN_DOC_ID) as any;
      // Design document exists, check if map function matches to see if we need update
      const existingMap = existingDoc.views?.by_initials_date?.map;
      const targetMap = sequenceDesignDoc.views.by_initials_date.map;
      
      if (existingMap !== targetMap) {
        console.log(`[CouchDB] Sequence design document map function has changed. Updating...`);
        await patientsDb.insert({
          ...sequenceDesignDoc,
          _rev: existingDoc._rev
        });
        console.log(`[CouchDB] Sequence design document updated.`);
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log(`[CouchDB] Creating sequence design document in '${PATIENTS_DB_NAME}'...`);
        await patientsDb.insert(sequenceDesignDoc);
        console.log(`[CouchDB] Sequence design document created.`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`[CouchDB] Error creating/updating design document in '${PATIENTS_DB_NAME}':`, error);
    throw error;
  }
}

/**
 * Automatically configures CORS on the CouchDB server.
 */
async function ensureCouchDbCors() {
  console.log('[CouchDB] Verifying and configuring CORS settings on target node...');
  try {
    const corsConfigs = [
      { path: 'chttpd/enable_cors', value: true, label: 'Enable CORS' },
      { path: 'cors/origins', value: '*', label: 'Allow Origins (*)' },
      { path: 'cors/credentials', value: true, label: 'Allow Credentials' },
      { path: 'cors/methods', value: 'GET, PUT, POST, HEAD, DELETE', label: 'Allowed Methods' },
      { path: 'cors/headers', value: 'accept, authorization, content-type, origin, referer', label: 'Allowed Headers' }
    ];

    for (const config of corsConfigs) {
      const fullPath = `_node/_local/_config/${config.path}`;
      try {
        // Send string configs as raw text (unquoted) and boolean configs as JSON booleans to prevent CouchDB from writing double quotes in local.ini
        const body = typeof config.value === 'string' ? config.value : JSON.stringify(config.value);
        await couch.request({
          method: 'PUT',
          path: fullPath,
          body: body
        });
        console.log(`[CouchDB] CORS configuration update: Set ${config.label} to ${config.value}`);
      } catch (err: any) {
        console.warn(`[CouchDB] Warning updating CORS configuration at ${config.path}:`, err.message || err);
      }
    }
    console.log('[CouchDB] CouchDB server CORS configuration sequence completed.');
  } catch (error) {
    console.error('[CouchDB] Unexpected error during CORS auto-setup:', error);
  }
}

/**
 * Initializes database structures and verifies connectivity
 */
export async function initCouchDb() {
  console.log(`[CouchDB] Connecting to CouchDB at ${COUCHDB_URL}...`);
  try {
    // Check credentials and connection via listing DBs
    await couch.db.list();
    console.log('[CouchDB] Connection established successfully.');
    
    // Automatically provision CORS on target node
    await ensureCouchDbCors();
    
    // Ensure core databases exist
    await ensureDbExists(PATIENTS_DB_NAME);
    await ensureDbExists(EXAMINATIONS_DB_NAME);
    await ensureDbExists(CUSTOM_ENTRIES_DB_NAME);
    await ensureDbExists(ICD10_DB_NAME);
    
    // Ensure sequence views exist
    await ensureDesignDocExists();
  } catch (error) {
    console.error('[CouchDB] Failed to initialize connection to database server:', error);
    throw error;
  }
}

export default couch;
