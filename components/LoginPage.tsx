import React, { useState } from 'react';
import { User, AppSettings } from '../types';
import { TRANSLATIONS } from '../constants';
import { Shield, Lock, User as UserIcon, LogIn } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => void;
  settings: AppSettings;
  error?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, settings, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const t = TRANSLATIONS[settings.language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
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
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 md:p-10">
            <div className="flex flex-col items-center mb-6 md:mb-8">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-white/20 to-white/5 flex items-center justify-center mb-4 shadow-lg border border-white/10`}>
                {settings.companyLogo ? (
                    <img src={settings.companyLogo} alt="Logo" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
                ) : (
                    <Shield className="w-8 h-8 md:w-10 md:h-10 text-white" />
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide text-center">{settings.companyName}</h1>
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
                    className={`w-full bg-black/20 border border-white/10 rounded-xl py-2.5 md:py-3 ${settings.language === 'fa' ? 'pr-10 md:pr-12 pl-4' : 'pl-10 md:pl-12 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/30 transition-all text-base md:text-sm`}
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
                    className={`w-full bg-black/20 border border-white/10 rounded-xl py-2.5 md:py-3 ${settings.language === 'fa' ? 'pr-10 md:pr-12 pl-4' : 'pl-10 md:pl-12 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/30 transition-all text-base md:text-sm`}
                  />
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
          </div>
          <div className="bg-black/20 p-3 md:p-4 text-center">
             <p className="text-white/30 text-[10px] md:text-xs">Protected by SafetyGuard v2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;