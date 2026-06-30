import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Employee, AppSettings } from '../types';

interface ManualEmployeeFormProps {
  settings: AppSettings;
  employees: Employee[];
  onAddEmployee: (newEmp: Employee) => void;
}

export const ManualEmployeeForm: React.FC<ManualEmployeeFormProps> = ({
  settings,
  employees,
  onAddEmployee
}) => {
  const [empFormData, setEmpFormData] = useState({
    personnelId: '',
    fullName: '',
    nationalId: '',
    department: '',
    hireDate: '',
    jobTitle: '',
    phoneNumber: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFormData.personnelId || !empFormData.fullName || !empFormData.department) {
      alert(
        settings.language === 'fa'
          ? 'لطفا کد پرسنلی، نام پرسنل و واحد را وارد کنید.'
          : 'Please enter Personnel ID, Name, and Department.'
      );
      return;
    }

    const trimmedPId = empFormData.personnelId.trim();
    // Check duplicate
    const exists = employees.some(emp => emp.personnelId === trimmedPId);
    if (exists) {
      alert(
        settings.language === 'fa'
          ? 'کد پرسنلی وارد شده از قبل وجود دارد!'
          : 'Personnel ID already exists!'
      );
      return;
    }

    const newEmp: Employee = {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      personnelId: trimmedPId,
      fullName: empFormData.fullName.trim(),
      nationalId: empFormData.nationalId.trim() || undefined,
      department: empFormData.department.trim(),
      hireDate: empFormData.hireDate.trim() || undefined,
      jobTitle: empFormData.jobTitle.trim() || undefined,
      phoneNumber: empFormData.phoneNumber.trim() || undefined
    };

    onAddEmployee(newEmp);

    // Reset form
    setEmpFormData({
      personnelId: '',
      fullName: '',
      nationalId: '',
      department: '',
      hireDate: '',
      jobTitle: '',
      phoneNumber: ''
    });

    alert(
      settings.language === 'fa'
        ? 'پرسنل جدید با موفقیت ثبت شد.'
        : 'Personnel successfully logged.'
    );
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-150 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
      <span className="block text-xs font-black text-gray-700 flex items-center gap-1">
        <UserPlus className="w-4 h-4 text-indigo-500" />
        {settings.language === 'fa' ? 'ثبت و تعریف دستی پرسنل جدید' : 'Manually Enroll New Personnel'}
      </span>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'کد پرسنلی (اجباری)' : 'Personnel ID (Required)'}
          </label>
          <input
            type="text"
            placeholder="e.g. 1003"
            value={empFormData.personnelId}
            onChange={e => setEmpFormData({ ...empFormData, personnelId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'نام و نام خانوادگی (اجباری)' : 'Full Name (Required)'}
          </label>
          <input
            type="text"
            placeholder="e.g. علی عباسی"
            value={empFormData.fullName}
            onChange={e => setEmpFormData({ ...empFormData, fullName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'کد ملی' : 'National ID'}
          </label>
          <input
            type="text"
            maxLength={10}
            placeholder="e.g. 0012345678"
            value={empFormData.nationalId}
            onChange={e => setEmpFormData({ ...empFormData, nationalId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'بخش / واحد (اجباری)' : 'Department (Required)'}
          </label>
          <input
            type="text"
            placeholder="e.g. تولید, انبار, HSE"
            value={empFormData.department}
            onChange={e => setEmpFormData({ ...empFormData, department: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'سمت سازمانی (اختیاری)' : 'Job Title (Optional)'}
          </label>
          <input
            type="text"
            placeholder="e.g. اپراتور"
            value={empFormData.jobTitle}
            onChange={e => setEmpFormData({ ...empFormData, jobTitle: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'تاریخ شروع به کار (اختیاری)' : 'Start Hire Date (Optional)'}
          </label>
          <input
            type="text"
            placeholder="e.g. 1402/06/20"
            value={empFormData.hireDate}
            onChange={e => setEmpFormData({ ...empFormData, hireDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'شماره همراه جهت پیامک (اختیاری)' : 'SMS Mobile for Notifications (Optional)'}
          </label>
          <input
            type="text"
            placeholder="e.g. 09123456789"
            value={empFormData.phoneNumber}
            onChange={e => setEmpFormData({ ...empFormData, phoneNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 font-sans leading-none"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{settings.language === 'fa' ? 'تعریف پرسنل جدید' : 'Enroll Personnel'}</span>
        </button>
      </div>
    </form>
  );
};
