import React from 'react';
import { Violation, Reward, SystemMode } from '../types';
import { AlertTriangle, Users, Activity, Medal, Star, ThumbsUp } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface DashboardStatsProps {
  violations?: Violation[];
  rewards?: Reward[];
  mode: SystemMode;
  language?: 'fa' | 'en';
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ violations = [], rewards = [], mode, language = 'fa' }) => {
  const t = TRANSLATIONS[language];

  if (mode === 'REWARD') {
    const totalRewards = rewards.length;
    const exemplaryCount = rewards.filter(r => r.rewardType === 'Exemplary').length;
    const uniqueRewarded = new Set(rewards.map(r => r.personnelId)).size;

    const cards = [
      {
        title: t.totalRewards,
        value: totalRewards,
        icon: <ThumbsUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />,
        bg: 'bg-emerald-50',
        border: 'border-emerald-100'
      },
      {
        title: t.exemplaryPersonnel,
        value: exemplaryCount,
        icon: <Medal className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />,
        bg: 'bg-yellow-50',
        border: 'border-yellow-100'
      },
      {
        title: t.honoredPersonnel,
        value: uniqueRewarded,
        icon: <Star className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />,
        bg: 'bg-blue-50',
        border: 'border-blue-100'
      }
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {cards.map((card, index) => (
          <div key={index} className={`p-4 md:p-6 rounded-2xl border ${card.bg} ${card.border} shadow-sm transition-transform hover:-translate-y-1`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                <h3 className="text-xl md:text-2xl font-bold text-gray-800">{card.value}</h3>
              </div>
              <div className={`p-2 rounded-xl bg-white bg-opacity-60`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // VIOLATION MODE
  const totalViolations = violations.length;
  const criticalViolations = violations.filter(v => v.severity === 'Critical' || v.severity === 'High').length;
  const uniqueEmployees = new Set(violations.map(v => v.personnelId)).size;

  const cards = [
    {
      title: t.totalViolations,
      value: totalViolations,
      icon: <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />,
      bg: 'bg-orange-50',
      border: 'border-orange-100'
    },
    {
      title: t.highRisk,
      value: criticalViolations,
      icon: <Activity className="w-5 h-5 md:w-6 md:h-6 text-red-600" />,
      bg: 'bg-red-50',
      border: 'border-red-100'
    },
    {
      title: t.personnel,
      value: uniqueEmployees,
      icon: <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {cards.map((card, index) => (
        <div key={index} className={`p-4 md:p-6 rounded-2xl border ${card.bg} ${card.border} shadow-sm transition-transform hover:-translate-y-1`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{card.title}</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-800">{card.value}</h3>
            </div>
            <div className={`p-2 rounded-xl bg-white bg-opacity-60`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;