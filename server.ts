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

// Real SMS Gateway Proxy Endpoint (Keeps API keys protected and hidden from the browser)
app.post('/api/sms/send', async (req, res) => {
  const { config, recipientPhone, message, placeholders } = req.body;

  if (!config || !config.isEnabled) {
    return res.status(400).json({ success: false, message: 'SMS is disabled or configuration is missing.' });
  }

  const { name, date, reason, type } = placeholders || { name: 'پرسنل', date: '-', reason: '-', type: 'اخطار' };
  const provider = config.provider;

  if (provider === 'SIMULATOR') {
    // Simulator mode completes immediately with a mock success message
    return res.json({ 
      success: true, 
      provider: 'SIMULATOR', 
      message: 'پیامک در حالت شبیه‌ساز با موفقیت ارسال شد.',
      response: { status: 'simulated_success', timestamp: new Date().toISOString() }
    });
  }

  try {
    let url = '';
    let options: RequestInit = { method: 'POST', headers: {} };

    if (provider === 'KAVENEGAR') {
      const apiKey = config.apiKey;
      const template = type === 'اخطار' ? config.warningTemplate : config.rewardTemplate;
      
      // Check if template/pattern is a number to use lookup, or if standard sending is used
      const isPattern = /^\d+$/.test(template || '');

      if (isPattern) {
        // Verification Lookup API (Fast & Pattern-based bypassing blacklists)
        const encodedName = encodeURIComponent(name.replace(/\s+/g, '_'));
        const encodedReason = encodeURIComponent(reason.substring(0, 20).replace(/\s+/g, '_'));
        const encodedDate = encodeURIComponent(date.replace(/\//g, '-'));

        url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?receptor=${recipientPhone}&token=${encodedName}&token2=${encodedReason}&token3=${encodedDate}&template=${template}`;
        options = { method: 'GET' };
      } else {
        // Standard SMS sending API
        url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
        const params = new URLSearchParams();
        params.append('receptor', recipientPhone);
        params.append('sender', config.senderLine || '');
        params.append('message', message);
        
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        };
      }
    } 
    else if (provider === 'FARAZSMS') {
      // IPPanel / FarazSMS modern pattern sending API
      url = 'https://api.ippanel.com/v1/messages/patterns/send';
      const templateCode = type === 'اخطار' ? config.warningTemplate : config.rewardTemplate;
      
      options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `AccessKey ${config.apiKey}`
        },
        body: JSON.stringify({
          pattern_code: templateCode,
          originator: config.senderLine || '+983000505',
          recipient: recipientPhone,
          values: {
            name: name,
            date: date,
            reason: reason,
            type: type
          }
        })
      };
    } 
    else if (provider === 'MELIPAYAMAK') {
      // Melipayamak Send with Pattern API
      url = 'https://rest.payamak.ir/BaseService/SendWithPattern';
      const bodyId = type === 'اخطار' ? config.warningTemplate : config.rewardTemplate;

      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.senderLine, // Often they use username/pass in payload or senderLine for login
          password: config.apiKey,
          text: `${name};${date};${reason}`,
          to: recipientPhone,
          bodyId: parseInt(bodyId || '0')
        })
      };
    } 
    else if (provider === 'CUSTOM') {
      // Fully custom HTTP client
      let customUrl = config.customUrl || '';
      customUrl = customUrl.replace(/{phone}/g, encodeURIComponent(recipientPhone))
                            .replace(/{message}/g, encodeURIComponent(message));

      let headers: Record<string, string> = {};
      if (config.customHeaders) {
        try {
          headers = JSON.parse(config.customHeaders);
        } catch (e) {
          console.warn('Failed to parse custom SMS headers:', e);
        }
      }

      const method = config.customMethod || 'POST';
      let body: any = undefined;

      if (method === 'POST' && config.customBodyTemplate) {
        let bodyStr = config.customBodyTemplate;
        bodyStr = bodyStr.replace(/{phone}/g, recipientPhone)
                          .replace(/{message}/g, message)
                          .replace(/{name}/g, name)
                          .replace(/{date}/g, date)
                          .replace(/{reason}/g, reason)
                          .replace(/{type}/g, type);
        try {
          body = JSON.parse(bodyStr);
          headers['Content-Type'] = headers['Content-Type'] || 'application/json';
          body = JSON.stringify(body);
        } catch (e) {
          // If not valid JSON, send as raw string
          body = bodyStr;
        }
      }

      options = {
        method,
        headers,
        body
      };
      url = customUrl;
    }

    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);

    if (response.ok) {
      return res.json({
        success: true,
        provider,
        message: 'پیامک با موفقیت از طریق درگاه فرستاده شد.',
        response: data
      });
    } else {
      return res.status(response.status).json({
        success: false,
        provider,
        message: `درگاه پیامک خطای کد ${response.status} را بازگرداند.`,
        response: data
      });
    }

  } catch (error: any) {
    console.error('SMS send failed in proxy server:', error);
    return res.status(500).json({
      success: false,
      provider,
      message: `خطای سیستمی سرور در ارسال پیامک: ${error.message || error}`
    });
  }
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
