import React from 'react';

export enum Severity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

// Changed to string to allow custom departments like 'Facilities' (Tasisat)
export type Department = 'HSE' | 'SECURITY' | 'TRAINING' | 'ADMIN' | 'HR' | string;

export interface Employee {
  id: string;
  personnelId: string;
  fullName: string;
  department: string;
  jobTitle?: string;
  nationalId?: string;
  hireDate?: string;
  phoneNumber?: string;
}

export interface Violation {
  id: string;
  employeeName: string;
  personnelId: string;
  department: string; // The employee's working department
  departmentSource: Department; // Which department reported this?
  reporterName: string;
  date: string;
  violationType: string;
  violationCode: number; // Stored code
  description: string;
  severity: Severity;
  score: number; // Negative value
  penaltyActions: string[]; 
  violationStage: number; 
  evidence?: string; 
  isArchived?: boolean; 
  committeeVerdict?: string; 
  status: 'Pending' | 'Paid' | 'Appealed';
  isApproved: boolean;
  rejectionReason?: string;
}

export type RewardType = 
  | 'SafetyPrinciples' 
  | 'PPEUsage'          
  | 'SafeMethod'        
  | 'Innovation'        
  | 'CrisisManagement'  
  | 'SecurityAlertness' // New
  | 'TrainingExcellence' // New
  | 'AdminDiscipline' // New
  | 'Other';

export interface Reward {
  id: string;
  employeeName: string;
  personnelId: string;
  department: string;
  departmentSource: Department; // Which department reported this?
  reporterName: string;
  date: string;
  rewardType: RewardType;
  rewardCode: number; // Stored code
  description: string;
  score: number; // Positive value
  rewardsGiven: string[];
  evidence?: string;
  isApproved: boolean;
  isArchived?: boolean;
}

export interface WorkerOfMonthResult {
  winnerId: string;
  winnerName: string;
  reasoning: string;
  period: string;
}

export type SystemMode = 'VIOLATION' | 'REWARD';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

export interface ReporterStat {
  name: string;
  totalReports: number;
  approvedReports: number;
  lastReportDate: string;
}

export type Role = 
  | 'DEVELOPER'       // Full Access + System Tools
  | 'PLANT_MANAGER'   // Sees ALL
  | 'HR_MANAGER'      // Sees ALL
  | 'HSE_MANAGER'     // Sees HSE
  | 'HSE_OFFICER'     // Sees HSE
  | 'SECURITY_MANAGER'// Sees SECURITY (Entezamat)
  | 'TRAINING_MANAGER'// Sees TRAINING (Amozesh)
  | 'ADMIN_STAFF'     // Sees ADMIN (Edari)
  | 'DEPARTMENT_MANAGER'; // Custom Department (e.g. Facilities)

export type Language = 'fa' | 'en';
export type ThemeColor = 'red' | 'blue' | 'green' | 'violet' | 'slate';

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: Role;
  avatar?: string;
  managedDepartment?: string; // For DEPARTMENT_MANAGER role
  phoneNumber?: string;
  email?: string;
  telegramUsername?: string;
}

export interface AppSettings {
  language: Language;
  themeColor: ThemeColor;
  companyLogo: string | null;
  companyName: string;
  customApiKey?: string;
  aiProvider?: 'GEMINI' | 'OLLAMA' | 'LOCAL_HF' | 'SIMULATOR';
  ollamaUrl?: string;
  ollamaModel?: string;
  localHfUrl?: string;
  localHfModel?: string;
  autoOfflineFailover?: boolean;
}

export interface CodeItem {
  id: string; // Added ID for easier management
  code: number;
  label: string;
  score: number; // Impact on personnel score
  department: Department;
}

export interface SmsConfig {
  isEnabled: boolean;
  provider: 'KAVENEGAR' | 'FARAZSMS' | 'MELIPAYAMAK' | 'SMSIR' | 'CUSTOM' | 'SIMULATOR';
  apiKey: string;
  senderLine: string;
  warningTemplate: string; // e.g. "همکار گرامی {name}، در تاریخ {date} اخطاری به علت {reason} در پرونده شما ثبت گردید."
  rewardTemplate: string;  // e.g. "همکار گرامی {name}، در تاریخ {date} تشویقی به علت {reason} در پرونده شما ثبت گردید."
  customUrl?: string;
  customMethod?: 'GET' | 'POST';
  customHeaders?: string; // JSON headers
  customBodyTemplate?: string; // JSON body with placeholders
}

export interface SmsLog {
  id: string;
  recipientName: string;
  recipientPhone: string;
  type: 'WARNING' | 'REWARD';
  message: string;
  date: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  provider: string;
  responseMessage?: string;
}