import React, { useState, useMemo, useRef } from 'react';
import { 
  X, Trophy, Medal, Award, Calendar, AlertTriangle, CheckCircle2, 
  Printer, TrendingUp, Sparkles, UserCheck, ChevronDown, ListOrdered, ShieldAlert
} from 'lucide-react';
import { AppSettings, Violation, Reward, Employee } from '../types';

interface WorkerOfMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  violations: Violation[];
  rewards: Reward[];
  employees: Employee[];
}

export const WorkerOfMonthModal: React.FC<WorkerOfMonthModalProps> = ({
  isOpen,
  onClose,
  settings,
  violations,
  rewards,
  employees
}) => {
  const isFa = settings.language === 'fa';
  const certificateRef = useRef<HTMLDivElement>(null);

  // Dynamic Month/Period Extraction
  const periods = useMemo(() => {
    const allDates = [
      ...violations.map(v => v.date),
      ...rewards.map(r => r.date)
    ].filter(Boolean);

    const uniquePeriods = new Set<string>();
    allDates.forEach(d => {
      const parts = d.includes('/') ? d.split('/') : d.split('-');
      if (parts.length >= 2) {
        // e.g., "1403/02" or "2024/05"
        uniquePeriods.add(`${parts[0]}/${parts[1]}`);
      }
    });

    // Sort periods descending
    return Array.from(uniquePeriods).sort((a, b) => b.localeCompare(a));
  }, [violations, rewards]);

  // Selected period state (defaults to most recent period or 'ALL')
  const [selectedPeriod, setSelectedPeriod] = useState<string>(periods[0] || 'ALL');

  // Convert period format to human readable Persian/English month name
  const formatPeriodName = (p: string) => {
    if (p === 'ALL') return isFa ? 'کل دوره‌ها (All-Time)' : 'All-Time';
    const [year, month] = p.split('/');
    
    if (isFa) {
      const persianMonths = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
      ];
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12 && year.length === 4 && parseInt(year, 10) > 1300 && parseInt(year, 10) < 1500) {
        return `${persianMonths[mIdx]} ${year}`;
      }
    } else {
      const englishMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const mIdx = parseInt(month, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${englishMonths[mIdx]} ${year}`;
      }
    }
    return p; // fallback
  };

  // HSE Scoring & Employee Selection Engine
  const scoringData = useMemo(() => {
    // 1. Filter approved violations & rewards by the selected period
    const filteredViolations = violations.filter(v => {
      if (!v.isApproved || v.isArchived) return false;
      if (selectedPeriod === 'ALL') return true;
      return v.date && v.date.startsWith(selectedPeriod);
    });

    const filteredRewards = rewards.filter(r => {
      if (!r.isApproved || r.isArchived) return false;
      if (selectedPeriod === 'ALL') return true;
      return r.date && r.date.startsWith(selectedPeriod);
    });

    // 2. Map of employee performance scores
    const candidateMap: {
      [personnelId: string]: {
        personnelId: string;
        fullName: string;
        department: string;
        jobTitle: string;
        rewardScore: number;
        rewardCount: number;
        violationScore: number;
        violationCount: number;
        netScore: number;
        isDisqualified: boolean;
        disqualificationReason: string;
        allRewards: Reward[];
        allViolations: Violation[];
      }
    } = {};

    // Initialize all existing employees
    employees.forEach(emp => {
      candidateMap[emp.personnelId] = {
        personnelId: emp.personnelId,
        fullName: emp.fullName,
        department: emp.department,
        jobTitle: emp.jobTitle || (isFa ? 'پرسنل سایت' : 'Site Staff'),
        rewardScore: 0,
        rewardCount: 0,
        violationScore: 0,
        violationCount: 0,
        netScore: 0,
        isDisqualified: false,
        disqualificationReason: '',
        allRewards: [],
        allViolations: []
      };
    });

    // Process rewards (adds positive points)
    filteredRewards.forEach(r => {
      let cand = candidateMap[r.personnelId];
      if (!cand) {
        // Fallback if employee was deleted but rewards remain
        candidateMap[r.personnelId] = {
          personnelId: r.personnelId,
          fullName: r.employeeName,
          department: r.department,
          jobTitle: isFa ? 'پرسنل غیررسمی' : 'Staff',
          rewardScore: 0,
          rewardCount: 0,
          violationScore: 0,
          violationCount: 0,
          netScore: 0,
          isDisqualified: false,
          disqualificationReason: '',
          allRewards: [],
          allViolations: []
        };
        cand = candidateMap[r.personnelId];
      }
      cand.rewardScore += Number(r.score || 0);
      cand.rewardCount += 1;
      cand.allRewards.push(r);
    });

    // Process violations (subtracted from score, and triggers Zero-Violation Safety Safeguard)
    filteredViolations.forEach(v => {
      let cand = candidateMap[v.personnelId];
      if (!cand) {
        candidateMap[v.personnelId] = {
          personnelId: v.personnelId,
          fullName: v.employeeName,
          department: v.department,
          jobTitle: isFa ? 'پرسنل غیررسمی' : 'Staff',
          rewardScore: 0,
          rewardCount: 0,
          violationScore: 0,
          violationCount: 0,
          netScore: 0,
          isDisqualified: false,
          disqualificationReason: '',
          allRewards: [],
          allViolations: []
        };
        cand = candidateMap[v.personnelId];
      }
      // Note: v.score is stored as negative number
      const scoreValue = Math.abs(Number(v.score || 0));
      cand.violationScore += scoreValue;
      cand.violationCount += 1;
      cand.allViolations.push(v);
      
      // Zero-Violation Safeguard (بند انضباطی ایمنی صفر):
      // Any approved safety violation in the active period disqualifies the candidate.
      cand.isDisqualified = true;
      cand.disqualificationReason = isFa 
        ? `دارای ${v.violationCount} تخلف ثبت شده در این دوره` 
        : `Has ${v.violationCount} registered violation(s) in this period`;
    });

    // Calculate net scores & eligibility status
    const allCandidates = Object.values(candidateMap).map(cand => {
      // Net Score formula: Reward Points - Violation Penalties
      // Baseline performance index can be viewed as Reward Points if no violations
      cand.netScore = cand.rewardScore - cand.violationScore;
      return cand;
    });

    // Separate eligible (no violations + positive rewards) vs disqualified or inactive
    const eligibleCandidates = allCandidates
      .filter(c => !c.isDisqualified && c.rewardScore > 0)
      .sort((a, b) => {
        // Highest Reward Score first
        if (b.netScore !== a.netScore) return b.netScore - a.netScore;
        // Tie breaker 1: Most rewards given
        if (b.rewardCount !== a.rewardCount) return b.rewardCount - a.rewardCount;
        // Tie breaker 2: alphabetical
        return a.fullName.localeCompare(b.fullName);
      });

    const disqualifiedOrInactive = allCandidates
      .filter(c => c.isDisqualified || c.rewardScore === 0)
      .sort((a, b) => {
        // Put disqualified with positive rewards above completely inactive ones
        if (a.isDisqualified && b.isDisqualified) {
          return b.rewardScore - a.rewardScore;
        }
        if (a.isDisqualified) return -1;
        if (b.isDisqualified) return 1;
        return 0;
      });

    const winner = eligibleCandidates[0] || null;

    return {
      winner,
      leaderboard: eligibleCandidates,
      disqualifiedOrInactive,
      allCandidates
    };
  }, [violations, rewards, employees, selectedPeriod, isFa]);

  const handlePrintCertificate = () => {
    const printContent = certificateRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(isFa 
        ? 'مرورگر جلوی باز شدن پنجره چاپ را گرفت. لطفا اجازه باز شدن پاپ‌آپ را بدهید.' 
        : 'Print window blocked. Please allow popups for this site.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${isFa ? 'لوح تقدیر کارمند نمونه' : 'Appreciation Certificate'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap');
            body {
              margin: 0;
              padding: 0;
              font-family: 'Vazirmatn', 'Inter', sans-serif;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .cert-container {
              width: 297mm;
              height: 210mm;
              padding: 20mm;
              box-sizing: border-box;
              border: 15px double #b45309;
              background: #fefcf6;
              position: relative;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              margin: auto;
            }
            .cert-header {
              font-size: 32px;
              font-weight: 900;
              color: #78350f;
              margin-top: 10px;
              letter-spacing: 2px;
            }
            .cert-subtitle {
              font-size: 16px;
              color: #d97706;
              font-weight: 700;
              margin-bottom: 20px;
            }
            .cert-text {
              font-size: 18px;
              line-height: 2;
              color: #451a03;
              max-width: 80%;
              margin: 0 auto;
              text-align: justify;
              direction: ${isFa ? 'rtl' : 'ltr'};
            }
            .cert-highlight {
              font-size: 24px;
              font-weight: bold;
              color: #1e3a8a;
              margin: 15px 0;
            }
            .cert-footer {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              padding: 0 40px;
            }
            .signature-box {
              border-top: 1px solid #b45309;
              width: 200px;
              padding-top: 10px;
              font-size: 14px;
              color: #78350f;
              font-weight: bold;
            }
            @page {
              size: A4 landscape;
              margin: 0;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="cert-container">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div 
        id="worker-of-the-month-modal" 
        className="bg-gray-50 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="bg-white border-b border-gray-150 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Trophy className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base md:text-lg">
                {isFa ? 'فرآیند و گزارش کارمند نمونه ماه' : 'Worker of the Month Recognition'}
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">
                {isFa 
                  ? 'محاسبه شفاف و زنده شایستگی ایمنی و انضباط بر اساس امتیازها' 
                  : 'Transparent point-based HSE merit & compliance calculation'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1 text-right">
          
          {/* Controls and System Description */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white border border-gray-150 p-4 rounded-2xl shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                {isFa ? 'سیستم رتبه‌بندی عادلانه HSE' : 'HSE Fair Rating Engine'}
              </span>
              <p className="text-xs text-gray-600 max-w-xl">
                {isFa 
                  ? 'رتبه‌بندی پرسنل بر مبنای تفاضل امتیازات تشویقی از جرایم انضباطی تایید شده انجام می‌شود. طبق آیین‌نامه ایمنی، هرگونه ثبت تخلف تایید شده، پرسنل را به طور خودکار از این عنوان در آن دوره معین محروم می‌سازد.' 
                  : 'Ranking is calculated as Approved Reward scores minus approved Violation scores. In compliance with industrial safety codes, any approved violation disqualifies a candidate in that period.'}
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-gray-500 self-center">
                {isFa ? 'انتخاب دوره ارزیابی:' : 'Evaluation Period:'}
              </label>
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none bg-gray-50 hover:bg-gray-100/70 border border-gray-200 text-slate-700 font-bold text-xs rounded-xl px-4 py-2.5 pr-9 cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">{isFa ? 'کل دوره‌ها (کامل)' : 'All Periods (Total)'}</option>
                  {periods.map(p => (
                    <option key={p} value={p}>{formatPeriodName(p)}</option>
                  ))}
                </select>
                <ChevronDown className={`w-4 h-4 text-gray-400 absolute ${isFa ? 'left-3' : 'right-3'} top-3 pointer-events-none`} />
              </div>
            </div>
          </div>

          {/* Winner Showcase */}
          {scoringData.winner ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Winner Profile Badge Card */}
              <div className="lg:col-span-5 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5 border-2 border-amber-500/30 rounded-3xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden shadow-xs">
                {/* Decorative Crown/Stars background */}
                <div className="absolute top-4 left-4 text-amber-500/10">
                  <Trophy className="w-32 h-32 rotate-12" />
                </div>

                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-100 text-amber-800 text-[10px] md:text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                      <Medal className="w-3.5 h-3.5" />
                      <span>{isFa ? 'برنده رتبه نخست این دوره' : 'First Place Champion'}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-600 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200/50">
                      {formatPeriodName(selectedPeriod)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md relative">
                      <Sparkles className="w-7 h-7 animate-pulse" />
                      <span className="absolute -bottom-1 -right-1 bg-white text-amber-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs border border-amber-100">۱</span>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-xl leading-snug">
                        {scoringData.winner.fullName}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">
                        {scoringData.winner.jobTitle} • <span className="font-bold text-indigo-600">{scoringData.winner.department}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {isFa ? 'کد پرسنلی: ' : 'Personnel ID: '}{scoringData.winner.personnelId}
                      </p>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-2 pt-3">
                    <div className="bg-white/80 backdrop-blur-xs border border-amber-200/30 p-2 rounded-xl text-center">
                      <span className="text-[9px] text-gray-400 block font-bold">{isFa ? 'امتیاز مثبت' : 'Reward Score'}</span>
                      <span className="text-base font-black text-emerald-600 font-mono">+{scoringData.winner.rewardScore}</span>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xs border border-amber-200/30 p-2 rounded-xl text-center">
                      <span className="text-[9px] text-gray-400 block font-bold">{isFa ? 'نرخ پایبندی' : 'Safety Rate'}</span>
                      <span className="text-base font-black text-blue-600 font-mono">100%</span>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xs border border-amber-200/30 p-2 rounded-xl text-center">
                      <span className="text-[9px] text-gray-400 block font-bold">{isFa ? 'کل تشویق‌ها' : 'Rewards'}</span>
                      <span className="text-base font-black text-amber-600 font-mono">{scoringData.winner.rewardCount}</span>
                    </div>
                  </div>

                  {/* Achievements Timeline */}
                  <div className="space-y-2 pt-2">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-600" />
                      <span>{isFa ? 'خلاصه اقدامات برجسته تایید شده:' : 'Notable Approved Actions:'}</span>
                    </h5>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto text-xs text-gray-600 pl-1">
                      {scoringData.winner.allRewards.map((rew, i) => (
                        <div key={rew.id} className="flex items-start gap-1.5 bg-white/45 p-1.5 rounded-lg border border-orange-200/20">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                          <div>
                            <span className="font-bold text-gray-800">{rew.description}</span>
                            <span className="text-[9px] text-gray-400 block mt-0.5">{rew.date} • {isFa ? 'امتیاز:' : 'Score:'} {rew.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-amber-500/10 flex justify-end gap-2">
                  <button
                    onClick={handlePrintCertificate}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isFa ? 'چاپ لوح تقدیر رسمی' : 'Print Official Certificate'}</span>
                  </button>
                </div>
              </div>

              {/* Certificate Template Wrapper (Hidden from Screen, used for print helper) */}
              <div className="hidden">
                <div ref={certificateRef}>
                  <div className="cert-header">
                    {isFa ? 'بسمه تعالی' : 'IN THE NAME OF GOD'}
                  </div>
                  <div className="cert-subtitle" style={{ fontSize: '26px', margin: '15px 0' }}>
                    {isFa ? 'لوح تقدیر و سپاس ایمنی و انضباط کارگاهی' : 'Certificate of Workshop Safety & Discipline Excellence'}
                  </div>
                  <div className="cert-text">
                    {isFa ? (
                      `بدینوسیله به پاس تعهد مستمر، رعایت دلسوزانه استانداردهای ایمنی و بهداشت حرفه‌ای (HSE)، و عدم ثبت هرگونه گزارش عدم انطباق یا تخلف در دوره ارزیابی ${formatPeriodName(selectedPeriod)}، از همکار گرامی جناب آقای/سرکار خانم `
                    ) : (
                      `This is to officially recognize and commend the dedication, professional HSE compliance, and outstanding safety contributions of our employee, `
                    )}
                    <strong style={{ fontSize: '24px', color: '#1e3a8a', display: 'inline-block', margin: '0 5px' }}>
                      ${scoringData.winner.fullName}
                    </strong>
                    {isFa ? (
                      ` با شماره پرسنلی ${scoringData.winner.personnelId} شاغل در واحد ${scoringData.winner.department} صمیمانه تقدیر و تشکر به عمل می‌آید.`
                    ) : (
                      ` (Personnel ID: ${scoringData.winner.personnelId}) in the ${scoringData.winner.department} department.`
                    )}
                    <br /><br />
                    {isFa ? (
                      `کسب این جایگاه با ارزش و ثبت بالاترین نمره عملکرد ایمنی کارگاه به میزان ${scoringData.winner.netScore} امتیاز مثبت بدون هرگونه خطا، نشانگر مسئولیت‌پذیری بالای جنابعالی در حفظ سرمایه انسانی شرکت است. توفیق روزافزون شما را از درگاه احدیت خواستاریم.`
                    ) : (
                      `Achieving the top safety score of ${scoringData.winner.netScore} points with a zero-fault record reflects high responsibility in protecting human life. We wish you continued success.`
                    )}
                  </div>
                  <div className="cert-footer">
                    <div className="signature-box">
                      {isFa ? 'مدیریت مجتمع کارگاهی' : 'Plant Management'}
                    </div>
                    <div className="signature-box">
                      {isFa ? 'واحد مهندسی ایمنی (HSE)' : 'HSE Department'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Leaderboard Table (Eligible Runners-Up) */}
              <div className="lg:col-span-7 bg-white border border-gray-150 rounded-3xl p-4 md:p-5 shadow-xs flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-2">
                    <ListOrdered className="w-4 h-4 text-indigo-500" />
                    <span>{isFa ? 'جدول رده‌بندی برترین پرسنل شایسته این دوره' : 'HSE Leaderboard of Qualified Employees'}</span>
                  </h4>
                  
                  <div className="overflow-x-auto max-h-[280px] scrollbar-thin">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="text-gray-400 font-bold border-b border-gray-100">
                          <th className="pb-2 text-center w-12">{isFa ? 'رتبه' : 'Rank'}</th>
                          <th className="pb-2 pr-2">{isFa ? 'نام و واحد کارمند' : 'Employee & Dept'}</th>
                          <th className="pb-2 text-center">{isFa ? 'کد پرسنلی' : 'Personnel ID'}</th>
                          <th className="pb-2 text-center">{isFa ? 'تعداد تشویق' : 'Rewards'}</th>
                          <th className="pb-2 text-center">{isFa ? 'امتیاز خالص' : 'Net Score'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {scoringData.leaderboard.map((cand, idx) => (
                          <tr key={cand.personnelId} className="hover:bg-gray-50/50">
                            <td className="py-2.5 text-center font-bold font-mono">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                            </td>
                            <td className="py-2.5 pr-2">
                              <span className="font-bold text-gray-800 block">{cand.fullName}</span>
                              <span className="text-[10px] text-gray-400">{cand.jobTitle} • {cand.department}</span>
                            </td>
                            <td className="py-2.5 text-center font-mono text-gray-500 font-medium">{cand.personnelId}</td>
                            <td className="py-2.5 text-center font-bold font-mono text-amber-600">{cand.rewardCount}</td>
                            <td className="py-2.5 text-center font-black font-mono text-emerald-600">+{cand.netScore}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100/30 rounded-2xl p-2.5 mt-4 text-[10px] text-indigo-800 font-medium">
                  {isFa 
                    ? `تعداد کل پرسنل واجد شرایط و دارای تشویقی بدون خطا در این دوره: ${scoringData.leaderboard.length} نفر است.`
                    : `Total employees with reward points and clean safety record in this period: ${scoringData.leaderboard.length}.`}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-gray-150 rounded-3xl p-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>
              <h4 className="font-bold text-slate-800">
                {isFa ? 'هیچ کاندیدای واجد شرایطی یافت نشد' : 'No Qualified Candidates Found'}
              </h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                {isFa 
                  ? 'در بازه زمانی انتخاب شده، هیچ پرسنلی دارای سابقه تشویق تایید شده نبوده و یا تمام پرسنل تشویق شده دارای حداقل یک مورد تخلف ثبت شده بوده‌اند و طبق بند ایمنی رد صلاحیت شده‌اند.' 
                  : 'In this period, either no employees received approved rewards, or all rewarded candidates also had at least one safety violation which disqualified them.'}
              </p>
            </div>
          )}

          {/* Red-Flagged & Disqualified List (Zero-Violation Compliance Enforcement view) */}
          <div className="bg-white border border-gray-150 rounded-3xl p-4 md:p-5 shadow-xs space-y-3">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>{isFa ? 'لیست پرسنل ردصلاحیت‌شده یا غیرفعال ایمنی در این دوره' : 'Disqualified or Safety-Faulted Candidates'}</span>
            </h4>
            
            <p className="text-[11px] text-red-700/80 bg-red-50 border border-red-100 p-2 rounded-xl">
              {isFa 
                ? 'توجه: بر اساس استاندارد ایمنی صفر، ثبت هرگونه تخلف (حتی در صورت داشتن پاداش) باعث خروج نام از فینالیست‌های کارمند نمونه می‌گردد.' 
                : 'Note: Following zero-violation benchmarks, any recorded violation during this period removes the candidate from Worker of the Month candidacy.'}
            </p>

            <div className="overflow-x-auto max-h-[150px] text-xs">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-gray-400 font-bold border-b border-gray-100">
                    <th className="pb-2 pr-2">{isFa ? 'نام و واحد کارمند' : 'Employee & Unit'}</th>
                    <th className="pb-2 text-center">{isFa ? 'امتیاز تشویق' : 'Rewards'}</th>
                    <th className="pb-2 text-center">{isFa ? 'امتیاز جریمه' : 'Violations Penalty'}</th>
                    <th className="pb-2 text-center">{isFa ? 'وضعیت نهایی' : 'Candidacy Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scoringData.disqualifiedOrInactive
                    .filter(c => c.rewardCount > 0 || c.violationCount > 0) // only show people with records
                    .map(cand => (
                      <tr key={cand.personnelId} className="hover:bg-gray-50/30">
                        <td className="py-2 pr-2">
                          <span className="font-bold text-gray-700 block">{cand.fullName}</span>
                          <span className="text-[10px] text-gray-400">{cand.jobTitle} • {cand.department}</span>
                        </td>
                        <td className="py-2 text-center font-mono text-emerald-600 font-bold">+{cand.rewardScore}</td>
                        <td className="py-2 text-center font-mono text-red-500 font-bold">-{cand.violationScore}</td>
                        <td className="py-2 text-center">
                          {cand.isDisqualified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-100 text-red-700 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{cand.disqualificationReason}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{isFa ? 'بدون تشویق ثبت شده' : 'No reward entries'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {scoringData.disqualifiedOrInactive.filter(c => c.rewardCount > 0 || c.violationCount > 0).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400 font-medium">
                        {isFa ? 'هیچ موردی یافت نشد.' : 'No faulted or inactive entries.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
