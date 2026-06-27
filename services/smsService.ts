import { SmsConfig, SmsLog } from '../types';

const CONFIG_KEY = 'sg_sms_config';
const LOGS_KEY = 'sg_sms_logs';

const DEFAULT_CONFIG: SmsConfig = {
  isEnabled: false,
  provider: 'SIMULATOR',
  apiKey: '',
  senderLine: '3000505',
  warningTemplate: 'همکار گرامی {name}، در تاریخ {date} اخطاری به علت {reason} در پرونده پرسنلی شما ثبت گردید.',
  rewardTemplate: 'همکار گرامی {name}، در تاریخ {date} تشویقی به علت {reason} در پرونده پرسنلی شما ثبت گردید.'
};

export function getSmsConfig(): SmsConfig {
  const data = localStorage.getItem(CONFIG_KEY);
  if (!data) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function saveSmsConfig(config: SmsConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getSmsLogs(): SmsLog[] {
  const data = localStorage.getItem(LOGS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveSmsLogs(logs: SmsLog[]): void {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function addSmsLog(log: Omit<SmsLog, 'id' | 'date'>): SmsLog {
  const logs = getSmsLogs();
  const newLog: SmsLog = {
    ...log,
    id: Date.now().toString() + Math.random().toString().slice(2, 6),
    date: new Date().toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  };
  saveSmsLogs([newLog, ...logs]);
  return newLog;
}

export async function sendNotificationSms(
  employeeName: string,
  phoneNumber: string,
  type: 'WARNING' | 'REWARD',
  date: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const config = getSmsConfig();
  
  if (!config.isEnabled) {
    return { success: false, message: 'SMS service is disabled.' };
  }

  if (!phoneNumber) {
    return { success: false, message: 'Employee has no registered phone number.' };
  }

  // Choose template
  const template = type === 'WARNING' ? config.warningTemplate : config.rewardTemplate;
  
  // Format message text
  const messageText = template
    .replace(/{name}/g, employeeName)
    .replace(/{date}/g, date)
    .replace(/{reason}/g, reason)
    .replace(/{type}/g, type === 'WARNING' ? 'اخطار' : 'تشویق');

  // Prepare placeholders
  const placeholders = {
    name: employeeName,
    date,
    reason,
    type: type === 'WARNING' ? 'اخطار' : 'تشویق' as any
  };

  try {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config,
        recipientPhone: phoneNumber,
        message: messageText,
        placeholders
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      addSmsLog({
        recipientName: employeeName,
        recipientPhone: phoneNumber,
        type,
        message: messageText,
        status: 'SUCCESS',
        provider: config.provider,
        responseMessage: result.message || 'Sent successfully'
      });
      return { success: true, message: result.message };
    } else {
      addSmsLog({
        recipientName: employeeName,
        recipientPhone: phoneNumber,
        type,
        message: messageText,
        status: 'FAILED',
        provider: config.provider,
        responseMessage: result.message || 'Failed to send'
      });
      return { success: false, message: result.message || 'Failed to send via API.' };
    }
  } catch (error: any) {
    console.error('Failed to send SMS through server API:', error);
    addSmsLog({
      recipientName: employeeName,
      recipientPhone: phoneNumber,
      type,
      message: messageText,
      status: 'FAILED',
      provider: config.provider,
      responseMessage: error.message || 'Network or server failure'
    });
    return { success: false, message: error.message || 'Network error occurred.' };
  }
}
