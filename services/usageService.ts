import { supabase } from '../auth/supabaseClient.ts';

/**
 * Usage Intelligence Service
 * Interacts with the secure 'usage_logs' table protected by the Database Governor.
 */

export const logFeatureUsage = async (userId: string, featureKey: string, retryCount = 0): Promise<void> => {
  if (!supabase) return;
  
  try {
    // SECURITY HANDSHAKE:
    // getSession() is faster and less prone to RLS rejection than getUser() 
    // when we just need the local ID for a write operation.
    const { data: { session } } = await supabase.auth.getSession();
    const activeId = session?.user?.id || userId;

    if (!activeId) {
      throw new Error("AUTH_LOST");
    }

    // EXPLICIT BINDING: We must send the user_id to satisfy the 
    // 'WITH CHECK (auth.uid() = user_id)' RLS policy. 
    // Omitting it causes the check to run against a NULL value.
    const { error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: activeId,
        feature_key: featureKey
      }]);
    
    if (error) {
      const combined = `${error.message} ${error.details || ""}`;
      console.error(`[Governor Rejection] Code: ${error.code} | Msg: ${combined}`);

      // Case 1: Quota actually full
      if (combined.includes('QUOTA_EXHAUSTED')) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      
      // Case 2: RLS Policy blocked it (Identity Conflict)
      if (combined.includes('violates row-level security policy')) {
        // Attempt ONE session refresh if it looks like a token drift
        if (retryCount === 0) {
          console.warn("UsageEngine: Identity Desync. Refreshing...");
          await supabase.auth.refreshSession();
          return await logFeatureUsage(activeId, featureKey, 1);
        }
        throw new Error("IDENTITY_DESYNC");
      }
      
      throw new Error(combined || "Unknown Usage Error");
    }
  } catch (e: any) {
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
      .eq('feature_key', featureKey)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) return 0;
    return count || 0;
  } catch (e) {
    return 0;
  }
};