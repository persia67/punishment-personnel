import { Employee } from '../types';

export const DEFAULT_DEPARTMENTS_LIST: string[] = [
  'انتظامات',
  'فنی',
  'فنی - جوشکاری',
  'فنی - نقاشی',
  'فنی - ماشین سازی',
  'فنی - CNC',
  'فنی - هیدرولیک',
  'فنی - تعمیرات',
  'تولید',
  'تولید - اسیدشویی',
  'تولید - نورد سرد',
  'تولید - گالوانیزه',
  'تولید - شیت کن',
  'تولید - خط رنگی',
  'برق',
  'الکترونیک',
  'انفورماتیک',
  'اداری',
  'آموزش',
  'مالی',
  'فروش',
  'تاسیسات',
  'لیفتراک',
  'کالیبراسیون',
  'انبار',
  'بازرسی',
  'مشاوران شرکت',
  'ایمنی و بهداشت'
];

/**
 * Normalizes Persian & English characters for accurate string matching
 */
export const cleanString = (str: string): string => {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[آا]/g, 'ا')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ') // zero-width spaces
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Map of common department synonyms/aliases to standard canonical department names
 */
const DEPARTMENT_ALIASES: Array<{ keywords: string[]; canonical: string }> = [
  { keywords: ['هیدرولیک', 'hydraulics', 'hydraulik', 'هیدرولیک کار'], canonical: 'فنی - هیدرولیک' },
  { keywords: ['جوشکاری', 'جوشکار', 'welding', 'welder'], canonical: 'فنی - جوشکاری' },
  { keywords: ['نقاشی', 'نقاش', 'painting', 'painter'], canonical: 'فنی - نقاشی' },
  { keywords: ['ماشین سازی', 'ماشینسازی', 'machine building'], canonical: 'فنی - ماشین سازی' },
  { keywords: ['cnc', 'سی ان سی', 'سی‌ان‌سی'], canonical: 'فنی - CNC' },
  { keywords: ['تعمیرات', 'تعمیرکار', 'نگهداری', 'maintenance'], canonical: 'فنی - تعمیرات' },
  { keywords: ['اسیدشویی', 'اسید شویی', 'pickling'], canonical: 'تولید - اسیدشویی' },
  { keywords: ['نورد', 'نورد سرد', 'cold rolling', 'rolling'], canonical: 'تولید - نورد سرد' },
  { keywords: ['گالوانیزه', 'galvanizing', 'galvanize'], canonical: 'تولید - گالوانیزه' },
  { keywords: ['شیت کن', 'شیتکن', 'شیت', 'shearing'], canonical: 'تولید - شیت کن' },
  { keywords: ['خط رنگی', 'رنگی', 'color line'], canonical: 'تولید - خط رنگی' },
  { keywords: ['حراست', 'نگهبانی', 'انتظامات', 'security'], canonical: 'انتظامات' },
  { keywords: ['ایمنی', 'بهداشت', 'hse', 'سلامت', 'HSE'], canonical: 'ایمنی و بهداشت' },
  { keywords: ['تاسیسات', 'تأسیسات', 'facilities'], canonical: 'تاسیسات' },
  { keywords: ['انبار', 'انبارداری', 'warehouse', 'store'], canonical: 'انبار' },
  { keywords: ['برق', 'برقکاری', 'electrical'], canonical: 'برق' },
  { keywords: ['الکترونیک', 'electronics'], canonical: 'الکترونیک' },
  { keywords: ['انفورماتیک', 'it', 'آی تی', 'شبکه', 'کامپیوتر'], canonical: 'انفورماتیک' },
  { keywords: ['اداری', 'منابع انسانی', 'hr', 'اداری و منابع انسانی', 'human resources'], canonical: 'اداری' },
  { keywords: ['آموزش', 'training'], canonical: 'آموزش' },
  { keywords: ['مالی', 'حسابداری', 'finance', 'accounting'], canonical: 'مالی' },
  { keywords: ['فروش', 'بازاریابی', 'sales', 'marketing'], canonical: 'فروش' },
  { keywords: ['لیفتراک', 'لیفتراک ران', 'forklift'], canonical: 'لیفتراک' },
  { keywords: ['کالیبراسیون', 'calibration'], canonical: 'کالیبراسیون' },
  { keywords: ['بازرسی', 'کنترل کیفیت', 'qc', 'کیفیت', 'inspection'], canonical: 'بازرسی' },
  { keywords: ['مشاور', 'مشاوران', 'consultant'], canonical: 'مشاوران شرکت' },
];

/**
 * Intelligently matches a raw department string to the closest existing department in the menu.
 * If no match is found, marks it as a new department to be added to the department list.
 */
export const normalizeDepartmentName = (
  rawDept: string,
  currentDepartments: string[] = DEFAULT_DEPARTMENTS_LIST
): { normalized: string; isNew: boolean } => {
  if (!rawDept || !rawDept.trim()) {
    return { normalized: 'ثبت نشده', isNew: false };
  }

  const cleanedRaw = cleanString(rawDept);

  // 1. Direct exact or cleaned match against current departments
  for (const dept of currentDepartments) {
    if (cleanString(dept) === cleanedRaw) {
      return { normalized: dept, isNew: false };
    }
  }

  // 2. Check explicitly defined aliases (e.g., "هیدرولیک" -> "فنی - هیدرولیک")
  for (const alias of DEPARTMENT_ALIASES) {
    for (const kw of alias.keywords) {
      if (cleanString(kw) === cleanedRaw || cleanedRaw.includes(cleanString(kw))) {
        // Confirm the canonical target exists in current departments or default list
        const foundInList = currentDepartments.find(d => cleanString(d) === cleanString(alias.canonical));
        return { normalized: foundInList || alias.canonical, isNew: false };
      }
    }
  }

  // 3. Partial/Sub-string matching against existing departments
  // e.g., if user uploaded "هیدرولیک", check if "فنی - هیدرولیک" contains "هیدرولیک"
  for (const dept of currentDepartments) {
    const cleanedDept = cleanString(dept);
    if (cleanedDept.includes(cleanedRaw) || (cleanedRaw.length > 3 && cleanedDept.endsWith(cleanedRaw))) {
      return { normalized: dept, isNew: false };
    }
  }

  // 4. Reverse containment: if raw contains an existing department keyword (e.g. "واحد فنی بخش جوش" -> "فنی - جوشکاری")
  for (const dept of currentDepartments) {
    const cleanedDept = cleanString(dept);
    const parts = cleanedDept.split(' ');
    const mainSubPart = parts[parts.length - 1]; // e.g., "هیدرولیک" from "فنی هیدرولیک"
    if (mainSubPart && mainSubPart.length >= 3 && cleanedRaw.includes(mainSubPart)) {
      return { normalized: dept, isNew: false };
    }
  }

  // 5. Completely new department! Retain original formatted string and mark isNew
  const formattedNewDept = rawDept.trim();
  return { normalized: formattedNewDept, isNew: true };
};

/**
 * Processes an array of employees, normalizes their department fields,
 * and collects any brand-new departments discovered to append to the master list.
 */
export const processEmployeeDepartments = (
  employees: Employee[],
  existingDepartments: string[] = DEFAULT_DEPARTMENTS_LIST
): { updatedEmployees: Employee[]; updatedDepartments: string[]; newAddedCount: number } => {
  const currentDeptList = [...existingDepartments];
  const newDeptsAdded = new Set<string>();

  const updatedEmployees = employees.map(emp => {
    if (!emp.department) return emp;
    const { normalized, isNew } = normalizeDepartmentName(emp.department, currentDeptList);
    
    if (isNew && normalized !== 'ثبت نشده') {
      if (!currentDeptList.includes(normalized)) {
        currentDeptList.push(normalized);
        newDeptsAdded.add(normalized);
      }
    }

    return {
      ...emp,
      department: normalized
    };
  });

  return {
    updatedEmployees,
    updatedDepartments: currentDeptList,
    newAddedCount: newDeptsAdded.size
  };
};

/**
 * Gets master list of departments combining default and custom stored ones
 */
export const getMasterDepartments = (customDepartments?: string[]): string[] => {
  const combined = new Set<string>([...DEFAULT_DEPARTMENTS_LIST]);

  if (customDepartments && Array.isArray(customDepartments)) {
    customDepartments.forEach(d => {
      if (d && d.trim()) combined.add(d.trim());
    });
  }

  // Also check localStorage
  try {
    const stored = localStorage.getItem('sg_custom_departments');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach(d => {
          if (d && d.trim()) combined.add(d.trim());
        });
      }
    }
  } catch {
    // Ignore localStorage read error
  }

  return Array.from(combined);
};

/**
 * Saves updated master department list to localStorage
 */
export const saveMasterDepartments = (departments: string[]): void => {
  try {
    const customList = departments.filter(d => !DEFAULT_DEPARTMENTS_LIST.includes(d));
    localStorage.setItem('sg_custom_departments', JSON.stringify(customList));
  } catch {
    // Ignore storage errors
  }
};
