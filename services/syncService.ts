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
  
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol;
    
    // Check if we are running in a standard web browser (hosted via http/https)
    if (protocol === 'http:' || protocol === 'https:') {
      const isRemote = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('127.');
      
      if (saved && saved.trim() !== '') {
        const isSavedLocal = saved.includes('localhost') || saved.includes('127.0.0.1');
        // If we are on remote, but the saved URL is local, ignore saved URL to avoid mixed-content blocks.
        if (isRemote && isSavedLocal) {
          return '';
        }
        return saved;
      }
      
      // Default to relative paths in the browser for maximum compatibility (handles CORS, SSL, Port matching, Iframe sandbox)
      return '';
    }
  }
  
  if (saved && saved.trim() !== '') {
    return saved;
  }
  return 'http://localhost:3000';
};

// Fetch all database records from central Express backend
export const fetchCentralData = async (): Promise<SyncPayload | null> => {
  const url = getServerUrl();
  const fetchUrl = url ? `${url}/api/db` : '/api/db';
  try {
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to contact central company server at ${fetchUrl}:`, err);
    
    // Fallback 1: Try relative path if we previously used an absolute url
    if (url !== '') {
      console.log('Attempting fallback connection to relative API endpoint...');
      try {
        const res = await fetch('/api/db', {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.removeItem('sg_serverUrl'); // reset to default relative
          return data;
        }
      } catch (fallbackErr) {
        console.error('Fallback to relative path also failed:', fallbackErr);
      }
    }

    // Fallback 2: Try window.location.origin
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const originUrl = window.location.origin;
      const originFetchUrl = `${originUrl}/api/db`;
      if (fetchUrl !== originFetchUrl) {
        console.log(`Attempting fallback connection to window origin: ${originFetchUrl}`);
        try {
          const res = await fetch(originFetchUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('sg_serverUrl', originUrl);
            return data;
          }
        } catch (fallbackErr) {
          console.error('Fallback to window origin also failed:', fallbackErr);
        }
      }
    }

    // Fallback 3: Try localhost:3000
    const fallbackLocal = 'http://localhost:3000/api/db';
    if (fetchUrl !== fallbackLocal) {
      console.log(`Attempting fallback connection to local port 3000: ${fallbackLocal}`);
      try {
        const res = await fetch(fallbackLocal, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('sg_serverUrl', 'http://localhost:3000');
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
  const url = getServerUrl();
  const fetchUrl = url ? `${url}/api/db/sync` : '/api/db/sync';
  try {
    const res = await fetch(fetchUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    return { success: true, message: data.message || "Data synchronized with central server successfully." };
  } catch (err: any) {
    console.warn(`Local sync failed on ${fetchUrl}, checking fallbacks...`, err);

    // Fallback 1: Try relative path
    if (url !== '') {
      try {
        const res = await fetch('/api/db/sync', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          localStorage.removeItem('sg_serverUrl');
          return { success: true, message: "Data synchronized via relative API path successfully." };
        }
      } catch (fallbackErr) {
        console.error('Sync fallback to relative path failed:', fallbackErr);
      }
    }

    // Fallback 2: Try window.location.origin
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const originUrl = window.location.origin;
      const originFetchUrl = `${originUrl}/api/db/sync`;
      if (fetchUrl !== originFetchUrl) {
        try {
          const res = await fetch(originFetchUrl, {
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

    // Fallback 3: Try localhost:3000
    const fallbackLocal = 'http://localhost:3000/api/db/sync';
    if (fetchUrl !== fallbackLocal) {
      try {
        const res = await fetch(fallbackLocal, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          localStorage.setItem('sg_serverUrl', 'http://localhost:3000');
          return { success: true, message: "Data synchronized with localhost:3000 server successfully." };
        }
      } catch (fallbackErr) {
        console.error('Sync fallback to localhost:3000 failed:', fallbackErr);
      }
    }

    return { success: false, message: err.message || "Failed to sync. Operating in local offline mode." };
  }
};
