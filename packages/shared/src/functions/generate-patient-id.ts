import moment from 'moment';

interface IGeneratePatientId {
  namePart: string;
  dateKey: string;
}

// Helper function to pad a number with leading zeros
export function padNumber(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

// Helper function to extract initials from a full name
function extractNamePart(fullName: string): string {
  const nameParts = fullName.trim().split(' ');
  const initials =
    nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : fullName.slice(0, 2).toUpperCase();
  return initials;
}

// Function to generate a 4-digit random sequence number
export function generateRandomSequenceNumber(): number {
  return Math.floor(Math.random() * 10000); // 4-digit random number between 0000 and 9999
}

export function generatePatientIdInitials(
  fullName: string,
  birthDateIso: string
): IGeneratePatientId {
  const namePart = extractNamePart(fullName); // Extract initials from full name
  const dateKey = moment(birthDateIso).format('YYYYMMDD'); // Format birthdate as YYYYMMDD

  return { namePart, dateKey };
}
