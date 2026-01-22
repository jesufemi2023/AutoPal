import { supabase } from '../auth/supabaseClient.ts';

/**
 * Usage Intelligence Service
 * Interacts with the secure 'usage_logs' table protected by the Database Governor.
 */

export const logFeatureUsage = async (userId: string, featureKey: string, retryCount = 0): Promise<void> => {
  if (!supabase) return;
  
  try {
    // SECURITY HANDSHAKE:
    // getUser() re-validates the JWT with the server and ensures the client
    // instance has the most up-to-date Authorization headers.
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (!user || userError) {
      throw new Error("AUTH_LOST");
    }

    // SURGICAL FIX: We omit 'user_id' from the payload.
    // The database column has 'DEFAULT auth.uid()'. 
    // This allows the server to handle the identity mapping via the JWT, 
    // which is the only 100% reliable way to pass RLS checks.
    const { error } = await supabase
      .from('usage_logs')
      .insert([{
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
      
      // Case 2: RLS Policy blocked it (Identity Conflict)
      if (combined.includes('violates row-level security policy') && retryCount === 0) {
        console.warn("UsageEngine: Identity Desync detected. Refreshing session and retrying...");
        await supabase.auth.refreshSession();
        return await logFeatureUsage(userId, featureKey, 1);
      }

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
      .eq('feature_key', featureKey)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) return 0;
    return count || 0;
  } catch (e) {
    return 0;
  }
};