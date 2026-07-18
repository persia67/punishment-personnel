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
                {isFa ? 'نسخه فعلی: v4.5.0' : 'Current Version: v4.5.0'}
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
                  در نسخه <strong>v4.5.0</strong>، آیکون و نشان تجاری جدید و اختصاصی سازمان به‌صورت کامل در تمامی ساختارها، فایل‌های نصبی، فایل‌های اجرایی نهایی و پرتال وب یکپارچه‌سازی شده است. همچنین پایداری کلی ماژول‌ها ارتقا یافته است.
                </p>
              ) : (
                <p>
                  In version <strong>v4.5.0</strong>, the brand new custom organization icon has been fully integrated across all platforms, installer packages, standalone executables, and web portals, ensuring visual consistency alongside overall module stability.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Feature 1: Sub-departments */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۱. تلفیق و توسعه همه‌جانبه واحدها (دپارتمان‌ها)' : '1. Comprehensive Redesign & Expansion of Departments'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      اضافه شدن واحد‌های جدید شامل <strong>انتظامات</strong>، زیرمجموعه‌های واحد <strong>فنی</strong> (جوشکاری، نقاشی، ماشین‌سازی، CNC، هیدرولیک) و زیرمجموعه‌های واحد <strong>تولید</strong> (اسیدشویی، نورد سرد، گالوانیزه، شیت‌کن، خط رنگی) جهت دسته‌بندی و گزارش‌گیری دقیق‌تر پرسنل.
                    </>
                  ) : (
                    <>
                      Added new departments including <strong>Security (انتظامات)</strong>, and sub-departments for <strong>Technical</strong> (Welding, Painting, Machine Building, CNC, Hydraulics) and <strong>Production</strong> (Pickling, Cold Rolling, Galvanizing, Sheet Shearing, Color Line) for precise categorizations.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Feature 2: Excel Mobile Number */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Phone className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۲. اضافه شدن فیلد شماره همراه به الگوی اکسل' : '2. Dedicated Phone Number in Excel Template'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      قالب دانلودی فایل الگو اکسل پرسنل و ماژول ورود گروهی اطلاعات اصلاح گردید و ستون اختصاصی <strong>شماره همراه (PhoneNumber)</strong> به آن افزوده شد تا از وارد کردن یا کپی دستی شماره‌ها بی‌نیاز شوید.
                    </>
                  ) : (
                    <>
                      The downloadable personnel Excel template and bulk-import parser have been upgraded with a dedicated <strong>Phone Number (PhoneNumber)</strong> column to eliminate manual entry steps.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Feature 3: Smart Syncing */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <RefreshCw className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۳. همگام‌سازی و یکپارچه‌سازی هوشمند داده‌ها' : '3. Advanced Local & Server State Synchronization'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      موتور سنکرونایزاسیون نرم‌افزار ارتقاء یافت تا داده‌های پرسنل، ویرایش‌ها، تخلفات و تشویقات ذخیره شده محلی شما، به‌صورت کاملا هوشمند و دوطرفه با پایگاه داده مرکزی همگام‌سازی شوند و از تداخل اطلاعات جلوگیری شود.
                    </>
                  ) : (
                    <>
                      The synchronization system has been optimized to merge local storage edits seamlessly with the database server upon container restart, preventing data overrides or loss.
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
