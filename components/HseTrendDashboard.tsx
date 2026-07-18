import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar 
} from 'recharts';
import { Violation, Reward, AppSettings } from '../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Activity, 
  Calendar, 
  BarChart2, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface HseTrendDashboardProps {
  violations: Violation[];
  rewards: Reward[];
  settings: AppSettings;
}

// Helper to convert Persian/Arabic digits to English digits
function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
}

// Robust date normalizer to YYYY/MM/DD
function normalizeDate(dStr: string): string {
  if (!dStr) return '';
  let clean = toEnglishDigits(dStr);
  clean = clean.replace(/-/g, '/');
  clean = clean.replace(/[^0-9/]/g, '');
  const parts = clean.split('/');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return clean;
}

// Subtract days in Jalali calendar
function subtractJalaliDays(dateStr: string, days: number): string {
  const parts = dateStr.split('/');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

  const getDaysInMonth = (year: number, month: number) => {
    if (month >= 1 && month <= 6) return 31;
    if (month >= 7 && month <= 11) return 30;
    if (month === 12) {
      // Leap years (approximate for 1390-1415 range)
      const isLeap = [1391, 1395, 1399, 1403, 1407, 1411, 1415].includes(year);
      return isLeap ? 30 : 29;
    }
    return 30;
  };

  for (let i = 0; i < days; i++) {
    d--;
    if (d < 1) {
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
      d = getDaysInMonth(y, m);
    }
  }

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}/${mm}/${dd}`;
}

// Subtract days in Gregorian calendar
function subtractGregorianDays(dateStr: string, days: number): string {
  const d = new Date(dateStr.replace(/\//g, '-'));
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

// Generate the last 30 days based on the reference date
function get30DaysRange(referenceDateStr: string): string[] {
  const normalized = normalizeDate(referenceDateStr);
  const parts = normalized.split('/');
  if (parts.length !== 3) return [];
  const year = parseInt(parts[0], 10);
  
  const isJalali = year < 1600;
  const days: string[] = [];
  
  for (let i = 29; i >= 0; i--) {
    if (isJalali) {
      days.push(subtractJalaliDays(normalized, i));
    } else {
      days.push(subtractGregorianDays(normalized, i));
    }
  }
  return days;
}

const HseTrendDashboard: React.FC<HseTrendDashboardProps> = ({ violations, rewards, settings }) => {
  const isFa = settings.language === 'fa';
  const [chartType, setChartType] = useState<'daily' | 'cumulative'>('daily');

  // Translations
  const t = useMemo(() => {
    return {
      title: isFa ? 'تحلیل روند شاخص‌های عملکردی HSE (۳۰ روز گذشته)' : 'HSE Performance Indicators Trend Analysis (Last 30 Days)',
      subtitle: isFa ? 'رصد آماری رویدادها، تخلفات ثبت‌شده و مشوق‌های اعطایی به پرسنل' : 'Statistical monitoring of incidents, violations, and safety incentives',
      violations: isFa ? 'تخلفات ثبت‌شده' : 'Recorded Violations',
      rewards: isFa ? 'تشویق‌های ایمنی' : 'Safety Rewards',
      dailyView: isFa ? 'نمودار فراوانی روزانه' : 'Daily Frequency Chart',
      cumulativeView: isFa ? 'نمودار انباشته تجمعی' : 'Cumulative Trend Chart',
      totalViolations: isFa ? 'کل تخلفات (۳۰ روز)' : 'Total Violations (30d)',
      totalRewards: isFa ? 'کل تشویق‌ها (۳۰ روز)' : 'Total Rewards (30d)',
      hseScore: isFa ? 'شاخص توازن عملکرد ایمنی' : 'HSE Performance Balance',
      balanceDesc: isFa ? 'تفاضل تراز تشویق منهای تخلف؛ تراز مثبت نشانگر برتری رفتارهای ایمن است' : 'Rewards minus violations; a positive balance indicates safer workplace behavior',
      noData: isFa ? 'داده‌ای در بازه زمانی ۳۰ روز گذشته یافت نشد.' : 'No data recorded in the last 30 days.',
      legendTitle: isFa ? 'راهنمای نمودار:' : 'Chart Legend:',
      date: isFa ? 'تاریخ' : 'Date',
      value: isFa ? 'تعداد' : 'Count',
      approvedOnly: isFa ? 'پرونده‌های تایید نهایی شده' : 'Approved records only',
    };
  }, [isFa]);

  // Determine reference date (maximum date in either violations or rewards, or today)
  const referenceDate = useMemo(() => {
    const allDates = [
      ...violations.map(v => normalizeDate(v.date)),
      ...rewards.map(r => normalizeDate(r.date))
    ].filter(Boolean);

    if (allDates.length === 0) {
      // Default to current date in correct language locale format
      const todayLoc = new Date().toLocaleDateString(isFa ? 'fa-IR' : 'en-US');
      return normalizeDate(todayLoc);
    }

    // Sort to find latest
    allDates.sort((a, b) => b.localeCompare(a));
    return allDates[0];
  }, [violations, rewards, isFa]);

  // 30 Days Timeline
  const timeline = useMemo(() => {
    return get30DaysRange(referenceDate);
  }, [referenceDate]);

  // Aggregate stats & prepare charts data
  const { chartData, stats } = useMemo(() => {
    if (timeline.length === 0) {
      return { chartData: [], stats: { totalV: 0, totalR: 0, balance: 0 } };
    }

    // Hash maps for daily occurrence counting
    const violationsMap: Record<string, number> = {};
    const rewardsMap: Record<string, number> = {};

    timeline.forEach(day => {
      violationsMap[day] = 0;
      rewardsMap[day] = 0;
    });

    // Count approved violations (or all that have isApproved !== false)
    violations.forEach(v => {
      const normalizedDay = normalizeDate(v.date);
      if (normalizedDay in violationsMap) {
        violationsMap[normalizedDay]++;
      }
    });

    // Count approved rewards
    rewards.forEach(r => {
      const normalizedDay = normalizeDate(r.date);
      if (normalizedDay in rewardsMap) {
        rewardsMap[normalizedDay]++;
      }
    });

    // Generate cumulative & daily data array
    let cumViolations = 0;
    let cumRewards = 0;
    let totalV = 0;
    let totalR = 0;

    const data = timeline.map(day => {
      const vCount = violationsMap[day] || 0;
      const rCount = rewardsMap[day] || 0;

      totalV += vCount;
      totalR += rCount;

      cumViolations += vCount;
      cumRewards += rCount;

      // Extract only MM/DD for elegant x-axis label representation
      const parts = day.split('/');
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : day;

      return {
        date: day,
        label,
        [t.violations]: vCount,
        [t.rewards]: rCount,
        cumViolations,
        cumRewards,
      };
    });

    return {
      chartData: data,
      stats: {
        totalV,
        totalR,
        balance: totalR - totalV
      }
    };
  }, [timeline, violations, rewards, t]);

  const hasData = stats.totalV > 0 || stats.totalR > 0;

  return (
    <div className="bg-white border border-gray-200/80 rounded-3xl shadow-xs p-5 md:p-6 mb-8 transition-all hover:shadow-md animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-sm md:text-base font-black text-gray-800 leading-tight">
              {t.title}
            </h3>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 font-medium leading-normal">
            {t.subtitle} ({t.approvedOnly})
          </p>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1.5 self-start md:self-center">
          <button
            onClick={() => setChartType('daily')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
              chartType === 'daily'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{t.dailyView}</span>
          </button>
          <button
            onClick={() => setChartType('cumulative')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
              chartType === 'cumulative'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t.cumulativeView}</span>
          </button>
        </div>
      </div>

      {/* 30-Day mini stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        
        {/* Total Violations Card */}
        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs text-rose-600 font-bold block">{t.totalViolations}</span>
            <span className="text-xl md:text-2xl font-black text-rose-700 font-mono leading-none">{stats.totalV}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-rose-100 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Total Rewards Card */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs text-emerald-600 font-bold block">{t.totalRewards}</span>
            <span className="text-xl md:text-2xl font-black text-emerald-700 font-mono leading-none">{stats.totalR}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-500">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Safety Balance Indicator */}
        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/60 flex items-center justify-between relative group">
          <div className="space-y-1 flex-1">
            <span className="text-[10px] md:text-xs text-indigo-700 font-bold flex items-center gap-1">
              {t.hseScore}
              <div className="cursor-help text-indigo-400 hover:text-indigo-600 relative group">
                <HelpCircle className="w-3.5 h-3.5" />
                <div className={`absolute bottom-full mb-2 ${isFa ? 'right-0' : 'left-0'} hidden group-hover:block w-48 bg-slate-900 text-white text-[9px] p-2 rounded-lg shadow-xl z-30 font-medium leading-relaxed`}>
                  {t.balanceDesc}
                </div>
              </div>
            </span>
            <span className={`text-xl md:text-2xl font-black font-mono leading-none ${
              stats.balance > 0 ? 'text-emerald-600' : stats.balance < 0 ? 'text-rose-600' : 'text-slate-600'
            }`}>
              {stats.balance > 0 ? `+${stats.balance}` : stats.balance}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl bg-white shadow-xs border flex items-center justify-center ${
            stats.balance > 0 ? 'border-emerald-100 text-emerald-500' : 'border-indigo-100 text-indigo-500'
          }`}>
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Chart Section */}
      <div className="w-full relative min-h-[300px] flex flex-col justify-center">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mb-2.5 stroke-[1.5]" />
            <p className="text-xs font-bold text-gray-400 mb-1">{t.noData}</p>
            <p className="text-[10px] text-gray-400 font-medium max-w-sm">
              {isFa 
                ? 'به محض ثبت تخلفات و تشویق‌های جدید با تاریخ‌های معتبر، آمار تجمعی ۳۰ روزه در این نمودار نمایش داده می‌شود.' 
                : 'As soon as new violations or rewards are logged with valid dates, the 30-day statistics will update here.'}
            </p>
          </div>
        ) : (
          <div className="w-full" dir="ltr">
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'daily' ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '16px',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontWeight: 600,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      textAlign: isFa ? 'right' : 'left',
                      direction: isFa ? 'rtl' : 'ltr'
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                  />
                  <Bar 
                    dataKey={t.rewards} 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={30}
                  />
                  <Bar 
                    dataKey={t.violations} 
                    fill="#ef4444" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={30}
                  />
                </BarChart>
              ) : (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '16px',
                      border: 'none',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontWeight: 600,
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      textAlign: isFa ? 'right' : 'left',
                      direction: isFa ? 'rtl' : 'ltr'
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'cumRewards') return [value, t.rewards];
                      if (name === 'cumViolations') return [value, t.violations];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                    formatter={(value: any) => {
                      if (value === 'cumRewards') return t.rewards;
                      if (value === 'cumViolations') return t.violations;
                      return value;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumRewards" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRewards)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumViolations" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorViolations)" 
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};

export default HseTrendDashboard;
