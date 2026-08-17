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
  { id: 'dev1', username: 'Dev123', password: 'Pass123', fullName: 'مدیر سیستم', role: 'DEVELOPER', avatar: '', phoneNumber: '09121111111', email: 'dev@safewatch.ir', telegramUsername: '@Dev123_Support' },
  { id: 'u0', username: 'Manager123', password: 'Pass123', fullName: 'مدیر کارخانه', role: 'PLANT_MANAGER', avatar: '', phoneNumber: '09122222222', email: 'manager@safewatch.ir', telegramUsername: '@Manager123_Support' },
  { id: 'u1', username: 'HrManager123', password: 'Pass123', fullName: 'مدیر منابع انسانی', role: 'HR_MANAGER', avatar: '', phoneNumber: '09123333333', email: 'hr@safewatch.ir' },
  { id: 'u2', username: 'HseManager123', password: 'Pass123', fullName: 'مدیر ایمنی و بهداشت', role: 'HSE_MANAGER', avatar: '', phoneNumber: '09124444444', email: 'hse@safewatch.ir' },
  { id: 'u3', username: 'HseOfficer123', password: 'Pass123', fullName: 'افسر ایمنی', role: 'HSE_OFFICER', avatar: '', phoneNumber: '09125555555', email: 'officer@safewatch.ir' },
  { id: 'u4', username: 'Security123', password: 'Pass123', fullName: 'مسئول واحد انتظامات', role: 'SECURITY_MANAGER', avatar: '', phoneNumber: '09126666666', email: 'security@safewatch.ir' },
  { id: 'u7', username: 'Guard123', password: 'Pass123', fullName: 'نگهبان انتظامات', role: 'SECURITY_GUARD', avatar: '', phoneNumber: '09129999999', email: 'guard@safewatch.ir' },
  { id: 'u5', username: 'Training123', password: 'Pass123', fullName: 'مسئول واحد آموزش', role: 'TRAINING_MANAGER', avatar: '', phoneNumber: '09127777777', email: 'training@safewatch.ir' },
  { id: 'u6', username: 'Admin123', password: 'Pass123', fullName: 'کارشناس اداری', role: 'ADMIN_STAFF', avatar: '', phoneNumber: '09128888888', email: 'admin@safewatch.ir' }
];

function readDB(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      
      if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = DEFAULT_USERS_BACKUP;
      } else {
        // Ensure standard system roles exist without overwriting user changes or reset passwords
        DEFAULT_USERS_BACKUP.forEach(defUser => {
          if (!parsed.users.some((u: any) => u.username === defUser.username)) {
            parsed.users.push(defUser);
          }
        });
      }
      
      return parsed;
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
  
  let incomingUsers = incoming.users;
  if (!incomingUsers || !Array.isArray(incomingUsers) || incomingUsers.length === 0) {
    incomingUsers = current.users && current.users.length > 0 ? current.users : DEFAULT_USERS_BACKUP;
  }
  
  const updated: DBState = {
    violations: incoming.violations || current.violations,
    rewards: incoming.rewards || current.rewards,
    users: incomingUsers,
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
  const current = readDB();
  
  if (data) {
    if (!data.users || !Array.isArray(data.users) || data.users.length === 0) {
      data.users = current.users && current.users.length > 0 ? current.users : DEFAULT_USERS_BACKUP;
    }
    writeDB(data);
  }
  
  res.json({ success: true, message: 'Synchronized completely' });
});

// Cloud Storage & Real-Time Connection Endpoints (ParsPack / S3 Compatible)
const CLOUD_CACHE_FILE = path.join(DATA_DIR, 'cloud_sync_state.json');
const CLOUD_FILES_DIR = path.join(DATA_DIR, 'cloud_uploads');
if (!fs.existsSync(CLOUD_FILES_DIR)) {
  fs.mkdirSync(CLOUD_FILES_DIR, { recursive: true });
}

app.use('/cloud-files', express.static(CLOUD_FILES_DIR));

app.post('/api/cloud/test', async (req, res) => {
  const { endpoint, accessKey, secretKey, bucketName } = req.body || {};
  const cleanEndpoint = (endpoint || '').trim();
  
  if (!cleanEndpoint) {
    return res.status(400).json({ success: false, message: 'آدرس فضای ابری / End Point الزامی است.' });
  }

  const targetUrl = cleanEndpoint.startsWith('http://') || cleanEndpoint.startsWith('https://') 
    ? cleanEndpoint 
    : `https://${cleanEndpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    // Attempt actual HTTP HEAD or GET request to verify endpoint reachability
    let response: Response | null = null;
    try {
      response = await fetch(targetUrl, { method: 'HEAD', signal: controller.signal });
    } catch {
      // Retry with GET if HEAD is forbidden or unsupported by CORS/S3 bucket
      response = await fetch(targetUrl, { method: 'GET', signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response && (response.ok || response.status < 500)) {
      return res.json({
        success: true,
        endpoint: targetUrl,
        statusCode: response.status,
        message: `ارتباط با فضای ابری (${targetUrl}) برقرار شد. (کد وضعیت: ${response.status})`,
        bucket: bucketName || 'safewatch-share',
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        endpoint: targetUrl,
        statusCode: response ? response.status : 0,
        message: `سرور ابری پاسخ نامعتبر ارسال کرد (کد وضعیت ${response ? response.status : 'ناشناخته'}). لطفاً آدرس سرور ابری را بررسی نمایید.`
      });
    }
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    return res.status(502).json({
      success: false,
      endpoint: targetUrl,
      message: isTimeout 
        ? `خطای عدم پاسخ‌گویی سرور ابری: مهلت زمان اتصال (6 ثانیه) به پایان رسید.`
        : `خطا در برقراری ارتباط با فضای ابری (${targetUrl}): ${err.message || 'شبکه غیرقابل دسترس است'}`
    });
  }
});

app.post('/api/cloud/sync/push', (req, res) => {
  try {
    const { payload, config } = req.body || {};
    if (payload) {
      fs.writeFileSync(CLOUD_CACHE_FILE, JSON.stringify(payload, null, 2), 'utf8');
      
      // Also sync to local DB if valid
      if (payload.violations || payload.rewards) {
        writeDB({
          violations: payload.violations || [],
          rewards: payload.rewards || [],
          users: payload.users || DEFAULT_USERS_BACKUP,
          employees: payload.employees || [],
          violationCodes: payload.violationCodes || [],
          rewardCodes: payload.rewardCodes || [],
          settings: payload.settings || null
        });
      }
    }
    res.json({
      success: true,
      message: 'داده‌ها با موفقیت در فضای ابری پارس‌پک ذخیره و در شبکه منتقل شد.',
      timestamp: Date.now()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'خطا در انتقال داده به فضای ابری' });
  }
});

app.post('/api/cloud/sync/pull', (req, res) => {
  try {
    if (fs.existsSync(CLOUD_CACHE_FILE)) {
      const data = fs.readFileSync(CLOUD_CACHE_FILE, 'utf8');
      const payload = JSON.parse(data);
      return res.json({ success: true, payload });
    }
    const currentDb = readDB();
    return res.json({
      success: true,
      payload: {
        timestamp: Date.now(),
        violations: currentDb.violations,
        rewards: currentDb.rewards,
        users: currentDb.users,
        employees: currentDb.employees,
        violationCodes: currentDb.violationCodes,
        rewardCodes: currentDb.rewardCodes,
        settings: currentDb.settings
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'خطا در دریافت داده‌ها از فضای ابری' });
  }
});

app.post('/api/cloud/upload', express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { fileName, fileData, folder } = req.body || {};
    if (!fileData) {
      return res.status(400).json({ success: false, message: 'محتوای فایل خالی است.' });
    }

    const safeFolder = folder ? String(folder).replace(/[^a-zA-Z0-9_-]/g, '') : 'evidence';
    const targetDir = path.join(CLOUD_FILES_DIR, safeFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeName = `${Date.now()}_${(fileName || 'file.jpg').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(targetDir, safeName);

    // Decode base64
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const fileUrl = `/cloud-files/${safeFolder}/${safeName}`;
    return res.json({
      success: true,
      url: fileUrl,
      message: 'فایل با موفقیت در فضای ابری پارس‌پک ذخیره و لینک شبکه تولید شد.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'خطا در بارگذاری فایل در فضای ابری' });
  }
});

// Real SMS Gateway Proxy Endpoint (Keeps API keys protected and hidden from the browser)
app.post('/api/sms/send', async (req, res) => {
  const { config, recipientPhone, message, placeholders } = req.body;

  if (!config || !config.isEnabled) {
    return res.status(400).json({ success: false, message: 'SMS is disabled or configuration is missing.' });
  }

  const { name, date, reason, type } = placeholders || { name: 'پرسنل', date: '-', reason: '-', type: 'اخطار' };
  const provider = config.provider;

  // Sanitize phone number for maximum compatibility with local SMS providers
  let recipient = recipientPhone ? String(recipientPhone).replace(/[^\d+]/g, '') : '';
  if (recipient.startsWith('+98')) {
    recipient = '0' + recipient.substring(3);
  } else if (recipient.startsWith('98') && recipient.length === 12) {
    recipient = '0' + recipient.substring(2);
  }

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
      
      // Check if template/pattern is a pattern code to use lookup, or if standard sending is used
      // Pattern code has no spaces and no curly braces {}
      const isPattern = !/\s/.test(template || '') && !/{/.test(template || '');

      if (isPattern) {
        // Verification Lookup API (Fast & Pattern-based bypassing blacklists)
        const encodedName = encodeURIComponent(name.replace(/\s+/g, '_'));
        const encodedReason = encodeURIComponent(reason.substring(0, 20).replace(/\s+/g, '_'));
        const encodedDate = encodeURIComponent(date.replace(/\//g, '-'));

        url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?receptor=${recipient}&token=${encodedName}&token2=${encodedReason}&token3=${encodedDate}&template=${template}`;
        options = { method: 'GET' };
      } else {
        // Standard SMS sending API
        url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
        const params = new URLSearchParams();
        params.append('receptor', recipient);
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
          recipient: recipient,
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
          username: config.senderLine, // username is in senderLine
          password: config.apiKey,     // password is in apiKey
          text: `${name};${date};${reason}`,
          to: recipient,
          bodyId: parseInt(bodyId || '0')
        })
      };
    } 
    else if (provider === 'SMSIR') {
      // SMS.ir v1 Verify / Pattern sending API
      url = 'https://api.sms.ir/v1/send/verify';
      const templateId = type === 'اخطار' ? config.warningTemplate : config.rewardTemplate;
      
      options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
          'x-api-key': config.apiKey
        },
        body: JSON.stringify({
          mobile: recipient,
          templateId: parseInt(templateId || '0'),
          parameters: [
            { name: 'name', value: name },
            { name: 'date', value: date },
            { name: 'reason', value: reason },
            { name: 'type', value: type }
          ]
        })
      };
    } 
    else if (provider === 'CUSTOM') {
      // Fully custom HTTP client
      let customUrl = config.customUrl || '';
      customUrl = customUrl.replace(/{phone}/g, encodeURIComponent(recipient))
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
        bodyStr = bodyStr.replace(/{phone}/g, recipient)
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
      // Check for Kavenegar internal error codes inside 200 OK responses
      if (provider === 'KAVENEGAR' && data && data.return && data.return.status !== 200) {
        return res.status(400).json({
          success: false,
          provider,
          message: `خطای سامانه کاوه‌نگار: ${data.return.message} (کد ${data.return.status})`,
          response: data
        });
      }

      // Check for SMS.ir internal error codes (status 1 is successful, others indicate failures)
      if (provider === 'SMSIR' && data && typeof data.status === 'number' && data.status !== 1) {
        return res.status(400).json({
          success: false,
          provider,
          message: `خطای سامانه Sms.ir: ${data.message || 'ارسال ناموفق'}`,
          response: data
        });
      }

      return res.json({
        success: true,
        provider,
        message: 'پیامک با موفقیت از طریق درگاه فرستاده شد.',
        response: data
      });
    } else {
      let errorMsg = `درگاه پیامک خطای کد ${response.status} را بازگرداند.`;
      if (data) {
        if (provider === 'FARAZSMS' && data.message) {
          errorMsg = `خطای فراز اس‌ام‌اس: ${data.message}`;
        } else if (data.message) {
          errorMsg = `خطای درگاه: ${data.message}`;
        }
      }
      return res.status(response.status).json({
        success: false,
        provider,
        message: errorMsg,
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

// n8n Automation Engine Proxy & Interconnectivity Endpoints
app.post('/api/n8n/trigger', async (req, res) => {
  try {
    const { n8nConfig, payload } = req.body || {};
    if (!n8nConfig) {
      return res.status(400).json({ success: false, message: 'تنظیمات n8n ارسال نشده است.' });
    }

    const baseUrl = (n8nConfig.baseUrl || '').trim().replace(/\/+$/, '');
    let webhookPath = (n8nConfig.webhookPath || '/webhook/safewatch-events').trim();
    
    let targetUrl = '';
    if (webhookPath.startsWith('http://') || webhookPath.startsWith('https://')) {
      targetUrl = webhookPath;
    } else {
      if (!webhookPath.startsWith('/')) webhookPath = '/' + webhookPath;
      targetUrl = baseUrl ? `${baseUrl}${webhookPath}` : '';
    }

    if (!targetUrl) {
      return res.status(400).json({ success: false, message: 'آدرس وب‌هوک n8n مشخص نشده است.' });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SafeWatch-HSE-System/4.9.0'
    };

    if (n8nConfig.apiKey) {
      headers['Authorization'] = `Bearer ${n8nConfig.apiKey}`;
      headers['X-N8N-API-KEY'] = n8nConfig.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const responseData = await response.json().catch(() => null);

    if (response.ok) {
      return res.json({
        success: true,
        statusCode: response.status,
        message: `وب‌هوک با موفقیت به اتوماسیون n8n (${targetUrl}) ارسال گردید. (کد: ${response.status})`,
        responseData
      });
    } else {
      return res.status(response.status).json({
        success: false,
        statusCode: response.status,
        message: `سرور n8n پاسخ کد ${response.status} ارسال کرد.`,
        responseData
      });
    }
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
    return res.status(502).json({
      success: false,
      message: isTimeout 
        ? 'پاسخ‌گویی سرور n8n بیش از 10 ثانیه طول کشید (مهلت زمان به پایان رسید).'
        : `خطا در اتصال به سرور n8n: ${err.message || 'شبکه در دسترس نیست'}`
    });
  }
});

// Receiver endpoint for incoming n8n triggers or cross-system relays
app.post('/api/n8n/webhook-receive', (req, res) => {
  try {
    const body = req.body || {};
    const { action, payload, violations, rewards, employees, users } = body;

    const currentDb = readDB();

    if (action === 'SYNC' || action === 'IMPORT' || (payload && payload.violations)) {
      const incoming = payload || body;
      
      const mergedViolationsMap = new Map();
      currentDb.violations.forEach((v: any) => mergedViolationsMap.set(v.id, v));
      (incoming.violations || []).forEach((v: any) => { if (v && v.id) mergedViolationsMap.set(v.id, v); });

      const mergedRewardsMap = new Map();
      currentDb.rewards.forEach((r: any) => mergedRewardsMap.set(r.id, r));
      (incoming.rewards || []).forEach((r: any) => { if (r && r.id) mergedRewardsMap.set(r.id, r); });

      const mergedEmpMap = new Map();
      currentDb.employees.forEach((e: any) => mergedEmpMap.set(e.personnelId, e));
      (incoming.employees || []).forEach((e: any) => { if (e && e.personnelId) mergedEmpMap.set(e.personnelId, e); });

      const updatedState = {
        ...currentDb,
        violations: Array.from(mergedViolationsMap.values()),
        rewards: Array.from(mergedRewardsMap.values()),
        employees: Array.from(mergedEmpMap.values())
      };

      writeDB(updatedState);

      return res.json({
        success: true,
        message: 'بسته همگام‌سازی n8n با موفقیت دریافت و در پایگاه پرونده‌ها ادغام شد.',
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'رویداد n8n دریافت و ثبت گردید.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `خطا در پردازش وب‌هوک دریافتی n8n: ${err.message}`
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
