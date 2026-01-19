
import { UserProfile, Tier } from '../shared/types.ts';

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  cooldownDays?: number;
}

/**
 * PRODUCTION QUOTA REGISTRY
 * Defines the operational boundaries for each user tier.
 */
export const QUOTAS = {
  free: {
    maxVehicles: 1,
    serviceLogsMonthly: 4,
    fuelLogsMonthly: 2,
    aiAuditsMonthly: 1,
    aiDiagnosisMonthly: 0,
    aiDiagnosisYearly: 0,
    hasReports: false,
    hasGeneralReport: false,
    isCloudSynced: false, // Free tier stays on IndexedDB/Local only
  },
  standard: {
    maxVehicles: 3,
    serviceLogsMonthly: 12,
    fuelLogsMonthly: 8,
    aiAuditsMonthly: 4,
    aiDiagnosisMonthly: 1,
    aiDiagnosisYearly: 12,
    hasReports: true,
    hasGeneralReport: false,
    isCloudSynced: true,
  },
  premium: {
    maxVehicles: 999, // Unlimited
    serviceLogsMonthly: 999, // Unlimited
    fuelLogsMonthly: 20,
    aiAuditsMonthly: 8,
    aiDiagnosisMonthly: 5,
    aiDiagnosisYearly: 60,
    hasReports: true,
    hasGeneralReport: true,
    isCloudSynced: true,
  }
};

/**
 * Logic to check and reset the 30-day usage window.
 */
export const syncLedgerPeriod = (user: UserProfile): UserProfile => {
  const now = new Date();
  const start = new Date(user.usageLedger.periodStart || now.toISOString());
  const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  // If 30 days have passed, reset the "punch card"
  if (diffDays >= 30) {
    return {
      ...user,
      usageLedger: {
        ...user.usageLedger,
        periodStart: now.toISOString(),
        serviceLogsCount: 0,
        fuelLogsCount: 0,
        aiAuditsCount: 0,
        aiDiagnosisCount: 0,
        // Yearly count does NOT reset here
      }
    };
  }
  return user;
};

export const canAddVehicle = (user: UserProfile, currentCount: number): PermissionResult => {
  const quota = QUOTAS[user.tier].maxVehicles;
  if (currentCount >= quota) {
    return { allowed: false, reason: `Tier limit reached. Your plan allows ${quota} active vehicle${quota > 1 ? 's' : ''}.` };
  }
  return { allowed: true, remaining: quota - currentCount };
};

export const canLogService = (user: UserProfile): PermissionResult => {
  const quota = QUOTAS[user.tier].serviceLogsMonthly;
  const ledger = user.usageLedger;

  // 1. Check Monthly Quota
  if (ledger.serviceLogsCount >= quota) {
    return { allowed: false, reason: `Monthly log limit (${quota}) reached for your tier.` };
  }

  // 2. Check Frequency Cooldown for Free Users (1 per week)
  if (user.tier === 'free' && ledger.lastServiceLogAt) {
    const last = new Date(ledger.lastServiceLogAt);
    const diff = (new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 7) {
      return { 
        allowed: false, 
        reason: `Free tier allows 1 log per week. Available in ${Math.ceil(7 - diff)} days.`,
        cooldownDays: Math.ceil(7 - diff)
      };
    }
  }

  return { allowed: true, remaining: quota - (ledger.serviceLogsCount || 0) };
};

export const canLogFuel = (user: UserProfile): PermissionResult => {
  const quota = QUOTAS[user.tier].fuelLogsMonthly;
  const ledger = user.usageLedger;

  if (ledger.fuelLogsCount >= quota) {
    return { allowed: false, reason: `Monthly fuel log limit (${quota}) reached.` };
  }
  return { allowed: true, remaining: quota - (ledger.fuelLogsCount || 0) };
};

export const canRunAiAudit = (user: UserProfile): PermissionResult => {
  const quota = QUOTAS[user.tier].aiAuditsMonthly;
  const ledger = user.usageLedger;

  if (ledger.aiAuditsCount >= quota) {
    return { allowed: false, reason: `Monthly AI Audit limit (${quota}) reached.` };
  }

  // AI Audits have a 7-day cooldown for non-premium to manage API costs
  if (user.tier !== 'premium' && ledger.lastAiAuditAt) {
    const last = new Date(ledger.lastAiAuditAt);
    const diff = (new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 7) {
      return { allowed: false, reason: `Weekly AI Audit limit reached. Try again in ${Math.ceil(7 - diff)} days.` };
    }
  }

  return { allowed: true };
};

export const canUseAiDiagnosis = (user: UserProfile): PermissionResult => {
  const tierQuotas = QUOTAS[user.tier];
  const ledger = user.usageLedger;

  if (tierQuotas.aiDiagnosisMonthly === 0) {
    return { allowed: false, reason: "AI Diagnosis requires Standard or Premium access." };
  }

  if ((ledger.aiDiagnosisCount || 0) >= tierQuotas.aiDiagnosisMonthly) {
    return { allowed: false, reason: `Monthly AI Diagnostic limit (${tierQuotas.aiDiagnosisMonthly}) reached.` };
  }

  if ((ledger.aiDiagnosisYearlyCount || 0) >= tierQuotas.aiDiagnosisYearly) {
    return { allowed: false, reason: `Yearly AI Diagnostic limit (${tierQuotas.aiDiagnosisYearly}) reached.` };
  }

  return { allowed: true };
};

export const hasExportAccess = (user: UserProfile): boolean => {
  return QUOTAS[user.tier].hasReports;
};

export const hasGeneralReportAccess = (user: UserProfile): boolean => {
  return QUOTAS[user.tier].hasGeneralReport;
};
