import React, { useMemo } from 'react';
import { Violation, Reward, User, AppSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { X, User as UserIcon, Shield, Activity, TrendingUp, TrendingDown, AlertTriangle, Briefcase, GraduationCap, Gavel, FileText } from 'lucide-react';

interface PersonnelProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnelId: string;
  violations: Violation[];
  rewards: Reward[];
  settings: AppSettings;
}

const PersonnelProfileModal: React.FC<PersonnelProfileModalProps> = ({ 
  isOpen, onClose, personnelId, violations, rewards, settings 
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[settings.language];

  // Aggregate Data
  const userViolations = violations.filter(v => v.personnelId === personnelId);
  const userRewards = rewards.filter(r => r.personnelId === personnelId);
  
  // Assuming basic info comes from the first record found (in a real app, fetch from User DB)
  const basicInfo = userViolations[0] || userRewards[0] || { employeeName: 'N/A', department: 'N/A', personnelId };

  // Calculate Score (Base 100)
  const startScore = 100;
  const violationScore = userViolations.reduce((acc, v) => acc + (v.score || 0), 0); // scores are negative
  const rewardScore = userRewards.reduce((acc, r) => acc + (r.score || 0), 0);
  const totalScore = startScore + violationScore + rewardScore;

  // Determine Status based on Score
  let status = { text: t.status_Good, color: 'text-blue-600', bg: 'bg-blue-100', icon: <Activity /> };
  if (totalScore >= 120) status = { text: t.status_Excellent, color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <TrendingUp /> };
  else if (totalScore < 70 && totalScore >= 50) status = { text: t.status_Warning, color: 'text-orange-600', bg: 'bg-orange-100', icon: <AlertTriangle /> };
  else if (totalScore < 50 && totalScore >= 20) status = { text: t.status_Danger, color: 'text-red-600', bg: 'bg-red-100', icon: <Gavel /> };
  else if (totalScore < 20) status = { text: t.status_Critical, color: 'text-red-800', bg: 'bg-red-200', icon: <X /> };

  // Group by Dept
  const byDept = (dept: string) => ({
    v: userViolations.filter(v => v.departmentSource === dept),
    r: userRewards.filter(r => r.departmentSource === dept)
  });

  const hseData = byDept('HSE');
  const secData = byDept('SECURITY');
  const trnData = byDept('TRAINING');
  const admData = byDept('ADMIN');

  const renderSection = (title: string, icon: React.ReactNode, data: {v: Violation[], r: Reward[]}, colorClass: string) => {
    if (data.v.length === 0 && data.r.length === 0) return null;
    return (
      <div className={`mb-4 rounded-xl border border-gray-200 overflow-hidden`}>
        <div className={`px-4 py-2 ${colorClass} flex justify-between items-center`}>
            <div className="flex items-center gap-2 font-bold text-sm md:text-base">
                {icon} {title}
            </div>
            <span className="text-xs bg-white/30 px-2 py-0.5 rounded text-black/70 font-mono">
                {data.v.length} {t.violations} / {data.r.length} {t.rewards}
            </span>
        </div>
        <div className="p-3 space-y-2 bg-white">
            {data.v.map(v => (
                <div key={v.id} className="flex justify-between items-center text-xs md:text-sm p-2 bg-red-50 rounded border-r-2 border-red-400">
                    <span>{v.violationType}</span>
                    <div className="flex items-center gap-2">
                         <span className="text-red-600 font-bold ltr">{v.score}</span>
                         <span className="text-gray-500 text-[10px]">{v.date}</span>
                    </div>
                </div>
            ))}
            {data.r.map(r => (
                <div key={r.id} className="flex justify-between items-center text-xs md:text-sm p-2 bg-emerald-50 rounded border-r-2 border-emerald-400">
                     <span>{(t as any)[`type_${r.rewardType}`] || r.rewardType}</span>
                     <div className="flex items-center gap-2">
                         <span className="text-emerald-600 font-bold ltr">+{r.score}</span>
                         <span className="text-gray-500 text-[10px]">{r.date}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-0 md:p-4 animate-in fade-in zoom-in-95 duration-200" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="bg-gray-50 w-full md:max-w-4xl h-full md:h-[85vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-indigo-900 text-white p-4 md:p-6 flex justify-between items-start shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                    <UserIcon className="w-8 h-8 md:w-9 md:h-9" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black">{basicInfo.employeeName}</h2>
                    <div className="flex gap-4 text-indigo-200 text-xs md:text-sm mt-1">
                        <span>{t.personnelId}: {basicInfo.personnelId}</span>
                        <span>{t.department}: {basicInfo.department}</span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
            
            {/* Score Card */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-6 items-center justify-between">
                 <div className="flex flex-col items-center justify-center w-full md:w-auto">
                      <div className={`text-4xl md:text-5xl font-black ${totalScore < 50 ? 'text-red-600' : totalScore > 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {totalScore}
                      </div>
                      <span className="text-gray-400 text-xs uppercase tracking-widest mt-1">{t.totalScore}</span>
                 </div>
                 
                 <div className="h-px w-full md:w-px md:h-16 bg-gray-200"></div>

                 <div className="flex-1 w-full">
                     <div className={`flex items-center gap-3 p-3 rounded-xl ${status.bg} border border-transparent`}>
                        <div className={`p-2 bg-white rounded-lg shadow-sm ${status.color}`}>
                            {status.icon}
                        </div>
                        <div>
                            <div className={`font-bold ${status.color}`}>{t.riskStatus}: {status.text}</div>
                            <p className="text-xs text-gray-600 mt-0.5 opacity-80">
                                {totalScore < 50 ? "نیاز به اقدام فوری انضباطی" : "وضعیت نرمال"}
                            </p>
                        </div>
                     </div>
                 </div>
            </div>

            {/* Department Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSection(t.dept_HSE, <Shield className="w-4 h-4" />, hseData, "bg-orange-100 text-orange-800")}
                {renderSection(t.dept_SECURITY, <AlertTriangle className="w-4 h-4" />, secData, "bg-slate-200 text-slate-800")}
                {renderSection(t.dept_TRAINING, <GraduationCap className="w-4 h-4" />, trnData, "bg-blue-100 text-blue-800")}
                {renderSection(t.dept_ADMIN, <Briefcase className="w-4 h-4" />, admData, "bg-purple-100 text-purple-800")}
            </div>

            {userViolations.length === 0 && userRewards.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>هیچ سابقه‌ای برای این پرسنل ثبت نشده است.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PersonnelProfileModal;