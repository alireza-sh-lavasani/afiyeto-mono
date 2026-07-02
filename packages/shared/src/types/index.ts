export type SyncStatus = 'synced' | 'pending' | 'error';

export interface UserSession {
  userId: string;
  name: string;
  role: 'doctor' | 'nurse' | 'admin';
  authToken?: string;
}
