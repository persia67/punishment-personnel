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
import PrintReportModal from './components/PrintReportModal';
import PersonnelProfileModal from './components/PersonnelProfileModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import OfflineSyncModal from './components/OfflineSyncModal';
import { EditAvatarModal } from './components/EditAvatarModal';
import { selectWorkerOfMonth } from './services/geminiService';
import { getServerUrl, fetchCentralData, syncCentralData } from './services/syncService';
import { sendNotificationSms } from './services/smsService';
import { Shield, Plus, Search, Trash2, AlertCircle, FileSpreadsheet, Archive, Gavel, Check, XCircle, LogOut, Settings, Award, Medal, Sparkles, Loader2, Cloud, CloudOff, RefreshCw, Wifi, WifiOff, Check as CheckIcon, BookOpen, User as UserIcon, ArrowUpDown, ChevronUp, ChevronDown, X, Layers, Key, Printer, ArrowLeftRight, Camera, Share2 } from 'lucide-react';
import { getTheme } from './theme';

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
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState(false);
  const [isEditAvatarOpen, setIsEditAvatarOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; id: string | null; type: 'VIOLATION' | 'REWARD'}>({ isOpen: false, id: null, type: 'VIOLATION' });
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [sortField, setSortField] = useState<'SCORE' | 'DEPARTMENT' | 'LAST_NAME' | 'NONE'>('NONE');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const handleSort = (field: 'SCORE' | 'DEPARTMENT' | 'LAST_NAME') => {
    if (sortField === field) {
      if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else {
        setSortField('NONE');
      }
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
  };

  const handleClearSort = () => {
    setSortField('NONE');
    setSortOrder('ASC');
  };
  
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
  
  // Electron auto-updater states
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState<any>(null);
  const [updateErrorMsg, setUpdateErrorMsg] = useState<string>('');

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.onUpdateAvailable((info: any) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
    });

    api.onUpdateNotAvailable(() => {
      setUpdateStatus('idle');
    });

    api.onDownloadProgress((progress: any) => {
      setDownloadProgress(progress);
      setUpdateStatus('downloading');
    });

    api.onUpdateDownloaded((info: any) => {
      setUpdateInfo(info);
      setUpdateStatus('downloaded');
    });

    api.onUpdateError((err: string) => {
      console.error('Update error:', err);
      setUpdateErrorMsg(err);
      setUpdateStatus('idle');
    });

    // Initial check for updates if running in Electron (silent in background)
    setUpdateStatus('idle');
    api.checkForUpdates();
  }, []);
  
  // Network & Sync helpers
  const pushDataToServerState = async (
    vList?: Violation[],
    rList?: Reward[],
    uList?: User[],
    eList?: Employee[],
    vcList?: CodeItem[],
    rcList?: CodeItem[],
    setts?: AppSettings
  ) => {
    try {
      setSyncStatus('syncing');
      const payload = {
        violations: vList !== undefined ? vList : violations,
        rewards: rList !== undefined ? rList : rewards,
        users: uList !== undefined ? uList : users,
        employees: eList !== undefined ? eList : employees,
        violationCodes: vcList !== undefined ? vcList : violationCodes,
        rewardCodes: rcList !== undefined ? rcList : rewardCodes,
        settings: setts !== undefined ? setts : settings
      };
      const res = await syncCentralData(payload);
      if (res.success) {
        setSyncStatus('synced');
        const now = new Date().toLocaleTimeString();
        setLastSyncTime(now);
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  const pullDataFromServerState = async (forceBootstrap = false) => {
    try {
      setSyncStatus('syncing');
      const data = await fetchCentralData();
      if (data) {
        // Automatically bootstrap fresh blank network servers with our default/saved collections
        if (forceBootstrap && (!data.users || data.users.length === 0)) {
          console.log('Bootstrapping fresh central Express database with local backup...');
          await syncCentralData({
            violations,
            rewards,
            users,
            employees,
            violationCodes,
            rewardCodes,
            settings
          });
          setSyncStatus('synced');
          const now = new Date().toLocaleTimeString();
          setLastSyncTime(now);
          return;
        }

        setSyncStatus('synced');
        if (data.violations) setViolations(data.violations);
        if (data.rewards) setRewards(data.rewards);
        if (data.users && data.users.length > 0) setUsers(data.users);
        if (data.employees) setEmployees(data.employees);
        if (data.violationCodes && data.violationCodes.length > 0) setViolationCodes(data.violationCodes);
        if (data.rewardCodes && data.rewardCodes.length > 0) setRewardCodes(data.rewardCodes);
        if (data.settings) setSettings(data.settings);

        const now = new Date().toLocaleTimeString();
        setLastSyncTime(now);
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  useEffect(() => {
    // Immediate local cache hydration
    const savedUsers = localStorage.getItem('sg_users');
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        const hasLegacyUsers = Array.isArray(parsed) && parsed.some(u => u.username === 'dev' || u.password === '123' || u.id === 'u8');
        if (hasLegacyUsers) {
          console.warn('Legacy system users detected. Upgrading local database with new secure default credentials...');
          localStorage.setItem('sg_users', JSON.stringify(DEFAULT_USERS));
          setUsers(DEFAULT_USERS);
        } else {
          setUsers(parsed);
        }
      } catch (err) {
        setUsers(DEFAULT_USERS);
      }
    } else {
      setUsers(DEFAULT_USERS);
    }
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
    
    const savedViolations = localStorage.getItem('sg_violations');
    if (savedViolations) setViolations(JSON.parse(savedViolations));
    const savedRewards = localStorage.getItem('sg_rewards');
    if (savedRewards) setRewards(JSON.parse(savedRewards));
    
    const savedVCodes = localStorage.getItem('sg_violationCodes');
    if (savedVCodes) setViolationCodes(JSON.parse(savedVCodes));
    const savedRCodes = localStorage.getItem('sg_rewardCodes');
    if (savedRCodes) setRewardCodes(JSON.parse(savedRCodes));
    
    // Connect to central network server immediately on boot
    pullDataFromServerState(true);

    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Listen for storage changes across windows
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

  // Periodic polling interval to pull down fresh records submitted by outer network nodes
  useEffect(() => {
    const interval = setInterval(() => {
      pullDataFromServerState(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [violations, rewards, users, employees, violationCodes, rewardCodes, settings]);

  // Sync to local storage
  useEffect(() => { localStorage.setItem('sg_violations', JSON.stringify(violations)); }, [violations]);
  useEffect(() => { localStorage.setItem('sg_rewards', JSON.stringify(rewards)); }, [rewards]);
  useEffect(() => { localStorage.setItem('sg_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('sg_violationCodes', JSON.stringify(violationCodes)); }, [violationCodes]);
  useEffect(() => { localStorage.setItem('sg_rewardCodes', JSON.stringify(rewardCodes)); }, [rewardCodes]);
  useEffect(() => { localStorage.setItem('sg_settings', JSON.stringify(settings)); }, [settings]);

  // Automated snapshot local backup helper
  const triggerAutoBackup = (
    v = violations,
    r = rewards,
    u = users,
    e = employees,
    vc = violationCodes,
    rc = rewardCodes,
    s = settings
  ) => {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        violations: v,
        rewards: r,
        users: u,
        employees: e,
        violationCodes: vc,
        rewardCodes: rc,
        settings: s
      };

      const raw = localStorage.getItem('sg_auto_backups');
      let backups: any[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            backups = parsed;
          }
        } catch {}
      }

      // Prepend so index 0 is always newest
      backups.unshift(snapshot);

      // Keep maximum 10 auto-saved snapshot copies
      if (backups.length > 10) {
        backups = backups.slice(0, 10);
      }

      localStorage.setItem('sg_auto_backups', JSON.stringify(backups));
    } catch (err) {
      console.error('[AutoBackup] Failed to save automatic snapshot:', err);
    }
  };

  // Debounced auto backup on central database state changes
  useEffect(() => {
    // Avoid backing up completely empty state on initial boot
    if (violations.length === 0 && rewards.length === 0 && employees.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      console.log('[AutoBackup] State changes stabilized. Creating database snapshot...');
      triggerAutoBackup(violations, rewards, users, employees, violationCodes, rewardCodes, settings);
    }, 3000); // 3 seconds stability debounce
    return () => clearTimeout(timer);
  }, [violations, rewards, users, employees, violationCodes, rewardCodes, settings]);

  const handleRestoreFullBackup = (bak: any) => {
    if (bak.violations) {
      setViolations(bak.violations);
      localStorage.setItem('sg_violations', JSON.stringify(bak.violations));
    }
    if (bak.rewards) {
      setRewards(bak.rewards);
      localStorage.setItem('sg_rewards', JSON.stringify(bak.rewards));
    }
    if (bak.users) {
      setUsers(bak.users);
      localStorage.setItem('sg_users', JSON.stringify(bak.users));
      if (user) {
        const matching = bak.users.find((u: any) => u.username === user.username);
        if (matching) setUser(matching);
      }
    }
    if (bak.employees) {
      setEmployees(bak.employees);
      localStorage.setItem('sg_employees', JSON.stringify(bak.employees));
    }
    if (bak.violationCodes) {
      setViolationCodes(bak.violationCodes);
      localStorage.setItem('sg_violationCodes', JSON.stringify(bak.violationCodes));
    }
    if (bak.rewardCodes) {
      setRewardCodes(bak.rewardCodes);
      localStorage.setItem('sg_rewardCodes', JSON.stringify(bak.rewardCodes));
    }
    if (bak.settings) {
      setSettings(bak.settings);
      localStorage.setItem('sg_settings', JSON.stringify(bak.settings));
    }
    // Update live central database to synchronize network nodes
    pushDataToServerState(
      bak.violations,
      bak.rewards,
      bak.users,
      bak.employees,
      bak.violationCodes,
      bak.rewardCodes,
      bak.settings
    );
  };

  const handleOfflineMergeSuccess = (
    mergedViolations: Violation[], 
    mergedRewards: Reward[], 
    mergedEmployees: Employee[]
  ) => {
    setViolations(mergedViolations);
    setRewards(mergedRewards);
    setEmployees(mergedEmployees);
    pushDataToServerState(
      mergedViolations,
      mergedRewards,
      users,
      mergedEmployees,
      violationCodes,
      rewardCodes,
      settings
    );
  };

  const handleUpdatePassword = (newPass: string) => {
    if (!user) return;
    const updatedLoggedInUser = { ...user, password: newPass };
    setUser(updatedLoggedInUser);

    const updatedUsersList = users.map(u => u.username === user.username ? { ...u, password: newPass } : u);
    setUsers(updatedUsersList);
    localStorage.setItem('sg_users', JSON.stringify(updatedUsersList));

    pushDataToServerState(violations, rewards, updatedUsersList, employees, violationCodes, rewardCodes, settings);
  };

  const handleLogin = (u: string, p: string) => {
    const cleanU = u.trim().toLowerCase();
    const foundUser = users.find(user => user.username.trim().toLowerCase() === cleanU && user.password === p);
    if (foundUser) {
      setUser(foundUser);
      setLoginError('');
    } else {
      setLoginError(settings.language === 'fa' ? 'نام کاربری یا رمز عبور اشتباه است.' : 'Invalid username or password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('VIOLATIONS');
    setSystemMode('VIOLATION');
  };

  const handleUpdateAvatar = (newAvatar: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatar: newAvatar };
    setUser(updatedUser);
    const updatedUsersList = users.map(u => u.username === user.username ? updatedUser : u);
    setUsers(updatedUsersList);
    localStorage.setItem('sg_users', JSON.stringify(updatedUsersList));
    pushDataToServerState(violations, rewards, updatedUsersList, employees, violationCodes, rewardCodes, settings);
  };

  const updateEmployees = (newEmployees: Employee[]) => {
      setEmployees(newEmployees);
      localStorage.setItem('sg_employees', JSON.stringify(newEmployees));
      pushDataToServerState(violations, rewards, users, newEmployees, violationCodes, rewardCodes, settings);
  };

  const handleUpdateSettings = (s: AppSettings) => {
    setSettings(s);
    pushDataToServerState(violations, rewards, users, employees, violationCodes, rewardCodes, s);
  };
  const handleUpdateUsers = (u: User[]) => {
    setUsers(u);
    pushDataToServerState(violations, rewards, u, employees, violationCodes, rewardCodes, settings);
  };
  const handleUpdateViolationCodes = (vc: CodeItem[]) => {
    setViolationCodes(vc);
    pushDataToServerState(violations, rewards, users, employees, vc, rewardCodes, settings);
  };
  const handleUpdateRewardCodes = (rc: CodeItem[]) => {
    setRewardCodes(rc);
    pushDataToServerState(violations, rewards, users, employees, violationCodes, rc, settings);
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
  const canApprove = ['HSE_MANAGER', 'PLANT_MANAGER', 'HR_MANAGER', 'DEVELOPER', 'ADMIN_STAFF'].includes(user?.role || '');

  const getCanApproveItem = (item: Violation | Reward) => {
    if (!user) return false;
    const role = user.role;
    if (['PLANT_MANAGER', 'DEVELOPER'].includes(role)) return true;
    
    if (item.departmentSource === 'HSE') {
      return role === 'HSE_MANAGER';
    }
    if (['ADMIN', 'HR'].includes(item.departmentSource)) {
      return role === 'HR_MANAGER' || role === 'ADMIN_STAFF';
    }
    if (item.departmentSource === 'SECURITY') {
      return role === 'SECURITY_MANAGER' || role === 'HR_MANAGER';
    }
    if (item.departmentSource === 'TRAINING') {
      return role === 'TRAINING_MANAGER' || role === 'HSE_MANAGER' || role === 'HR_MANAGER' || role === 'ADMIN_STAFF';
    }
    if (role === 'DEPARTMENT_MANAGER' && user.managedDepartment === item.departmentSource) {
      return true;
    }
    return false;
  };

  const getCanDeleteItem = (item: Violation | Reward) => {
    if (!user) return false;
    const role = user.role;
    // Plant manager and developer can delete everything
    if (['PLANT_MANAGER', 'DEVELOPER'].includes(role)) return true;
    
    // HSE Manager can delete HSE and Training items
    if (role === 'HSE_MANAGER' && ['HSE', 'TRAINING'].includes(item.departmentSource)) return true;
    
    // HR Manager can delete admin, HR, security items
    if (role === 'HR_MANAGER' && ['ADMIN', 'HR', 'SECURITY'].includes(item.departmentSource)) return true;

    // Security Manager can delete security items
    if (role === 'SECURITY_MANAGER' && item.departmentSource === 'SECURITY') return true;

    // Training Manager can delete training items
    if (role === 'TRAINING_MANAGER' && item.departmentSource === 'TRAINING') return true;
    
    // Custom Department Manager can delete their own department's items
    if (role === 'DEPARTMENT_MANAGER' && user.managedDepartment === item.departmentSource) return true;

    return false;
  };

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

  const sortedItems = [...itemsToDisplay].sort((a, b) => {
    if (sortField === 'NONE') return 0;
    
    if (sortField === 'SCORE') {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return sortOrder === 'ASC' ? scoreA - scoreB : scoreB - scoreA;
    }
    
    if (sortField === 'DEPARTMENT') {
      const deptA = (a.department || '').toLowerCase();
      const deptB = (b.department || '').toLowerCase();
      return sortOrder === 'ASC' 
        ? deptA.localeCompare(deptB, settings.language === 'fa' ? 'fa' : 'en') 
        : deptB.localeCompare(deptA, settings.language === 'fa' ? 'fa' : 'en');
    }
    
    if (sortField === 'LAST_NAME') {
      const getLastName = (name: string) => {
        const parts = name.trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] : name;
      };
      const nameA = getLastName(a.employeeName).toLowerCase();
      const nameB = getLastName(b.employeeName).toLowerCase();
      return sortOrder === 'ASC' 
        ? nameA.localeCompare(nameB, settings.language === 'fa' ? 'fa' : 'en') 
        : nameB.localeCompare(nameA, settings.language === 'fa' ? 'fa' : 'en');
    }
    
    return 0;
  });

  const themeStyles = getTheme(settings.themeColor);

  const handleSync = async () => {
    await pullDataFromServerState(false);
  };
  const handleAddViolation = (v: Violation) => {
    const updated = [v, ...violations];
    setViolations(updated);
    setIsModalOpen(false);
    pushDataToServerState(updated, rewards, users, employees, violationCodes, rewardCodes, settings);

    // Auto dispatch SMS notification to employee if auto-approved on creation
    if (v.isApproved) {
      const emp = employees.find(e => e.personnelId === v.personnelId);
      if (emp && emp.phoneNumber) {
        sendNotificationSms(emp.fullName, emp.phoneNumber, 'WARNING', v.date, v.reason)
          .catch(err => console.error('[SMS] Fail auto warning notification dispatch:', err));
      }
    }
  };
  const handleAddReward = (r: Reward) => {
    const updated = [r, ...rewards];
    setRewards(updated);
    setIsRewardModalOpen(false);
    pushDataToServerState(violations, updated, users, employees, violationCodes, rewardCodes, settings);

    // Auto dispatch SMS notification to employee if auto-approved on creation
    if (r.isApproved) {
      const emp = employees.find(e => e.personnelId === r.personnelId);
      if (emp && emp.phoneNumber) {
        sendNotificationSms(emp.fullName, emp.phoneNumber, 'REWARD', r.date, r.reason)
          .catch(err => console.error('[SMS] Fail auto reward notification dispatch:', err));
      }
    }
  };
  const handleDelete = () => {
      if (deleteModal.id) {
          const targetId = deleteModal.id;
          const item = deleteModal.type === 'VIOLATION'
               ? violations.find(v => v.id === targetId)
               : rewards.find(r => r.id === targetId);

          if (!item || !getCanDeleteItem(item)) {
              alert(settings.language === 'fa' 
                  ? 'خطای امنیتی: شما دسترسی لازم برای حذف این مورد ثبت شده را ندارید!' 
                  : 'Security Error: You do not have permission to delete this logged item.');
              return;
          }

          let updatedV = violations;
          let updatedR = rewards;
          if (deleteModal.type === 'VIOLATION') {
              updatedV = violations.filter(v => v.id !== targetId);
              setViolations(updatedV);
          } else {
              updatedR = rewards.filter(r => r.id !== targetId);
              setRewards(updatedR);
          }
          setDeleteModal({ isOpen: false, id: null, type: 'VIOLATION' });
          pushDataToServerState(updatedV, updatedR, users, employees, violationCodes, rewardCodes, settings);
      }
  };
  const handleApprove = (id: string, type: 'VIOLATION' | 'REWARD') => {
      let updatedV = violations;
      let updatedR = rewards;
      if (type === 'VIOLATION') {
          const item = violations.find(v => v.id === id);
          if (!item || !getCanApproveItem(item)) {
              alert(settings.language === 'fa' 
                  ? 'خطای امنیتی: شما دسترسی لازم برای تایید این مورد را ندارید!' 
                  : 'Security Error: You are not authorized to approve this item.');
              return;
          }
          updatedV = violations.map(v => v.id === id ? { ...v, isApproved: true } : v);
          setViolations(updatedV);

          // SMS dispatch on final approval
          const emp = employees.find(e => e.personnelId === item.personnelId);
          if (emp && emp.phoneNumber) {
              sendNotificationSms(emp.fullName, emp.phoneNumber, 'WARNING', item.date, item.reason)
                .catch(err => console.error('[SMS] Fail auto warning notification dispatch:', err));
          }
      } else {
          const item = rewards.find(r => r.id === id);
          if (!item || !getCanApproveItem(item)) {
              alert(settings.language === 'fa' 
                  ? 'خطای امنیتی: شما دسترسی لازم برای تایید این مورد را ندارید!' 
                  : 'Security Error: You are not authorized to approve this item.');
              return;
          }
          updatedR = rewards.map(r => r.id === id ? { ...r, isApproved: true } : r);
          setRewards(updatedR);

          // SMS dispatch on final approval
          const emp = employees.find(e => e.personnelId === item.personnelId);
          if (emp && emp.phoneNumber) {
              sendNotificationSms(emp.fullName, emp.phoneNumber, 'REWARD', item.date, item.reason)
                .catch(err => console.error('[SMS] Fail auto reward notification dispatch:', err));
          }
      }
      pushDataToServerState(updatedV, updatedR, users, employees, violationCodes, rewardCodes, settings);
  };
  const handlePickWorkerOfMonth = async () => {
    try {
      setSelectingWorker(true);
      const res = await selectWorkerOfMonth(rewards, violations);
      setWorkerOfMonth(res);
    } catch (e: any) {
      console.error(e);
      alert(settings.language === 'fa' 
        ? "خطا در فرآیند تحلیل هوش مصنوعی: لطفا اتصال به شبکه یا تنظیمات سرور هوش مصنوعی را بازبینی کنید." 
        : "AI selection process failed. Please check your networks or AI server properties.");
    } finally {
      setSelectingWorker(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const dataToExport = systemMode === 'VIOLATION' ? violations : rewards;
      if (dataToExport.length === 0) {
        alert(settings.language === 'fa' ? "داده‌ای برای خروجی وجود ندارد" : "No records to export");
        return;
      }
      
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM
      if (systemMode === 'VIOLATION') {
        csvContent += "ID,Employee Name,Personnel ID,Department,Severity,Score,Date,Status,Approved\n";
        dataToExport.forEach((item: any) => {
          csvContent += `"${item.id}","${item.employeeName}","${item.personnelId}","${item.department}","${item.severity}",${item.score},"${item.date}","${item.status}",${item.isApproved || false}\n`;
        });
      } else {
        csvContent += "ID,Employee Name,Personnel ID,Department,Type,Score,Date,Approved\n";
        dataToExport.forEach((item: any) => {
          csvContent += `"${item.id}","${item.employeeName}","${item.personnelId}","${item.department}","${item.rewardType}",${item.score},"${item.date}",${item.isApproved || false}\n`;
        });
      }
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `HSE_${systemMode}_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV export error", e);
    }
  };

  // Helper to map text to code label
  const getDisplayLabel = (code: number, type: 'VIOLATION' | 'REWARD') => {
      const list = type === 'VIOLATION' ? violationCodes : rewardCodes;
      return list.find(c => c.code === code)?.label || 'Unknown';
  };

  if (!user) return <LoginPage onLogin={handleLogin} settings={settings} error={loginError} />;

  return (
    <div className="min-h-screen pb-safe bg-gray-50 flex flex-col font-sans transition-all duration-300" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
           <div className="flex items-center gap-2 md:gap-3">
             {settings.companyLogo ? (
               <img 
                 src={settings.companyLogo} 
                 alt="Intelligent monitoring system Logo" 
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

             <button 
                type="button"
                onClick={() => setIsOfflineSyncOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-black transition-all shadow-xs active:scale-95 shrink-0"
                title={settings.language === 'fa' ? 'تبادل آفلاین داده‌ها (فلش/ایمیل)' : 'Offline Exchange (USB/Email)'}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 animate-pulse text-indigo-600" />
                <span className="hidden md:inline">
                  {settings.language === 'fa' ? 'تبادل آفلاین داده‌ها' : 'Offline Exchange'}
                </span>
              </button>

             <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${themeStyles.bg}`}>{user.username.charAt(0).toUpperCase()}</div>
                <button onClick={() => setIsChangePasswordOpen(true)} className="p-1.5 rounded-full hover:bg-white text-amber-600 transition-colors" title={settings.language === 'fa' ? 'تغییر رمز عبور کاربر' : 'Change Password'}><Key className="w-4 h-4" /></button>
                 <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded-full hover:bg-white text-gray-500 transition-colors"><Settings className="w-4 h-4" /></button>
                <button onClick={handleLogout} className="p-1.5 rounded-full hover:bg-white text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
             </div>
           </div>
        </div>
      </header>

       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 flex-grow w-full space-y-6 font-sans print:hidden">
         {/* Welcome & Session Profile Banner */}
         {user && (
           <div className="bg-gradient-to-r from-indigo-900 to-slate-800 text-white rounded-3xl p-5 md:p-6 shadow-md border border-indigo-950 flex flex-col md:flex-row items-center justify-between gap-5 transition-all relative overflow-hidden" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
             {/* Abstract background graphics */}
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500 rounded-full opacity-10 blur-xl"></div>
             <div className="absolute -left-10 -top-10 w-32 h-32 bg-sky-500 rounded-full opacity-10 blur-xl"></div>
             
             <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 w-full md:w-auto text-center sm:text-right">
               {/* Clickable Profile Photo */}
               <div className="relative group shrink-0">
                 <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-950/80 border-2 border-indigo-400/50 p-1 shadow-inner flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-300">
                   {user.avatar ? (
                     <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                   ) : (
                     <div className="w-full h-full bg-linear-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center rounded-xl font-bold text-2xl md:text-3xl shadow-sm">
                       {user.fullName.charAt(0)}
                     </div>
                   )}
                 </div>
                 <button 
                   onClick={() => setIsEditAvatarOpen(true)}
                   className="absolute -bottom-1.5 -right-1.5 bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-lg border border-indigo-700/50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-bold flex items-center justify-center"
                   title={settings.language === 'fa' ? 'تغییر عکس پروفایل' : 'Change Profile Photo'}
                 >
                   <Camera className="w-3.5 h-3.5" />
                 </button>
               </div>
               
               <div className="space-y-1.5">
                 <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                   <h2 className="text-lg md:text-2xl font-black tracking-tight">{settings.language === 'fa' ? 'خوش آمدید،' : 'Welcome,'} {user.fullName}</h2>
                   <span className="bg-indigo-500/35 border border-indigo-400/30 text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                     {settings.language === 'fa' ? 'فعال در سامانه' : 'Active Session'}
                   </span>
                 </div>
                 
                 <p className="text-xs md:text-sm text-indigo-200 font-medium leading-relaxed flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
                   <span>
                     <strong className="text-white">{settings.language === 'fa' ? 'سمت سازمانی:' : 'Job Title:'}</strong>{' '}
                     {(TRANSLATIONS as any)[settings.language][`role_${user.role.toLowerCase()}`] || user.role}
                   </span>
                   <span className="text-indigo-400 hidden sm:inline">•</span>
                   <span>
                     <strong className="text-white">{settings.language === 'fa' ? 'سطح دسترسی:' : 'Access Level:'}</strong>{' '}
                     {user.role === 'DEVELOPER' ? (settings.language === 'fa' ? 'مدیریت کل سیستم (دولوپر)' : 'Full System Control (Developer)') : 
                      user.role === 'PLANT_MANAGER' ? (settings.language === 'fa' ? 'مدیریت ارشد کارخانه' : 'Plant Senior Management') : 
                      user.role === 'HR_MANAGER' ? (settings.language === 'fa' ? 'مدیریت منابع انسانی' : 'HR Management') : 
                      (settings.language === 'fa' ? `پایش و ثبت اختصاصی واحد ${userDept}` : `Departmental Node: ${userDept}`)}
                   </span>
                 </p>
               </div>
             </div>
             
             {/* Quick Actions inside Profile Banner */}
             <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto relative z-10 border-t border-indigo-800/50 pt-3 md:pt-0 md:border-0">
               <button
                 onClick={() => setIsEditAvatarOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/40 hover:bg-indigo-800/60 text-indigo-100 hover:text-white border border-indigo-700/40 text-xs font-bold transition-all active:scale-95"
               >
                 <Camera className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'تغییر عکس' : 'Change Avatar'}</span>
               </button>
               <button
                 onClick={() => setIsChangePasswordOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/40 hover:bg-indigo-800/60 text-indigo-100 hover:text-white border border-indigo-700/40 text-xs font-bold transition-all active:scale-95"
               >
                 <Key className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'تغییر رمز عبور' : 'Change Password'}</span>
               </button>
               <button
                 onClick={handleLogout}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 border border-red-500/30 text-xs font-bold transition-all active:scale-95"
               >
                 <LogOut className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'خروج' : 'Logout'}</span>
               </button>
               <button
                 onClick={() => setIsSettingsOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/40 hover:bg-indigo-800/60 text-indigo-100 hover:text-white border border-indigo-700/40 text-xs font-bold transition-all active:scale-95"
                 title={settings.language === 'fa' ? 'تنظیمات سیستم' : 'System Settings'}
               >
                 <Settings className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'تنظیمات' : 'Settings'}</span>
               </button>
             </div>
           </div>
         )}

         {/* Dynamic Mode Segment Directory - Fresh, Premium & Distinctive */}
        <div className="p-1.5 rounded-2xl bg-white border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
          {/* Card 1 Switch: Safety Violations Portal */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setSystemMode('VIOLATION')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSystemMode('VIOLATION');
              }
            }}
            className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 outline-none cursor-pointer ${
              systemMode === 'VIOLATION' 
                ? 'bg-red-50/70 text-red-605 border border-red-200/50 shadow-xs ring-2 ring-red-500/10' 
                : 'hover:bg-gray-50 text-gray-500 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg transition-all ${
                systemMode === 'VIOLATION' ? 'bg-red-600 text-white shadow-sm scale-105' : 'bg-gray-100/80 text-gray-400'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="block font-black text-xs md:text-sm text-gray-800">
                  {settings.language === 'fa' ? 'سامانه ثبت و گزارش تخلفات' : 'Violations Center'}
                </span>
                <span className="block text-[10px] md:text-xs text-gray-500 font-medium">
                  {violations.filter(v => !v.isArchived).length}{' '}
                  {settings.language === 'fa' ? 'مورد فعال در سیستم' : 'Active cases logged'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {systemMode === 'VIOLATION' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-red-600 text-white shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  {settings.language === 'fa' ? 'در حال پایش' : 'Active View'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold bg-gray-100 text-gray-400">
                  {settings.language === 'fa' ? 'انتخاب جهت پایش' : 'View'}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors flex items-center justify-center shadow-xs active:scale-95"
                title={settings.language === 'fa' ? 'ثبت سریع تخلف جدید' : 'Quick Register Violation'}
              >
                <Plus className="w-3.5 h-3.5 font-bold" />
              </button>
            </div>
          </div>

          {/* Card 2 Switch: HSE Positive Rewards Portal */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setSystemMode('REWARD')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSystemMode('REWARD');
              }
            }}
            className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 outline-none cursor-pointer ${
              systemMode === 'REWARD' 
                ? `${themeStyles.accentBg} text-gray-800 border ${themeStyles.borderLight} shadow-xs ring-2 ${themeStyles.ring}/10` 
                : 'hover:bg-gray-50 text-gray-500 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg transition-all ${
                systemMode === 'REWARD' ? `${themeStyles.bg} text-white shadow-sm scale-105` : 'bg-gray-100/80 text-gray-400'
              }`}>
                <Medal className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="block font-black text-xs md:text-sm text-gray-800">
                  {settings.language === 'fa' ? 'سامانه تشویقی و امتیازهای مثبت پرسنل' : 'Personnel Rewards & Points'}
                </span>
                <span className="block text-[10px] md:text-xs text-gray-500 font-medium">
                  {rewards.filter(r => !r.isArchived).length}{' '}
                  {settings.language === 'fa' ? 'مورد تشویقی ثبت شده' : 'Active rewards logged'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {systemMode === 'REWARD' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-white border border-gray-200 text-gray-700 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {settings.language === 'fa' ? 'در حال پایش' : 'Active View'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold bg-gray-100 text-gray-400">
                  {settings.language === 'fa' ? 'انتخاب جهت پایش' : 'View'}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRewardModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors flex items-center justify-center shadow-xs active:scale-95"
                title={settings.language === 'fa' ? 'ثبت سریع تشویق جدید' : 'Quick Register Reward'}
              >
                <Plus className="w-3.5 h-3.5 font-bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Console banner card with dynamic styling based on active mode & theme */}
        <div className={`relative overflow-hidden rounded-2xl border mb-6 ${
          systemMode === 'VIOLATION'
            ? 'border-red-200 bg-gradient-to-br from-red-50/50 via-white to-red-50/10 shadow-xs'
            : `${themeStyles.borderLight} bg-gradient-to-br ${themeStyles.gradientBg} shadow-xs`
        } p-5 md:p-6 transition-all duration-500`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            {/* Left Desk: Context and counts */}
            <div className="space-y-1.5">
              <div className="flex items-center flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                  systemMode === 'VIOLATION' 
                    ? 'bg-red-655 bg-red-600 text-white shadow-xs' 
                    : `${themeStyles.bg} text-white shadow-xs`
                }`}>
                  {systemMode === 'VIOLATION' ? <Shield className="w-3.5 h-3.5" /> : <Medal className="w-3.5 h-3.5" />}
                  {systemMode === 'VIOLATION' ? t.mode_violation : t.mode_reward}
                </span>
                {/* Server Status Indicators */}
                {getServerUrl() && (
                  <>
                    {(syncStatus === 'synced' && isOnline) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-emerald-100 text-emerald-600 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {settings.language === 'fa' ? 'سرور متصل' : 'Intranet Connected'}
                      </span>
                    ) : syncStatus === 'syncing' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-blue-100 text-blue-600 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        {settings.language === 'fa' ? 'در حال همگام‌سازی...' : 'Syncing...'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-amber-200 text-amber-700 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {settings.language === 'fa' ? 'آفلاین (نسخه محلی و امن)' : 'Offline (Local Replica)'}
                      </span>
                    )}
                  </>
                )}
              </div>
              
              <h2 className="text-base md:text-lg font-black text-gray-900 leading-tight">
                {systemMode === 'VIOLATION' 
                  ? (settings.language === 'fa' ? 'پیشخوان جامع کنترل و ثبت تخلفات سازمانی' : 'Organizational Compliance & Violations Desk')
                  : (settings.language === 'fa' ? 'پیشخوان انگیزش و تخصیص امتیازات مثبت پرسنلی' : 'Personnel Motivation & Performance Desk')}
              </h2>
              <p className="text-xs text-gray-650 leading-relaxed max-w-3xl">
                {systemMode === 'VIOLATION'
                  ? (settings.language === 'fa' 
                      ? 'در این بخش می‌توانید نسبت به ثبت عدم انطباق‌ها، آرشیو مجازات کدهای انضباطی سازمان و کسر امتیازهای متناسب اقدام به پایش نمایید.' 
                      : 'Log and monitor personnel non-compliances, warnings, disciplinary codes, and performance point deductions.')
                  : (settings.language === 'fa' 
                      ? 'در این بخش امتیازات مثبت تشویقی بابت رفتارهای ایمن، ابتکارها و آراستگی پرسنل ثبت و تایید نهایی می‌گردد.' 
                      : 'Log awards, safety improvements, and positive behavior points to empower high-performing crews.')}
              </p>
            </div>

            {/* Right Desk: Core primary actions (No duplicates, elegant animations) */}
            <div className="flex flex-wrap lg:flex-nowrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLegendOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
              >
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span>{t.codeLegend}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintReportOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
              >
                <Printer className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>{settings.language === 'fa' ? 'گزارش چاپی واحدها' : 'Print Dept Report'}</span>
              </button>

              {systemMode === 'REWARD' && canViewAll && (
                <button
                  type="button"
                  disabled={selectingWorker}
                  onClick={handlePickWorkerOfMonth}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
                >
                  {selectingWorker ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-600" />}
                  <span>{settings.language === 'fa' ? 'کارمند نمونه ماه (با هوش مصنوعی)' : 'AI Pick Worker of Month'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => systemMode === 'VIOLATION' ? setIsModalOpen(true) : setIsRewardModalOpen(true)}
                className={`text-white font-black py-2.5 px-4.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md ${
                  systemMode === 'VIOLATION' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : `${themeStyles.bg} ${themeStyles.hoverBg}`
                }`}
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                <span>{systemMode === 'VIOLATION' ? t.newViolation : t.newReward}</span>
              </button>
            </div>
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

        {/* Sorting controls */}
        <div className="flex flex-wrap items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 gap-2.5 mb-4 text-xs md:text-sm shadow-xs">
          <span className="text-gray-500 font-bold flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            {settings.language === 'fa' ? 'مرتب‌سازی بر اساس:' : 'Sort by:'}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSort('SCORE')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                sortField === 'SCORE'
                  ? `${themeStyles.bg} text-white border-transparent`
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{settings.language === 'fa' ? 'امتیاز عملکرد' : 'Score'}</span>
              {sortField === 'SCORE' && (
                sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => handleSort('DEPARTMENT')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                sortField === 'DEPARTMENT'
                  ? `${themeStyles.bg} text-white border-transparent`
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{settings.language === 'fa' ? 'دپارتمان دفتری' : 'Department'}</span>
              {sortField === 'DEPARTMENT' && (
                sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => handleSort('LAST_NAME')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                sortField === 'LAST_NAME'
                  ? `${themeStyles.bg} text-white border-transparent`
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{settings.language === 'fa' ? 'نام خانوادگی' : 'Last Name (Personnel Name)'}</span>
              {sortField === 'LAST_NAME' && (
                sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {sortField !== 'NONE' && (
              <button
                onClick={handleClearSort}
                className="text-red-500 hover:text-red-650 bg-red-50 hover:bg-red-100/80 p-1.5 rounded-xl transition-colors border border-transparent hover:border-red-200"
                title={settings.language === 'fa' ? 'حذف فیلتر مرتب‌سازی' : 'Clear sorting'}
              >
                <X className="w-4 h-4" />
              </button>
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
                      {sortedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-5 py-4 whitespace-nowrap cursor-pointer" onClick={() => setSelectedPersonnelId(item.personnelId)}>
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110 ${themeStyles.lightBg} ${themeStyles.lightText}`}>
                                          {item.employeeName.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                              {item.employeeName}
                                              <UserIcon className="w-3 h-3 text-gray-400" />
                                              {item.isApproved ? (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                                  {settings.language === 'fa' ? 'درج در پرونده' : 'Logged'}
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                                                  {settings.language === 'fa' ? 'ثبت اولیه' : 'Preliminary'}
                                                </span>
                                              )}
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
                                      {!item.isApproved && getCanApproveItem(item) && (
                                          <button onClick={() => handleApprove(item.id, systemMode)} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors" title={settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}>
                                              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                              <span>{settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}</span>
                                          </button>
                                      )}
                                      {getCanDeleteItem(item) && (
                                          <button onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: systemMode })} className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors hover:text-red-850" title={settings.language === 'fa' ? 'حذف مورد ثبت شده' : 'Delete Log'}>
                                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                              <span>{settings.language === 'fa' ? 'حذف' : 'Delete'}</span>
                                          </button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              {sortedItems.length === 0 && (
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
              {sortedItems.map((item) => {
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
                                  <div className="space-y-1">
                                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                          {item.employeeName}
                                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                                      </div>
                                      <div className="flex gap-2 items-center flex-wrap">
                                          <span className="text-[11px] text-gray-500 font-mono">
                                              {item.personnelId} | {item.department}
                                          </span>
                                          {item.isApproved ? (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-205">
                                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                                              {settings.language === 'fa' ? 'درج پرونده' : 'Logged'}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                                              {settings.language === 'fa' ? 'ثبت اولیه' : 'Prelim'}
                                            </span>
                                          )}
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
                              {!item.isApproved && getCanApproveItem(item) && (
                                  <button 
                                      onClick={() => handleApprove(item.id, systemMode)} 
                                      className="px-4 py-2.5 text-emerald-700 bg-emerald-50 active:bg-emerald-110/80 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5 shrink-0"
                                      title={settings.language === 'fa' ? 'تایید نهایی و ثبت پرونده' : 'Approve'}
                                  >
                                      <Check className="w-4 h-4 font-bold text-emerald-600" />
                                      <span className="text-xs font-bold">{settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}</span>
                                  </button>
                              )}
                              {getCanDeleteItem(item) && (
                                  <button 
                                      onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: systemMode })} 
                                      className="px-4 py-2.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                                      title={settings.language === 'fa' ? 'حذف مورد ثبت شده' : 'Delete Log'}
                                  >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                      <span className="text-xs font-bold">{settings.language === 'fa' ? 'حذف' : 'Delete'}</span>
                                  </button>
                              )}
                          </div>
                      </div>
                  );
              })}
              {sortedItems.length === 0 && (
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
        employees={employees}
      />
      
      <DeleteModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, type: 'VIOLATION' })} onConfirm={handleDelete} />
      <CodeLegendModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} settings={settings} mode={systemMode} violationCodes={violationCodes} rewardCodes={rewardCodes} />
      <PrintReportModal 
        isOpen={isPrintReportOpen} 
        onClose={() => setIsPrintReportOpen(false)} 
        settings={settings} 
        violations={violations} 
        rewards={rewards} 
        employees={employees} 
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={handleUpdateSettings} 
        users={users} 
        onUpdateUsers={handleUpdateUsers} 
        employees={employees}
        onUpdateEmployees={updateEmployees}
        currentUser={user}
        violationCodes={violationCodes}
        onUpdateViolationCodes={handleUpdateViolationCodes}
        rewardCodes={rewardCodes}
        onUpdateRewardCodes={handleUpdateRewardCodes}
        onRestoreFullBackup={handleRestoreFullBackup}
      />

      <OfflineSyncModal
        isOpen={isOfflineSyncOpen}
        onClose={() => setIsOfflineSyncOpen(false)}
        settings={settings}
        violations={violations}
        rewards={rewards}
        employees={employees}
        onMergeSuccess={handleOfflineMergeSuccess}
      />

      {user && (
        <ChangePasswordModal 
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={user}
          settings={settings}
          onUpdatePassword={handleUpdatePassword}
        />
      )}

      {user && (
        <EditAvatarModal
          isOpen={isEditAvatarOpen}
          onClose={() => setIsEditAvatarOpen(false)}
          currentUser={user}
          onUpdateAvatar={handleUpdateAvatar}
          settings={settings}
        />
      )}

      {/* Electron Auto-Updater Banner */}
      {updateStatus !== 'idle' && (window as any).electronAPI && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-2xl p-4 text-white text-xs animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <RefreshCw className={`w-4 h-4 ${updateStatus === 'downloading' || updateStatus === 'checking' ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-right" dir="rtl">
                <h4 className="font-bold text-xs text-gray-100">
                  {settings.language === 'fa' ? 'به‌روزرسانی نرم‌افزار' : 'Software Update'}
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {updateStatus === 'checking' && (settings.language === 'fa' ? 'در حال بررسی نسخه‌های جدید...' : 'Checking for updates...')}
                  {updateStatus === 'available' && (settings.language === 'fa' ? `نسخه جدید ${updateInfo?.version || ''} در دسترس است` : `New version ${updateInfo?.version || ''} available`)}
                  {updateStatus === 'downloading' && (settings.language === 'fa' ? `در حال دانلود... (${Math.round(downloadProgress?.percent || 0)}%)` : `Downloading... (${Math.round(downloadProgress?.percent || 0)}%)`)}
                  {updateStatus === 'downloaded' && (settings.language === 'fa' ? 'دانلود کامل شد. آماده نصب است.' : 'Download complete. Ready to install.')}
                  {updateStatus === 'error' && (settings.language === 'fa' ? 'خطا در فرآیند به‌روزرسانی' : 'Error during update process')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setUpdateStatus('idle')} 
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {updateStatus === 'downloading' && (
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 mb-3 overflow-hidden">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${downloadProgress?.percent || 0}%` }}
              />
            </div>
          )}

          {updateStatus === 'available' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setUpdateStatus('downloading');
                  (window as any).electronAPI.startDownload();
                }}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors text-center text-[11px]"
              >
                {settings.language === 'fa' ? 'به‌روزرسانی و دانلود نسخه جدید' : 'Download Update'}
              </button>
            </div>
          )}

          {updateStatus === 'downloaded' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  (window as any).electronAPI.quitAndInstall();
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors text-center text-[11px] flex items-center justify-center gap-1.5"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>{settings.language === 'fa' ? 'راه‌اندازی مجدد و نصب' : 'Restart & Install'}</span>
              </button>
            </div>
          )}

          {updateStatus === 'error' && (
            <p className="text-[9px] text-red-400 mt-2 line-clamp-1 truncate text-left" title={updateErrorMsg}>
              {updateErrorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;