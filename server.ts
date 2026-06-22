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
  { id: 'u1', username: 'dev', password: '123', fullName: 'Developer Admin', role: 'DEVELOPER' },
  { id: 'u2', username: 'plant', password: '123', fullName: 'Plant Manager', role: 'PLANT_MANAGER' },
  { id: 'u3', username: 'hr', password: '123', fullName: 'HR Manager', role: 'HR_MANAGER' },
  { id: 'u4', username: 'hse_m', password: '123', fullName: 'HSE Manager', role: 'HSE_MANAGER' },
  { id: 'u5', username: 'hse_o', password: '123', fullName: 'HSE Officer', role: 'HSE_OFFICER' },
  { id: 'u6', username: 'security', password: '123', fullName: 'Security Manager', role: 'SECURITY_MANAGER' },
  { id: 'u7', username: 'training', password: '123', fullName: 'Training Manager', role: 'TRAINING_MANAGER' },
  { id: 'u8', username: 'admin', password: '123', fullName: 'Admin Staff', role: 'ADMIN_STAFF' }
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
