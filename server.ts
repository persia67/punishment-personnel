import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure database directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBState {
  violations: any[];
  rewards: any[];
  users: any[];
  employees: any[];
  violationCodes: any[];
  rewardCodes: any[];
  settings: any;
}

// Minimal Bootstrapping Defaults for Server
const DEFAULT_USERS_BACKUP = [
  { id: 'dev1', username: 'Dev123', password: 'Pass123', fullName: 'مدیر سیستم', role: 'DEVELOPER', avatar: '' },
  { id: 'u0', username: 'Manager123', password: 'Pass123', fullName: 'مدیر کارخانه', role: 'PLANT_MANAGER', avatar: '' },
  { id: 'u1', username: 'HrManager123', password: 'Pass123', fullName: 'مدیر منابع انسانی', role: 'HR_MANAGER', avatar: '' },
  { id: 'u2', username: 'HseManager123', password: 'Pass123', fullName: 'مدیر ایمنی', role: 'HSE_MANAGER', avatar: '' },
  { id: 'u3', username: 'HseOfficer123', password: 'Pass123', fullName: 'افسر ایمنی', role: 'HSE_OFFICER', avatar: '' },
  { id: 'u4', username: 'Security123', password: 'Pass123', fullName: 'سرپرست انتظامات', role: 'SECURITY_MANAGER', avatar: '' },
  { id: 'u5', username: 'Training123', password: 'Pass123', fullName: 'مسئول آموزش', role: 'TRAINING_MANAGER', avatar: '' },
  { id: 'u6', username: 'Admin123', password: 'Pass123', fullName: 'کارشناس اداری', role: 'ADMIN_STAFF', avatar: '' }
];

function readDB(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading DB, using defaults', err);
  }
  return {
    violations: [],
    rewards: [],
    users: DEFAULT_USERS_BACKUP,
    employees: [],
    violationCodes: [],
    rewardCodes: [],
    settings: null
  };
}

function writeDB(data: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to DB file', err);
  }
}

// Initialize file if not existing
if (!fs.existsSync(DB_FILE)) {
  writeDB({
    violations: [],
    rewards: [],
    users: DEFAULT_USERS_BACKUP,
    employees: [],
    violationCodes: [],
    rewardCodes: [],
    settings: null
  });
}

// API Routes
app.get('/api/db', (req, res) => {
  const db = readDB();
  res.json(db);
});

app.post('/api/db', (req, res) => {
  const incoming = req.body;
  const current = readDB();
  
  const updated: DBState = {
    violations: incoming.violations || current.violations,
    rewards: incoming.rewards || current.rewards,
    users: incoming.users || current.users,
    employees: incoming.employees || current.employees,
    violationCodes: incoming.violationCodes || current.violationCodes,
    rewardCodes: incoming.rewardCodes || current.rewardCodes,
    settings: incoming.settings || current.settings
  };
  
  writeDB(updated);
  res.json({ success: true, db: updated });
});

// Single-endpoint full replacement (excellent for continuous sync)
app.put('/api/db/sync', (req, res) => {
  const data = req.body;
  writeDB(data);
  res.json({ success: true, message: 'Synchronized completely' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', version: '2.0.0' });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
