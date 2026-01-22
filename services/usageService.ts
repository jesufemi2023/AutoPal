import { supabase } from '../auth/supabaseClient.ts';

/**
 * Usage Intelligence Service
 * Interacts with the secure 'usage_logs' table protected by the Database Governor.
 */

export const logFeatureUsage = async (userId: string, featureKey: string) => {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: userId,
        feature_key: featureKey
      }]);
    
    // CRITICAL: If the Database Governor (Trigger) blocks this, we catch and throw
    if (error) {
      const errMsg = error.message || "Unknown Usage Error";
      // Ensure we always throw a standard JS Error object
      if (errMsg.includes('QUOTA_EXHAUSTED')) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      throw new Error(errMsg);
    }
  } catch (e: any) {
    console.warn(`[QuotaEnforcement] Access Restricted: ${e.message}`);
    throw e;
  }
};

export const getMonthlyUsageCount = async (userId: string, featureKey: string): Promise<number> => {
  if (!supabase) return 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const { count, error } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;
    return count || 0;
  } catch (e) {
    return 0;
  }
};