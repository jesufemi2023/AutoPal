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
    
    // CRITICAL: Extract the actual database message
    if (error) {
      // Supabase errors often wrap the PG message in the 'message' property
      // If it's a RAISE EXCEPTION, it will be clearly strings in error.message
      const detailMsg = error.details || "";
      const mainMsg = error.message || "";
      const combined = `${mainMsg} ${detailMsg}`;
      
      console.error(`[Governor Rejection] Code: ${error.code} | Msg: ${combined}`);

      if (combined.includes('QUOTA_EXHAUSTED')) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      
      // If it's a 404, the table is missing
      if (error.code === '42P01') {
        throw new Error("Infrastructure missing: 'usage_logs' table not deployed.");
      }

      throw new Error(combined || "Unknown Usage Error");
    }
  } catch (e: any) {
    // Re-throw standardized errors
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

    if (error) return 0;
    return count || 0;
  } catch (e) {
    return 0;
  }
};