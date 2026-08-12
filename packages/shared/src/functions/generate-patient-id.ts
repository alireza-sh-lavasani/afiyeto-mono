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
// Function to generate a 4-digit random sequence number
export function generateRandomSequenceNumber(): number {
  return Math.floor(Math.random() * 10000); // 4-digit random number between 0000 and 9999
}

export function generatePatientIdInitials(
  firstNameOrFullName: string,
  lastNameOrBirthDate: string,
  birthDateIso?: string
): IGeneratePatientId {
  let firstName = '';
  let lastName = '';
  let birthDate = '';

  if (birthDateIso !== undefined) {
    firstName = firstNameOrFullName;
    lastName = lastNameOrBirthDate;
    birthDate = birthDateIso;
  } else {
    // Backward compatibility: first parameter is fullName, second is birthDate
    const fullName = firstNameOrFullName;
    birthDate = lastNameOrBirthDate;
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const f = firstName.trim().charAt(0).toUpperCase() || 'X';
  const l = lastName.trim().charAt(0).toUpperCase() || 'X';
  const namePart = f + l;
  const dateKey = moment(birthDate).format('YYYYMMDD');

  return { namePart, dateKey };
}
