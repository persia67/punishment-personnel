import React from 'react';
import { X, Sparkles, Phone, Layers, RefreshCw, Milestone, Shield } from 'lucide-react';
import { AppSettings } from '../types';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, settings }) => {
  if (!isOpen) return null;

  const isFa = settings.language === 'fa';

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" 
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
        
        {/* Modal Header */}
        <div className="p-5 flex justify-between items-center text-white bg-linear-to-r from-indigo-700 to-indigo-900 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-lg"></div>
          <div className="flex items-center gap-2.5 relative z-10">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <div>
              <h3 className="font-black text-sm md:text-base leading-tight">
                {isFa ? 'آخرین تغییرات و ویژگی‌های جدید' : 'Latest Features & Changelog'}
              </h3>
              <p className="text-[10px] text-indigo-200 font-mono mt-0.5">
                {isFa ? 'نسخه فعلی: v4.11.0' : 'Current Version: v4.11.0'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex gap-3">
            <Milestone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed font-medium">
              {isFa ? (
                <p>
                  در نسخه <strong>v4.11.0</strong>، نقش‌های جدید سازمانی تفکیک شدند (مسئول و نگهبان انتظامات، مسئول واحد آموزش)، کارتابل اختصاصی انتظامات و تأیید مستقیم آموزش فعال شد، و سیستم ورود سریع با انتخاب واحد پیش‌فرض به صفحه ورود افزوده شد.
                </p>
              ) : (
                <p>
                  In version <strong>v4.11.0</strong>, dedicated organizational roles were introduced (Security Manager, Security Guard, Training Manager), dedicated approval routing was added, and unit-filtered quick login customization was integrated.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Feature 1: Roles & Permissions */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۱. تفکیک دقیق نقش‌های سازمانی در انتظامات و آموزش' : '1. Granular Role Separation for Security & Training'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      افزوده شدن نقش‌های <strong>مسئول واحد انتظامات</strong>، <strong>نگهبان یا نیروی انتظامات</strong> و <strong>مسئول واحد آموزش</strong> به همراه دسترسی‌های مدیریتی و فرم‌های ثبت پرسنل.
                    </>
                  ) : (
                    <>
                      Added dedicated roles for <strong>Security Unit Manager</strong>, <strong>Security Guard</strong>, and <strong>Training Unit Manager</strong> across user administration and employee records.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Feature 2: Approvals & Workflow */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <RefreshCw className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۲. گردش‌کار کارتابل انتظامات و تایید خودکار آموزش' : '2. Security Approval Inbox & Training Direct Approval'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      گزارش‌های ثبت‌شده توسط نگهبان به کارتابل مسئول انتظامات ارسال شده و با تایید وی نهایی می‌شوند. همچنین برای مسئول آموزش فرآیند ثبت و تایید یکپارچه و مستقیم اعمال می‌گردد.
                    </>
                  ) : (
                    <>
                      Guard submissions are routed to the Security Manager inbox for review and approval, while Training entries support direct, auto-approved execution.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Feature 3: Login Customization */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Phone className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۳. ورود سریع و تنظیم واحد پیش‌فرض در صفحه لاگین' : '3. Quick Login & Default Department Customization'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      امکان تعیین واحد پیش‌فرض در تنظیمات برای سیستم‌های مستقر در هر بخش و نمایش کارت‌های ورود سریع با دسته‌بندی و فیلتر واحدها در پایین صفحه ورود.
                    </>
                  ) : (
                    <>
                      Configurable default department for kiosk/unit devices and interactive unit-filtered quick login cards on the login screen.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-bold text-gray-600">HSE Safewatch & Reward AI</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {isFa ? 'متوجه شدم' : 'Got it'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChangelogModal;
