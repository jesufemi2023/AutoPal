import { UserProfile, Tier } from '../shared/types.ts';

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  cooldownDays?: number;
}

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
  },
  standard: {
    maxVehicles: 3,
    serviceLogsMonthly: 12,
    fuelLogsMonthly: 8,
    aiAuditsMonthly: 4,
    aiDiagnosisMonthly: 1,
    aiDiagnosisYearly: 17,
    hasReports: true,
    hasGeneralReport: false,
  },
  premium: {
    maxVehicles: 999, // Unlimited
    serviceLogsMonthly: 999, // Unlimited
    fuelLogsMonthly: 8,
    aiAuditsMonthly: 4,
    aiDiagnosisMonthly: 4,
    aiDiagnosisYearly: 65,
    hasReports: true,
    hasGeneralReport: true,
  }
};

/**
 * Checks if the 30-day period has passed and resets the ledger if needed.
 */
export const syncLedgerPeriod = (user: UserProfile): UserProfile => {
  const now = new Date();
  const start = new Date(user.usageLedger.periodStart);
  const diffDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

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
        // aiDiagnosisYearlyCount does NOT reset every 30 days
      }
    };
  }
  return user;
};

export const canAddVehicle = (user: UserProfile, currentCount: number): PermissionResult => {
  const quota = QUOTAS[user.tier].maxVehicles;
  if (currentCount >= quota) {
    return { allowed: false, reason: `Tier limit reached. Your plan allows ${quota} active vehicle.` };
  }
  return { allowed: true, remaining: quota - currentCount };
};

export const canLogService = (user: UserProfile): PermissionResult => {
  const quota = QUOTAS[user.tier].serviceLogsMonthly;
  const ledger = user.usageLedger;

  // 1. Check Monthly Quota
  if (ledger.serviceLogsCount >= quota) {
    return { allowed: false, reason: `Monthly log limit (${quota}) reached.` };
  }

  // 2. Check Weekly Cooldown (1 per week)
  if (ledger.lastServiceLogAt) {
    const last = new Date(ledger.lastServiceLogAt);
    const diff = (new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 7) {
      return { 
        allowed: false, 
        reason: `Maintenance Cooldown Active. Next log available in ${Math.ceil(7 - diff)} days.`,
        cooldownDays: Math.ceil(7 - diff)
      };
    }
  }

  return { allowed: true, remaining: quota - ledger.serviceLogsCount };
};

export const canLogFuel = (user: UserProfile): PermissionResult => {
  const quota = QUOTAS[user.tier].fuelLogsMonthly;
  const ledger = user.usageLedger;

  if (ledger.fuelLogsCount >= quota) {
    return { allowed: false, reason: `Monthly fuel log limit (${quota}) reached.` };
  }
  return { allowed: true, remaining: quota - ledger.fuelLogsCount };
};

export const canRunAiAudit = (user: UserProfile): PermissionResult => {
  const quota = QUOTAS[user.tier].aiAuditsMonthly;
  const ledger = user.usageLedger;

  if (ledger.aiAuditsCount >= quota) {
    return { allowed: false, reason: `Monthly AI Audit limit reached.` };
  }

  // AI Audits also have a 7-day cooldown (1 per week)
  if (ledger.lastAiAuditAt) {
    const last = new Date(ledger.lastAiAuditAt);
    const diff = (new Date().getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 7) {
      return { allowed: false, reason: `AI Audit cooldown active. Try again in ${Math.ceil(7 - diff)} days.` };
    }
  }

  return { allowed: true };
};

export const canUseAiDiagnosis = (user: UserProfile): PermissionResult => {
  const tierQuotas = QUOTAS[user.tier];
  const ledger = user.usageLedger;

  if (tierQuotas.aiDiagnosisMonthly === 0) {
    return { allowed: false, reason: "AI Diagnosis is a Standard feature." };
  }

  if (ledger.aiDiagnosisCount >= tierQuotas.aiDiagnosisMonthly) {
    return { allowed: false, reason: `Monthly AI Diagnostic limit (${tierQuotas.aiDiagnosisMonthly}) reached.` };
  }

  if (ledger.aiDiagnosisYearlyCount >= tierQuotas.aiDiagnosisYearly) {
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