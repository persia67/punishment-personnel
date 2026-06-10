import { GoogleGenAI } from "@google/genai";
import { Violation, Reward, WorkerOfMonthResult } from "../types";

const getApiKey = (): string => {
  try {
    const stored = localStorage.getItem('sg_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.customApiKey && settings.customApiKey.trim() !== '') {
        return settings.customApiKey;
      }
    }
  } catch (e) {
    console.error("Error reading settings", e);
  }
  // Safe guard access to process.env in browser environment
  const envKey = typeof process !== 'undefined' && process?.env ? process.env.API_KEY : '';
  return envKey || '';
};

export const generateSafetyReport = async (violations: Violation[]): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const dataString = JSON.stringify(violations.map(v => ({
      type: v.violationType,
      severity: v.severity,
      penalties: v.penaltyActions,
      date: v.date
    })));

    const prompt = `
      به عنوان یک متخصص ارشد HSE، داده های زیر را تحلیل کن.
      داده ها: ${dataString}
      یک گزارش مدیریتی کوتاه و حرفه ای به زبان فارسی بنویس که شامل خلاصه وضعیت، الگوها و پیشنهادات باشد.
      پاسخ باید با فرمت Markdown باشد.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "خطا در تولید گزارش.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "متاسفانه در حال حاضر امکان برقراری ارتباط با هوش مصنوعی وجود ندارد. لطفا کلید API را بررسی کنید.";
  }
};

export const selectWorkerOfMonth = async (rewards: Reward[], violations: Violation[]): Promise<WorkerOfMonthResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    // Prepare comparative data
    const rewardsData = rewards.filter(r => r.isApproved).map(r => ({
      name: r.employeeName,
      id: r.personnelId,
      type: r.rewardType,
      description: r.description,
      date: r.date
    }));

    const violationIds = new Set(violations.map(v => v.personnelId));

    const prompt = `
      به عنوان یک مدیر منابع انسانی و HSE، از بین لیست پرسنل تشویق شده زیر، "کارگر نمونه ماه" را انتخاب کن.
      
      لیست تشویق شدگان:
      ${JSON.stringify(rewardsData)}
      
      لیست سیاه (کسانی که در این ماه تخلف داشته اند و نباید انتخاب شوند):
      ${Array.from(violationIds).join(', ')}

      معیارهای انتخاب:
      1. تعداد تشویق ها در این ماه.
      2. اهمیت نوع تشویق (PPEUsage و SafeMethod اولویت بالاتری دارند).
      3. شرح دقیق اقدامات مثبت.
      
      خروجی باید دقیقاً با فرمت JSON زیر باشد (فقط JSON و هیچ متن اضافه ای ننویس):
      {
        "winnerId": "کد پرسنلی نفر برنده",
        "winnerName": "نام نفر برنده",
        "reasoning": "دلیل انتخاب به صورت فارسی و حرفه ای در 3 جمله",
        "period": "اردیبهشت 1403"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Worker of Month AI Error:", error);
    throw error;
  }
};