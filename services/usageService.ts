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
    
    if (error) {
      if (error.message.includes('QUOTA_EXHAUSTED')) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      throw error;
    }
  } catch (e: any) {
    console.warn(`[QuotaEnforcement] Access Restricted: ${e.message}`);
    throw e;
  }
};

/**
 * Cycle-Based Usage Fetching
 * Uses the user's lastBillingResetAt to define the start of the current cycle.
 */
export const getMonthlyUsageCount = async (userId: string, featureKey: string, resetAnchor?: string): Promise<number> => {
  if (!supabase) return 0;

  // Fallback to 30 days ago only if anchor is missing (should not happen for logged users)
  const defaultAnchor = new Date();
  defaultAnchor.setDate(defaultAnchor.getDate() - 30);
  const filterDate = resetAnchor || defaultAnchor.toISOString();

  try {
    const { count, error } = await supabase
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .gte('created_at', filterDate);

    if (error) throw error;
    return count || 0;
  } catch (e) {
    return 0;
  }
};