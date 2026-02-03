import React, { useState } from 'react';
import { AppSettings, User, ThemeColor, Language, Role, Employee, CodeItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { X, Upload, UserPlus, Trash2, Check, Palette, Globe, Building2, Users as UsersIcon, Database, Download, FileSpreadsheet, Key, RefreshCw, Layers, List, Plus, Bot } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';

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
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, settings, onUpdateSettings, users, onUpdateUsers, employees, onUpdateEmployees, currentUser,
  violationCodes, onUpdateViolationCodes, rewardCodes, onUpdateRewardCodes
}) => {
  const [activeTab, setActiveTab] = useState<'APPEARANCE' | 'USERS' | 'DATA' | 'CODES' | 'AI'>('APPEARANCE');
  const [newUser, setNewUser] = useState<Partial<User>>({ username: '', password: '', fullName: '', role: 'HSE_OFFICER', managedDepartment: '' });
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
  
  // New Code State
  const [newCode, setNewCode] = useState<Partial<CodeItem>>({ code: 0, label: '', score: 0, department: 'HSE' });
  const [codeType, setCodeType] = useState<'VIOLATION' | 'REWARD'>('VIOLATION');

  const t = TRANSLATIONS[settings.language];
  const isDeveloper = currentUser.role === 'DEVELOPER';
  const canManageUsers = isDeveloper || currentUser.role === 'HSE_MANAGER' || currentUser.role === 'HR_MANAGER' || currentUser.role === 'PLANT_MANAGER';

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
    if(newUser.username && newUser.password && newUser.fullName) {
        // Validate Managed Dept
        if(newUser.role === 'DEPARTMENT_MANAGER' && !newUser.managedDepartment) {
            alert('لطفا نام واحد تحت مدیریت را وارد کنید.');
            return;
        }

        const u: User = {
            id: Date.now().toString(),
            username: newUser.username!,
            password: newUser.password!,
            fullName: newUser.fullName!,
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
      if(window.confirm("آیا اطمینان دارید؟ رمز عبور تمام کاربران به 123 تغییر خواهد کرد.")) {
          onUpdateUsers(users.map(u => ({ ...u, password: '123' })));
          alert("تمام رمزها ریست شدند.");
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
          
          const newEmployees: Employee[] = data.map((row: any) => ({
            id: Date.now().toString() + Math.random().toString().slice(2),
            personnelId: row['PersonnelID'] || row['کد پرسنلی'] || '',
            fullName: row['FullName'] || row['نام و نام خانوادگی'] || '',
            department: row['Department'] || row['واحد'] || '',
            jobTitle: row['JobTitle'] || row['سمت'] || ''
          })).filter((e: Employee) => e.personnelId && e.fullName);

          if (newEmployees.length > 0) {
             onUpdateEmployees(newEmployees);
             alert(t.importSuccess.replace('{count}', newEmployees.length.toString()));
          } else {
             alert('فایل فاقد اطلاعات معتبر است.');
          }

        } catch (error) {
          console.error(error);
          alert('خطا در خواندن فایل اکسل.');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.json_to_sheet([
          { 'PersonnelID': '9901', 'FullName': 'علی رضایی', 'Department': 'تولید', 'JobTitle': 'اپراتور' },
          { 'PersonnelID': '9902', 'FullName': 'محمد احمدی', 'Department': 'انبار', 'JobTitle': 'انباردار' }
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, "Personnel_Template.xlsx");
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

            {isDeveloper && (
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
                </div>
            )}

            {activeTab === 'USERS' && (
                <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <form onSubmit={handleAddUser} className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        <input 
                            placeholder={t.username}
                            value={newUser.username} 
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                            className="px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            required
                        />
                         <input 
                            placeholder={t.password}
                            value={newUser.password} 
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
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
            
            {activeTab === 'CODES' && isDeveloper && (
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
                </div>
            )}

            {activeTab === 'DATA' && (
                <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 md:p-5">
                         {/* Existing Data Sync/Backup UI */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            {/* EXPORT */}
                            <button 
                                onClick={handleExportBackup}
                                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2.5 md:px-4 md:py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 text-xs md:text-sm"
                            >
                                <Download className="w-4 h-4 md:w-5 md:h-5" />
                                {t.downloadBackup}
                            </button>

                            {/* IMPORT */}
                            <label className="flex items-center justify-center gap-2 bg-white border-2 border-dashed border-gray-300 text-gray-600 px-3 py-2.5 md:px-4 md:py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer active:scale-95 text-xs md:text-sm">
                                <Upload className="w-4 h-4 md:w-5 md:h-5" />
                                <span>{importMode === 'MERGE' ? t.mergeData : t.uploadBackup}</span>
                                <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                            </label>
                        </div>
                    </div>
                    {isDeveloper && (
                         <div className="border-t border-dashed border-red-200 pt-4 mt-2">
                            <button 
                                onClick={handleFactoryReset}
                                className="w-full bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {t.factoryReset}
                            </button>
                         </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;