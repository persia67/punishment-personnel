import { Violation, Reward, User, AppSettings, Employee, CodeItem } from '../types';

export interface SyncPayload {
  violations: Violation[];
  rewards: Reward[];
  users: User[];
  employees: Employee[];
  violationCodes: CodeItem[];
  rewardCodes: CodeItem[];
  settings: AppSettings;
}

// Dynamically resolves active connection endpoint
export const getServerUrl = (): string => {
  const saved = localStorage.getItem('sg_serverUrl');
  
  // Default to window origin if running inside a web browser, otherwise fallback to local server port 3000
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const isRemote = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');
    if (isRemote) {
      // If we are on a remote server, only use the saved URL if it is also remote.
      // If it is localhost, ignore it to prevent browser mixed-content/connection block.
      if (saved && !saved.includes('localhost') && !saved.includes('127.0.0.1')) {
        return saved;
      }
      return window.location.origin;
    }
  }
  
  if (saved) return saved;
  return 'http://localhost:3000';
};

// Fetch all database records from central Express backend
export const fetchCentralData = async (): Promise<SyncPayload | null> => {
  const url = getServerUrl();
  try {
    const res = await fetch(`${url}/api/db`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to contact central company server:', err);
    return null;
  }
};

// Full synchronization (overwrite/merge back to central backend server)
export const syncCentralData = async (payload: SyncPayload): Promise<{ success: boolean; message: string }> => {
  const url = getServerUrl();
  try {
    const res = await fetch(`${url}/api/db/sync`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    return { success: true, message: data.message || "Data synchronized with central server successfully." };
  } catch (err: any) {
    console.error('Local sync failed, operating in offline failover:', err);
    return { success: false, message: err.message || "Failed to sync. Operating in local offline mode." };
  }
};
