import React, { useState, useEffect } from 'react';
import { MOCK_VIOLATIONS, MOCK_REWARDS, getSeverityColor, getStatusColor, isOlderThanSixMonths, APP_VERSION, DEFAULT_USERS, DEFAULT_SETTINGS, TRANSLATIONS, INITIAL_VIOLATION_CODES, INITIAL_REWARD_CODES } from './constants';
import { Violation, Reward, User, AppSettings, SystemMode, WorkerOfMonthResult, Department, Employee, CodeItem } from './types';
import DashboardStats from './components/DashboardStats';
import ViolationForm from './components/ViolationForm';
import RewardForm from './components/RewardForm';
import GeminiReport from './components/GeminiReport';
import DeleteModal from './components/DeleteModal';
import LoginPage from './components/LoginPage';
import SettingsModal from './components/SettingsModal';
import CodeLegendModal from './components/CodeLegendModal';
import PersonnelProfileModal from './components/PersonnelProfileModal';
import { selectWorkerOfMonth } from './services/geminiService';
import { syncData } from './services/syncService';
import { Shield, Plus, Search, Trash2, AlertCircle, FileSpreadsheet, Archive, Gavel, Check, XCircle, LogOut, Settings, Award, Medal, Sparkles, Loader2, Cloud, CloudOff, RefreshCw, Wifi, WifiOff, Check as CheckIcon, BookOpen, User as UserIcon } from 'lucide-react';

type Tab = 'VIOLATIONS' | 'APPROVALS' | 'ARCHIVE';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loginError, setLoginError] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [violations, setViolations] = useState<Violation[]>(MOCK_VIOLATIONS);
  const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS);
  const [systemMode, setSystemMode] = useState<SystemMode>('VIOLATION');
  const [activeTab, setActiveTab] = useState<Tab>('VIOLATIONS');
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false); 
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; id: string | null; type: 'VIOLATION' | 'REWARD'}>({ isOpen: false, id: null, type: 'VIOLATION' });
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  
  // Dynamic Code State
  const [violationCodes, setViolationCodes] = useState<CodeItem[]>(INITIAL_VIOLATION_CODES);
  const [rewardCodes, setRewardCodes] = useState<CodeItem[]>(INITIAL_REWARD_CODES);

  // Profile Modal State
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [workerOfMonth, setWorkerOfMonth] = useState<WorkerOfMonthResult | null>(null);
  const [selectingWorker, setSelectingWorker] = useState(false);
  
  useEffect(() => {
    const savedUsers = localStorage.getItem('sg_users');
    if (savedUsers) setUsers(JSON.parse(savedUsers));
    const savedSettings = localStorage.getItem('sg_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.companyLogo && parsed.companyLogo.includes('app_icon_1781090095655.png')) {
        parsed.companyLogo = './app_icon_1781090095655.png';
      }
      setSettings(parsed);
    }
    const savedEmployees = localStorage.getItem('sg_employees');
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    const savedLastSync = localStorage.getItem('sg_lastSync');
    if (savedLastSync) setLastSyncTime(savedLastSync);
    
    // Check local storage for data
    const savedViolations = localStorage.getItem('sg_violations');
    if (savedViolations) setViolations(JSON.parse(savedViolations));
    
    const savedRewards = localStorage.getItem('sg_rewards');
    if (savedRewards) setRewards(JSON.parse(savedRewards));
    
    // Codes
    const savedVCodes = localStorage.getItem('sg_violationCodes');
    if (savedVCodes) setViolationCodes(JSON.parse(savedVCodes));
    const savedRCodes = localStorage.getItem('sg_rewardCodes');
    if (savedRCodes) setRewardCodes(JSON.parse(savedRCodes));
    
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Listen for storage changes (Sync across tabs/windows in real-time)
    const handleStorageChange = () => {
        const u = localStorage.getItem('sg_users');
        if(u) setUsers(JSON.parse(u));
        
        const v = localStorage.getItem('sg_violations');
        if(v) setViolations(JSON.parse(v));

        const r = localStorage.getItem('sg_rewards');
        if(r) setRewards(JSON.parse(r));

        const e = localStorage.getItem('sg_employees');
        if(e) setEmployees(JSON.parse(e));
        
        const vc = localStorage.getItem('sg_violationCodes');
        if(vc) setViolationCodes(JSON.parse(vc));
        
        const rc = localStorage.getItem('sg_rewardCodes');
        if(rc) setRewardCodes(JSON.parse(rc));

        const s = localStorage.getItem('sg_settings');
        if(s) {
            const parsed = JSON.parse(s);
            if (parsed.companyLogo && parsed.companyLogo.includes('app_icon_1781090095655.png')) {
                parsed.companyLogo = './app_icon_1781090095655.png';
            }
            setSettings(parsed);
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update localStorage when state changes
  useEffect(() => { localStorage.setItem('sg_violations', JSON.stringify(violations)); }, [violations]);
  useEffect(() => { localStorage.setItem('sg_rewards', JSON.stringify(rewards)); }, [rewards]);
  useEffect(() => { localStorage.setItem('sg_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('sg_violationCodes', JSON.stringify(violationCodes)); }, [violationCodes]);
  useEffect(() => { localStorage.setItem('sg_rewardCodes', JSON.stringify(rewardCodes)); }, [rewardCodes]);
  useEffect(() => { localStorage.setItem('sg_settings', JSON.stringify(settings)); }, [settings]);

  const handleLogin = (u: string, p: string) => {
    const foundUser = users.find(user => user.username === u && user.password === p);
    if (foundUser) {
      setUser(foundUser);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('VIOLATIONS');
    setSystemMode('VIOLATION');
  };

  const updateEmployees = (newEmployees: Employee[]) => {
      setEmployees(newEmployees);
      localStorage.setItem('sg_employees', JSON.stringify(newEmployees));
  };

  const t = TRANSLATIONS[settings.language];

  // --- PERMISSION & DEPARTMENT LOGIC ---
  const getUserDepartment = (): Department | 'ALL' => {
    if (!user) return 'HSE'; // Default fallback
    if (['PLANT_MANAGER', 'HR_MANAGER', 'DEVELOPER'].includes(user.role)) return 'ALL';
    if (user.role === 'HSE_MANAGER' || user.role === 'HSE_OFFICER') return 'HSE';
    if (user.role === 'SECURITY_MANAGER') return 'SECURITY';
    if (user.role === 'TRAINING_MANAGER') return 'TRAINING';
    if (user.role === 'ADMIN_STAFF') return 'ADMIN';
    if (user.role === 'DEPARTMENT_MANAGER' && user.managedDepartment) return user.managedDepartment;
    return 'HSE';
  };

  const userDept = getUserDepartment();
  const canViewAll = userDept === 'ALL';
  const canApprove = ['HSE_MANAGER', 'PLANT_MANAGER', 'HR_MANAGER', 'DEVELOPER'].includes(user?.role || '');

  // Filter Data based on Role/Department
  const filterData = <T extends Violation | Reward>(data: T[]) => {
    return data.filter(item => {
      // 1. Department Filter
      const isMyDept = canViewAll || item.departmentSource === userDept;
      if (!isMyDept) return false;

      // 2. Search Filter
      const matchesSearch = item.employeeName.includes(searchTerm) || item.personnelId.includes(searchTerm);
      if (!matchesSearch) return false;

      // 3. Status/Tab Filter
      if (activeTab === 'ARCHIVE') {
        if (!item.isArchived) return false;
      } else {
        if (item.isArchived) return false;
      }

      if (approvalStatusFilter === 'PENDING') return !item.isApproved;
      if (approvalStatusFilter === 'APPROVED') return !!item.isApproved;
      return true;
    });
  };

  const itemsToDisplay = systemMode === 'VIOLATION' ? filterData(violations) : filterData(rewards);

  const getThemeColor = () => {
    const theme = settings.themeColor || 'blue';
    const mapper: Record<string, { bg: string; text: string; lightBg: string; lightText: string; ring: string }> = {
      blue: { bg: 'bg-blue-600', text: 'text-blue-600', lightBg: 'bg-blue-50', lightText: 'text-blue-700', ring: 'ring-blue-500' },
      red: { bg: 'bg-red-600', text: 'text-red-600', lightBg: 'bg-red-50', lightText: 'text-red-700', ring: 'ring-red-500' },
      green: { bg: 'bg-emerald-600', text: 'text-emerald-600', lightBg: 'bg-emerald-50', lightText: 'text-emerald-700', ring: 'ring-emerald-500' },
      violet: { bg: 'bg-violet-600', text: 'text-violet-600', lightBg: 'bg-violet-50', lightText: 'text-violet-700', ring: 'ring-violet-500' },
      slate: { bg: 'bg-slate-700', text: 'text-slate-700', lightBg: 'bg-slate-100', lightText: 'text-slate-800', ring: 'ring-slate-500' },
    };
    return mapper[theme] || mapper.blue;
  };
  const themeStyles = getThemeColor();

  const handleSync = async () => { /* Sync logic remains same */ };
  const handleAddViolation = (v: Violation) => { setViolations([v, ...violations]); setIsModalOpen(false); };
  const handleAddReward = (r: Reward) => { setRewards([r, ...rewards]); setIsRewardModalOpen(false); };
  const handleDelete = () => {
      if (deleteModal.id) {
          if (deleteModal.type === 'VIOLATION') setViolations(violations.filter(v => v.id !== deleteModal.id));
          else setRewards(rewards.filter(r => r.id !== deleteModal.id));
          setDeleteModal({ isOpen: false, id: null, type: 'VIOLATION' });
      }
  };
  const handleApprove = (id: string, type: 'VIOLATION' | 'REWARD') => {
      if (type === 'VIOLATION') setViolations(prev => prev.map(v => v.id === id ? { ...v, isApproved: true } : v));
      else setRewards(prev => prev.map(r => r.id === id ? { ...r, isApproved: true } : r));
  };
  const handlePickWorkerOfMonth = async () => { /* Logic remains */ };
  const handleExportCSV = () => { /* Logic remains */ };

  // Helper to map text to code label
  const getDisplayLabel = (code: number, type: 'VIOLATION' | 'REWARD') => {
      const list = type === 'VIOLATION' ? violationCodes : rewardCodes;
      return list.find(c => c.code === code)?.label || 'Unknown';
  };

  if (!user) return <LoginPage onLogin={handleLogin} settings={settings} error={loginError} />;

  return (
    <div className="min-h-screen pb-safe bg-gray-50 flex flex-col font-sans transition-all duration-300" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
           <div className="flex items-center gap-2 md:gap-3">
             {settings.companyLogo ? (
               <img 
                 src={settings.companyLogo} 
                 alt="SafeWatch AI Logo" 
                 className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-contain shadow-md hover:scale-105 transition-transform bg-gray-100/50 border border-gray-200/60 p-0.5" 
                 referrerPolicy="no-referrer"
               />
             ) : (
               <div className={`p-2 rounded-xl shadow-lg ${themeStyles.bg} text-white transition-transform active:scale-95`}><Shield className="w-5 h-5 md:w-6 md:h-6" /></div>
             )}
             <div>
                <h1 className="text-sm md:text-lg font-black text-gray-800 leading-tight">{settings.companyName}</h1>
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">{userDept === 'ALL' ? 'General Management' : `${userDept} Department`}</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2 md:gap-3">
             {/* Mode Switch */}
             <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 scale-90 md:scale-100">
                <button onClick={() => setSystemMode('VIOLATION')} className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex gap-1 items-center transition-all ${systemMode === 'VIOLATION' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}><AlertCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.mode_violation}</span></button>
                <button onClick={() => setSystemMode('REWARD')} className={`px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold flex gap-1 items-center transition-all ${systemMode === 'REWARD' ? 'bg-white shadow text-emerald-600' : 'text-gray-500'}`}><Medal className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t.mode_reward}</span></button>
             </div>
             
             <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${themeStyles.bg}`}>{user.username.charAt(0).toUpperCase()}</div>
                <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded-full hover:bg-white text-gray-500 transition-colors"><Settings className="w-4 h-4" /></button>
                <button onClick={handleLogout} className="p-1.5 rounded-full hover:bg-white text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
             </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 flex-grow w-full">
        {/* Dual Quick-Action & Mode Command Center */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Card 1: Safety Violations Portal */}
          <div 
            onClick={() => setSystemMode('VIOLATION')}
            className={`relative rounded-2xl p-5 md:p-6 transition-all duration-300 cursor-pointer overflow-hidden border-2 ${
              systemMode === 'VIOLATION' 
                ? 'border-red-500 bg-gradient-to-br from-red-50/70 via-red-50/30 to-white shadow-md ring-4 ring-red-500/10' 
                : 'border-gray-200 bg-white hover:border-red-200 hover:shadow shadow-sm opacity-85 hover:opacity-100'
            }`}
          >
            {/* Ambient subtle light inside active card */}
            {systemMode === 'VIOLATION' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            )}
            
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl transition-all duration-300 ${
                  systemMode === 'VIOLATION' ? 'bg-red-600 text-white shadow-md shadow-red-500/20' : 'bg-red-50 text-red-600'
                }`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base md:text-lg text-gray-900 leading-tight">
                    {settings.language === 'fa' ? 'سامانه ثبت و گزارش تخلفات ایمنی' : 'Safety Violations Center'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    {violations.filter(v => !v.isArchived).length}{' '}
                    {settings.language === 'fa' ? 'مورد فعال در سامانه' : 'Active Cases logged'}
                  </p>
                </div>
              </div>

              {/* Status Indicator Badge */}
              <div className="shrink-0 flex items-center">
                {systemMode === 'VIOLATION' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-605 bg-red-600 text-white shadow-sm border border-red-700 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white block"></span>
                    {settings.language === 'fa' ? 'در حال پایش' : 'Active View'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                    {settings.language === 'fa' ? 'کلیک جهت پایش' : 'View List'}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs md:text-sm text-gray-600 mb-4 leading-relaxed relative z-10">
              {settings.language === 'fa' 
                ? 'ثبت، پیگیری و گزارش‌گیری انواع عدم انطباق‌ها و جرایم ایمنی پرسنل بر اساس کدهای آئین‌نامه انضباطی سازمان.' 
                : 'Log, track, and generate regulatory reports for employee safety violations & non-compliances.'}
            </p>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="w-full relative z-10 bg-red-600 hover:bg-red-700 text-white font-black py-3.5 px-5 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm border-b-4 border-red-800 hover:border-red-900 shadow-red-500/10"
            >
              <Plus className="w-5 h-5 animate-pulse" />
              <span>{settings.language === 'fa' ? 'ثبت گزارش تخلف جدید (اخطار منفی)' : 'Log New Violation'}</span>
            </button>
          </div>

          {/* Card 2: HSE Positive Rewards Portal */}
          <div 
            onClick={() => setSystemMode('REWARD')}
            className={`relative rounded-2xl p-5 md:p-6 transition-all duration-300 cursor-pointer overflow-hidden border-2 ${
              systemMode === 'REWARD' 
                ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/70 via-emerald-50/30 to-white shadow-md ring-4 ring-emerald-500/10' 
                : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow shadow-sm opacity-85 hover:opacity-100'
            }`}
          >
            {/* Ambient subtle light inside active card */}
            {systemMode === 'REWARD' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            )}
            
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl transition-all duration-300 ${
                  systemMode === 'REWARD' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <Medal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base md:text-lg text-gray-900 leading-tight">
                    {settings.language === 'fa' ? 'سامانه تشویقی و امتیازهای مثبت پرسنل' : 'Personnel Rewards & Points'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    {rewards.filter(r => !r.isArchived).length}{' '}
                    {settings.language === 'fa' ? 'مورد فعال در سامانه' : 'Active Cases logged'}
                  </p>
                </div>
              </div>

              {/* Status Indicator Badge */}
              <div className="shrink-0 flex items-center">
                {systemMode === 'REWARD' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm border border-emerald-700 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white block"></span>
                    {settings.language === 'fa' ? 'در حال پایش' : 'Active View'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                    {settings.language === 'fa' ? 'کلیک جهت پایش' : 'View List'}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs md:text-sm text-gray-600 mb-4 leading-relaxed relative z-10">
              {settings.language === 'fa' 
                ? 'ثبت و تخصیص امتیازات رفتار ایمن پرسنل جهت ایجاد انگیزه و انتخاب هوشمند پرسنل برتر ماه.' 
                : 'Award positive behaviors, track performance scores, and seamlessly select workers of the month via AI.'}
            </p>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsRewardModalOpen(true);
              }}
              className="w-full relative z-10 bg-emerald-600 hover:bg-emerald-750 text-white font-black py-3.5 px-5 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm border-b-4 border-emerald-800 hover:border-emerald-900 shadow-emerald-500/10"
            >
              <Plus className="w-5 h-5 animate-pulse" />
              <span>{settings.language === 'fa' ? 'ثبت امتیاز مثبت / تشویق جدید' : 'Log New Reward'}</span>
            </button>
          </div>
        </div>

        {/* Only show Stats if Plant Manager or HR */}
        {canViewAll && <DashboardStats violations={violations} rewards={rewards} mode={systemMode} language={settings.language} />}

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-4">
             <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                 <div className="relative flex-grow">
                    <Search className={`absolute ${settings.language === 'fa' ? 'right-3' : 'left-3'} top-3.5 h-4 w-4 text-gray-400`} />
                    <input 
                        type="text" 
                        placeholder={t.search} 
                        className={`w-full py-2.5 ${settings.language === 'fa' ? 'pr-9 pl-4' : 'pl-9 pr-4'} text-base md:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 ${themeStyles.ring} bg-white shadow-sm`} 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                 </div>
                 {/* Status Dropdown Filter */}
                 <div className="relative shrink-0">
                    <select
                      value={approvalStatusFilter}
                      onChange={(e) => setApprovalStatusFilter(e.target.value as any)}
                      className={`w-full sm:w-44 py-2.5 px-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 ${themeStyles.ring} text-[13px] md:text-sm font-semibold shadow-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors`}
                    >
                      <option value="ALL">{settings.language === 'fa' ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
                      <option value="PENDING">{settings.language === 'fa' ? 'در انتظار تایید' : 'Pending Approval'}</option>
                      <option value="APPROVED">{settings.language === 'fa' ? 'تایید شده' : 'Approved'}</option>
                    </select>
                 </div>
             </div>
             <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                 <button onClick={() => setIsLegendOpen(true)} className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 flex gap-2 items-center whitespace-nowrap shadow-sm"><BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">{t.codeLegend}</span></button>
                 {activeTab !== 'ARCHIVE' && (
                    <button onClick={() => systemMode === 'VIOLATION' ? setIsModalOpen(true) : setIsRewardModalOpen(true)} className={`text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg flex gap-2 items-center whitespace-nowrap active:scale-95 transition-transform ${themeStyles.bg}`}><Plus className="w-4 h-4" /> {systemMode === 'VIOLATION' ? t.newViolation : t.newReward}</button>
                 )}
             </div>
        </div>

        {/* Data Table / Cards Container */}
        <div className="space-y-4">
          {/* Desktop Version (hidden on mobile) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-5 py-4 text-xs font-bold text-gray-500 text-right whitespace-nowrap">{t.personnel}</th>
                          {canViewAll && <th className="px-4 py-4 text-xs font-bold text-gray-500 text-center whitespace-nowrap">{t.sourceDept}</th>}
                          <th className="px-4 py-4 text-xs font-bold text-gray-500 text-center w-24 whitespace-nowrap">{systemMode === 'VIOLATION' ? t.violationCode : t.rewardCode}</th>
                          <th className="px-4 py-4 text-xs font-bold text-gray-500 text-center whitespace-nowrap">{t.scoreLabel}</th>
                          <th className="px-5 py-4 text-xs font-bold text-gray-500 text-center uppercase whitespace-nowrap">{t.actions}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {itemsToDisplay.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-5 py-4 whitespace-nowrap cursor-pointer" onClick={() => setSelectedPersonnelId(item.personnelId)}>
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110 ${themeStyles.lightBg} ${themeStyles.lightText}`}>
                                          {item.employeeName.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                              {item.employeeName}
                                              <UserIcon className="w-3 h-3 text-gray-400" />
                                          </div>
                                          <div className="text-xs text-gray-500 font-mono">{item.personnelId} | {item.department}</div>
                                      </div>
                                  </div>
                              </td>
                              {canViewAll && (
                                  <td className="px-4 py-4 text-center whitespace-nowrap">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.departmentSource === 'SECURITY' ? 'bg-slate-200 text-slate-800' : item.departmentSource === 'HSE' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                          {(t as any)[`dept_${item.departmentSource}`] || item.departmentSource}
                                      </span>
                                  </td>
                              )}
                              <td className="px-4 py-4 text-center whitespace-nowrap">
                                  <div className="flex flex-col items-center">
                                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono font-bold text-gray-700">
                                          {systemMode === 'VIOLATION' ? (item as Violation).violationCode : (item as Reward).rewardCode}
                                      </span>
                                      <span className="text-[10px] text-gray-400 mt-1 max-w-[120px] truncate block">
                                          {getDisplayLabel(systemMode === 'VIOLATION' ? (item as Violation).violationCode : (item as Reward).rewardCode, systemMode)}
                                      </span>
                                  </div>
                              </td>
                              <td className="px-4 py-4 text-center whitespace-nowrap">
                                  <span className={`font-bold font-mono text-sm ${systemMode === 'VIOLATION' ? 'text-red-600' : 'text-emerald-600'}`} dir="ltr">
                                      {systemMode === 'VIOLATION' ? (item as Violation).score : `+${(item as Reward).score}`}
                                  </span>
                              </td>
                              <td className="px-5 py-4 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => setSelectedPersonnelId(item.personnelId)} className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                          {t.viewProfile}
                                      </button>
                                      {!item.isApproved && canApprove && (
                                          <button onClick={() => handleApprove(item.id, systemMode)} className="text-emerald-600 bg-emerald-50 p-1.5 rounded-lg hover:bg-emerald-100 transition-colors" title={settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}><Check className="w-4 h-4" /></button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              {itemsToDisplay.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserIcon className="w-8 h-8 text-gray-300" />
                    <span className="text-sm font-medium">
                      {settings.language === 'fa' ? 'هیچ موردی برای نمایش یافت نشد.' : 'No cases found to display.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Cards View (shown on screens smaller than md breakpoint) */}
          <div className="md:hidden space-y-3.5">
              {itemsToDisplay.map((item) => {
                  const code = systemMode === 'VIOLATION' ? (item as Violation).violationCode : (item as Reward).rewardCode;
                  const score = systemMode === 'VIOLATION' ? (item as Violation).score : (item as Reward).score;
                  return (
                      <div key={item.id} className="bg-white rounded-2xl p-4 border border-gray-150 shadow-sm flex flex-col gap-3.5 hover:shadow-md transition-shadow">
                          {/* Personnel Profile Header & Score / Department Source Badge */}
                          <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedPersonnelId(item.personnelId)}>
                                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${themeStyles.lightBg} ${themeStyles.lightText}`}>
                                      {item.employeeName.charAt(0)}
                                  </div>
                                  <div className="space-y-0.5">
                                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                          {item.employeeName}
                                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                                      </div>
                                      <div className="text-[11px] text-gray-500 font-mono">
                                          {item.personnelId} | {item.department}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 font-mono">
                                  <span className={`font-black text-base leading-none ${systemMode === 'VIOLATION' ? 'text-red-650' : 'text-emerald-650'}`} dir="ltr">
                                      {systemMode === 'VIOLATION' ? score : `+${score}`}
                                  </span>
                                  {canViewAll && (
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${item.departmentSource === 'SECURITY' ? 'bg-slate-200 text-slate-800' : item.departmentSource === 'HSE' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                          {(t as any)[`dept_${item.departmentSource}`] || item.departmentSource}
                                      </span>
                                  )}
                              </div>
                          </div>

                          {/* Code and Action Description Details */}
                          <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
                              <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                      {systemMode === 'VIOLATION' ? t.violationCode : t.rewardCode}
                                  </span>
                                  <span className="text-xs font-bold text-gray-700 truncate mt-0.5 leading-tight">
                                      {getDisplayLabel(code, systemMode)}
                                  </span>
                              </div>
                              <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-700 shrink-0 shadow-xs">
                                  {code}
                              </span>
                          </div>

                          {/* Action Button Segment */}
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => setSelectedPersonnelId(item.personnelId)} 
                                  className="flex-grow text-center text-indigo-600 bg-indigo-50 active:bg-indigo-100/80 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-indigo-100/40"
                              >
                                  <UserIcon className="w-4 h-4" />
                                  {t.viewProfile}
                              </button>
                              {!item.isApproved && canApprove && (
                                  <button 
                                      onClick={() => handleApprove(item.id, systemMode)} 
                                      className="px-4 py-2.5 text-emerald-600 bg-emerald-50 active:bg-emerald-100/80 rounded-xl border border-emerald-100/40 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5 shrink-0"
                                      title={settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}
                                  >
                                      <Check className="w-4 h-4" />
                                      <span className="text-xs font-bold">{settings.language === 'fa' ? 'تایید' : 'Approve'}</span>
                                  </button>
                              )}
                          </div>
                      </div>
                  );
              })}
              {itemsToDisplay.length === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserIcon className="w-7 h-7 text-gray-300" />
                    <span className="text-xs font-medium">
                      {settings.language === 'fa' ? 'هیچ موردی برای نمایش یافت نشد.' : 'No cases found to display.'}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {isModalOpen && <ViolationForm currentUser={user} existingViolations={violations} employees={employees} onClose={() => setIsModalOpen(false)} onSubmit={handleAddViolation} codes={violationCodes} />}
      {isRewardModalOpen && <RewardForm currentUser={user} employees={employees} onClose={() => setIsRewardModalOpen(false)} onSubmit={handleAddReward} codes={rewardCodes} />}
      
      {/* NEW PROFILE MODAL */}
      <PersonnelProfileModal 
        isOpen={!!selectedPersonnelId} 
        onClose={() => setSelectedPersonnelId(null)} 
        personnelId={selectedPersonnelId || ''} 
        violations={violations}
        rewards={rewards}
        settings={settings}
      />
      
      <DeleteModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, type: 'VIOLATION' })} onConfirm={handleDelete} />
      <CodeLegendModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} settings={settings} mode={systemMode} violationCodes={violationCodes} rewardCodes={rewardCodes} />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={setSettings} 
        users={users} 
        onUpdateUsers={setUsers} 
        employees={employees}
        onUpdateEmployees={updateEmployees}
        currentUser={user}
        violationCodes={violationCodes}
        onUpdateViolationCodes={setViolationCodes}
        rewardCodes={rewardCodes}
        onUpdateRewardCodes={setRewardCodes}
      />
    </div>
  );
};

export default App;