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
    console.warn(`Failed to contact central company server at ${url}:`, err);
    
    // Fallback 1: Try window.location.origin if we are in a browser and the URL used wasn't already the origin
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const originUrl = window.location.origin;
      if (url !== originUrl) {
        console.log(`Attempting fallback connection to window origin: ${originUrl}`);
        try {
          const res = await fetch(`${originUrl}/api/db`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            const data = await res.json();
            // If the fallback succeeded, let's update localStorage so future requests are fast
            localStorage.setItem('sg_serverUrl', originUrl);
            return data;
          }
        } catch (fallbackErr) {
          console.error('Fallback to window origin also failed:', fallbackErr);
        }
      }
    }

    // Fallback 2: Try localhost:3000 if the URL used wasn't already localhost:3000
    const fallbackLocal = 'http://localhost:3000';
    if (url !== fallbackLocal) {
      console.log(`Attempting fallback connection to local port 3000: ${fallbackLocal}`);
      try {
        const res = await fetch(`${fallbackLocal}/api/db`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('sg_serverUrl', fallbackLocal);
          return data;
        }
      } catch (fallbackErr) {
        console.error('Fallback to localhost:3000 also failed:', fallbackErr);
      }
    }

    console.error('Failed to contact central company server: All fallbacks exhausted.');
    return null;
  }
};

// Full synchronization (overwrite/merge back to central backend server)
export const syncCentralData = async (payload: SyncPayload): Promise<{ success: boolean; message: string }> => {
  let url = getServerUrl();
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
    console.warn(`Local sync failed on ${url}, checking fallbacks...`, err);

    // Fallback 1: Try window.location.origin
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const originUrl = window.location.origin;
      if (url !== originUrl) {
        try {
          const res = await fetch(`${originUrl}/api/db/sync`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            localStorage.setItem('sg_serverUrl', originUrl);
            return { success: true, message: "Data synchronized with window origin server successfully." };
          }
        } catch (fallbackErr) {
          console.error('Sync fallback to window origin failed:', fallbackErr);
        }
      }
    }

    // Fallback 2: Try localhost:3000
    const fallbackLocal = 'http://localhost:3000';
    if (url !== fallbackLocal) {
      try {
        const res = await fetch(`${fallbackLocal}/api/db/sync`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          localStorage.setItem('sg_serverUrl', fallbackLocal);
          return { success: true, message: "Data synchronized with localhost:3000 server successfully." };
        }
      } catch (fallbackErr) {
        console.error('Sync fallback to localhost:3000 failed:', fallbackErr);
      }
    }

    return { success: false, message: err.message || "Failed to sync. Operating in local offline mode." };
  }
};
