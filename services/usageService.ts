import { supabase } from '../auth/supabaseClient.ts';

/**
 * Usage Intelligence Service
 * Interacts with the secure 'usage_logs' table protected by the Database Governor.
 */

export const logFeatureUsage = async (userId: string, featureKey: string) => {
  if (!supabase) return;
  
  try {
    // SECURITY HANDSHAKE: 
    // Instead of trusting the userId passed from the UI state (which can be stale),
    // we fetch the current session's UID directly from the auth client.
    const { data: { session } } = await supabase.auth.getSession();
    const activeUid = session?.user?.id;

    if (!activeUid) {
      throw new Error("AUTH_LOST");
    }

    const { error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: activeUid, // Force alignment with session UID
        feature_key: featureKey
      }]);
    
    if (error) {
      const detailMsg = error.details || "";
      const mainMsg = error.message || "";
      const combined = `${mainMsg} ${detailMsg}`;
      
      console.error(`[Governor Rejection] Code: ${error.code} | Msg: ${combined}`);

      // Case 1: Database Governor Trigger blocked it (Quota Full)
      if (combined.includes('QUOTA_EXHAUSTED')) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      
      // Case 2: RLS Policy blocked it (Persistent Identity Mismatch)
      if (combined.includes('violates row-level security policy')) {
        throw new Error("IDENTITY_DESYNC");
      }
      
      // Case 3: Infrastructure Fault (Table missing)
      if (error.code === '42P01') {
        throw new Error("Infrastructure missing: 'usage_logs' table not deployed.");
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
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) return 0;
    return count || 0;
  } catch (e) {
    return 0;
  }
};