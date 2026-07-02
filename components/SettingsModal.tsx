import React, { useState, useEffect } from 'react';
import { AppSettings, User, ThemeColor, Language, Role, Employee, CodeItem, SmsConfig, SmsLog } from '../types';
import { TRANSLATIONS } from '../constants';
import { X, Upload, UserPlus, Trash2, Check, Palette, Globe, Building2, Users as UsersIcon, Database, Download, FileSpreadsheet, Key, RefreshCw, Layers, List, Plus, Bot, MessageSquare, Smartphone, Send, Save } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import { getSmsConfig, saveSmsConfig, getSmsLogs, saveSmsLogs } from '../services/smsService';
import { ManualEmployeeForm } from './ManualEmployeeForm';

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
  const [activeTab, setActiveTab] = useState<'APPEARANCE' | 'USERS' | 'DATA' | 'CODES' | 'AI' | 'SMS'>('APPEARANCE');
  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', password: '', fullName: '', role: 'HSE_OFFICER', managedDepartment: '' });
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
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
  const isUnitManager = isDeveloper || 
    currentUser.role === 'HSE_MANAGER' || 
    currentUser.role === 'SECURITY_MANAGER' || 
    currentUser.role === 'TRAINING_MANAGER' || 
    currentUser.role === 'HR_MANAGER' || 
    currentUser.role === 'PLANT_MANAGER' ||
    currentUser.role === 'DEPARTMENT_MANAGER';

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
            managedDepartment: newUser.role === 'DEPARTMENT_MANAGER' ? newUser.managedDepartment : undefined
        };
        onUpdateUsers([...users, u]);
        setNewUser({ username: '', password: '', fullName: '', role: 'HSE_OFFICER', managedDepartment: '' });
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
      if (!isUnitManager) {
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
      if (!isUnitManager) {
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
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const imported: Employee[] = data.map((row: any) => {
            const pId = String(row['PersonnelID'] || row['کد پرسنلی'] || row['کد'] || row['کد_پرسنلی'] || row['personnel_id'] || row['شماره پرسنلی'] || '').trim();
            const fName = String(row['FullName'] || row['نام و نام خانوادگی'] || row['نام'] || row['نام کامل'] || row['full_name'] || '').trim();
            const nId = String(row['NationalID'] || row['کد ملی'] || row['کدملی'] || row['کد_ملی'] || row['national_id'] || '').trim();
            const dept = String(row['Department'] || row['واحد'] || row['بخش'] || row['قسمت'] || row['department'] || '').trim();
            const hDate = String(row['HireDate'] || row['تاریخ شروع به کار'] || row['تاریخ شروع'] || row['تاریخ_شروع'] || row['تاریخ استخدام'] || row['hire_date'] || '').trim();
            const title = String(row['JobTitle'] || row['سمت'] || row['job_title'] || '').trim();
            const phone = String(row['PhoneNumber'] || row['شماره تماس'] || row['تلفن'] || row['موبایل'] || row['تلفن همراه'] || row['شماره همراه'] || row['phone'] || row['mobile'] || row['phone_number'] || '').trim();
            
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
                alert(settings.language === 'fa' 
                  ? `${imported.length} پرسنل با موفقیت تلفیق و بروزرسانی شدند.` 
                  : `Successfully merged and updated ${imported.length} employee records.`);
             } else {
                onUpdateEmployees(imported);
                alert(settings.language === 'fa' 
                  ? `${imported.length} پرسنل جدید بارگذاری و جایگزین کل لیست شدند.` 
                  : `Successfully imported and replaced with ${imported.length} employee records.`);
             }
          } else {
             alert(settings.language === 'fa' ? 'فایل فاقد اطلاعات معتبر است. لطفا نام ستون‌ها را بر اساس نمونه الگو تنظیم کنید.' : 'File lacks valid employee data. Please verify your column headers match the template.');
          }

        } catch (error) {
          console.error(error);
          alert(settings.language === 'fa' ? 'خطا در خواندن فایل اکسل.' : 'Error parsing Excel sheet.');
        }
      };
      reader.readAsBinaryString(file);
    }
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
                    onClick={() => setActiveTab('AI')}
                    className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'AI' ? 'bg-white shadow-md text-indigo-600 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Bot className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="text-xs md:text-sm">{t.aiSettings}</span>
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

            {(isDeveloper || currentUser.role === 'HSE_MANAGER' || currentUser.role === 'PLANT_MANAGER') && (
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
                    {activeTab === 'AI' && t.aiSettings}
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

                                            {settings.companyLogo && settings.companyLogo !== './app_icon_1781090095655.png' && (
                                                <button 
                                                    type="button"
                                                    onClick={() => onUpdateSettings({ ...settings, companyLogo: './app_icon_1781090095655.png' })}
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
                                    <th className={`px-3 py-2 md:px-4 md:py-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>Name</th>
                                    <th className={`px-3 py-2 md:px-4 md:py-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>{t.role}</th>
                                    <th className="px-3 py-2 md:px-4 md:py-3 text-center">{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 md:px-4 md:py-3">{u.username}</td>
                                        <td className="px-3 py-2 md:px-4 md:py-3">{u.fullName}</td>
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

                     <form onSubmit={handleAddCode} className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                         <input type="number" placeholder="Code #" className="p-2 text-sm rounded border" required value={newCode.code || ''} onChange={e => setNewCode({...newCode, code: Number(e.target.value)})} />
                         <input type="number" placeholder={t.codeScore} className="p-2 text-sm rounded border" required value={newCode.score || ''} onChange={e => setNewCode({...newCode, score: Number(e.target.value)})} />
                         <input type="text" placeholder={t.codeTitle} className="p-2 text-sm rounded border col-span-2" required value={newCode.label || ''} onChange={e => setNewCode({...newCode, label: e.target.value})} />
                         <input type="text" placeholder={t.codeDept} className="p-2 text-sm rounded border col-span-2" required value={newCode.department || ''} onChange={e => setNewCode({...newCode, department: e.target.value})} />
                         <button type="submit" className="col-span-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                             <Plus className="w-4 h-4" /> {t.addCode}
                         </button>
                     </form>

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
                                            <button onClick={() => handleDeleteCode(code.id, codeType)} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
            )}
            
            {activeTab === 'AI' && (
                <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                     {/* AI Provider Selector */}
                     <div className="bg-white border border-gray-150 p-4 md:p-5 rounded-2xl shadow-sm space-y-4">
                        <label className="block text-sm font-bold text-gray-700">
                            {settings.language === 'fa' ? 'انتخاب موتور هوش مصنوعی' : 'Select AI Engine'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'GEMINI' })}
                                className={`p-4 rounded-xl border text-right sm:text-center transition-all flex flex-col items-start sm:items-center justify-center gap-1.5 ${settings.aiProvider === 'GEMINI' || !settings.aiProvider ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                <span className="font-bold text-xs md:text-sm text-gray-900">
                                    {settings.language === 'fa' ? 'گوگل جِمینای کلود (آنلاین)' : 'Google Gemini Cloud (Online)'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {settings.language === 'fa' ? 'نیاز به دسترسی اینترنت' : 'Requires internet access'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'OLLAMA' })}
                                className={`p-4 rounded-xl border text-right sm:text-center transition-all flex flex-col items-start sm:items-center justify-center gap-1.5 ${settings.aiProvider === 'OLLAMA' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                <span className="font-bold text-xs md:text-sm text-gray-900">
                                    {settings.language === 'fa' ? 'سرویس محلی Ollama (آفلاین)' : 'Local Ollama Service (Offline)'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {settings.language === 'fa' ? 'اجرا روی سیستم عامل شما' : 'Runs on your operating system'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'LOCAL_HF' })}
                                className={`p-4 rounded-xl border text-right sm:text-center transition-all flex flex-col items-start sm:items-center justify-center gap-1.5 ${settings.aiProvider === 'LOCAL_HF' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                <span className="font-bold text-xs md:text-sm text-gray-900">
                                    {settings.language === 'fa' ? 'سرویس محلی الگوهای hugging face' : 'Local Hugging Face Server'}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                    {settings.language === 'fa' ? 'فایلهای دانلود شده روی سیستم' : 'Downloaded model files on OS'}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdateSettings({ ...settings, aiProvider: 'SIMULATOR' })}
                                className={`p-4 rounded-xl border text-right sm:text-center transition-all flex flex-col items-start sm:items-center justify-center gap-1.5 ${settings.aiProvider === 'SIMULATOR' ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                <span className="font-bold text-xs md:text-sm text-gray-900">
                                    {settings.language === 'fa' ? 'شبیه‌ساز هوش مصنوعی (۱۰۰٪ آفلاین)' : 'AI Simulator (100% Offline)'}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium">
                                    {settings.language === 'fa' ? 'بدون نیاز به هیچ پیش‌نیازی' : 'No setup or internet needed'}
                                </span>
                            </button>
                        </div>
                     </div>

                     {/* Cloud Gemini Configuration */}
                     {(settings.aiProvider === 'GEMINI' || !settings.aiProvider) && (
                         <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-6 rounded-2xl border border-indigo-100">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{t.apiKeyLabel}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{t.apiKeyDesc}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                 <input 
                                    type="password" 
                                    value={settings.customApiKey || ''}
                                    onChange={(e) => onUpdateSettings({ ...settings, customApiKey: e.target.value })}
                                    placeholder={t.apiKeyPlaceholder}
                                    className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                                 />
                                 <p className="text-[10px] text-gray-400">
                                     Note: This key is stored locally in your browser and used for AI requests.
                                 </p>
                            </div>
                         </div>
                     )}

                     {/* Ollama Offline Configuration */}
                     {settings.aiProvider === 'OLLAMA' && (
                         <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 md:p-6 rounded-2xl border border-slate-200 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-white border border-gray-200 rounded-lg text-slate-800 font-bold text-xs">Ollama</div>
                                <h4 className="font-bold text-gray-800 text-sm">{settings.language === 'fa' ? 'تنظیمات اتصال محلی به برنامه اولاما' : 'Local Ollama Setup parameters'}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">{settings.language === 'fa' ? 'آدرس لوکال هاست اولاما' : 'Localhost Ollama URL'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.ollamaUrl || 'http://localhost:11434'}
                                        onChange={(e) => onUpdateSettings({ ...settings, ollamaUrl: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">{settings.language === 'fa' ? 'نام مدل فعال (مثلا llama3 یا deepseek)' : 'Model Name (e.g. llama3)'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.ollamaModel || 'llama3'}
                                        onChange={(e) => onUpdateSettings({ ...settings, ollamaModel: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-mono"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400">
                                {settings.language === 'fa' ? 'نکته: نرم‌افزار اولاما باید روی سیستم شما در حال اجرا باشد و پورت مربوطه باز باشد.' : 'Note: Ollama must be active and listening on your local workspace/local machine OS.'}
                            </p>
                         </div>
                     )}

                     {/* Hugging Face / API compat Configuration */}
                     {settings.aiProvider === 'LOCAL_HF' && (
                         <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 md:p-6 rounded-2xl border border-slate-200 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-xs font-bold">HF</div>
                                <h4 className="font-bold text-gray-800 text-sm">{settings.language === 'fa' ? 'تنظیمات اتصال به مدلهای هگینگ فیس محلی' : 'Local Hugging Face / API parameters'}</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">{settings.language === 'fa' ? 'آدرس وب‌سرویس لوکال (مانند LM Studio)' : 'Local Endpoint URL (e.g. LM Studio)'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.localHfUrl || 'http://localhost:8000'}
                                        onChange={(e) => onUpdateSettings({ ...settings, localHfUrl: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">{settings.language === 'fa' ? 'نام مدل لود شده' : 'Loaded Local Model Name'}</label>
                                    <input 
                                        type="text" 
                                        value={settings.localHfModel || 'Qwen/Qwen2.5-Copilot-3B'}
                                        onChange={(e) => onUpdateSettings({ ...settings, localHfModel: e.target.value })}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-mono"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400">
                                {settings.language === 'fa' ? 'مناسب برای پروژه‌های محلی دانلود شده از Hugging Face که روی وب‌سرور شبیه ساز OpenAI لوکال نظیر LM Studio یا llama.cpp اجرا شده‌اند.' : 'Compatible with local Hugging Face model launchers matching OpenAI API shape on localhost.'}
                            </p>
                         </div>
                     )}

                     {/* Auto Failover Toggle */}
                     <div className="bg-white border border-gray-150 p-4 md:p-5 rounded-2xl shadow-sm flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <span className="block text-xs md:text-sm font-bold text-gray-800">
                                {settings.language === 'fa' ? 'انتقال خودکار به شبیه‌ساز آفلاین در صورت نداشتن اینترنت' : 'Auto Failover to Offline Simulator'}
                            </span>
                            <span className="block text-[11px] text-gray-500 md:max-w-md">
                                {settings.language === 'fa' 
                                    ? 'در صورت غیرفعال بودن اینترنت یا خطا در شبکه، هوش مصنوعی محلی بی‌درنگ گزارش‌ها را بدون خطا شبیه‌سازی می‌کند.' 
                                    : 'If offline or networking fails, the system switches instantly to the high-fidelity local on-device generator to prevent any errors.'}
                            </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                                type="checkbox" 
                                checked={settings.autoOfflineFailover !== false}
                                onChange={(e) => onUpdateSettings({ ...settings, autoOfflineFailover: e.target.checked })}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
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
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* EXPORT */}
                            <button 
                                onClick={handleExportBackup}
                                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 text-xs md:text-sm font-semibold"
                            >
                                <Download className="w-4 h-4" />
                                {t.downloadBackup}
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

                         {/* Import Settings & Upload Excel */}
                         <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4">
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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

                                 <div className="flex gap-2 font-bold select-none cursor-pointer">
                                     <button 
                                         onClick={handleDownloadTemplate}
                                         className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all font-bold"
                                     >
                                         <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                         <span>{settings.language === 'fa' ? 'دانلود الگوی اکسل پرسنل' : 'Download Excel Template'}</span>
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
                                         💡 <strong className="text-gray-700">Excel Format Requirements:</strong> The spreadsheet must contain columns for <strong className="text-indigo-500">PersonnelID</strong>, <strong className="text-indigo-500">FullName</strong>, <strong className="text-indigo-505">NationalID</strong>, and <strong className="text-indigo-500">Department</strong>. Column header row detection is automatic.
                                     </>
                                 )}
                             </div>
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
                                                 <th className="px-3 py-2.5">{settings.language === 'fa' ? 'کد ملی' : 'National ID'}</th><th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'تلفن همراه پیامک' : 'Mobile Phone (SMS)'}</th>
                                                 <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'واحد' : 'Department'}</th>
                                                 <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'تاریخ شروع به کار' : 'Hire Date'}</th>
                                                 <th className="px-3 py-2.5 text-center">{settings.language === 'fa' ? 'حذف' : 'Remove'}</th>
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
                                             }).map(emp => (
                                                 <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                                                     <td className="px-3 py-2.5 text-center font-bold text-slate-700 font-mono text-xs">{emp.personnelId}</td>
                                                     <td className="px-3 py-2.5">
                                                         <div className="font-bold text-gray-900">{emp.fullName}</div>
                                                         {emp.jobTitle && <div className="text-[10px] text-gray-400 font-medium">{emp.jobTitle}</div>}
                                                     </td>
                                                     <td className="px-3 py-2.5 font-mono text-gray-600 text-xs text-right leading-none">
                                                         {emp.nationalId || (settings.language === 'fa' ? '— ثبت نشده' : '— Not Settled')}</td><td className="px-3 py-2.5 text-center"><input type="text" value={emp.phoneNumber || ''} placeholder={settings.language === 'fa' ? 'مثال: 0912...' : '0912...'} onChange={e => handleUpdateEmployeePhone(emp.personnelId, e.target.value)} className="w-28 text-center bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all text-xs font-mono font-bold text-slate-800 text-left" dir="ltr" /></td><td>
                                                     </td>
                                                     <td className="px-3 py-2.5 text-center font-medium">
                                                         <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px]">
                                                             {emp.department}
                                                         </span>
                                                     </td>
                                                     <td className="px-3 py-2.5 text-center font-mono text-xs font-bold text-indigo-600">
                                                         {emp.hireDate || (settings.language === 'fa' ? '— ثبت نشده' : '— Not Settled')}
                                                     </td>
                                                     <td className="px-3 py-2.5 text-center">
                                                         <button 
                                                             type="button"
                                                             onClick={() => handleDeleteEmployee(emp.personnelId)}
                                                             className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                             title={settings.language === 'fa' ? 'حذف پرسنل' : 'Delete Personnel'}
                                                         >
                                                             <Trash2 className="w-3.5 h-3.5" />
                                                         </button>
                                                     </td>
                                                 </tr>
                                             ))}
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
                                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                 <span className="mr-2 text-xs font-bold text-gray-700 font-sans">
                                     {smsConfig.isEnabled 
                                         ? (settings.language === 'fa' ? 'فعال' : 'Enabled') 
                                         : (settings.language === 'fa' ? 'غیرفعال' : 'Disabled')}
                                 </span>
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
                                     {settings.language === 'fa' ? 'شماره خط فرستنده' : 'Sender Number'}
                                 </label>
                                 <input 
                                     type="text"
                                     value={smsConfig.senderLine || ''}
                                     onChange={e => setSmsConfigState({ ...smsConfig, senderLine: e.target.value })}
                                     placeholder="e.g. 3000505"
                                     className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-left"
                                 />
                             </div>

                             <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-gray-700 mb-1">
                                     {settings.language === 'fa' ? 'کلید وب‌سرویس / API Key' : 'API Token / API Key'}
                                 </label>
                                 <input 
                                     type="password"
                                     value={smsConfig.apiKey || ''}
                                     onChange={e => setSmsConfigState({ ...smsConfig, apiKey: e.target.value })}
                                     placeholder="API key or authentication token from provider"
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
