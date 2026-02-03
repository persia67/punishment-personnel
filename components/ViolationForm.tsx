import React, { useState, useEffect } from 'react';
import { Violation, Severity, User, Department, Employee, CodeItem } from '../types';
import { X, Camera, AlertOctagon, CheckSquare, Square, UserCheck, Search, Filter } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface ViolationFormProps {
  existingViolations: Violation[];
  employees: Employee[];
  onClose: () => void;
  onSubmit: (violation: Violation) => void;
  currentUser: User;
  codes: CodeItem[];
}

const ViolationForm: React.FC<ViolationFormProps> = ({ existingViolations, employees, onClose, onSubmit, currentUser, codes }) => {
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
      return 'HSE'; // Default for global users
  };

  const [sourceDept, setSourceDept] = useState<string>(getInitialDept());

  // Filter available codes based on the selected Department
  const availableCodes = codes.filter(c => c.department === sourceDept);

  // Get unique departments from codes for the dropdown (plus standard ones)
  const availableDepartments = Array.from(new Set([
      'HSE', 'SECURITY', 'TRAINING', 'ADMIN', 
      ...codes.map(c => c.department)
  ]));

  const [formData, setFormData] = useState<Partial<Violation>>({
    severity: Severity.MEDIUM,
    status: 'Pending',
    date: new Date().toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US'),
    penaltyActions: [],
    violationStage: 1,
    isApproved: false, 
    reporterName: currentUser.fullName,
    departmentSource: sourceDept
  });

  const [selectedCode, setSelectedCode] = useState<number | null>(null);

  // Update formData when sourceDept changes
  useEffect(() => {
      setFormData(prev => ({ ...prev, departmentSource: sourceDept }));
      setSelectedCode(null); // Reset selection when switching dept
  }, [sourceDept]);

  // Auto-calculate stage
  useEffect(() => {
    if (formData.personnelId && formData.personnelId.length >= 3) {
      const historyCount = existingViolations.filter(v => v.personnelId === formData.personnelId && v.isApproved).length;
      const newStage = Math.min(historyCount + 1, 3);
      setFormData(prev => ({ ...prev, violationStage: newStage }));
    }
  }, [formData.personnelId, existingViolations]);

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

  const handleCodeSelect = (codeId: number) => {
      setSelectedCode(codeId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.personnelId || !formData.department || !selectedCode) {
        alert(t.requiredFields);
        return;
    }

    const codeObj = codes.find(c => c.code === selectedCode);
    if (!codeObj) return;

    const newViolation: Violation = {
      id: `V-${Math.floor(Math.random() * 10000)}`,
      employeeName: formData.employeeName!,
      personnelId: formData.personnelId!,
      department: formData.department!,
      departmentSource: sourceDept,
      reporterName: formData.reporterName!, 
      date: formData.date || '1402/01/01',
      violationType: codeObj.label,
      violationCode: codeObj.code,
      score: codeObj.score,
      description: formData.description || '',
      severity: formData.severity as Severity,
      penaltyActions: formData.penaltyActions || [],
      violationStage: formData.violationStage || 1,
      evidence: formData.evidence,
      status: 'Pending',
      isApproved: false 
    };

    onSubmit(newViolation);
    onClose();
  };

  const handlePenaltyChange = (option: string) => {
    const current = formData.penaltyActions || [];
    if (current.includes(option)) {
      setFormData({ ...formData, penaltyActions: current.filter(p => p !== option) });
    } else {
      setFormData({ ...formData, penaltyActions: [...current, option] });
    }
  };

  return (
    <div className="fixed inset-0 bg-white md:bg-black/50 md:backdrop-blur-sm flex items-center justify-center z-50 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white md:rounded-2xl shadow-none md:shadow-2xl w-full md:max-w-3xl flex flex-col h-full md:h-auto md:max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0 bg-red-50 md:bg-white md:rounded-t-2xl">
          <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">{t.newViolation}</h2>
              {isGlobalUser ? (
                  <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">واحد گزارش دهنده:</span>
                      <select 
                        value={sourceDept} 
                        onChange={(e) => setSourceDept(e.target.value)}
                        className="text-xs font-bold text-red-600 bg-transparent border-b border-red-200 focus:outline-none cursor-pointer"
                      >
                          {availableDepartments.map(dept => (
                              <option key={dept} value={dept}>{(t as any)[`dept_${dept}`] || dept}</option>
                          ))}
                      </select>
                  </div>
              ) : (
                <p className="text-xs text-red-600 mt-1 font-bold">واحد: {sourceDept === 'HSE' ? (t as any)[`dept_${sourceDept}`] : sourceDept}</p>
              )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          
          {/* Warning Badge */}
          {formData.violationStage && formData.violationStage > 1 && (
            <div className={`p-3 md:p-4 rounded-xl flex items-start gap-3 ${formData.violationStage === 3 ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}>
              <AlertOctagon className="w-5 h-5 md:w-6 md:h-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">{t.warningStage} {formData.violationStage}</h4>
                <p className="text-xs mt-1">{t.historyAlert}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="relative">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.personnelId} *</label>
              <div className="relative">
                  <input
                    required
                    type="text"
                    value={formData.personnelId || ''}
                    className="w-full px-3 py-2.5 pl-9 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    onChange={handlePersonnelIdChange}
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 md:top-3" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">با وارد کردن کد، نام و واحد پر می‌شود.</p>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.fullName} *</label>
              <input
                required
                type="text"
                value={formData.employeeName || ''}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-gray-50"
                onChange={e => setFormData({...formData, employeeName: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.department} *</label>
              <input
                required
                type="text"
                value={formData.department || ''}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-gray-50"
                onChange={e => setFormData({...formData, department: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.severity}</label>
              <select 
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                onChange={e => setFormData({...formData, severity: e.target.value as Severity})}
                defaultValue={Severity.MEDIUM}
              >
                <option value={Severity.LOW}>{t.severity_Low}</option>
                <option value={Severity.MEDIUM}>{t.severity_Medium}</option>
                <option value={Severity.HIGH}>{t.severity_High}</option>
                <option value={Severity.CRITICAL}>{t.severity_Critical}</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                 <label className="block text-xs md:text-sm font-medium text-gray-700">{t.violationType} *</label>
                 <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                     نمایش کدهای واحد: {(t as any)[`dept_${sourceDept}`] || sourceDept}
                 </span>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-3 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50">
              {availableCodes.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">هیچ کدی برای واحد {sourceDept} تعریف نشده است.</p>
              ) : availableCodes.map((codeItem) => (
                <div 
                  key={codeItem.id} 
                  onClick={() => handleCodeSelect(codeItem.code)}
                  className={`flex items-start p-2 md:p-3 rounded-lg border cursor-pointer transition-all select-none active:scale-[0.99] ${selectedCode === codeItem.code ? 'bg-red-50 border-red-300 text-red-900 ring-1 ring-red-300' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                >
                   {selectedCode === codeItem.code ? 
                      <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-red-600 ml-2 shrink-0 mt-0.5" /> : 
                      <Square className="w-4 h-4 md:w-5 md:h-5 text-gray-300 ml-2 shrink-0 mt-0.5" />
                   }
                   <div className="flex-1">
                       <div className="flex justify-between items-center mb-1">
                           <span className="text-xs md:text-sm font-bold">{codeItem.label}</span>
                           <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-mono">#{codeItem.code}</span>
                       </div>
                       <div className="text-[10px] text-red-500 font-bold">امتیاز منفی: {codeItem.score}</div>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">{t.penaltyActions}</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-2">
               {t.penaltyList.map((option) => (
                 <label key={option} className={`flex items-center p-2 md:p-3 rounded-lg border cursor-pointer transition-all active:scale-95 ${formData.penaltyActions?.includes(option) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                   <input
                     type="checkbox"
                     checked={formData.penaltyActions?.includes(option)}
                     onChange={() => handlePenaltyChange(option)}
                     className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 ml-2"
                   />
                   <span className="text-xs md:text-sm select-none">{option}</span>
                 </label>
               ))}
             </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">{t.description}</label>
            <textarea
              className="w-full px-3 py-2 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all h-20 md:h-24 resize-none"
              placeholder="..."
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 md:pt-4 border-t border-gray-100 mt-auto shrink-0 pb-safe">
            <button type="button" onClick={onClose} className="px-4 py-2.5 md:px-6 md:py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2.5 md:px-6 md:py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-lg shadow-red-200 transition-all active:scale-95">
              {t.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ViolationForm;