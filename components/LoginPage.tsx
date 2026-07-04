import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { Shield, Lock, User as UserIcon, LogIn, Key, ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => void;
  settings: AppSettings;
  error?: string;
  users?: User[];
  onUpdateUsers?: (users: User[]) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  onLogin, 
  settings, 
  error,
  users = [],
  onUpdateUsers
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const t = TRANSLATIONS[settings.language];

  // Password Recovery States
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoverUsername, setRecoverUsername] = useState('');
  const [recoverFullName, setRecoverFullName] = useState('');
  const [recoverStep, setRecoverStep] = useState<1 | 2 | 3>(1); // 1: Verify, 2: New Password, 3: Success
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    
    if (!recoverUsername.trim() || !recoverFullName.trim()) {
      setRecoverError(settings.language === 'fa' 
        ? 'لطفاً نام کاربری و نام کامل خود را وارد کنید.' 
        : 'Please enter both your username and full name.'
      );
      return;
    }

    const found = users.find(u => 
      u.username.trim().toLowerCase() === recoverUsername.trim().toLowerCase() &&
      u.fullName.trim().toLowerCase() === recoverFullName.trim().toLowerCase()
    );

    if (!found) {
      setRecoverError(settings.language === 'fa'
        ? 'کاربری با این مشخصات یافت نشد. لطفاً نام کاربری و نام کامل خود را بررسی کنید.'
        : 'No matching user found. Please verify your username and full name.'
      );
    } else {
      setMatchedUser(found);
      setRecoverStep(2);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');

    const trimmedPass = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPass || !trimmedConfirm) {
      setRecoverError(settings.language === 'fa'
        ? 'لطفاً رمز عبور جدید و تکرار آن را وارد کنید.'
        : 'Please enter your new password and confirmation.'
      );
      return;
    }

    if (trimmedPass !== trimmedConfirm) {
      setRecoverError(settings.language === 'fa'
        ? 'کلمه عبور جدید و تکرار آن مطابقت ندارند.'
        : 'Passwords do not match.'
      );
      return;
    }

    // Password validation rule matching settings: minimum 1 lowercase, 1 uppercase, 1 digit
    const validatePass = (str: string) => {
      return /[a-z]/.test(str) && /[A-Z]/.test(str) && /\d/.test(str);
    };

    if (!validatePass(trimmedPass)) {
      setRecoverError(settings.language === 'fa'
        ? 'خطای اعتبارسنجی: کلمه عبور حتماً باید شامل حداقل یک حرف بزرگ (A-Z)، یک حرف کوچک (a-z) و یک عدد (0-9) باشد.'
        : 'Validation Error: Password must contain at least one uppercase letter (A-Z), one lowercase letter (a-z), and a number (0-9).'
      );
      return;
    }

    if (!matchedUser || !onUpdateUsers) return;

    // Create the updated users array
    const updatedUsers = users.map(u => 
      u.id === matchedUser.id 
        ? { ...u, password: trimmedPass }
        : u
    );

    // Persist changes
    onUpdateUsers(updatedUsers);
    setRecoverStep(3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username.trim(), password.trim());
  };

  // Dynamic background style based on theme
  const getGradient = () => {
    switch(settings.themeColor) {
      case 'blue': return 'from-blue-900 to-slate-900';
      case 'green': return 'from-emerald-900 to-slate-900';
      case 'violet': return 'from-violet-900 to-slate-900';
      case 'slate': return 'from-slate-800 to-black';
      default: return 'from-red-900 to-slate-900';
    }
  };

  const getAccentColor = () => {
      switch(settings.themeColor) {
      case 'blue': return 'text-blue-500 group-focus-within:text-blue-500';
      case 'green': return 'text-emerald-500 group-focus-within:text-emerald-500';
      case 'violet': return 'text-violet-500 group-focus-within:text-violet-500';
      default: return 'text-red-500 group-focus-within:text-red-500';
    }
  }

  const getButtonColor = () => {
       switch(settings.themeColor) {
      case 'blue': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30';
      case 'green': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30';
      case 'violet': return 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30';
      case 'slate': return 'bg-slate-600 hover:bg-slate-700 shadow-slate-500/30';
      default: return 'bg-red-600 hover:bg-red-700 shadow-red-500/30';
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${getGradient()} relative overflow-hidden font-sans px-4`} dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Background Poster Cover */}
      {settings.companyLogo && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 z-0 scale-105 pointer-events-none"
          style={{ 
            backgroundImage: `url(${settings.companyLogo})`,
            filter: 'blur(12px) brightness(0.35)'
          }}
        />
      )}

      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl my-4">
        <div className="bg-slate-950/45 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden md:grid md:grid-cols-12">
          
          {/* Brand Presentation Column (Desktop Split Screen Layout) */}
          {settings.companyLogo && (
            <div className="hidden md:flex md:col-span-6 flex-col items-center justify-center p-8 bg-black/40 border-r border-white/10 text-center relative overflow-hidden">
              <div 
                className="absolute inset-0 bg-cover bg-center brightness-[0.4] opacity-50 hover:scale-105 transition-transform duration-1000"
                style={{ backgroundImage: `url(${settings.companyLogo})` }}
              />
              <div className="relative z-10 space-y-5 max-w-xs">
                <div className="w-56 h-56 rounded-2xl bg-slate-950/70 p-2 border border-white/20 shadow-2xl mx-auto overflow-hidden group">
                  <img 
                    src={settings.companyLogo} 
                    alt="HSE Professional Logo" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded-xl transition-all duration-700 ease-out group-hover:scale-105" 
                  />
                </div>
                <h2 className="text-lg font-extrabold text-white leading-snug tracking-wide">{settings.companyName}</h2>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-3" />
                <p className="text-white/80 text-xs font-light leading-relaxed">
                  {settings.language === 'fa' 
                    ? 'سامانه هوشمند و پیشرفته مدیریت پایش عملکرد، ثبت عدم انطباقات و تخلفات سازمانی به همراه سیستم انگیزش و پاداش پرسنلی.' 
                    : 'Advanced and intelligent enterprise platform for organizational compliance logs, performance auditing, and local AI-driven worker reward systems.'}
                </p>
              </div>
            </div>
          )}

          {/* Secure Login Form Column */}
          <div className={`${settings.companyLogo ? 'col-span-12 md:col-span-6' : 'col-span-12'} p-6 md:p-10 flex flex-col justify-between min-h-[500px]`}>
            {!isRecoverOpen ? (
              <div>
                <div className="flex flex-col items-center mb-6 md:mb-8 text-center">
                  {/* Mobile/Tablet Logo indicator */}
                  <div className="w-24 h-24 md:hidden rounded-2xl bg-slate-950/70 flex items-center justify-center mb-4 shadow-lg border border-white/10 p-1">
                    {settings.companyLogo ? (
                        <img src={settings.companyLogo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                        <Shield className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">{settings.companyName}</h1>
                  <p className="text-white/60 text-xs md:text-sm mt-1">{t.loginTitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  <div className="space-y-3 md:space-y-4">
                    <div className="group relative">
                      <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 md:top-3.5 transition-colors duration-300 text-white/40 ${getAccentColor()}`}>
                        <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <input 
                        type="text" 
                        placeholder={t.username}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 md:py-3 ${settings.language === 'fa' ? 'pr-10 md:pr-12 pl-4' : 'pl-10 md:pl-12 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/35 transition-all text-base md:text-sm`}
                      />
                    </div>
                    
                    <div className="group relative">
                      <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 md:top-3.5 transition-colors duration-300 text-white/40 ${getAccentColor()}`}>
                        <Lock className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <input 
                        type="password" 
                        placeholder={t.password}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 md:py-3 ${settings.language === 'fa' ? 'pr-10 md:pr-12 pl-4' : 'pl-10 md:pl-12 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/35 transition-all text-base md:text-sm`}
                      />
                    </div>

                    {/* Forgot Password Toggle Link */}
                    <div className="flex justify-end text-xs px-1">
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsRecoverOpen(true);
                          setRecoverStep(1);
                          setRecoverError('');
                          setRecoverUsername('');
                          setRecoverFullName('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-white/40 hover:text-indigo-400 transition-colors hover:underline decoration-dotted underline-offset-4 font-medium"
                      >
                        {settings.language === 'fa' ? 'فراموشی رمز عبور / بازیابی حساب' : 'Forgot password? Recover account'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs md:text-sm py-2 px-3 rounded-lg text-center animate-in fade-in slide-in-from-top-1">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className={`w-full py-3 md:py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base ${getButtonColor()}`}
                  >
                    <span>{t.loginBtn}</span>
                    <LogIn className={`w-4 h-4 md:w-5 md:h-5 ${settings.language === 'fa' ? 'rotate-180' : ''}`} />
                  </button>
                </form>

                {/* Default Accounts Guide */}
                <div className="mt-6 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-between text-xs text-white/40 hover:text-white/75 transition-colors focus:outline-none"
                  >
                    <span>
                      {settings.language === 'fa' 
                        ? '🔑 راهنمای حساب‌های کاربری پیش‌فرض سیستم' 
                        : '🔑 Default System Accounts Guide'}
                    </span>
                    <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10">
                      {showGuide 
                        ? (settings.language === 'fa' ? 'بستن' : 'Close') 
                        : (settings.language === 'fa' ? 'مشاهده' : 'View')}
                    </span>
                  </button>
                  
                  {showGuide && (
                    <div className="mt-3 bg-black/35 rounded-xl p-3 border border-white/10 space-y-2 animate-in fade-in duration-200" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
                      <p className="text-[11px] text-white/50 leading-relaxed text-right">
                        {settings.language === 'fa' 
                          ? 'جهت ورود به سیستم می‌توانید از نام‌های کاربری زیر استفاده کنید (رمز عبور تمام حساب‌ها Pass123 می‌باشد):' 
                          : 'To access the system, you can use the following default usernames (password for all is Pass123):'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {[
                          { username: 'Dev123', label: settings.language === 'fa' ? 'مدیر سیستم' : 'SysAdmin', role: 'DEVELOPER' },
                          { username: 'Manager123', label: settings.language === 'fa' ? 'مدیر کارخانه' : 'Factory Mgr', role: 'PLANT_MANAGER' },
                          { username: 'HseManager123', label: settings.language === 'fa' ? 'مدیر ایمنی' : 'HSE Mgr', role: 'HSE_MANAGER' },
                          { username: 'HrManager123', label: settings.language === 'fa' ? 'مدیر منابع انسانی' : 'HR Mgr', role: 'HR_MANAGER' },
                          { username: 'Security123', label: settings.language === 'fa' ? 'سرپرست انتظامات' : 'Security Mgr', role: 'SECURITY_MANAGER' },
                          { username: 'Admin123', label: settings.language === 'fa' ? 'کارشناس اداری' : 'Admin Staff', role: 'ADMIN_STAFF' },
                        ].map((acc) => (
                          <button
                            key={acc.username}
                            type="button"
                            onClick={() => {
                              setUsername(acc.username);
                              setPassword('Pass123');
                            }}
                            className={`flex flex-col items-start p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-lg transition-all duration-150 active:scale-95 group text-white/80 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}
                          >
                            <span className="font-semibold text-white group-hover:text-blue-400 transition-colors">{acc.username}</span>
                            <span className="text-[10px] text-white/40">{acc.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // PASSWORD RECOVERY WORKFLOW
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col items-center mb-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 border border-white/10">
                    <Key className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <h1 className="text-lg font-bold text-white tracking-wide">
                    {settings.language === 'fa' ? 'بازیابی رمز عبور اپراتور' : 'Operator Password Recovery'}
                  </h1>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">
                    {settings.language === 'fa' 
                      ? 'بررسی هویت و تنظیم مجدد کلمه عبور' 
                      : 'Self-service identity verification & password reset'}
                  </p>
                </div>

                {recoverStep === 1 && (
                  <form onSubmit={handleVerifyIdentity} className="space-y-4">
                    <p className="text-[11px] text-white/50 leading-relaxed text-right bg-white/5 p-2.5 rounded-lg border border-white/5">
                      {settings.language === 'fa'
                        ? 'برای تایید هویت، نام کاربری و نام کامل خود را دقیقاً همان‌طور که در سیستم ثبت شده است وارد کنید.'
                        : 'To verify identity, enter your username and registered full name exactly as stored in the system.'}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 transition-colors duration-300 text-white/40`}>
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <input 
                          type="text" 
                          placeholder={settings.language === 'fa' ? 'نام کاربری حساب' : 'Account Username'}
                          value={recoverUsername}
                          onChange={(e) => setRecoverUsername(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                      </div>

                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 transition-colors duration-300 text-white/40`}>
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <input 
                          type="text" 
                          placeholder={settings.language === 'fa' ? 'نام کامل کاربر ثبت‌شده' : 'Registered Full Name'}
                          value={recoverFullName}
                          onChange={(e) => setRecoverFullName(e.target.value)}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                      </div>
                    </div>

                    {recoverError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{recoverError}</span>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                      <button 
                        type="submit"
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <span>{settings.language === 'fa' ? 'بررسی و تایید هویت' : 'Verify Identity'}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsRecoverOpen(false)}
                        className="w-full py-2.5 rounded-xl font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        {settings.language === 'fa' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                        <span>{settings.language === 'fa' ? 'بازگشت به صفحه ورود' : 'Back to Login'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {recoverStep === 2 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs py-2 px-3 rounded-lg text-center leading-relaxed">
                      {settings.language === 'fa'
                        ? `هویت شما تایید شد همکار گرامی، ${matchedUser?.fullName}، لطفاً رمز عبور جدید خود را تعریف کنید.`
                        : `Identity verified, hello ${matchedUser?.fullName}. Please define your new secure password.`}
                    </div>

                    <div className="space-y-3">
                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 text-white/40`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          placeholder={settings.language === 'fa' ? 'کلمه عبور جدید' : 'New Password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-10' : 'pl-10 pr-10'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute ${settings.language === 'fa' ? 'left-3' : 'right-3'} top-3 text-white/40 hover:text-white/80 transition-colors`}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 text-white/40`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={settings.language === 'fa' ? 'تکرار کلمه عبور جدید' : 'Confirm New Password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-10' : 'pl-10 pr-10'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute ${settings.language === 'fa' ? 'left-3' : 'right-3'} top-3 text-white/40 hover:text-white/80 transition-colors`}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 text-amber-200 p-2.5 rounded-lg text-[10px] leading-relaxed text-right">
                      <span className="font-bold block mb-0.5">
                        {settings.language === 'fa' ? 'الزام امنیتی کلمه عبور:' : 'Password Security Rules:'}
                      </span>
                      {settings.language === 'fa' 
                        ? 'کلمه عبور باید شامل حداقل یک حرف بزرگ انگلیسی (A-Z)، یک حرف کوچک انگلیسی (a-z) و یک عدد (0-9) باشد.' 
                        : 'Must include at least one uppercase letter (A-Z), one lowercase letter (a-z), and a number (0-9).'}
                    </div>

                    {recoverError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{recoverError}</span>
                      </div>
                    )}

                    <div className="pt-1 flex flex-col gap-2">
                      <button 
                        type="submit"
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <span>{settings.language === 'fa' ? 'به‌روزرسانی کلمه عبور' : 'Update Password'}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRecoverStep(1)}
                        className="w-full py-2.5 rounded-xl font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        {settings.language === 'fa' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                        <span>{settings.language === 'fa' ? 'برگشت به مرحله قبل' : 'Back to Verification'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {recoverStep === 3 && (
                  <div className="space-y-5 text-center py-4 animate-in zoom-in-95 duration-300">
                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-7 h-7 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">
                        {settings.language === 'fa' ? 'تغییر رمز عبور با موفقیت انجام شد!' : 'Password Reset Successful!'}
                      </h3>
                      <p className="text-white/60 text-xs leading-relaxed px-4">
                        {settings.language === 'fa'
                          ? `رمز عبور همکار گرامی ${matchedUser?.fullName} با موفقیت به روزرسانی شد. اکنون با اطلاعات جدید وارد شوید.`
                          : `Password for ${matchedUser?.fullName} was reset. You can now log in using your new password.`}
                      </p>
                    </div>
                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setIsRecoverOpen(false);
                          if (matchedUser) {
                            setUsername(matchedUser.username);
                            setPassword('');
                          }
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 text-xs"
                      >
                        {settings.language === 'fa' ? 'ورود به حساب کاربری' : 'Login to Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-8 pt-4 border-t border-white/5 text-center">
               <p className="text-white/30 text-[10px] md:text-xs">Protected by SafetyGuard v2.0</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;