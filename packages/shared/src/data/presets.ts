/**
 * Preset values for patient demographic fields.
 * These are the "built-in" options displayed in dropdowns.
 * User-defined custom entries are stored separately in PouchDB
 * and merged with these presets at render time.
 */

// --- Eritrean Ethnic Groups (9 recognized) ---
export const ETHNICITY_PRESETS = [
  'Tigrinya',
  'Tigre',
  'Saho',
  'Kunama',
  'Bilen',
  'Nara',
  'Afar',
  'Rashida',
  'Hedareb',
] as const;

// --- Occupation Categories ---
export const OCCUPATION_PRESETS = [
  'Farmer',
  'Pastoralist',
  'Fisherman',
  'Trader',
  'Artisan',
  'Government Employee',
  'Military',
  'Teacher',
  'Healthcare Worker',
  'Student',
  'Homemaker',
  'Daily Laborer',
  'Driver',
  'Unemployed',
  'Retired',
  'Child (under working age)',
] as const;

// --- Chronic Condition Presets ---
export const CHRONIC_CONDITION_PRESETS = [
  'Diabetes (Type 1)',
  'Diabetes (Type 2)',
  'Hypertension',
  'Asthma',
  'COPD',
  'HIV/AIDS',
  'Tuberculosis',
  'Hepatitis B',
  'Hepatitis C',
  'Epilepsy',
  'Heart Disease',
  'Kidney Disease',
  'Sickle Cell Disease',
  'Rheumatic Heart Disease',
  'Cancer',
  'Malaria (recurrent)',
  'Schistosomiasis',
] as const;

// --- Common Allergy Presets ---
export const ALLERGY_PRESETS = [
  'Penicillin',
  'Sulfonamides',
  'Aspirin / NSAIDs',
  'Tetracycline',
  'Chloroquine',
  'Latex',
  'Iodine',
  'Bee / Wasp Stings',
  'Peanuts',
  'Eggs',
  'Fish',
  'Dust',
  'Pollen',
] as const;

// --- Disability / Functional Limitation Presets (WHO ICF-aligned) ---
export const DISABILITY_PRESETS = [
  'Vision impairment',
  'Hearing impairment',
  'Mobility impairment',
  'Cognitive impairment',
  'Speech impairment',
  'Upper limb amputation',
  'Lower limb amputation',
  'Chronic pain (limiting)',
  'Mental health disability',
  'Developmental disability',
] as const;

// --- Water Source Options ---
export const WATER_SOURCE_OPTIONS = [
  { value: 'piped', label: 'Piped / Tap Water' },
  { value: 'well', label: 'Well / Borehole' },
  { value: 'river', label: 'River / Stream / Lake' },
  { value: 'rainwater', label: 'Rainwater Collection' },
  { value: 'tanker', label: 'Water Tanker / Vendor' },
  { value: 'other', label: 'Other' },
] as const;

// --- Sanitation Type Options ---
export const SANITATION_OPTIONS = [
  { value: 'flush', label: 'Flush Toilet' },
  { value: 'pit_latrine', label: 'Pit Latrine' },
  { value: 'open_defecation', label: 'Open Defecation' },
  { value: 'other', label: 'Other' },
] as const;

// --- Blood Type Options ---
export const BLOOD_TYPE_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown',
] as const;

/**
 * Custom entry document stored in the `afiyet_custom_entries` PouchDB database.
 * Used for user-defined values that supplement the preset lists.
 */
export interface ICustomEntry {
  _id: string;
  _rev?: string;
  type: 'custom_entry';
  field: 'ethnicity' | 'occupation' | 'allergy' | 'chronic_condition' | 'disability' | 'medication';
  value: string;
  createdAt: string;
}
