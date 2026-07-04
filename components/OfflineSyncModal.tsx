import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Download, 
  Upload, 
  Check, 
  FileJson, 
  Calendar, 
  Filter, 
  Building, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText, 
  Database,
  History,
  Trash2,
  Info,
  Share2
} from 'lucide-react';
import { Violation, Reward, Employee, AppSettings } from '../types';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  violations: Violation[];
  rewards: Reward[];
  employees: Employee[];
  onMergeSuccess: (
    mergedViolations: Violation[], 
    mergedRewards: Reward[], 
    mergedEmployees: Employee[]
  ) => void;
}

interface SyncFilePayload {
  version: string;
  source: string;
  exportDate: string;
  filterPeriod?: string;
  filterDept?: string;
  violations: Violation[];
  rewards: Reward[];
  employees: Employee[];
}

interface SyncLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  actionType: 'IMPORT' | 'EXPORT';
  period?: string;
  violationsCount: number;
  rewardsCount: number;
  employeesCount: number;
  newViolationsAdded?: number;
  updatedViolations?: number;
  newRewardsAdded?: number;
  updatedRewards?: number;
  newEmployeesAdded?: number;
}

const FA_TRANSLATIONS = {
  title: 'پیشخوان جامع تبادل و ادغام آفلاین داده‌ها',
  subtitle: 'پل ارتباطی فایل‌های ادواری و انتقال ایمن اطلاعات بین واحدها',
  howItWorksTitle: 'راهنمای کارکرد سامانه همگام‌سازی آفلاین (بدون نیاز به شبکه)',
  howItWorksDesc: 'چنانچه به شبکه داخلی یا سرور متصل نیستید، می‌توانید برای ارسال اطلاعات ثبت شده در طول ماه به واحد اداری/منابع انسانی و یا مدیریت، از این ابزار استفاده کنید. سیستم مبدا داده‌ها را صادر می‌کند و سیستم مقصد آن‌ها را به صورت هوشمند ادغام (Merge) می‌نماید بدون آنکه اطلاعات قبلی پاک شوند.',
  step1: '۱. خروجی دوره‌ای واحد خود را دانلود و به کمک فلش مموری یا ایمیل به واحد مقصد تحویل دهید.',
  step2: '۲. واحد اداری یا مدیریت با بارگذاری فایل، اطلاعات جدید را با اطلاعات قبلی ادغام و وضعیت تاییدها را بروزرسانی می‌کند.',
  exportTitle: 'پشتیبان‌گیری و خروجی ادواری (جهت ارسال به واحد مقصد)',
  importTitle: 'بارگذاری و ادغام هوشمند فایل‌های دریافتی',
  filterMonth: 'فیلتر بر اساس دوره/ماه ثبت:',
  filterDept: 'فیلتر واحد صادرکننده:',
  filterStatus: 'فیلتر وضعیت تایید پرونده:',
  allMonths: 'همه دوره‌ها (کل تاریخچه)',
  allDepts: 'همه واحدها (کل سازمان)',
  allStatuses: 'همه موارد (مواد موقت و تایید شده)',
  pendingOnly: 'فقط موارد در انتظار تایید',
  approvedOnly: 'فقط موارد تایید شده نهایی',
  violationCount: 'تعداد تخلفات منطبق:',
  rewardCount: 'تعداد تشویقات منطبق:',
  employeesCount: 'تعداد پرسنل مرتبط:',
  downloadButton: 'دریافت فایل تبادل آفلاین داده‌ها (.json)',
  dragDropText: 'فایل تبادل دریافتی را به اینجا بکشید یا جهت انتخاب کلیک کنید',
  fileValidationTitle: 'تحلیل و ارزیابی هوشمند فایل تبادل',
  fileName: 'نام فایل:',
  fileSource: 'منبع صادرکننده فایل:',
  fileDate: 'تاریخ تولید فایل:',
  newRecordsToAdd: 'پرونده‌های جدید جهت افزودن:',
  recordsToUpdate: 'پرونده‌های تکراری جهت بروزرسانی (تایید نهایی آفلاین):',
  identicalRecords: 'پرونده‌های تکراری و کاملا یکسان (بدون نیاز به تغییر):',
  confirmMergeBtn: 'تایید نهایی و ادغام در پایگاه داده محلی',
  cancelMergeBtn: 'انصراف',
  mergeSuccessMsg: 'ادغام آفلاین اطلاعات با موفقیت انجام شد و پرونده‌ها بروزرسانی گردیدند.',
  mergeErrorMsg: 'فایل بارگذاری شده نامعتبر است یا با فرمت فایل‌های تبادل SafeWatch همخوانی ندارد.',
  historyTitle: 'تاریخچه همگام‌سازی‌ها و تبادل‌های آفلاین قبلی',
  noHistory: 'هنوز هیچ تبادل یا ادغام آفلاینی ثبت نشده است.',
  clearHistory: 'پاکسازی تاریخچه',
  itemCountUnit: 'مورد',
  monthLabels: {
    '01': 'فروردین',
    '02': 'اردیبهشت',
    '03': 'خرداد',
    '04': 'تیر',
    '05': 'مرداد',
    '06': 'شهریور',
    '07': 'مهر',
    '08': 'آبان',
    '09': 'آذر',
    '10': 'دی',
    '11': 'بهمن',
    '12': 'اسفند'
  }
};

const EN_TRANSLATIONS = {
  title: 'Offline Data Exchange & Merge Desk',
  subtitle: 'Bridges periodic files & secure information transfer between units',
  howItWorksTitle: 'How Offline File Synchronization Works (No Intranet Needed)',
  howItWorksDesc: 'If you cannot connect via the intranet server, use this tool to transfer registered records of the month from your unit to HR/Admin or management. The source exports a secure package, and the destination system merges them seamlessly without overwriting existing entries.',
  step1: '1. Export your periodic records to a file, and transfer it (via USB or email) to the destination unit.',
  step2: '2. The destination (HR/Manager) uploads the file to merge new entries and sync approval states.',
  exportTitle: 'Periodic Export & Archiving (To Send to Destination)',
  importTitle: 'Upload & Smart Merge Received Files',
  filterMonth: 'Filter by Period/Month:',
  filterDept: 'Filter by Reporting Unit:',
  filterStatus: 'Filter by Approval Status:',
  allMonths: 'All Periods (Entire History)',
  allDepts: 'All Departments (Entire Organization)',
  allStatuses: 'All Items (Pending & Approved)',
  pendingOnly: 'Pending Approvals Only',
  approvedOnly: 'Approved & Logged Only',
  violationCount: 'Matching Violations:',
  rewardCount: 'Matching Rewards:',
  employeesCount: 'Associated Personnel:',
  downloadButton: 'Download Offline Exchange File (.json)',
  dragDropText: 'Drag & drop the received sync file here, or click to browse',
  fileValidationTitle: 'Smart Sync File Analysis & Dry-Run',
  fileName: 'File Name:',
  fileSource: 'Originating Source:',
  fileDate: 'Exported Date:',
  newRecordsToAdd: 'New records to be appended:',
  recordsToUpdate: 'Existing records to update (offline status sync):',
  identicalRecords: 'Identical records (ignored/no changes):',
  confirmMergeBtn: 'Confirm & Apply Offline Merge',
  cancelMergeBtn: 'Cancel',
  mergeSuccessMsg: 'Offline data merged successfully and local databases updated!',
  mergeErrorMsg: 'The selected file is invalid or does not match the SafeWatch exchange schema.',
  historyTitle: 'Offline Sync & Import History Log',
  noHistory: 'No offline sync sessions registered yet.',
  clearHistory: 'Clear Sync Log',
  itemCountUnit: 'items',
  monthLabels: {} as any
};

export default function OfflineSyncModal({
  isOpen,
  onClose,
  settings,
  violations,
  rewards,
  employees,
  onMergeSuccess
}: OfflineSyncModalProps) {
  const isFa = settings.language === 'fa';
  const t = isFa ? FA_TRANSLATIONS : EN_TRANSLATIONS;

  // Filter States
  const [exportMonth, setExportMonth] = useState<string>('ALL'); // 'ALL' or 'YYYY-MM'
  const [exportDept, setExportDept] = useState<string>('ALL');
  const [exportStatus, setExportStatus] = useState<string>('ALL'); // 'ALL', 'PENDING', 'APPROVED'

  // Import Upload State
  const [importedFile, setImportedFile] = useState<SyncFilePayload | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [mergeAnalysis, setMergeAnalysis] = useState<{
    newViolations: Violation[];
    updateViolations: Violation[];
    identicalViolationsCount: number;
    newRewards: Reward[];
    updateRewards: Reward[];
    identicalRewardsCount: number;
    newEmployees: Employee[];
  } | null>(null);

  // Sync Log History
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);

  // Toast / Status Message
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Load Sync logs
    const saved = localStorage.getItem('sg_offline_sync_logs');
    if (saved) {
      try {
        setSyncLogs(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing offline sync logs:', e);
      }
    }
  }, []);

  const saveLogs = (updated: SyncLogEntry[]) => {
    setSyncLogs(updated);
    localStorage.setItem('sg_offline_sync_logs', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  // Extract unique Persian and Western months from existing records to populate month filter
  const getAvailablePeriods = () => {
    const periods = new Set<string>();
    
    const extractFromDate = (dateStr: string) => {
      // Expect YYYY/MM/DD or YYYY-MM-DD
      if (!dateStr) return;
      const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
      if (parts.length >= 2) {
        // e.g. "1403/04" or "2026-07"
        return `${parts[0]}/${parts[1]}`;
      }
    };

    violations.forEach(v => {
      const p = extractFromDate(v.date);
      if (p) periods.add(p);
    });

    rewards.forEach(r => {
      const p = extractFromDate(r.date);
      if (p) periods.add(p);
    });

    return Array.from(periods).sort().reverse();
  };

  const availablePeriods = getAvailablePeriods();

  // Filter Logic for Export Preview
  const getFilteredData = () => {
    let filteredViolations = [...violations];
    let filteredRewards = [...rewards];

    const matchPeriod = (dateStr: string, periodStr: string) => {
      if (periodStr === 'ALL') return true;
      if (!dateStr) return false;
      return dateStr.startsWith(periodStr);
    };

    // Filter by period
    filteredViolations = filteredViolations.filter(v => matchPeriod(v.date, exportMonth));
    filteredRewards = filteredRewards.filter(r => matchPeriod(r.date, exportMonth));

    // Filter by Reporting Unit (DepartmentSource)
    if (exportDept !== 'ALL') {
      filteredViolations = filteredViolations.filter(v => v.departmentSource === exportDept);
      filteredRewards = filteredRewards.filter(r => r.departmentSource === exportDept);
    }

    // Filter by Status
    if (exportStatus === 'PENDING') {
      filteredViolations = filteredViolations.filter(v => !v.isApproved);
      filteredRewards = filteredRewards.filter(r => !r.isApproved);
    } else if (exportStatus === 'APPROVED') {
      filteredViolations = filteredViolations.filter(v => v.isApproved);
      filteredRewards = filteredRewards.filter(r => r.isApproved);
    }

    // Find all employees associated with these filtered records to bundle them in the sync file
    const requiredEmpIds = new Set<string>();
    filteredViolations.forEach(v => requiredEmpIds.add(v.personnelId));
    filteredRewards.forEach(r => requiredEmpIds.add(r.personnelId));

    const filteredEmployees = employees.filter(e => requiredEmpIds.has(e.personnelId));

    return {
      violations: filteredViolations,
      rewards: filteredRewards,
      employees: filteredEmployees
    };
  };

  const { 
    violations: exportV, 
    rewards: exportR, 
    employees: exportE 
  } = getFilteredData();

  // Export File Download
  const handleExport = () => {
    try {
      const payload: SyncFilePayload = {
        version: '3.2.0',
        source: isFa ? 'واحد پایش محلی SafeWatch' : 'Local SafeWatch Node',
        exportDate: new Date().toISOString(),
        filterPeriod: exportMonth,
        filterDept: exportDept,
        violations: exportV,
        rewards: exportR,
        employees: exportE
      };

      const dateTag = new Date().toLocaleDateString(isFa ? 'fa-IR' : 'en-US')
        .replace(/\//g, '-');
      const filename = `SafeWatch_Sync_${exportMonth.replace(/\//g, '_')}_${dateTag}.json`;

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Add Export log
      const newLog: SyncLogEntry = {
        id: 'log_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        fileName: filename,
        actionType: 'EXPORT',
        period: exportMonth,
        violationsCount: exportV.length,
        rewardsCount: exportR.length,
        employeesCount: exportE.length
      };

      saveLogs([newLog, ...syncLogs]);
      showToast(isFa ? 'فایل همگام‌سازی با موفقیت آماده و دانلود شد.' : 'Sync file downloaded successfully!', 'success');
    } catch (e) {
      showToast(isFa ? 'خطا در خروجی گرفتن اطلاعات.' : 'Error generating export file.', 'error');
    }
  };

  const handleShare = async () => {
    try {
      const payload: SyncFilePayload = {
        version: '3.2.0',
        source: isFa ? 'واحد پایش محلی SafeWatch' : 'Local SafeWatch Node',
        exportDate: new Date().toISOString(),
        filterPeriod: exportMonth,
        filterDept: exportDept,
        violations: exportV,
        rewards: exportR,
        employees: exportE
      };

      const dateTag = new Date().toLocaleDateString(isFa ? 'fa-IR' : 'en-US')
        .replace(/\//g, '-');
      const filename = `SafeWatch_Sync_${exportMonth.replace(/\//g, '_')}_${dateTag}.json`;
      const jsonString = JSON.stringify(payload, null, 2);

      if (navigator.share) {
        const file = new File([jsonString], filename, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: isFa ? 'فایل همگام‌سازی SafeWatch' : 'SafeWatch Sync File',
            text: isFa ? 'فایل تبادل آفلاین اطلاعات جهت انتقال به سیستم مقصد' : 'Offline exchange file for system transfer'
          });
          showToast(isFa ? 'فایل تبادل با موفقیت به اشتراک گذاشته شد.' : 'Sync file shared successfully!', 'success');
        } else {
          await navigator.share({
            title: isFa ? 'فایل همگام‌سازی SafeWatch' : 'SafeWatch Sync File',
            text: jsonString
          });
          showToast(isFa ? 'داده‌ها به صورت متنی به اشتراک گذاشته شدند.' : 'Data shared as text successfully!', 'success');
        }

        // Add Share log
        const newLog: SyncLogEntry = {
          id: 'log_' + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          fileName: filename + ' (Shared)',
          actionType: 'EXPORT',
          period: exportMonth,
          violationsCount: exportV.length,
          rewardsCount: exportR.length,
          employeesCount: exportE.length
        };
        saveLogs([newLog, ...syncLogs]);
      } else {
        await navigator.clipboard.writeText(jsonString);
        showToast(isFa ? 'داده‌ها در حافظه موقت کپی شدند. دانلود خودکار فایل آغاز می‌شود...' : 'Data copied! Starting file download fallback...', 'success');
        handleExport();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        showToast(isFa ? `خطا در اشتراک‌گذاری: ${error.message}` : `Share failed: ${error.message}`, 'error');
      }
    }
  };

  // Import File Parsing & Smart Merge Analysis
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string) as SyncFilePayload;
        
        // Validation check
        if (!payload.version || (!Array.isArray(payload.violations) && !Array.isArray(payload.rewards))) {
          throw new Error("Invalid format");
        }

        setImportedFile(payload);
        analyzeMerge(payload);
      } catch (err) {
        showToast(t.mergeErrorMsg, 'error');
        setImportedFile(null);
        setMergeAnalysis(null);
      }
    };
    reader.readAsText(file);
  };

  // Compare incoming records with existing records to prepare precise preview of merge actions
  const analyzeMerge = (incoming: SyncFilePayload) => {
    const localViolationsMap = new Map<string, Violation>();
    violations.forEach(v => localViolationsMap.set(v.id, v));

    const localRewardsMap = new Map<string, Reward>();
    rewards.forEach(r => localRewardsMap.set(r.id, r));

    const localEmployeesMap = new Map<string, Employee>();
    employees.forEach(e => localEmployeesMap.set(e.personnelId, e));

    const newViolations: Violation[] = [];
    const updateViolations: Violation[] = [];
    let identicalViolationsCount = 0;

    const newRewards: Reward[] = [];
    const updateRewards: Reward[] = [];
    let identicalRewardsCount = 0;

    const newEmployees: Employee[] = [];

    // Analyze Violations
    (incoming.violations || []).forEach(incomingV => {
      const localV = localViolationsMap.get(incomingV.id);
      if (!localV) {
        newViolations.push(incomingV);
      } else {
        // Conflict / Status Change check
        const isApprovedChanged = localV.isApproved !== incomingV.isApproved;
        const isStatusChanged = localV.status !== incomingV.status;
        const isVStageChanged = localV.violationStage !== incomingV.violationStage;
        
        if (isApprovedChanged || isStatusChanged || isVStageChanged) {
          // If incoming is approved or stage is different, we merge/overwrite this specific record
          updateViolations.push(incomingV);
        } else {
          identicalViolationsCount++;
        }
      }
    });

    // Analyze Rewards
    (incoming.rewards || []).forEach(incomingR => {
      const localR = localRewardsMap.get(incomingR.id);
      if (!localR) {
        newRewards.push(incomingR);
      } else {
        const isApprovedChanged = localR.isApproved !== incomingR.isApproved;
        if (isApprovedChanged) {
          updateRewards.push(incomingR);
        } else {
          identicalRewardsCount++;
        }
      }
    });

    // Analyze Employees (Personnel)
    (incoming.employees || []).forEach(incomingE => {
      const localE = localEmployeesMap.get(incomingE.personnelId);
      if (!localE) {
        newEmployees.push(incomingE);
      }
    });

    setMergeAnalysis({
      newViolations,
      updateViolations,
      identicalViolationsCount,
      newRewards,
      updateRewards,
      identicalRewardsCount,
      newEmployees
    });
  };

  // Perform actual Database Merge and invoke parent callback
  const handleConfirmMerge = () => {
    if (!importedFile || !mergeAnalysis) return;

    try {
      const finalViolationsMap = new Map<string, Violation>();
      // Load current local records
      violations.forEach(v => finalViolationsMap.set(v.id, v));
      // Overwrite or append analyzed records
      mergeAnalysis.newViolations.forEach(v => finalViolationsMap.set(v.id, v));
      mergeAnalysis.updateViolations.forEach(v => finalViolationsMap.set(v.id, v));

      const finalRewardsMap = new Map<string, Reward>();
      rewards.forEach(r => finalRewardsMap.set(r.id, r));
      mergeAnalysis.newRewards.forEach(r => finalRewardsMap.set(r.id, r));
      mergeAnalysis.updateRewards.forEach(r => finalRewardsMap.set(r.id, r));

      const finalEmployeesMap = new Map<string, Employee>();
      employees.forEach(e => finalEmployeesMap.set(e.personnelId, e));
      mergeAnalysis.newEmployees.forEach(e => finalEmployeesMap.set(e.personnelId, e));

      const mergedV = Array.from(finalViolationsMap.values());
      const mergedR = Array.from(finalRewardsMap.values());
      const mergedE = Array.from(finalEmployeesMap.values());

      // Save to local storage
      localStorage.setItem('sg_violations', JSON.stringify(mergedV));
      localStorage.setItem('sg_rewards', JSON.stringify(mergedR));
      localStorage.setItem('sg_employees', JSON.stringify(mergedE));

      // Callback to root component to update memory state & Express server
      onMergeSuccess(mergedV, mergedR, mergedE);

      // Add Log entry
      const logId = 'log_' + Math.random().toString(36).substr(2, 9);
      const syncLog: SyncLogEntry = {
        id: logId,
        timestamp: new Date().toISOString(),
        fileName: importFileName,
        actionType: 'IMPORT',
        violationsCount: (importedFile.violations || []).length,
        rewardsCount: (importedFile.rewards || []).length,
        employeesCount: (importedFile.employees || []).length,
        newViolationsAdded: mergeAnalysis.newViolations.length,
        updatedViolations: mergeAnalysis.updateViolations.length,
        newRewardsAdded: mergeAnalysis.newRewards.length,
        updatedRewards: mergeAnalysis.updateRewards.length,
        newEmployeesAdded: mergeAnalysis.newEmployees.length
      };

      saveLogs([syncLog, ...syncLogs]);

      showToast(t.mergeSuccessMsg, 'success');

      // Clear Import State
      setImportedFile(null);
      setMergeAnalysis(null);
      setImportFileName('');
    } catch (e) {
      showToast(isFa ? 'خطا در حین ادغام آفلاین اطلاعات.' : 'Error during offline database merge.', 'error');
    }
  };

  const handleCancelMerge = () => {
    setImportedFile(null);
    setMergeAnalysis(null);
    setImportFileName('');
  };

  const handleClearHistory = () => {
    if (window.confirm(isFa ? 'آیا از پاکسازی گزارش همگام‌سازی‌ها مطمئن هستید؟' : 'Are you sure you want to clear sync logs?')) {
      saveLogs([]);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const getPersianMonthName = (periodStr: string) => {
    if (periodStr === 'ALL') return t.allMonths;
    // expect YYYY/MM
    const parts = periodStr.split('/');
    if (parts.length === 2) {
      const monthNum = parts[1];
      const monthLabel = t.monthLabels[monthNum] || monthNum;
      return `${monthLabel} ${parts[0]}`;
    }
    return periodStr;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 z-[100] animate-fade-in">
      <div 
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl relative max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Toast Notification inside modal */}
        {toast && (
          <div className={`absolute top-4 left-4 right-4 z-[110] p-3.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 shadow-lg transition-all animate-bounce ${
            toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm md:text-base leading-tight">
                {t.title}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {/* How it works info-card */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4.5 space-y-3">
            <h4 className="font-bold text-indigo-900 text-xs md:text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              {t.howItWorksTitle}
            </h4>
            <p className="text-[11.5px] text-indigo-950 leading-relaxed font-medium">
              {t.howItWorksDesc}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-700 font-semibold border-t border-indigo-100/50">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>{t.step1}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>{t.step2}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Box: Export periodic records */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="font-black text-gray-800 text-xs md:text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Download className="w-4.5 h-4.5 text-indigo-600" />
                  {t.exportTitle}
                </h4>

                {/* Export Filters */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">{t.filterMonth}</label>
                    <div className="relative">
                      <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select 
                        value={exportMonth}
                        onChange={(e) => setExportMonth(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pr-9 pl-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="ALL">{t.allMonths}</option>
                        {availablePeriods.map(p => (
                          <option key={p} value={p}>{getPersianMonthName(p)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">{t.filterDept}</label>
                    <div className="relative">
                      <Building className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select 
                        value={exportDept}
                        onChange={(e) => setExportDept(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pr-9 pl-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="ALL">{t.allDepts}</option>
                        <option value="HSE">HSE</option>
                        <option value="SECURITY">{isFa ? 'انتظامات و حراست' : 'Security'}</option>
                        <option value="ADMIN">{isFa ? 'اداری و پشتیبانی' : 'Admin'}</option>
                        <option value="HR">{isFa ? 'منابع انسانی' : 'HR'}</option>
                        <option value="TRAINING">{isFa ? 'آموزش' : 'Training'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">{t.filterStatus}</label>
                    <div className="relative">
                      <CheckCircle className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select 
                        value={exportStatus}
                        onChange={(e) => setExportStatus(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pr-9 pl-3 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 cursor-pointer"
                      >
                        <option value="ALL">{t.allStatuses}</option>
                        <option value="PENDING">{t.pendingOnly}</option>
                        <option value="APPROVED">{t.approvedOnly}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Match Preview Panel */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-xs font-semibold text-gray-600">
                  <div className="flex justify-between">
                    <span>{t.violationCount}</span>
                    <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded-md font-bold">{exportV.length} {t.itemCountUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.rewardCount}</span>
                    <span className="font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">{exportR.length} {t.itemCountUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.employeesCount}</span>
                    <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">{exportE.length} {isFa ? 'نفر' : 'persons'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex-grow bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white py-3 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Download className="w-4.5 h-4.5" />
                  <span>{t.downloadButton}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-3 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all shrink-0"
                  title={isFa ? 'اشتراک‌گذاری مستقیم (اندروید/پیامرسان‌ها/بلوتوث)' : 'Direct Share (Android/Messenger/Bluetooth)'}
                >
                  <Share2 className="w-4.5 h-4.5" />
                  <span>{isFa ? 'اشتراک‌گذاری' : 'Share'}</span>
                </button>
              </div>
            </div>

            {/* Right Box: Import & Smart Merge */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4 h-full flex flex-col">
                <h4 className="font-black text-gray-800 text-xs md:text-sm flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Upload className="w-4.5 h-4.5 text-indigo-600" />
                  {t.importTitle}
                </h4>

                {!importedFile ? (
                  // File Select Area
                  <label className="border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 bg-slate-50/50 hover:bg-indigo-50/10 cursor-pointer transition-all flex-grow min-h-60">
                    <div className="p-3 bg-white border border-gray-150 text-indigo-600 rounded-full shadow-xs animate-pulse">
                      <FileJson className="w-8 h-8" />
                    </div>
                    <span className="text-[11.5px] md:text-xs font-bold text-gray-700 max-w-xs leading-relaxed">
                      {t.dragDropText}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono font-medium">
                      JSON Sync Files (*.json)
                    </span>
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={handleImportFileSelect} 
                    />
                  </label>
                ) : (
                  // Validation & Analyze Dashboard before merge
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4.5 space-y-4 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="block text-xs font-black text-indigo-900 border-b border-slate-200 pb-1.5 mb-2 flex items-center gap-1.5">
                        <Database className="w-4.5 h-4.5 text-indigo-600" />
                        {t.fileValidationTitle}
                      </span>

                      <div className="space-y-2 text-[11px] text-gray-600 font-semibold mb-3 border-b border-dashed border-gray-200 pb-3">
                        <div className="flex justify-between">
                          <span>{t.fileName}</span>
                          <span className="font-mono text-gray-800 break-all text-right max-w-[200px] truncate">{importFileName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.fileSource}</span>
                          <span className="text-gray-800">{importedFile.source}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t.fileDate}</span>
                          <span className="font-mono text-gray-800">
                            {new Date(importedFile.exportDate).toLocaleString(isFa ? 'fa-IR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      {mergeAnalysis && (
                        <div className="space-y-2.5 text-xs font-bold">
                          <div className="flex items-start justify-between bg-emerald-50 text-emerald-850 p-2.5 rounded-xl border border-emerald-100">
                            <span className="flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              {t.newRecordsToAdd}
                            </span>
                            <span className="font-mono">
                              {mergeAnalysis.newViolations.length + mergeAnalysis.newRewards.length + mergeAnalysis.newEmployees.length} {t.itemCountUnit}
                            </span>
                          </div>

                          <div className="flex items-start justify-between bg-amber-50 text-amber-850 p-2.5 rounded-xl border border-amber-100">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              {t.recordsToUpdate}
                            </span>
                            <span className="font-mono">
                              {mergeAnalysis.updateViolations.length + mergeAnalysis.updateRewards.length} {t.itemCountUnit}
                            </span>
                          </div>

                          <div className="flex items-start justify-between bg-slate-100 text-slate-700 p-2.5 rounded-xl border border-slate-200/50">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                              {t.identicalRecords}
                            </span>
                            <span className="font-mono">
                              {mergeAnalysis.identicalViolationsCount + mergeAnalysis.identicalRewardsCount} {t.itemCountUnit}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleConfirmMerge}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-sm hover:shadow active:scale-98 transition-all"
                      >
                        {t.confirmMergeBtn}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelMerge}
                        className="bg-white border border-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-xl hover:bg-gray-50 active:scale-98 transition-all"
                      >
                        {t.cancelMergeBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync history logs list */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h4 className="font-black text-gray-800 text-xs md:text-sm flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-gray-500" />
                {t.historyTitle}
              </h4>
              {syncLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearHistory}</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {syncLogs.length === 0 ? (
                <div className="text-[11px] text-gray-400 py-6 text-center border border-dashed rounded-xl">
                  {t.noHistory}
                </div>
              ) : (
                syncLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleString(
                    isFa ? 'fa-IR' : 'en-US',
                    { dateStyle: 'medium', timeStyle: 'short' }
                  );
                  return (
                    <div 
                      key={log.id} 
                      className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-150 gap-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          log.actionType === 'IMPORT' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {log.actionType === 'IMPORT' ? <Upload className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[11.5px] font-bold text-gray-800 block">
                            {log.actionType === 'IMPORT' 
                              ? (isFa ? 'ادغام موفق فایل اطلاعات' : 'Successful File Merge')
                              : (isFa ? 'خروجی فایل دوره' : 'Periodic File Export')
                            }
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block max-w-sm truncate" title={log.fileName}>
                            {log.fileName}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        <span className="text-gray-500 font-mono">{dateStr}</span>
                        <div className="flex gap-1.5">
                          {log.violationsCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded">
                              {log.violationsCount} {isFa ? 'تخلف' : 'violations'}
                            </span>
                          )}
                          {log.rewardsCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
                              {log.rewardsCount} {isFa ? 'تشویق' : 'rewards'}
                            </span>
                          )}
                          {log.employeesCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded">
                              {log.employeesCount} {isFa ? 'پرسنل' : 'staff'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
