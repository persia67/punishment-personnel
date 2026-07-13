import React, { useState, useEffect } from 'react';
import { AppSettings, User, ThemeColor, Language, Role, Employee, CodeItem, SmsConfig, SmsLog } from '../types';
import { TRANSLATIONS } from '../constants';
import { X, Upload, UserPlus, Trash2, Check, Palette, Globe, Building2, Users as UsersIcon, Database, Download, FileSpreadsheet, Key, RefreshCw, Layers, List, Plus, Bot, MessageSquare, Smartphone, Send, Save, ShieldAlert, Share2, Edit } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import { getSmsConfig, saveSmsConfig, getSmsLogs, saveSmsLogs } from '../services/smsService';
import { ManualEmployeeForm, DEPARTMENTS_LIST } from './ManualEmployeeForm';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  users: User[];
  onUpdateUsers: (newUsers: User[]) => void;
  employees: Employee[];
  onUpdateEmployees: (newEmployees: Employee[]) => void;
  currentUser: User;
  violationCodes: CodeItem[];
  onUpdateViolationCodes: (codes: CodeItem[]) => void;
  rewardCodes: CodeItem[];
  onUpdateRewardCodes: (codes: CodeItem[]) => void;
  onRestoreFullBackup?: (backup: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, onUpdateSettings, users, onUpdateUsers, employees, onUpdateEmployees, currentUser,
  violationCodes, onUpdateViolationCodes, rewardCodes, onUpdateRewardCodes, onRestoreFullBackup
}) => {
  const [activeTab, setActiveTab] = useState<'APPEARANCE' | 'USERS' | 'DATA' | 'CODES' | 'SMS'>('APPEARANCE');
  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', password: '', fullName: '', role: 'HSE_OFFICER', managedDepartment: '', phoneNumber: '', email: '', telegramUsername: '' });
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
  const [importMethod, setImportMethod] = useState<'EXCEL_FILE' | 'TEXT_PASTE'>('EXCEL_FILE');
  const [bulkText, setBulkText] = useState('');
  const [autoBackups, setAutoBackups] = useState<any[]>([]);

  // SMS settings & log state
  const [smsConfig, setSmsConfigState] = useState<SmsConfig>(() => getSmsConfig());
  const [smsLogs, setSmsLogsState] = useState<SmsLog[]>(() => getSmsLogs());

  useEffect(() => {
    if (activeTab === 'DATA') {
      const raw = localStorage.getItem('sg_auto_backups');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setAutoBackups(parsed);
          }
        } catch (e) {
          console.error('[Settings] Auto backup parse fail:', e);
        }
      }
    } else if (activeTab === 'SMS') {
      setSmsLogsState(getSmsLogs());
    }
  }, [activeTab]);
  
  // New employee search state
  const [empSearch, setEmpSearch] = useState('');
  const empFormData = { personnelId: '', fullName: '', nationalId: '', department: '', hireDate: '', jobTitle: '', phoneNumber: '' };
  const setEmpFormData = (val: any) => {};

  const [editingPersonnelId, setEditingPersonnelId] = useState<string | null>(null);
  const [editingEmpData, setEditingEmpData] = useState<Partial<Employee>>({});

  // New Code State
  const [newCode, setNewCode] = useState<Partial<CodeItem>>({ code: 0, label: '', score: 0, department: 'HSE' });
  const [codeType, setCodeType] = useState<'VIOLATION' | 'REWARD'>('VIOLATION');

  // Server network config states
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('sg_serverUrl') || '');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(settings.language === 'fa' ? 'این یک پیامک تست از سامانه HSE است.' : 'This is a test SMS from HSE system.');
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSaveSmsConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSmsConfig(smsConfig);
    alert(settings.language === 'fa' ? 'تنظیمات پیامک با موفقیت ذخیره شد.' : 'SMS configuration saved successfully.');
  };

  const handleClearSmsLogs = () => {
    if (confirm(settings.language === 'fa' ? 'آیا از پاک کردن تمامی لاگ‌های ارسال پیامک مطمئن هستید؟' : 'Are you sure you want to clear all SMS log history?')) {
      saveSmsLogs([]);
      setSmsLogsState([]);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      alert(settings.language === 'fa' ? 'لطفا شماره همراه و متن پیامک را وارد کنید.' : 'Please enter a test mobile number and message.');
      return;
    }
    setIsSendingTest(true);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: smsConfig,
          recipientPhone: testPhone,
          message: testMessage,
          placeholders: { name: 'کاربر تست', date: 'امروز', reason: 'تست سیستم', type: 'WARNING' }
        })
      });
      const result = await response.json();
      setIsSendingTest(false);
      if (response.ok && result.success) {
        alert(settings.language === 'fa' ? `پیامک با موفقیت ارسال شد: ${result.message}` : `SMS sent successfully: ${result.message}`);
        setSmsLogsState(getSmsLogs());
      } else {
        alert(settings.language === 'fa' ? `خطا در ارسال پیامک: ${result.message}` : `Error sending SMS: ${result.message}`);
        setSmsLogsState(getSmsLogs());
      }
    } catch (e: any) {
      setIsSendingTest(false);
      alert(settings.language === 'fa' ? `خطا در برقراری ارتباط با سرور: ${e.message}` : `Server connection error: ${e.message}`);
    }
  };
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

  const normalizeUrl = (url: string): string => {
    let trimmed = url.trim();
    if (!trimmed) return '';
    
    // If it doesn't have a protocol, prepend http://
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'http://' + trimmed;
    }
    
    try {
      const parsed = new URL(trimmed);
      // If there's no port specified and it's a typical IP or localhost, append :3000
      if (!parsed.port) {
        const hostname = parsed.hostname;
        const isIpOrLocal = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(hostname) || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
        if (isIpOrLocal) {
          parsed.port = '3000';
          trimmed = parsed.toString().replace(/\/$/, ''); // remove trailing slash
        }
      }
    } catch (e) {
      if (!trimmed.includes(':', 6)) {
        trimmed = trimmed + ':3000';
      }
    }
    return trimmed;
  };

  const getNormalizedActiveUrl = (): string => {
    const normalized = normalizeUrl(serverUrl);
    return normalized || (window.location.hostname ? window.location.origin : 'http://localhost:3000');
  };

  const isCloudPreview = typeof window !== 'undefined' && 
    window.location.hostname && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1') && 
    !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.hostname);

  const isTestingLocalUrlOnCloud = (): boolean => {
    const activeUrl = getNormalizedActiveUrl();
    if (!activeUrl) return false;
    try {
      const parsed = new URL(activeUrl);
      const host = parsed.hostname;
      const isLocalHostOrIp = host === 'localhost' || 
        host === '127.0.0.1' || 
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
      return !!(isCloudPreview && isLocalHostOrIp);
    } catch {
      return false;
    }
  };

  const testServerConnection = async () => {
    setConnectionStatus('checking');
    try {
      const activeUrl = getNormalizedActiveUrl();
      const res = await fetch(`${activeUrl}/api/health`, { method: 'GET' });
      
      const contentType = res.headers.get('content-type') || '';
      const isHtmlResponse = contentType.includes('text/html');
      const isCustomServer = serverUrl.trim() !== '' && !getNormalizedActiveUrl().startsWith(window.location.origin);
      
      if (res.ok && !(isCustomServer && isHtmlResponse)) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('failed');
      }
    } catch {
      setConnectionStatus('failed');
    }
  };

  const handleSaveServerUrl = () => {
    const normalized = normalizeUrl(serverUrl);
    if (normalized) {
      setServerUrl(normalized);
      localStorage.setItem('sg_serverUrl', normalized);
    } else {
      setServerUrl('');
      localStorage.removeItem('sg_serverUrl');
    }
    alert(settings.language === 'fa' ? 'آدرس اتصال به سرور با موفقیت ثبت شد. اتصالات بعدی از این آدرس انجام می‌شود.' : 'Server connection URL saved successfully.');
  };

  const t = TRANSLATIONS[settings.language];
  const isDeveloper = currentUser.role === 'DEVELOPER';
  const canManageUsers = isDeveloper; // Restrict creating a new user strictly to DEVELOPER mode
  const canManageCodes = isDeveloper || 
    currentUser.role === 'HR_MANAGER' || 
    currentUser.role === 'ADMIN_STAFF' || 
    currentUser.role === 'PLANT_MANAGER' || 
    currentUser.role === 'TRAINING_MANAGER';
  const isUnitManager = isDeveloper || 
    currentUser.role === 'HSE_MANAGER' || 
    currentUser.role === 'SECURITY_MANAGER' || 
    currentUser.role === 'TRAINING_MANAGER' || 
    currentUser.role === 'HR_MANAGER' || 
    currentUser.role === 'PLANT_MANAGER' ||
    currentUser.role === 'DEPARTMENT_MANAGER' ||
    currentUser.role === 'ADMIN_STAFF';

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateSettings({ ...settings, companyLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = newUser.username.trim();
    const trimmedPassword = newUser.password.trim();
    const trimmedFullName = newUser.fullName.trim();
    if(trimmedUsername && trimmedPassword && trimmedFullName) {
        const validateCredentialsObj = (str: string) => {
            return /[a-z]/.test(str) && /[A-Z]/.test(str) && /\d/.test(str);
        };

        if (trimmedUsername.length < 3) {
            alert(settings.language === 'fa' 
                ? 'خطای اعتبارسنجی: نام کاربری باید حداقل ۳ کاراکتر باشد.'
                : 'Validation Error: Username must be at least 3 characters.');
            return;
        }

        if (!validateCredentialsObj(trimmedPassword)) {
            alert(settings.language === 'fa' 
                ? 'خطای اعتبارسنجی: کلمه عبور حتماً باید شامل حداقل یک حرف بزرگ (A-Z)، یک حرف کوچک (a-z) و یک عدد (0-9) باشد.'
                : 'Validation Error: Password must contain at least one uppercase letter (A-Z), one lowercase letter (a-z), and a number (0-9).');
            return;
        }

        // Validate Managed Dept
        if(newUser.role === 'DEPARTMENT_MANAGER' && !newUser.managedDepartment) {
            alert('لطفا نام واحد تحت مدیریت را وارد کنید.');
            return;
        }

        const u: User = {
            id: Date.now().toString(),
            username: trimmedUsername,
            password: trimmedPassword,
            fullName: trimmedFullName,
            role: newUser.role as Role,
            managedDepartment: newUser.role === 'DEPARTMENT_MANAGER' ? newUser.managedDepartment : undefined,
            phoneNumber: newUser.phoneNumber?.trim() || undefined,
            email: newUser.email?.trim() || undefined,
            telegramUsername: newUser.telegramUsername?.trim() || undefined
        };
        onUpdateUsers([...users, u]);
        setNewUser({ username: '', password: '', fullName: '', role: 'HSE_OFFICER', managedDepartment: '', phoneNumber: '', email: '', telegramUsername: '' });
    }
  };

  const handleDeleteUser = (id: string) => {
      if(window.confirm('Are you sure?')) {
          onUpdateUsers(users.filter(u => u.id !== id));
      }
  };

  const handleResetAllPasswords = () => {
      if(window.confirm("آیا اطمینان دارید؟ رمز عبور تمام کاربران به 'Pass123' تغییر خواهد کرد.")) {
          onUpdateUsers(users.map(u => ({ ...u, password: 'Pass123' })));
          alert("تمام رمزها به 'Pass123' ریست شدند.");
      }
  };

  const handleFactoryReset = () => {
      if(window.confirm("هشدار: تمام اطلاعات (کاربران، تخلفات، تنظیمات) حذف خواهد شد. آیا مطمئن هستید؟")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const handleAddCode = (e: React.FormEvent) => {
      e.preventDefault();
      if (!canManageCodes) {
          alert(settings.language === 'fa' 
              ? 'خطای امنیتی: شما اجازه تعریف کد جدید را ندارید!' 
              : 'Security Error: You are not authorized to create a new code.');
          return;
      }
      if(newCode.label && newCode.code && newCode.department) {
          const item: CodeItem = {
              id: Date.now().toString(),
              code: Number(newCode.code),
              label: newCode.label,
              score: Number(newCode.score),
              department: newCode.department
          };
          if(codeType === 'VIOLATION') onUpdateViolationCodes([...violationCodes, item]);
          else onUpdateRewardCodes([...rewardCodes, item]);
          
          setNewCode({ code: 0, label: '', score: 0, department: newCode.department });
      }
  };

  const handleDeleteCode = (id: string, type: 'VIOLATION' | 'REWARD') => {
      if (!canManageCodes) {
          alert(settings.language === 'fa' 
              ? 'خطای امنیتی: شما اجازه حذف کدهای موجود را ندارید!' 
              : 'Security Error: You are not authorized to delete codes.');
          return;
      }
      if(type === 'VIOLATION') onUpdateViolationCodes(violationCodes.filter(c => c.id !== id));
      else onUpdateRewardCodes(rewardCodes.filter(c => c.id !== id));
  };

  // --- Personnel Import Logic ---
  const handlePersonnelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const dataBytes = evt.target?.result;
          if (!dataBytes) {
            throw new Error("No data read from file");
          }
          
          const wb = XLSX.read(dataBytes, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const normalizeKey = (key: string): string => {
            return key
              .replace(/[\s\u200c\-_]+/g, '') // remove spaces, underscores, hyphens, and zero-width non-joiners
              .replace(/ي/g, 'ی')
              .replace(/ك/g, 'ک')
              .trim()
              .toLowerCase();
          };

          const getRowValue = (row: any, possibleKeys: string[]): string => {
            const normalizedPossibles = possibleKeys.map(k => normalizeKey(k));
            for (const rawKey of Object.keys(row)) {
              const normRawKey = normalizeKey(rawKey);
              if (normalizedPossibles.includes(normRawKey)) {
                return String(row[rawKey] ?? '').trim();
              }
            }
            return '';
          };

          const imported: Employee[] = data.map((row: any) => {
            const pId = getRowValue(row, ['PersonnelID', 'کد پرسنلی', 'کد', 'کد_پرسنلی', 'personnel_id', 'شماره پرسنلی', 'شماره_پرسنلی']);
            const fName = getRowValue(row, ['FullName', 'نام و نام خانوادگی', 'نام', 'نام کامل', 'نام_کامل', 'full_name', 'نام خانوادگی']);
            const nId = getRowValue(row, ['NationalID', 'کد ملی', 'کدملی', 'کد_ملی', 'national_id', 'شناسنامه']);
            const dept = getRowValue(row, ['Department', 'واحد', 'بخش', 'قسمت', 'department', 'واحد سازمانی']);
            const hDate = getRowValue(row, ['HireDate', 'تاریخ شروع به کار', 'تاریخ شروع', 'تاریخ_شروع', 'تاریخ استخدام', 'تاریخ_استخدام', 'hire_date']);
            const title = getRowValue(row, ['JobTitle', 'سمت', 'job_title', 'عنوان شغلی', 'عنوان_شغلی', 'نقش']);
            const phone = getRowValue(row, ['PhoneNumber', 'شماره تماس', 'تلفن', 'موبایل', 'تلفن همراه', 'تلفن_همراه', 'شماره همراه', 'شماره_همراه', 'phone', 'mobile', 'phone_number']);
            
            return {
              id: Date.now().toString() + Math.random().toString().slice(2, 6),
              personnelId: pId,
              fullName: fName,
              department: dept,
              jobTitle: title || undefined,
              nationalId: nId || undefined,
              hireDate: hDate || undefined,
              phoneNumber: phone || undefined
            };
          }).filter((e: Employee) => e.personnelId && e.fullName);

          if (imported.length > 0) {
             const checkIncompleteCount = imported.filter((emp: Employee) => {
               return !emp.department || emp.department.trim() === '' || emp.department === 'ثبت نشده' ||
                      !emp.nationalId || emp.nationalId.trim() === '' ||
                      !emp.phoneNumber || emp.phoneNumber.trim() === '' ||
                      !emp.jobTitle || emp.jobTitle.trim() === '' ||
                      !emp.hireDate || emp.hireDate.trim() === '';
             }).length;

             const incompleteWarning = checkIncompleteCount > 0
               ? (settings.language === 'fa' 
                   ? `\n\n⚠️ هشدار: تعداد ${checkIncompleteCount} پرونده بارگذاری شده دارای نقص اطلاعات هستند (واحد، کدملی، تلفن یا سایر فیلدها خالی ثبت شده است).` 
                   : `\n\n⚠️ Warning: ${checkIncompleteCount} of the imported profiles have incomplete information (empty department, national ID, phone, etc.).`)
               : '';

             if (importMode === 'MERGE') {
                const mergedMap = new Map<string, Employee>();
                employees.forEach(emp => mergedMap.set(emp.personnelId, emp));
                imported.forEach(emp => {
                  const existing = mergedMap.get(emp.personnelId);
                  if (existing) {
                    mergedMap.set(emp.personnelId, {
                      ...existing,
                      fullName: emp.fullName || existing.fullName,
                      department: emp.department || existing.department,
                      nationalId: emp.nationalId || existing.nationalId,
                      hireDate: emp.hireDate || existing.hireDate,
                      jobTitle: emp.jobTitle || existing.jobTitle,
                      phoneNumber: emp.phoneNumber || existing.phoneNumber
                    });
                  } else {
                    mergedMap.set(emp.personnelId, emp);
                  }
                });
                onUpdateEmployees(Array.from(mergedMap.values()));
                alert((settings.language === 'fa' 
                  ? `${imported.length} پرسنل با موفقیت تلفیق و بروزرسانی شدند.` 
                  : `Successfully merged and updated ${imported.length} employee records.`) + incompleteWarning);
             } else {
                onUpdateEmployees(imported);
                alert((settings.language === 'fa' 
                  ? `${imported.length} پرسنل جدید بارگذاری و جایگزین کل لیست شدند.` 
                  : `Successfully imported and replaced with ${imported.length} employee records.`) + incompleteWarning);
             }
          } else {
             alert(settings.language === 'fa' ? 'فایل فاقد اطلاعات معتبر است. لطفا نام ستون‌ها را بر اساس نمونه الگو تنظیم کنید.' : 'File lacks valid employee data. Please verify your column headers match the template.');
          }

        } catch (error) {
          console.error(error);
          alert(settings.language === 'fa' ? 'خطا در خواندن فایل اکسل.' : 'Error parsing Excel sheet.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handlePersonnelTextImport = (text: string) => {
    if (!text.trim()) {
      alert(settings.language === 'fa' ? 'لطفاً ابتدا اطلاعات پرسنل را در کادر وارد کنید.' : 'Please enter personnel data in the text area first.');
      return;
    }

    let parsedEmployees: Employee[] = [];

    // Try parsing as JSON array first
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        parsedEmployees = json.map((item: any) => {
          return {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            personnelId: String(item.personnelId || item['کد پرسنلی'] || item['کد'] || '').trim(),
            fullName: String(item.fullName || item['نام و نام خانوادگی'] || item['نام'] || '').trim(),
            department: String(item.department || item['واحد'] || item['بخش'] || '').trim(),
            jobTitle: String(item.jobTitle || item['سمت'] || item['عنوان شغلی'] || '').trim() || undefined,
            nationalId: String(item.nationalId || item['کد ملی'] || item['کدملی'] || '').trim() || undefined,
            phoneNumber: String(item.phoneNumber || item['شماره تماس'] || item['تلفن'] || item['موبایل'] || '').trim() || undefined,
            hireDate: String(item.hireDate || item['تاریخ شروع به کار'] || item['تاریخ شروع'] || '').trim() || undefined,
          };
        }).filter((e: Employee) => e.personnelId && e.fullName);
      }
    } catch (e) {
      // Not JSON
    }

    if (parsedEmployees.length === 0) {
      // Split by lines
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      parsedEmployees = lines.map(line => {
        // Detect delimiter
        let delimiter: string | RegExp = ',';
        if (line.includes('\t')) {
          delimiter = '\t';
        } else if (line.includes('|')) {
          delimiter = '|';
        } else if (line.includes(';')) {
          delimiter = ';';
        } else if (line.includes(',')) {
          delimiter = ',';
        } else {
          delimiter = /\s{2,}/; // double or more spaces
        }

        const cols = line.split(delimiter).map(c => c.trim());
        if (cols.length < 2) return null;

        // Order: PersonnelID | FullName | Department | JobTitle | NationalID | PhoneNumber | HireDate
        return {
          id: Date.now().toString() + Math.random().toString().slice(2, 6),
          personnelId: cols[0] || '',
          fullName: cols[1] || '',
          department: cols[2] || '',
          jobTitle: cols[3] || undefined,
          nationalId: cols[4] || undefined,
          phoneNumber: cols[5] || undefined,
          hireDate: cols[6] || undefined,
        };
      }).filter((e): e is Employee => e !== null && e.personnelId !== '' && e.fullName !== '');
    }

    if (parsedEmployees.length === 0) {
      alert(settings.language === 'fa' 
        ? 'داده معتبری یافت نشد. لطفاً مطمئن شوید اطلاعات را در قالب ستون‌های مشخص شده (حداقل شامل کد پرسنلی و نام پرسنل) وارد کرده‌اید.' 
        : 'No valid data found. Make sure you entered data in the specified columns (at least Personnel ID and Full Name).');
      return;
    }

    const checkIncompleteCount = parsedEmployees.filter((emp: Employee) => {
      return !emp.department || emp.department.trim() === '' || emp.department === 'ثبت نشده' ||
             !emp.nationalId || emp.nationalId.trim() === '' ||
             !emp.phoneNumber || emp.phoneNumber.trim() === '' ||
             !emp.jobTitle || emp.jobTitle.trim() === '' ||
             !emp.hireDate || emp.hireDate.trim() === '';
    }).length;

    const incompleteWarning = checkIncompleteCount > 0
      ? (settings.language === 'fa' 
          ? `\n\n⚠️ هشدار: تعداد ${checkIncompleteCount} پرونده بارگذاری شده دارای نقص اطلاعات هستند (واحد، کدملی، تلفن یا سایر فیلدها خالی ثبت شده است).` 
          : `\n\n⚠️ Warning: ${checkIncompleteCount} of the imported profiles have incomplete information (empty department, national ID, phone, etc.).`)
      : '';

    if (importMode === 'MERGE') {
      const mergedMap = new Map<string, Employee>();
      employees.forEach(emp => mergedMap.set(emp.personnelId, emp));
      parsedEmployees.forEach(emp => {
        const existing = mergedMap.get(emp.personnelId);
        if (existing) {
          mergedMap.set(emp.personnelId, {
            ...existing,
            fullName: emp.fullName || existing.fullName,
            department: emp.department || existing.department,
            nationalId: emp.nationalId || existing.nationalId,
            hireDate: emp.hireDate || existing.hireDate,
            jobTitle: emp.jobTitle || existing.jobTitle,
            phoneNumber: emp.phoneNumber || existing.phoneNumber
          });
        } else {
          mergedMap.set(emp.personnelId, emp);
        }
      });
      onUpdateEmployees(Array.from(mergedMap.values()));
      alert((settings.language === 'fa' 
        ? `${parsedEmployees.length} پرسنل با موفقیت از متن کپی-پیست شده تلفیق و بروزرسانی شدند.` 
        : `Successfully merged and updated ${parsedEmployees.length} employee records from pasted text.`) + incompleteWarning);
    } else {
      onUpdateEmployees(parsedEmployees);
      alert((settings.language === 'fa' 
        ? `${parsedEmployees.length} پرسنل جدید از متن کپی-پیست شده بارگذاری و جایگزین کل لیست شدند.` 
        : `Successfully imported and replaced with ${parsedEmployees.length} employee records from pasted text.`) + incompleteWarning);
    }

    setBulkText(''); // Clear text area
  };

  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.json_to_sheet([
          { 
            'کد پرسنلی': '1001', 
            'نام و نام خانوادگی': 'حمید رافیان', 
            'کد ملی': '1234567890', 
            'واحد': 'HSE', 
            'سمت': 'افسر ایمنی',
            'تاریخ شروع به کار': '1401/10/01'
          },
          { 
            'کد پرسنلی': '1002', 
            'نام و نام خانوادگی': 'علی رضایی', 
            'کد ملی': '0987654321', 
            'واحد': 'تولید', 
            'سمت': 'اپراتور',
            'تاریخ شروع به کار': '1402/05/15'
          }
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, "Personnel_Template.xlsx");
  };

  const handleAddEmployeeDirect = (newEmp: Employee) => {
    onUpdateEmployees([...employees, newEmp]);
  };

  const handleDeleteEmployee = (personnelId: string) => {
    if (confirm(settings.language === 'fa' ? 'آیا از حذف این پرسنل اطمینان دارید؟ تمامی رکوردهای فعلی او حفظ اما برای گزارش‌های بعدی فعال نخواهد بود.' : 'Are you sure you want to delete this employee?')) {
      onUpdateEmployees(employees.filter(emp => emp.personnelId !== personnelId));
    }
  };

  const handleUpdateEmployeePhone = (personnelId: string, newPhone: string) => {
    const updated = employees.map(emp => emp.personnelId === personnelId ? { ...emp, phoneNumber: newPhone } : emp);
    onUpdateEmployees(updated);
  };

  const handleSaveEditingEmployee = () => {
    if (!editingPersonnelId) return;
    const updated = employees.map(emp => {
      if (emp.personnelId === editingPersonnelId) {
        return {
          ...emp,
          fullName: editingEmpData.fullName?.trim() || emp.fullName,
          nationalId: editingEmpData.nationalId?.trim() || '',
          phoneNumber: editingEmpData.phoneNumber?.trim() || '',
          department: editingEmpData.department || emp.department,
          jobTitle: editingEmpData.jobTitle?.trim() || '',
          hireDate: editingEmpData.hireDate?.trim() || ''
        };
      }
      return emp;
    });
    onUpdateEmployees(updated);
    setEditingPersonnelId(null);
  };

  // --- Backup & Restore Logic ---
  const handleExportBackup = () => {
    const dataToExport = {
      sg_users: localStorage.getItem('sg_users'),
      sg_settings: localStorage.getItem('sg_settings'),
      sg_violations: localStorage.getItem('sg_violations'),
      sg_rewards: localStorage.getItem('sg_rewards'),
      sg_employees: localStorage.getItem('sg_employees'),
      sg_violationCodes: localStorage.getItem('sg_violationCodes'),
      sg_rewardCodes: localStorage.getItem('sg_rewardCodes'),
      version: "3.2.0",
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SafeWatch_Backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareBackup = async () => {
    const dataToExport = {
      sg_users: localStorage.getItem('sg_users'),
      sg_settings: localStorage.getItem('sg_settings'),
      sg_violations: localStorage.getItem('sg_violations'),
      sg_rewards: localStorage.getItem('sg_rewards'),
      sg_employees: localStorage.getItem('sg_employees'),
      sg_violationCodes: localStorage.getItem('sg_violationCodes'),
      sg_rewardCodes: localStorage.getItem('sg_rewardCodes'),
      version: "3.2.0",
      exportDate: new Date().toISOString()
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const fileName = `SafeWatch_Backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;

    if (navigator.share) {
      try {
        const file = new File([jsonString], fileName, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'SafeWatch Backup',
            text: settings.language === 'fa' ? 'فایل پشتیبان کامل سامانه SafeWatch' : 'SafeWatch Complete Backup File'
          });
        } else {
          await navigator.share({
            title: 'SafeWatch Backup JSON',
            text: jsonString
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          alert(settings.language === 'fa' 
            ? `خطا در اشتراک‌گذاری: ${err.message}` 
            : `Share failed: ${err.message}`);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(jsonString);
        alert(settings.language === 'fa'
          ? 'داده‌های پشتیبان در حافظه موقت (Clipboard) کپی شدند. دانلود خودکار فایل آغاز می‌شود...'
          : 'Backup JSON copied to clipboard successfully. Downloading file now.');
        handleExportBackup();
      } catch (e) {
        handleExportBackup();
      }
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (!json.version) throw new Error("Invalid backup file format");

          if (confirm(t.restoreDesc)) {
             if (json.sg_users) localStorage.setItem('sg_users', json.sg_users);
             if (json.sg_settings) localStorage.setItem('sg_settings', json.sg_settings);
             if (json.sg_employees) localStorage.setItem('sg_employees', json.sg_employees);
             if (json.sg_violationCodes) localStorage.setItem('sg_violationCodes', json.sg_violationCodes);
             if (json.sg_rewardCodes) localStorage.setItem('sg_rewardCodes', json.sg_rewardCodes);

             if (importMode === 'MERGE') {
                 const currentV = JSON.parse(localStorage.getItem('sg_violations') || '[]');
                 const newV = JSON.parse(json.sg_violations || '[]');
                 const mergedVMap = new Map();
                 currentV.forEach((v: any) => mergedVMap.set(v.id, v));
                 newV.forEach((v: any) => mergedVMap.set(v.id, v)); 
                 localStorage.setItem('sg_violations', JSON.stringify(Array.from(mergedVMap.values())));

                 const currentR = JSON.parse(localStorage.getItem('sg_rewards') || '[]');
                 const newR = JSON.parse(json.sg_rewards || '[]');
                 const mergedRMap = new Map();
                 currentR.forEach((r: any) => mergedRMap.set(r.id, r));
                 newR.forEach((r: any) => mergedRMap.set(r.id, r));
                 localStorage.setItem('sg_rewards', JSON.stringify(Array.from(mergedRMap.values())));
             } else {
                 if (json.sg_violations) localStorage.setItem('sg_violations', json.sg_violations);
                 if (json.sg_rewards) localStorage.setItem('sg_rewards', json.sg_rewards);
             }
             
             alert(t.restoreSuccess);
             window.location.reload(); 
          }

        } catch (error) {
          console.error(error);
          alert(t.restoreError);
        }
      };
      reader.readAsText(file);
    }
  };

  const colors: {id: ThemeColor, color: string}[] = [
      {id: 'red', color: 'bg-red-600'},
      {id: 'blue', color: 'bg-blue-600'},
      {id: 'green', color: 'bg-emerald-600'},
      {id: 'violet', color: 'bg-violet-600'},
      {id: 'slate', color: 'bg-slate-600'},
  ];

  const roleOptions: Role[] = ['DEVELOPER', 'PLANT_MANAGER', 'HR_MANAGER', 'HSE_MANAGER', 'HSE_OFFICER', 'SECURITY_MANAGER', 'TRAINING_MANAGER', 'ADMIN_STAFF', 'DEPARTMENT_MANAGER'];

  return (
    <div className="fixed inset-0 bg-white md:bg-black/60 md:backdrop-blur-sm flex items-center justify-center z-50 md:p-4" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="bg-white md:rounded-2xl shadow-none md:shadow-2xl w-full md:max-w-4xl overflow-hidden flex flex-col md:flex-row h-full md:h-[600px]">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 p-4 md:p-6 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible shrink-0 no-scrollbar">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-0 md:mb-4 px-2 hidden md:block">{t.settings}</h2>
            
            <button 
                onClick={() => setActiveTab('APPEARANCE')}
                className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'APPEARANCE' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
            >
                <Palette className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-xs md:text-sm">{t.appearance}</span>
            </button>

            {canManageUsers && (
                <button 
                    onClick={() => setActiveTab('USERS')}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'USERS' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <UsersIcon className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-xs md:text-sm">{t.users}</span>
                </button>
            )}

            {isUnitManager && (
                 <button 
                    onClick={() => setActiveTab('CODES')}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'CODES' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <List className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-xs md:text-sm">{t.codingSystem}</span>
                </button>
            )}


            
            {(isDeveloper || currentUser.role === 'HSE_MANAGER' || currentUser.role === 'PLANT_MANAGER') && (
                <button 
                    onClick={() => setActiveTab('DATA')}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'DATA' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Database className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-xs md:text-sm">{t.dataManagement}</span>
                </button>
            )}

            {(isDeveloper || currentUser.role === 'HSE_MANAGER' || currentUser.role === 'PLANT_MANAGER' || currentUser.role === 'HR_MANAGER') && (
                <button 
                    onClick={() => setActiveTab('SMS')}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'SMS' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-xs md:text-sm">{(settings.language === 'fa' ? 'تنظیمات پیامک' : 'SMS Settings')}</span>
                </button>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-800">
                    {activeTab === 'APPEARANCE' && t.appearance}
                    {activeTab === 'USERS' && t.users}
                    {activeTab === 'DATA' && t.dataManagement}
                    {activeTab === 'CODES' && t.codingSystem}
                     {activeTab === 'SMS' && (settings.language === 'fa' ? 'تنظیمات اتصال پیامک و لاگ‌ها' : 'SMS Gateway & Notification Logs')}
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                </button>
            </div>

            {activeTab === 'APPEARANCE' && (
                <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Theme */}
                    <div className="bg-white border border-gray-100 p-4 md:p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-3 md:mb-4 text-gray-700 font-medium text-sm md:text-base">
                            <Palette className="w-4 h-4 md:w-5 md:h-5" />
                            {t.theme}
                        </div>
                        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2">
                            {colors.map(c => (
                                <button 
                                    key={c.id}
                                    onClick={() => onUpdateSettings({...settings, themeColor: c.id})}
                                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${c.color} flex items-center justify-center transition-transform hover:scale-110 shrink-0 ${settings.themeColor === c.id ? 'ring-4 ring-offset-2 ring-gray-200' : ''}`}
                                >
                                    {settings.themeColor === c.id && <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div className="bg-white border border-gray-100 p-4 md:p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-3 md:mb-4 text-gray-700 font-medium text-sm md:text-base">
                            <Globe className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                            {settings.language === 'fa' ? 'زبان برنامه' : 'App Language'}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onUpdateSettings({...settings, language: 'fa'})}
                                className={`px-4 py-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${settings.language === 'fa' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 font-bold text-indigo-750' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                            >
                                <span className="text-sm font-semibold">فارسی (Fa)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdateSettings({...settings, language: 'en'})}
                                className={`px-4 py-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${settings.language === 'en' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 font-bold text-indigo-750' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                            >
                                <span className="text-sm font-semibold">English (En)</span>
                            </button>
                        </div>
                    </div>

                    {/* Organizational Branding */}
                    <div className="bg-white border border-gray-100 p-4 md:p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-2 mb-3 md:mb-4 text-gray-700 font-medium text-sm md:text-base">
                            <Building2 className="w-4 h-4 md:w-5 md:h-5 text-indigo-550" />
                            {settings.language === 'fa' ? 'طراحی و هویت سازمانی' : 'Corporate Identity & Branding'}
                        </div>
                        
                        <div className="space-y-4">
                            {/* Company Name */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-650 mb-2">
                                    {settings.language === 'fa' ? 'نام سازمان / برند شما' : 'Organization / App Name'}
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-555 outline-none transition-all text-sm font-semibold"
                                    value={settings.companyName}
                                    onChange={(e) => onUpdateSettings({...settings, companyName: e.target.value})}
                                    placeholder={settings.language === 'fa' ? 'مثلا: سامانه جامع HSE شرکت فولاد' : 'e.g. Steel Corp HSE Platform'}
                                />
                            </div>

                            {/* Company Logo Preview and Upload */}
                            <div>
                                <label className="block text-xs md:text-sm font-semibold text-gray-650 mb-2">
                                    {settings.language === 'fa' ? 'لوگو یا نشان تجاری سازمان (تصویر واضح)' : 'Organization Brand Logo (Clear Image)'}
                                </label>
                                
                                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-white border border-gray-250 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                                        {settings.companyLogo ? (
                                            <img 
                                                src={settings.companyLogo} 
                                                alt="Preview" 
                                                className="w-full h-full object-contain"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <Building2 className="w-8 h-8 text-gray-300" />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            <label className="cursor-pointer bg-white border border-gray-200 hover:bg-gray-100 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 transition-colors flex items-center gap-1 active:scale-95">
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>{settings.language === 'fa' ? 'بارگذاری لوگو جدید' : 'Upload New Logo'}</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={handleLogoUpload} 
                                                />
                                            </label>

                                            {settings.companyLogo && settings.companyLogo !== './app_icon_fixed.jpg' && (
                                                <button 
                                                    type="button"
                                                    onClick={() => onUpdateSettings({ ...settings, companyLogo: './app_icon_fixed.jpg' })}
                                                    className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 active:scale-95"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>{settings.language === 'fa' ? 'بازنشانی به پیش‌فرض' : 'Reset to Default'}</span>
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] md:text-xs text-gray-400">
                                            {settings.language === 'fa' 
                                                ? 'برای بهترین نمایش، از تصویر مربع یا دایره با وضوح بالا استفاده کنید.' 
                                                : 'For best results, upload a high-resolution square or circular image.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'USERS' && (
                <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Security notification banner */}
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 md:p-4 rounded-xl text-xs flex gap-2.5 items-start">
                        <Key className="w-4.5 h-4.5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-semibold block mb-1">
                                {settings.language === 'fa' ? 'الزام امنیتی حساب‌های کاربری:' : 'Mandatory Account Security Directives:'}
                            </span>
                            <span className="leading-relaxed">
                                {settings.language === 'fa' 
                                    ? 'کلمه عبور حتماً باید حاوی حداقل یک حرف بزرگ انگلیسی (A-Z)، یک حرف کوچک انگلیسی (a-z) و اعداد (0-9) باشد. نام کاربری باید حداقل ۳ کاراکتر داشته باشد.' 
                                    : 'The Password must contain at least one uppercase letter (A-Z), one lowercase letter (a-z), and numbers (0-9). The Username must be at least 3 characters.'}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleAddUser} className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <input 
                            placeholder={t.username}
                            value={newUser.username} 
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            required
                        />
                         <input 
                            placeholder={t.password}
                            value={newUser.password} 
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            required
                        />
                         <input 
                            placeholder="Full Name"
                            value={newUser.fullName} 
                            onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            required
                        />
                        <select 
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                            {roleOptions.map(r => (
                                <option key={r} value={r}>{(t as any)[`role_${r.toLowerCase()}`] || r}</option>
                            ))}
                        </select>
                        
                        <input 
                            placeholder={settings.language === 'fa' ? 'شماره موبایل (جهت پیامک بازیابی)' : 'Phone Number (for SMS recovery)'}
                            value={newUser.phoneNumber || ''} 
                            onChange={e => setNewUser({...newUser, phoneNumber: e.target.value})}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                        <input 
                            placeholder={settings.language === 'fa' ? 'ایمیل (جهت ایمیل بازیابی)' : 'Email (for Email recovery)'}
                            value={newUser.email || ''} 
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            type="email"
                        />
                        <input 
                            placeholder={settings.language === 'fa' ? 'شناسه تلگرام (مثال: Support_User@)' : 'Telegram Username (e.g. @support)'}
                            value={newUser.telegramUsername || ''} 
                            onChange={e => setNewUser({...newUser, telegramUsername: e.target.value})}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm md:col-span-2"
                        />
                        
                        {/* Custom Dept Input */}
                        {newUser.role === 'DEPARTMENT_MANAGER' && (
                             <input 
                                placeholder={t.managedDepartment}
                                value={newUser.managedDepartment} 
                                onChange={e => setNewUser({...newUser, managedDepartment: e.target.value})}
                                className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:col-span-2 bg-blue-50"
                                required
                            />
                        )}

                        <button type="submit" className="md:col-span-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm">
                            <UserPlus className="w-4 h-4" />
                            {t.addUser}
                        </button>
                    </form>

                    <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-xs md:text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                <tr>
                                    <th className={`px-3 py-2 md:px-4 md:py-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>{t.username}</th>
                                    {isDeveloper && (
                                        <th className={`px-3 py-2 md:px-4 md:py-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>
                                            {settings.language === 'fa' ? 'رمز عبور' : 'Password'}
                                        </th>
                                    )}
                                    <th className={`px-3 py-2 md:px-4 md:py-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>Name</th>
                                    <th className={`px-3 py-2 md:px-4 md:py-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>{t.role}</th>
                                    <th className="px-3 py-2 md:px-4 md:py-3 text-center">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 md:px-4 md:py-3 font-semibold text-gray-900">{u.username}</td>
                                        {isDeveloper && (
                                            <td className="px-3 py-2 md:px-4 md:py-3 font-mono text-xs text-indigo-600 font-bold bg-indigo-50/50">
                                                <span className="select-all bg-white px-2 py-0.5 rounded border border-indigo-100 shadow-sm">{u.password}</span>
                                            </td>
                                        )}
                                        <td className="px-3 py-2 md:px-4 md:py-3">
                                            <div className="font-medium text-gray-800">{u.fullName}</div>
                                            {(u.phoneNumber || u.email || u.telegramUsername) && (
                                                <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-gray-400">
                                                    {u.phoneNumber && <span className="bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">📞 {u.phoneNumber}</span>}
                                                    {u.email && <span className="bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">✉️ {u.email}</span>}
                                                    {u.telegramUsername && <span className="bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">✈️ {u.telegramUsername}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 md:px-4 md:py-3">
                                            <div className="flex flex-col">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs w-fit ${u.role === 'HSE_MANAGER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {(t as any)[`role_${u.role.toLowerCase()}`] || u.role}
                                                </span>
                                                {u.role === 'DEPARTMENT_MANAGER' && (
                                                    <span className="text-[10px] text-blue-600 mt-1 font-bold">{u.managedDepartment}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 md:px-4 md:py-3 text-center flex items-center justify-center gap-2">
                                            {u.username !== currentUser.username && (
                                                <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 p-1">
                                                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {isDeveloper && (
                        <div className="border-t border-dashed border-red-200 pt-4 mt-4">
                            <h4 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                                <Key className="w-3 h-3" />
                                {t.developerTools}
                            </h4>
                            <button 
                                onClick={handleResetAllPasswords}
                                className="w-full border border-red-200 text-red-600 bg-red-50 py-2 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                            >
                                {t.resetAllPasswords}
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {activeTab === 'CODES' && isUnitManager && (
                <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="flex bg-gray-100 p-1 rounded-xl w-full">
                         <button onClick={() => setCodeType('VIOLATION')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${codeType === 'VIOLATION' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>{t.mode_violation}</button>
                         <button onClick={() => setCodeType('REWARD')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${codeType === 'REWARD' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}>{t.mode_reward}</button>
                     </div>

                     {canManageCodes ? (
                         <form onSubmit={handleAddCode} className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                         <input type="number" placeholder="Code #" className="p-2 text-sm rounded border" required value={newCode.code || ''} onChange={e => setNewCode({...newCode, code: Number(e.target.value)})} />
                         <input type="number" placeholder={t.codeScore} className="p-2 text-sm rounded border" required value={newCode.score || ''} onChange={e => setNewCode({...newCode, score: Number(e.target.value)})} />
                         <input type="text" placeholder={t.codeTitle} className="p-2 text-sm rounded border col-span-2" required value={newCode.label || ''} onChange={e => setNewCode({...newCode, label: e.target.value})} />
                         <input type="text" placeholder={t.codeDept} className="p-2 text-sm rounded border col-span-2" required value={newCode.department || ''} onChange={e => setNewCode({...newCode, department: e.target.value})} />
                         <button type="submit" className="col-span-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                             <Plus className="w-4 h-4" /> {t.addCode}
                         </button>
                     </form>
                     ) : (
                         <div className="bg-amber-50/70 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed animate-in fade-in" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
                             <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                             <div>
                                 <span className="font-bold block text-amber-900 mb-1">
                                     {settings.language === 'fa' ? 'محدودیت دسترسی مدیریت کدها' : 'Code Management Restricted'}
                                 </span>
                                 <span>
                                     {settings.language === 'fa' 
                                         ? 'همکار گرامی، طبق سیاست‌های امنیتی سیستم، امکان تعریف کدهای جدید آیین‌نامه یا حذف آن‌ها تنها برای مدیر سیستم، منابع انسانی، مدیر آموزش، مدیر کارخانه و کادر اداری مجاز می‌باشد.' 
                                         : 'According to system security policies, defining new regulatory codes or deleting them is restricted to SysAdmin, HR, Training, Plant Managers, and Admin Staff.'}
                                 </span>
                             </div>
                         </div>
                     )}

                     <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-xs md:text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-center">#</th>
                                    <th className="px-3 py-2">{t.description}</th>
                                    <th className="px-3 py-2 text-center">{t.department}</th>
                                    <th className="px-3 py-2 text-center">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(codeType === 'VIOLATION' ? violationCodes : rewardCodes).map(code => (
                                    <tr key={code.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-center font-bold text-gray-500">{code.code}</td>
                                        <td className="px-3 py-2">
                                            {code.label}
                                            <span className={`block text-[10px] ${codeType === 'VIOLATION' ? 'text-red-500' : 'text-emerald-500'}`}>Score: {code.score}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center text-xs text-gray-400">{code.department}</td>
                                        <td className="px-3 py-2 text-center">
                                            {canManageCodes ? (
                                                <button onClick={() => handleDeleteCode(code.id, codeType)} className="text-red-500 hover:text-red-700 p-1">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 font-mono">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}
            
            {activeTab === 'DATA' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
                     {/* Intranet Server Connection Settings SECTION */}
                     <div className="bg-white border border-gray-150 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
                          <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                              {settings.language === 'fa' ? 'اتصال به سرور شبکه داخلی شرکت (Intranet)' : 'Intranet Company Client/Server Connection'}
                          </h4>
                          
                          <div className="space-y-3">
                              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                                  {settings.language === 'fa'
                                      ? 'برای اشتراک‌گذاری همزمان پرونده‌ها و ثبتیات بین پرسنل و مدیران در شبکه دفتری شرکت، آدرس سرور داخلی را وارد کنید.'
                                      : 'Configure the host-server IP to securely sync rewards and violations across all local network workstations.'}
                              </p>
                              
                              <div className="flex flex-col md:flex-row gap-2">
                                  <input 
                                      type="text" 
                                      placeholder="e.g. http://192.168.1.100:3000"
                                      value={serverUrl}
                                      onChange={(e) => setServerUrl(e.target.value)}
                                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-gray-400"
                                  />
                                  <div className="flex gap-2">
                                      <button 
                                          type="button"
                                          onClick={handleSaveServerUrl}
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                      >
                                          {settings.language === 'fa' ? 'ذخیره آدرس' : 'Save'}
                                      </button>
                                      <button 
                                          type="button"
                                          onClick={testServerConnection}
                                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                      >
                                          {settings.language === 'fa' ? 'تست اتصال' : 'Test Status'}
                                      </button>
                                  </div>
                              </div>

                              {connectionStatus === 'checking' && (
                                  <div className="text-xs text-indigo-600 font-bold animate-pulse">
                                      {settings.language === 'fa' ? '⏳ در حال تست اتصال به سرور...' : '⏳ Checking host connection...'}
                                  </div>
                              )}
                              {connectionStatus === 'success' && (
                                  <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg font-sans">
                                      {settings.language === 'fa' ? '✓ اتصال با موفقیت برقرار شد! سرور شبکه با این نسخه سازگار است.' : '✓ Connected successfully! System sync is live on this local node.'}
                                  </div>
                              )}
                              {connectionStatus === 'failed' && (
                                  <div className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 p-2.5 rounded-lg font-sans space-y-2">
                                      <div>
                                          {settings.language === 'fa' 
                                              ? '✗ خطای اتصال! لطفا از فعال بودن سرور روی پورت ۳۰۰۰ و صحت آدرس اطمینان حاصل کنید. (برنامه در حالت آفلاین بکار خود ادامه میدهد)' 
                                              : '✗ Direct ping failed! Ensure server is active on Port 3000. Operating in offline replica mode.'}
                                      </div>
                                      {isTestingLocalUrlOnCloud() && (
                                          <div className="mt-2 pt-2 border-t border-amber-200 text-amber-700 leading-relaxed text-[11px] font-medium bg-amber-100/40 p-2.5 rounded-md">
                                              {settings.language === 'fa' 
                                                  ? '💡 راهنمایی: به دلیل اینکه این پیش‌نمایش در بستر امن ابری (HTTPS) اجرا می‌شود، مرورگر شما اجازه ارسال درخواست مستقیم به آی‌پی‌های محلی و شبکه داخلی شرکت (مانند ۱۰.۱.۱.۱۳۵ یا localhost) را نمی‌دهد. نگران نباشید، آدرس صحیح را وارد کرده و دکمه «ذخیره آدرس» را بزنید؛ این تنظیم در نسخه دسکتاپ محلی شما که مستقیماً به شبکه داخلی متصل است، کاملاً صحیح کار خواهد کرد.' 
                                                  : '💡 Note: Since this preview runs in a secure Cloud sandbox (HTTPS), browser security prevents direct connection requests to your private Intranet IP or localhost. Rest assured, just type the correct address and click "Save Address"; this setup will function flawlessly in your local Desktop build connected to your intranet.'}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                     </div>

                     {/* Backup & Factory Reset SECTION */}
                    <div className="bg-white border border-gray-150 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
                         <h4 className="font-bold text-gray-800 text-sm border-b border-gray-100 pb-2">
                             {settings.language === 'fa' ? 'پشتیبان‌گیری و اعاده تنظیمات سامانه' : 'System Backup & Recovery'}
                         </h4>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* EXPORT */}
                            <button 
                                onClick={handleExportBackup}
                                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 text-xs md:text-sm font-semibold"
                            >
                                <Download className="w-4 h-4" />
                                {t.downloadBackup}
                            </button>

                            {/* SHARE */}
                            <button 
                                onClick={handleShareBackup}
                                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 text-xs md:text-sm font-semibold"
                            >
                                <Share2 className="w-4 h-4" />
                                {settings.language === 'fa' ? 'اشتراک‌گذاری داده‌ها' : 'Share Data'}
                            </button>

                            {/* IMPORT */}
                            <label className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all cursor-pointer shadow-sm active:scale-95 text-xs md:text-sm font-semibold">
                                <Upload className="w-4 h-4 text-gray-500" />
                                <span>{importMode === 'MERGE' ? t.mergeData : t.uploadBackup}</span>
                                <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                            </label>
                         </div>

                         {/* AUTOMATIC LOCAL BACKUPS LIST SECTION */}
                             <div className="pt-4 border-t border-dashed border-gray-150 space-y-3 mb-4">
                                  <span className="block text-xs font-bold text-gray-700">
                                      {settings.language === 'fa' ? 'تاریخچه پشتیبان‌گیری‌های خودکار سیستم (ذخیره لوکال)' : 'Automatic System Local Backup History'}
                                   </span>
                                   <p className="text-[11px] text-gray-500 leading-normal">
                                       {settings.language === 'fa'
                                           ? 'سیستم به طور خودکار با هر تغییر وضعیت جدید یک نسخه پشتیبان کامل به صورت محلی در حافظه مرورگر جهت تداوم کسب‌وکار ذخیره می‌کند.'
                                           : 'The application automatically captures a complete offline system snapshot to your browser storage upon database modifications.'}
                                   </p>

                                   <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                       {autoBackups.length === 0 ? (
                                           <div className="text-[11px] text-gray-400 py-4 text-center border border-dashed rounded-xl">
                                               {settings.language === 'fa' ? 'هیچ بکاپ خودکاری هنوز ثبت نشده است.' : 'No automatic backups captured yet.'}
                                           </div>
                                       ) : (
                                           autoBackups.map((bak, i) => {
                                               const dateStr = new Date(bak.timestamp).toLocaleString(
                                                   settings.language === 'fa' ? 'fa-IR' : 'en-US',
                                                   { dateStyle: 'medium', timeStyle: 'short' }
                                               );
                                               return (
                                                   <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-150 gap-2 hover:bg-gray-100 transition-colors" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
                                                       <div className="flex flex-col items-start">
                                                           <span className="text-[11.5px] font-bold text-gray-800">
                                                               {settings.language === 'fa' ? `پشتیبان خودکار شماره ${autoBackups.length - i}` : `Auto-Snapshot #${autoBackups.length - i}`}
                                                           </span>
                                                           <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                               {dateStr}
                                                           </span>
                                                       </div>
                                                       <div className="flex items-center gap-1.5 shrink-0">
                                                           <button
                                                               type="button"
                                                               onClick={() => {
                                                                   if (window.confirm(settings.language === 'fa' ? 'آیا مطمئن هستید که می‌خواهید اطلاعات فعلی سیستم را به این نسخه بازگردانید؟ تمامی اطلاعات جدید پاک خواهند شد.' : 'Are you sure you want to restore the entire database to this system snapshot? All current modifications will be replaced.')) {
                                                                       if (onRestoreFullBackup) {
                                                                           onRestoreFullBackup(bak);
                                                                           alert(settings.language === 'fa' ? 'اطلاعات با موفقیت بازیابی شد!' : 'Full recovery completed successfully!');
                                                                       }
                                                                   }
                                                               }}
                                                               className="px-2.5 py-1.5 text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm active:scale-95"
                                                           >
                                                               <Check className="w-3.5 h-3.5" />
                                                               {settings.language === 'fa' ? 'بازیابی' : 'Restore'}
                                                           </button>
                                                           <button
                                                               type="button"
                                                               onClick={() => {
                                                                   const blob = new Blob([JSON.stringify(bak, null, 2)], { type: 'application/json' });
                                                                   const url = URL.createObjectURL(blob);
                                                                   const a = document.createElement('a');
                                                                   a.href = url;
                                                                   a.download = `safewatch_autobackup_${new Date(bak.timestamp).getTime()}.json`;
                                                                   a.click();
                                                               }}
                                                               className="p-1.5 text-gray-550 hover:text-gray-850 bg-white border border-gray-250 rounded-lg shadow-sm hover:bg-gray-50"
                                                               title={settings.language === 'fa' ? 'دانلود فایل' : 'Download File'}
                                                           >
                                                               <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (window.confirm(settings.language === 'fa' ? 'حذف این فایل بکاپ؟' : 'Delete this backup file?')) {
                                                                        const updated = autoBackups.filter((_, idx) => idx !== i);
                                                                        localStorage.setItem('sg_auto_backups', JSON.stringify(updated));
                                                                        setAutoBackups(updated);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-red-650 hover:bg-red-50 hover:text-red-800 bg-white border border-gray-250 rounded-lg shadow-sm"
                                                                title={settings.language === 'fa' ? 'حذف' : 'Delete'}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                              </div>

                          {isDeveloper && (
                              <div className="pt-2 border-t border-dashed border-red-100 flex justify-end">
                                 <button 
                                     onClick={handleFactoryReset}
                                     className="px-4 py-2 bg-red-50 text-red-650 hover:bg-red-100 text-red-600 transition-colors rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-red-200"
                                 >
                                     <RefreshCw className="w-3.5 h-3.5" />
                                     {t.factoryReset}
                                 </button>
                              </div>
                          )}
                     </div>

                     {/* PERSONNEL REGISTRY SECTION */}
                     <div className="bg-white border border-gray-150 rounded-2xl p-4 md:p-5 shadow-sm space-y-5">
                          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                  <UsersIcon className="w-4 h-4 text-indigo-600" />
                                  {settings.language === 'fa' ? 'مدیریت بانک اطلاعات پرسنل کارخانه' : 'Factory Personnel Database'}
                              </h4>
                              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                  {employees.length} {settings.language === 'fa' ? 'نفر ثبت شده' : 'Registered'}
                              </span>
                          </div>

                         <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4">
                             <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-gray-200 pb-3">
                                 <div>
                                     <span className="block text-xs font-bold text-gray-700 mb-1">
                                         {settings.language === 'fa' ? 'نحوه بارگذاری لیست جدید پرسنل:' : 'Import Mode Strategy:'}
                                     </span>
                                     <div className="flex bg-gray-200 p-0.5 rounded-lg w-fit">
                                         <button 
                                             onClick={() => setImportMode('MERGE')} 
                                             className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${importMode === 'MERGE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                         >
                                             {settings.language === 'fa' ? 'تلفیق با لیست فعلی (افزودن و اصلاح)' : 'Merge & Update'}
                                         </button>
                                         <button 
                                             onClick={() => setImportMode('REPLACE')} 
                                             className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${importMode === 'REPLACE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                         >
                                             {settings.language === 'fa' ? 'پاکسازی و جایگزینی کامل' : 'Replace Entirely'}
                                         </button>
                                     </div>
                                 </div>

                                 <div>
                                     <span className="block text-xs font-bold text-gray-700 mb-1 md:text-left">
                                         {settings.language === 'fa' ? 'روش ورود اطلاعات پرسنل:' : 'Personnel Import Source:'}
                                     </span>
                                     <div className="flex bg-gray-200 p-0.5 rounded-lg w-fit md:ml-auto">
                                         <button 
                                             onClick={() => setImportMethod('EXCEL_FILE')} 
                                             className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${importMethod === 'EXCEL_FILE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                         >
                                             {settings.language === 'fa' ? '📂 بارگذاری فایل اکسل' : 'Excel File'}
                                         </button>
                                         <button 
                                             onClick={() => setImportMethod('TEXT_PASTE')} 
                                             className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${importMethod === 'TEXT_PASTE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                                         >
                                             {settings.language === 'fa' ? '✍️ کپی-پیست متنی اطلاعات' : 'Clipboard Paste'}
                                         </button>
                                     </div>
                                 </div>
                             </div>

                             {importMethod === 'EXCEL_FILE' ? (
                                 <div className="space-y-3 pt-1">
                                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                         <p className="text-[11px] text-gray-500 leading-relaxed max-w-md">
                                             {settings.language === 'fa' 
                                               ? 'لیست پرسنل را از طریق فایل اکسل آپلود کنید. ستون‌های مجاز: کد پرسنلی، نام و نام خانوادگی، بخش/واحد، کد ملی، شماره همراه، سمت شغلی، تاریخ شروع به کار.' 
                                               : 'Upload personnel list via Excel. Supported columns: Personnel ID, Full Name, Department, National ID, Phone, Job Title, Hire Date.'}
                                         </p>
                                         <div className="flex gap-2 font-bold select-none cursor-pointer shrink-0">
                                             <button 
                                                 onClick={handleDownloadTemplate}
                                                 className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all font-bold"
                                             >
                                                 <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                                 <span>{settings.language === 'fa' ? 'دانلود الگوی اکسل پرسنل' : 'Download Template'}</span>
                                             </button>
                                             
                                             <label className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all cursor-pointer shadow-sm active:scale-95 font-bold">
                                                 <Upload className="w-4 h-4" />
                                                 <span>{settings.language === 'fa' ? 'انتخاب و بارگذاری فایل اکسل' : 'Choose Excel File'}</span>
                                                 <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handlePersonnelImport} />
                                             </label>
                                         </div>
                                     </div>

                                     <div className="text-[11px] text-gray-500 leading-relaxed bg-white border border-gray-100 p-2.5 rounded-lg font-medium opacity-90">
                                          {settings.language === 'fa' ? (
                                              <>
                                                  💡 <strong className="text-gray-700">فرم‌بندی فایل اکسل:</strong> کافی است فایل حاوی ستون‌های <strong className="text-indigo-600">کد پرسنلی</strong>، <strong className="text-indigo-600">نام و نام خانوادگی</strong>، <strong className="text-indigo-600">کد ملی</strong>، و <strong className="text-indigo-600">واحد</strong> (یا معادل‌های انگلیسی آنها مانند PersonnelID, FullName, NationalID, Department, HireDate) باشد. بدون نیاز به فیلتر دستی، داده‌ها استخراج و در سامانه قرار می‌گیرند.
                                              </>
                                          ) : (
                                              <>
                                                  💡 <strong className="text-gray-700">Excel Format Requirements:</strong> The spreadsheet must contain columns for <strong className="text-indigo-500">PersonnelID</strong>, <strong className="text-indigo-500">FullName</strong>, <strong className="text-indigo-500">NationalID</strong>, and <strong className="text-indigo-500">Department</strong>. Column header row detection is automatic.
                                              </>
                                          )}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="space-y-3 pt-1">
                                      <div className="flex flex-col gap-1">
                                          <span className="text-[11px] font-bold text-gray-600">
                                              {settings.language === 'fa' 
                                                ? '✍️ اطلاعات را از فایل متنی، اکسل، یا ورد کپی کرده و در کادر زیر قرار دهید:' 
                                                : '✍️ Paste your copied text columns (CSV/TSV/pasted Excel rows) directly below:'}
                                          </span>
                                          <span className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                              {settings.language === 'fa' 
                                                ? 'ستون‌ها را به وسیله Tab یا کاما از هم جدا کنید. برای مثال، کپی-پیست مستقیم ردیف‌های یک جدول اکسل دقیقاً بدین صورت عمل می‌کند.' 
                                                : 'Columns should be tab-separated or comma-separated. Directly copying-pasting rows from Excel fits this layout perfectly.'}
                                          </span>
                                      </div>
                                      
                                      <textarea
                                          value={bulkText}
                                          onChange={e => setBulkText(e.target.value)}
                                          placeholder={settings.language === 'fa' 
                                            ? 'ترتیب ردیف‌ها: کد پرسنلی | نام کامل پرسنل | بخش یا واحد (اختیاری) | سمت سازمانی (اختیاری) | کد ملی (اختیاری) | شماره همراه (اختیاری) | تاریخ استخدام (اختیاری)\n\nمثال:\n1001\tعلی رضایی\tتولید\tاپراتور انبار\t0012345678\t09121111111\t1402/01/01\n1002\tمریم احمدی\tانبار\tسرپرست دفتر فنی\t0022345678\t09122222222\t1401/12/10' 
                                            : 'Row columns order: Personnel ID | Full Name | Department (optional) | Job Title (optional) | National ID (optional) | Phone Number (optional) | Hire Date (optional)\n\nExample:\n1001\tJohn Doe\tProduction\tOperator\t0012345678\t09121111111\t2024/01/01'}
                                          className="w-full h-32 px-3 py-2 border border-gray-250 bg-white rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed text-left"
                                          dir="ltr"
                                          spellCheck={false}
                                      />
                                      
                                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                                          <span>
                                              {settings.language === 'fa' 
                                                ? '💡 ورود اطلاعات بدون بخش یا واحد، منجر به بروز هشدار نقص پرونده خواهد شد اما پرونده با موفقیت ثبت می‌شود.' 
                                                : '💡 Saving profiles with empty department creates active profiles but flags them as incomplete.'}
                                          </span>
                                          <div className="flex justify-end gap-2 shrink-0">
                                              <button 
                                                  type="button"
                                                  onClick={() => setBulkText('')}
                                                  className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg"
                                              >
                                                  {settings.language === 'fa' ? 'پاک کردن کادر' : 'Clear'}
                                              </button>
                                              <button 
                                                  type="button"
                                                  onClick={() => handlePersonnelTextImport(bulkText)}
                                                  className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-sm"
                                              >
                                                  <Plus className="w-3.5 h-3.5" />
                                                  <span>{settings.language === 'fa' ? 'ثبت و بارگذاری اطلاعات پرسنل' : 'Import Pasted Personnel'}</span>
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          {/* Manual Adding Form */}
                          <ManualEmployeeForm
                              settings={settings}
                              employees={employees}
                              onAddEmployee={handleAddEmployeeDirect}
                          />
                          <div className="hidden">
                             <span className="block text-xs font-black text-gray-700 flex items-center gap-1">
                                 <UserPlus className="w-4 h-4 text-indigo-500" />
                                 {settings.language === 'fa' ? 'ثبت و تعریف دستی پرسنل جدید' : 'Manually Enroll New Personnel'}
                             </span>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                 <div>
                                     <label className="block text-[10px] text-gray-500 mb-1">{settings.language === 'fa' ? 'کد پرسنلی (اجباری)' : 'Personnel ID (Required)'}</label>
                                     <input 
                                         type="text" 
                                         placeholder="e.g. 1003"
                                         value={empFormData.personnelId}
                                         onChange={e => setEmpFormData({...empFormData, personnelId: e.target.value})}
                                         className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                         required
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-[10px] text-gray-500 mb-1">{settings.language === 'fa' ? 'نام و نام خانوادگی (اجباری)' : 'Full Name (Required)'}</label>
                                     <input 
                                         type="text" 
                                         placeholder="e.g. علی عباسی"
                                         value={empFormData.fullName}
                                         onChange={e => setEmpFormData({...empFormData, fullName: e.target.value})}
                                         className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                         required
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-[10px] text-gray-500 mb-1">{settings.language === 'fa' ? 'کد ملی' : 'National ID'}</label>
                                     <input 
                                         type="text" 
                                         maxLength={10}
                                         placeholder="e.g. 0012345678"
                                         value={empFormData.nationalId}
                                         onChange={e => setEmpFormData({...empFormData, nationalId: e.target.value})}
                                         className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-[10px] text-gray-500 mb-1">{settings.language === 'fa' ? 'بخش / واحد (اجباری)' : 'Department (Required)'}</label>
                                     <input 
                                         type="text" 
                                         placeholder="e.g. تولید, انبار, HSE"
                                         value={empFormData.department}
                                         onChange={e => setEmpFormData({...empFormData, department: e.target.value})}
                                         className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                         required
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-[10px] text-gray-500 mb-1">{settings.language === 'fa' ? 'سمت سازمانی (اختیاری)' : 'Job Title (Optional)'}</label>
                                     <input 
                                         type="text" 
                                         placeholder="e.g. اپراتور"
                                         value={empFormData.jobTitle}
                                         onChange={e => setEmpFormData({...empFormData, jobTitle: e.target.value})}
                                         className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-[10px] text-gray-500 mb-1">{settings.language === 'fa' ? 'تاریخ شروع به کار (اختیاری)' : 'Start Hire Date (Optional)'}</label>
                                     <input 
                                         type="text" 
                                         placeholder="e.g. 1402/06/20"
                                          value={empFormData.hireDate}
                                          onChange={e => setEmpFormData({...empFormData, hireDate: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-[10px] text-gray-500 mb-1">{settings.language === 'fa' ? 'شماره همراه جهت پیامک (اختیاری)' : 'SMS Mobile for Notifications (Optional)'}</label>
                                      <input 
                                          type="text" 
                                          placeholder="e.g. 09123456789"
                                          value={empFormData.phoneNumber}
                                          onChange={e => setEmpFormData({...empFormData, phoneNumber: e.target.value})}
                                          className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                      />
                                  </div>
                              </div>
                             <div className="flex justify-end pt-2">
                                 <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 font-sans leading-none">
                                     <UserPlus className="w-3.5 h-3.5" />
                                     <span>{settings.language === 'fa' ? 'تعریف پرسنل جدید' : 'Enroll Personnel'}</span>
                                 </button>
                             </div>
                          </div>

                         {/* Search & Listing table */}
                         <div className="space-y-3">
                             <div className="flex items-center gap-2">
                                 <input 
                                     type="text"
                                     placeholder={settings.language === 'fa' ? '🔍 جستجو در پرسنل بر اساس نام، کد پرسنلی یا کدملی...' : '🔍 Search by name, ID or national code...'}
                                     value={empSearch}
                                     onChange={e => setEmpSearch(e.target.value)}
                                     className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                 />
                             </div>

                             <div className="border border-gray-150 rounded-xl overflow-hidden shadow-xs bg-white">
                                                               <div className="max-h-64 overflow-y-auto w-full overflow-x-auto">
                                     <table className="w-full text-xs text-right whitespace-nowrap min-w-[600px]">
                                         <thead className="bg-gray-100 text-gray-600 sticky top-0 font-extrabold text-[11px] border-b border-gray-200">
                                             <tr>
                                                 <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'کد پرسنلی' : 'Personnel ID'}</th>
                                                 <th className="px-3 py-2.5">{settings.language === 'fa' ? 'نام و نام خانوادگی' : 'Full Name'}</th>
                                                 <th className="px-3 py-2.5">{settings.language === 'fa' ? 'کد ملی' : 'National ID'}</th>
                                                  <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'تلفن همراه پیامک' : 'Mobile Phone (SMS)'}</th>
                                                 <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'واحد' : 'Department'}</th>
                                                 <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'تاریخ شروع به کار' : 'Hire Date'}</th>
                                                 <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'عملیات' : 'Actions'}</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-150">
                                                                                           {employees.filter(emp => {
                                                  const query = empSearch.toLowerCase().trim();
                                                  if (!query) return true;
                                                  return (
                                                      emp.personnelId.toLowerCase().includes(query) ||
                                                      emp.fullName.toLowerCase().includes(query) ||
                                                      (emp.nationalId && emp.nationalId.toLowerCase().includes(query)) ||
                                                      emp.department.toLowerCase().includes(query)
                                                  );
                                              }).map(emp => {
                                                  const isEditing = editingPersonnelId === emp.personnelId;
                                                  if (isEditing) {
                                                      return (
                                                          <tr key={emp.id} className="bg-indigo-50/40">
                                                              <td className="px-3 py-2.5 text-center font-bold text-slate-700 font-mono text-xs">{emp.personnelId}</td>
                                                              <td className="px-3 py-2.5">
                                                                  <div className="space-y-1.5 max-w-[200px]">
                                                                      <input 
                                                                          type="text" 
                                                                          value={editingEmpData.fullName || ''} 
                                                                          onChange={e => setEditingEmpData({ ...editingEmpData, fullName: e.target.value })} 
                                                                          className="w-full text-right bg-white border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none text-xs font-bold text-gray-900"
                                                                          placeholder={settings.language === 'fa' ? 'نام و نام خانوادگی' : 'Full Name'}
                                                                      />
                                                                      <input 
                                                                          type="text" 
                                                                          value={editingEmpData.jobTitle || ''} 
                                                                          onChange={e => setEditingEmpData({ ...editingEmpData, jobTitle: e.target.value })} 
                                                                          className="w-full text-right bg-white border border-gray-300 rounded px-2 py-0.5 focus:border-indigo-500 focus:outline-none text-[10px] text-gray-700"
                                                                          placeholder={settings.language === 'fa' ? 'سمت شغلی' : 'Job Title'}
                                                                      />
                                                                  </div>
                                                              </td>
                                                              <td className="px-3 py-2.5">
                                                                  <input 
                                                                      type="text" 
                                                                      value={editingEmpData.nationalId || ''} 
                                                                      onChange={e => setEditingEmpData({ ...editingEmpData, nationalId: e.target.value })} 
                                                                      className="w-24 text-center bg-white border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none text-xs font-mono font-bold text-gray-900"
                                                                      placeholder={settings.language === 'fa' ? 'کد ملی' : 'National ID'}
                                                                  />
                                                              </td>
                                                              <td className="px-3 py-2.5 text-center">
                                                                  <input 
                                                                      type="text" 
                                                                      value={editingEmpData.phoneNumber || ''} 
                                                                      onChange={e => setEditingEmpData({ ...editingEmpData, phoneNumber: e.target.value })} 
                                                                      className="w-28 text-center bg-white border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none text-xs font-mono font-bold text-gray-900"
                                                                      placeholder="0912..."
                                                                      dir="ltr"
                                                                  />
                                                              </td>
                                                              <td className="px-3 py-2.5 text-center">
                                                                  <div className="flex flex-col gap-1 items-center">
                                                                      <select
                                                                          value={DEPARTMENTS_LIST.includes(editingEmpData.department || '') ? (editingEmpData.department || '') : 'سایر (ورود دستی)'}
                                                                          onChange={e => {
                                                                              const val = e.target.value;
                                                                              if (val === 'سایر (ورود دستی)') {
                                                                                  setEditingEmpData({ ...editingEmpData, department: '' });
                                                                              } else {
                                                                                  setEditingEmpData({ ...editingEmpData, department: val });
                                                                              }
                                                                          }}
                                                                          className="bg-white border border-gray-300 rounded px-1.5 py-1 focus:border-indigo-500 focus:outline-none text-xs font-bold text-gray-700 cursor-pointer"
                                                                      >
                                                                          {DEPARTMENTS_LIST.map(d => (
                                                                              <option key={d} value={d}>{d}</option>
                                                                          ))}
                                                                      </select>
                                                                      {!DEPARTMENTS_LIST.includes(editingEmpData.department || '') && (
                                                                          <input
                                                                              type="text"
                                                                              value={editingEmpData.department || ''}
                                                                              onChange={e => setEditingEmpData({ ...editingEmpData, department: e.target.value })}
                                                                              className="w-24 text-center bg-white border border-gray-300 rounded px-1.5 py-0.5 focus:border-indigo-500 focus:outline-none text-[10px] font-bold text-gray-900"
                                                                              placeholder={settings.language === 'fa' ? 'بخش دستی...' : 'Custom...'}
                                                                          />
                                                                      )}
                                                                  </div>
                                                              </td>
                                                              <td className="px-3 py-2.5 text-center">
                                                                  <input 
                                                                      type="text" 
                                                                      value={editingEmpData.hireDate || ''} 
                                                                      onChange={e => setEditingEmpData({ ...editingEmpData, hireDate: e.target.value })} 
                                                                      className="w-24 text-center bg-white border border-gray-300 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none text-xs font-mono font-bold text-gray-900"
                                                                      placeholder="1402/01/01"
                                                                      dir="ltr"
                                                                  />
                                                              </td>
                                                              <td className="px-3 py-2.5 text-center">
                                                                  <div className="flex items-center justify-center gap-1.5">
                                                                      <button 
                                                                          type="button"
                                                                          onClick={handleSaveEditingEmployee}
                                                                          className="p-1 px-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-xs border border-emerald-200"
                                                                          title={settings.language === 'fa' ? 'ذخیره تغییرات' : 'Save Changes'}
                                                                      >
                                                                          <Check className="w-3.5 h-3.5" />
                                                                          <span>{settings.language === 'fa' ? 'ذخیره' : 'Save'}</span>
                                                                      </button>
                                                                      <button 
                                                                          type="button"
                                                                          onClick={() => setEditingPersonnelId(null)}
                                                                          className="p-1 px-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                                                          title={settings.language === 'fa' ? 'انصراف' : 'Cancel'}
                                                                      >
                                                                          <X className="w-3.5 h-3.5" />
                                                                          <span>{settings.language === 'fa' ? 'لغو' : 'Cancel'}</span>
                                                                      </button>
                                                                  </div>
                                                              </td>
                                                          </tr>
                                                      );
                                                  }

                                                  return (
                                                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                                                          <td className="px-3 py-2.5 text-center font-bold text-slate-700 font-mono text-xs">{emp.personnelId}</td>
                                                          <td className="px-3 py-2.5">
                                                              <div className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                                                  <span>{emp.fullName}</span>
                                                                  {(!emp.department || emp.department.trim() === '' || emp.department === 'ثبت نشده' || !emp.nationalId || !emp.phoneNumber || !emp.jobTitle || !emp.hireDate) && (
                                                                      <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold" title={settings.language === 'fa' ? 'پرونده دارای نقص اطلاعات' : 'Incomplete profile'}>
                                                                          ⚠ {settings.language === 'fa' ? 'اطلاعات ناقص' : 'Incomplete'}
                                                                      </span>
                                                                  )}
                                                              </div>
                                                              {emp.jobTitle && <div className="text-[10px] text-gray-400 font-medium">{emp.jobTitle}</div>}
                                                          </td>
                                                          <td className="px-3 py-2.5 font-mono text-gray-650 text-xs text-right leading-none">
                                                              {emp.nationalId || (settings.language === 'fa' ? '— ثبت نشده' : '— Not Settled')}
                                                          </td>
                                                          <td className="px-3 py-2.5 text-center font-mono text-xs text-gray-700 font-bold">
                                                              {emp.phoneNumber || (settings.language === 'fa' ? '— ثبت نشده' : '— Not Settled')}
                                                          </td>
                                                          <td className="px-3 py-2.5 text-center font-medium">
                                                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                  {emp.department}
                                                              </span>
                                                          </td>
                                                          <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-indigo-600">
                                                              {emp.hireDate || (settings.language === 'fa' ? '— ثبت نشده' : '— Not Settled')}
                                                          </td>
                                                          <td className="px-3 py-2.5 text-center">
                                                              <div className="flex items-center justify-center gap-1.5">
                                                                  <button 
                                                                      type="button"
                                                                      onClick={() => {
                                                                          setEditingPersonnelId(emp.personnelId);
                                                                          setEditingEmpData({ ...emp });
                                                                      }}
                                                                      className="p-1 px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                                                      title={settings.language === 'fa' ? 'ویرایش اطلاعات پرسنل' : 'Edit Personnel Profile'}
                                                                  >
                                                                      <Edit className="w-3 h-3" />
                                                                      <span>{settings.language === 'fa' ? 'ویرایش' : 'Edit'}</span>
                                                                  </button>
                                                                  <button 
                                                                      type="button"
                                                                      onClick={() => handleDeleteEmployee(emp.personnelId)}
                                                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                      title={settings.language === 'fa' ? 'حذف پرسنل' : 'Delete Personnel'}
                                                                  >
                                                                      <Trash2 className="w-3.5 h-3.5" />
                                                                  </button>
                                                              </div>
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                             {employees.length === 0 && (
                                                 <tr>
                                                     <td colSpan={6} className="px-3 py-8 text-center text-gray-400 font-semibold text-xs">
                                                         {settings.language === 'fa' ? 'هیچ پرسنلی در بانک اطلاعات موجود نیست' : 'No personnel records on file.'}</td></tr>)}</tbody></table></div></div></div></div></div>)}

             {activeTab === 'SMS' && (
                 <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-right" dir="rtl">
                     {/* SMS Config Card */}
                     <form onSubmit={handleSaveSmsConfig} className="bg-white border border-gray-150 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                         <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                             <div className="flex items-center gap-2 text-gray-800 font-bold text-sm md:text-base">
                                 <MessageSquare className="w-5 h-5 text-indigo-600" />
                                 {settings.language === 'fa' ? 'پیکربندی سامانه پیامکی' : 'SMS Gateway Configuration'}
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                 <input 
                                     type="checkbox" 
                                     checked={smsConfig.isEnabled} 
                                     onChange={e => setSmsConfigState({ ...smsConfig, isEnabled: e.target.checked })}
                                     className="sr-only peer" 
                                 />
                                 <div className="relative w-16 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:-translate-x-10">
                                     <span className="absolute left-[8px] top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500 font-sans select-none pointer-events-none z-10">
                                         {smsConfig.isEnabled 
                                             ? (settings.language === 'fa' ? 'فعال' : 'Enabled') 
                                             : (settings.language === 'fa' ? 'غیرفعال' : 'Disabled')}
                                     </span>
                                 </div>
                             </label>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">
                                     {settings.language === 'fa' ? 'ارائه‌دهنده سرویس پیامک' : 'SMS Gateway Provider'}
                                 </label>
                                 <select
                                     value={smsConfig.provider}
                                     onChange={e => setSmsConfigState({ ...smsConfig, provider: e.target.value as any })}
                                     className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                 >
                                     <option value="SIMULATOR">{settings.language === 'fa' ? 'شبیه‌ساز (لاگ محلی)' : 'Simulator (Local Log)'}</option>
                                     <option value="FARAZSMS">FarazSMS (ippanel.com)</option>
                                     <option value="KAVENEGAR">Kavehnegar</option>
                                      <option value="SMSIR">Sms.ir (جدید)</option>
                                     <option value="MELIPAYAMAK">MeliPayamak</option>
                                 </select>
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">
                                     {smsConfig.provider === 'MELIPAYAMAK'
                                          ? (settings.language === 'fa' ? 'نام کاربری ملی پیامک' : 'MeliPayamak Username')
                                          : (settings.language === 'fa' ? 'شماره خط فرستنده' : 'Sender Number')}
                                 </label>
                                 <input 
                                     type="text"
                                     value={smsConfig.senderLine || ''}
                                     onChange={e => setSmsConfigState({ ...smsConfig, senderLine: e.target.value })}
                                     placeholder={smsConfig.provider === 'MELIPAYAMAK' ? 'YourUsername' : 'e.g. 3000505'}
                                     className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-left"
                                 />
                             </div>

                             <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-gray-700 mb-1">
                                     {smsConfig.provider === 'MELIPAYAMAK'
                                          ? (settings.language === 'fa' ? 'کلمه عبور ملی پیامک / API Key' : 'MeliPayamak Password / API Key')
                                          : (settings.language === 'fa' ? 'کلید وب‌سرویس / API Key' : 'API Token / API Key')}
                                 </label>
                                 <input 
                                     type="password"
                                     value={smsConfig.apiKey || ''}
                                     onChange={e => setSmsConfigState({ ...smsConfig, apiKey: e.target.value })}
                                     placeholder={smsConfig.provider === 'MELIPAYAMAK' ? 'YourPassword' : 'API key or authentication token from provider'}
                                     className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-left"
                                 />
                             </div>

                             <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-gray-700 mb-1">
                                     {settings.language === 'fa' ? 'الگوی پیامک اخطار' : 'Warning Template'}
                                 </label>
                                 <textarea 
                                     rows={2}
                                     value={smsConfig.warningTemplate || ''}
                                     onChange={e => setSmsConfigState({ ...smsConfig, warningTemplate: e.target.value })}
                                     className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                 />
                                 <p className="text-[10px] text-gray-400 mt-1 col-span-2 text-right">
                                     {settings.language === 'fa' 
                                         ? 'راهنما: برای درگاه‌های الگومحور (Sms.ir, FarazSMS, Kavenegar, MeliPayamak) به جای متن، شناسه الگو را وارد نمایید. پارامترها: {name}، {date}، {reason}، {type}' 
                                         : 'Placeholders: {name} (name), {date} (date), {reason} (reason), {type} (type)'}
                                 </p>
                             </div>

                             <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-gray-700 mb-1">
                                     {settings.language === 'fa' ? 'الگوی پیامک تشویقی' : 'Reward Template'}
                                 </label>
                                 <textarea 
                                     rows={2}
                                     value={smsConfig.rewardTemplate || ''}
                                     onChange={e => setSmsConfigState({ ...smsConfig, rewardTemplate: e.target.value })}
                                     className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                 />
                                 <p className="text-[10px] text-gray-400 mt-1 col-span-2 text-right">
                                     {settings.language === 'fa' 
                                         ? 'راهنما: برای درگاه‌های الگومحور (Sms.ir, FarazSMS, Kavenegar, MeliPayamak) به جای متن، شناسه الگو را وارد نمایید. پارامترها: {name}، {date}، {reason}، {type}' 
                                         : 'Placeholders: {name} (name), {date} (date), {reason} (reason), {type} (type)'}
                                 </p>
                             </div>
                         </div>

                         <div className="flex justify-end pt-2">
                             <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 leading-none">
                                 <Save className="w-4 h-4" />
                                 <span>{settings.language === 'fa' ? 'ذخیره تنظیمات درگاه' : 'Save Connection Configuration'}</span>
                             </button>
                         </div>
                     </form>

                     {/* Test SMS Card */}
                     {smsConfig.isEnabled && (
                         <div className="bg-white border border-gray-150 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                             <div className="flex items-center gap-2 text-gray-800 font-bold text-sm md:text-base border-b border-gray-100 pb-3">
                                 <Send className="w-5 h-5 text-indigo-600" />
                                 {settings.language === 'fa' ? 'ارسال پیامک آزمایشی' : 'Send Test SMS'}
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                 <div>
                                     <label className="block text-xs font-bold text-gray-700 mb-1">
                                         {settings.language === 'fa' ? 'شماره همراه تست' : 'Test Mobile Number'}
                                     </label>
                                     <input 
                                         type="text"
                                         value={testPhone}
                                         onChange={e => setTestPhone(e.target.value)}
                                         placeholder="e.g. 09123456789"
                                         className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-left"
                                     />
                                 </div>
                                 <div className="md:col-span-2">
                                     <label className="block text-xs font-bold text-gray-700 mb-1">
                                         {settings.language === 'fa' ? 'متن پیامک آزمایشی' : 'Test Message Text'}
                                     </label>
                                     <input 
                                         type="text"
                                         value={testMessage}
                                         onChange={e => setTestMessage(e.target.value)}
                                         className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                     />
                                 </div>
                             </div>

                             <div className="flex justify-end pt-2">
                                 <button 
                                     onClick={handleSendTest}
                                     disabled={isSendingTest}
                                     className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none leading-none animate-none"
                                 >
                                     <Smartphone className="w-4 h-4" />
                                     <span>{isSendingTest ? (settings.language === 'fa' ? 'در حال ارسال...' : 'Sending...') : (settings.language === 'fa' ? 'ارسال پیامک آزمایشی' : 'Send Test SMS')}</span>
                                 </button>
                             </div>
                         </div>
                     )}

                     {/* Notification Logs Card */}
                     <div className="bg-white border border-gray-150 p-5 md:p-6 rounded-2xl shadow-sm space-y-4">
                         <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                             <div className="flex items-center gap-2 text-gray-800 font-bold text-sm md:text-base">
                                 <Smartphone className="w-5 h-5 text-indigo-600" />
                                 {settings.language === 'fa' ? 'تاریخچه پیامک‌های ارسالی' : 'SMS Notification Dispatch History'}
                             </div>
                             {smsLogs.length > 0 && (
                                 <button 
                                     onClick={handleClearSmsLogs}
                                     className="px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-[10px] font-bold rounded-lg transition-colors"
                                 >
                                     {settings.language === 'fa' ? 'پاک‌سازی تاریخچه' : 'Clear History'}
                                 </button>
                             )}
                         </div>

                         <div className="overflow-x-auto border border-gray-150 rounded-xl">
                             <table className="w-full text-xs text-right whitespace-nowrap min-w-[700px]">
                                 <thead className="bg-gray-50 text-gray-600 border-b border-gray-150 font-extrabold text-[11px]">
                                     <tr>
                                         <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'نام همکار' : 'Recipient Name'}</th>
                                         <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'تلفن همراه' : 'Mobile Number'}</th>
                                         <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'نوع پیام' : 'Notification Type'}</th>
                                         <th className="px-3 py-2.5 text-right">{settings.language === 'fa' ? 'متن ارسالی' : 'Sent Content'}</th>
                                         <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'تاریخ و زمان' : 'Date / Time'}</th>
                                         <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'سامانه' : 'Provider'}</th>
                                         <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'وضعیت' : 'Delivery Status'}</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-150">
                                     {smsLogs.map(log => (
                                         <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                             <td className="px-3 py-3 text-center font-bold text-gray-900">{log.recipientName}</td>
                                             <td className="px-3 py-3 text-center font-mono font-bold text-gray-700">{log.recipientPhone}</td>
                                             <td className="px-3 py-3 text-center">
                                                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.type === 'WARNING' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                     {log.type === 'WARNING' ? (settings.language === 'fa' ? 'اخطار' : 'Warning') : (settings.language === 'fa' ? 'تشویق' : 'Reward')}
                                                 </span>
                                             </td>
                                             <td className="px-3 py-3 font-medium text-gray-600 text-right whitespace-normal max-w-xs text-[11px]">
                                                 {log.message}
                                             </td>
                                             <td className="px-3 py-3 text-center font-mono text-[11px] text-gray-500">{log.date}</td>
                                             <td className="px-3 py-3 text-center text-[10px] text-gray-400 font-bold font-mono">{log.provider}</td>
                                             <td className="px-3 py-3 text-center">
                                                 <div className="flex items-center justify-center gap-1">
                                                     <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                     <span className={`text-[10px] font-extrabold ${log.status === 'SUCCESS' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                         {log.status === 'SUCCESS' ? (settings.language === 'fa' ? 'موفق' : 'Success') : (settings.language === 'fa' ? 'ناموفق' : 'Failed')}
                                                     </span>
                                                 </div>
                                                 {log.responseMessage && log.status === 'FAILED' && (
                                                     <div className="text-[9px] text-red-400 max-w-[120px] truncate" title={log.responseMessage}>
                                                         {log.responseMessage}
                                                     </div>
                                                 )}
                                             </td>
                                         </tr>
                                     ))}
                                     {smsLogs.length === 0 && (
                                         <tr>
                                             <td colSpan={7} className="px-3 py-8 text-center text-gray-400 font-semibold">
                                                 {settings.language === 'fa' ? 'تاریخچه پیامک‌های ارسالی خالی است.' : 'No sent notifications logged.'}
                                             </td>
                                         </tr>
                                     )}
                                 </tbody>
                             </table>
                         </div>
                     </div>
                 </div>
             )}

 
         </div>
       </div>
     </div>
   );
 };

export default SettingsModal;
