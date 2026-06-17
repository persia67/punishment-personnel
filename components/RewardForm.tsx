import React, { useState, useEffect } from 'react';
import { Reward, User, RewardType, Department, Employee, CodeItem } from '../types';
import { X, Camera, UserCheck, Medal, Star, ShieldCheck, HardHat, Zap, Briefcase, Search } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface RewardFormProps {
  onClose: () => void;
  onSubmit: (reward: Reward) => void;
  currentUser: User;
  employees: Employee[];
  codes: CodeItem[];
}

const RewardForm: React.FC<RewardFormProps> = ({ onClose, onSubmit, currentUser, employees, codes }) => {
  const lang = document.documentElement.dir === 'rtl' ? 'fa' : 'en';
  const t = TRANSLATIONS[lang];

  // Check if user is Global Admin
  const isGlobalUser = ['DEVELOPER', 'PLANT_MANAGER', 'HR_MANAGER'].includes(currentUser.role);

  // Determine initial Source Dept
  const getInitialDept = (): string => {
      if (currentUser.role === 'SECURITY_MANAGER') return 'SECURITY';
      if (currentUser.role === 'TRAINING_MANAGER') return 'TRAINING';
      if (currentUser.role === 'ADMIN_STAFF') return 'ADMIN';
      if (currentUser.role === 'DEPARTMENT_MANAGER' && currentUser.managedDepartment) return currentUser.managedDepartment;
      return 'HSE'; // Default
  };

  const [sourceDept, setSourceDept] = useState<string>(getInitialDept());

  const availableCodes = codes.filter(c => c.department === sourceDept);

  const availableDepartments = Array.from(new Set([
      'HSE', 'SECURITY', 'TRAINING', 'ADMIN', 
      ...codes.map(c => c.department)
  ]));

  const [formData, setFormData] = useState<Partial<Reward>>({
    rewardType: 'SafetyPrinciples',
    date: new Date().toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US'),
    rewardsGiven: [],
    isApproved: false, 
    reporterName: currentUser.fullName,
    departmentSource: sourceDept
  });

  const [selectedCode, setSelectedCode] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
      setFormData(prev => ({ ...prev, departmentSource: sourceDept }));
      setSelectedCode(null);
  }, [sourceDept]);

  const handlePersonnelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFormData(prev => ({ ...prev, personnelId: val }));
      
      // Auto-Fill Logic
      const foundEmployee = employees.find(emp => emp.personnelId === val);
      if (foundEmployee) {
          setFormData(prev => ({
              ...prev,
              personnelId: val,
              employeeName: foundEmployee.fullName,
              department: foundEmployee.department
          }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.personnelId || !formData.department || !selectedCode) {
        alert(t.requiredFields);
        return;
    }

    const codeObj = codes.find(c => c.code === selectedCode);
    if (!codeObj) return;

    const newReward: Reward = {
      id: `R-${Math.floor(Math.random() * 10000)}`,
      employeeName: formData.employeeName!,
      personnelId: formData.personnelId!,
      department: formData.department!,
      departmentSource: sourceDept,
      reporterName: formData.reporterName!, 
      date: formData.date || '1403/02/01',
      rewardType: 'Other', // Simplified for internal logic, label comes from code
      rewardCode: codeObj.code,
      score: codeObj.score,
      description: formData.description || '',
      rewardsGiven: formData.rewardsGiven || [],
      isApproved: false 
    };

    onSubmit(newReward);
    setIsSuccess(true);
  };

  const handleRewardChange = (option: string) => {
    const current = formData.rewardsGiven || [];
    if (current.includes(option)) {
      setFormData({ ...formData, rewardsGiven: current.filter(p => p !== option) });
    } else {
      setFormData({ ...formData, rewardsGiven: [...current, option] });
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-white md:bg-black/50 md:backdrop-blur-sm flex items-center justify-center z-50 md:p-4 animate-in fade-in duration-200">
        <div className="bg-white md:rounded-2xl shadow-none md:shadow-2xl w-full md:max-w-md p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-105 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-650 text-emerald-600 mb-4 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
            {lang === 'fa' ? 'ثبت تشویقی با موفقیت انجام شد' : 'Reward Logged'}
          </h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {lang === 'fa' 
              ? 'گزارش تشویقی ثبت اولیه گردید و برای بررسی و تایید در پرونده، به میز کار مسئول مربوطه ارسال شد.' 
              : 'The reward record was logged as preliminary and routed to the corresponding manager\'s workspace for final approval and insertion to file.'}
          </p>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full py-3 px-4 text-white font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
          >
            {lang === 'fa' ? 'متوجه شدم' : 'Got it'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white md:bg-black/50 md:backdrop-blur-sm flex items-center justify-center z-50 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white md:rounded-2xl shadow-none md:shadow-2xl w-full md:max-w-3xl flex flex-col h-full md:h-auto md:max-h-[90vh] border-t-0 md:border-t-4 border-emerald-500">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-100 bg-emerald-50/50 shrink-0">
          <div>
              <h2 className="text-lg md:text-xl font-bold text-emerald-800 flex items-center gap-2">
                <Medal className="w-5 h-5 md:w-6 md:h-6" />
                {t.newReward}
              </h2>
               {isGlobalUser ? (
                  <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">واحد گزارش دهنده:</span>
                      <select 
                        value={sourceDept} 
                        onChange={(e) => setSourceDept(e.target.value)}
                        className="text-xs font-bold text-emerald-600 bg-transparent border-b border-emerald-200 focus:outline-none cursor-pointer"
                      >
                          {availableDepartments.map(dept => (
                              <option key={dept} value={dept}>{(t as any)[`dept_${dept}`] || dept}</option>
                          ))}
                      </select>
                  </div>
              ) : (
                <p className="text-xs text-emerald-600 mt-1 font-bold">واحد: {sourceDept === 'HSE' ? (t as any)[`dept_${sourceDept}`] : sourceDept}</p>
              )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="bg-emerald-50 p-3 md:p-4 rounded-xl border border-emerald-100">
             <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <label className="text-xs md:text-sm font-bold text-emerald-800">{t.reporterInfo}</label>
             </div>
             <input
                required
                readOnly
                type="text"
                value={formData.reporterName}
                className="w-full px-3 py-2 text-base md:text-sm border border-emerald-200 rounded-lg bg-white text-gray-600 outline-none"
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="relative">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.personnelId} *</label>
              <div className="relative">
                <input
                    required
                    type="text"
                    value={formData.personnelId || ''}
                    className="w-full px-3 py-2.5 pl-9 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    onChange={handlePersonnelIdChange}
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 md:top-3" />
              </div>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.fullName} *</label>
              <input
                required
                type="text"
                value={formData.employeeName || ''}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50"
                onChange={e => setFormData({...formData, employeeName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.department} *</label>
              <input
                required
                type="text"
                value={formData.department || ''}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50"
                onChange={e => setFormData({...formData, department: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.date}</label>
              <input
                type="text"
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg outline-none"
                defaultValue={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                 <label className="block text-xs md:text-sm font-medium text-gray-700">{t.rewardReason}</label>
                 <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                     نمایش کدهای واحد: {(t as any)[`dept_${sourceDept}`] || sourceDept}
                 </span>
            </div>
             <div className="grid grid-cols-1 gap-2 md:gap-3">
                {availableCodes.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm">کدی برای این واحد تعریف نشده است.</p>
                ) : availableCodes.map((codeItem) => (
                  <label key={codeItem.id} className={`flex items-center p-2 md:p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${selectedCode === codeItem.code ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                    <input 
                        type="radio" 
                        name="rewardCode" 
                        className="hidden" 
                        checked={selectedCode === codeItem.code}
                        onChange={() => setSelectedCode(codeItem.code)}
                    />
                    <div className="flex-1 flex justify-between items-center">
                        <span className="text-xs md:text-sm font-bold text-gray-700">{codeItem.label}</span>
                        <span className="text-emerald-600 font-bold text-xs">+{codeItem.score}</span>
                    </div>
                  </label>
                ))}
             </div>
          </div>

          <div>
             <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">{t.rewardActions}</label>
             <div className="flex flex-wrap gap-2">
               {t.rewardList.map((option) => (
                 <label key={option} className={`flex items-center px-3 py-1.5 md:px-4 md:py-2 rounded-full border cursor-pointer transition-all active:scale-95 ${formData.rewardsGiven?.includes(option) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                   <input
                     type="checkbox"
                     className="hidden"
                     checked={formData.rewardsGiven?.includes(option)}
                     onChange={() => handleRewardChange(option)}
                   />
                   <span className="text-[10px] md:text-xs font-medium">{option}</span>
                 </label>
               ))}
             </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">{t.positiveAction}</label>
            <textarea
              className="w-full px-3 py-2 text-base md:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none h-20 md:h-24 resize-none"
              placeholder="..."
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 md:pt-4 border-t border-gray-100 mt-auto shrink-0 pb-safe">
            <button type="button" onClick={onClose} className="px-4 py-2.5 md:px-6 md:py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium active:bg-gray-200">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2.5 md:px-6 md:py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-lg shadow-emerald-200 active:scale-95 transition-transform">
              {t.submitReward}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RewardForm;