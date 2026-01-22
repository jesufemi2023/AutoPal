import { supabase } from '../auth/supabaseClient.ts';

/**
 * Usage Intelligence Service
 * Interacts with the secure 'usage_logs' table protected by the Database Governor.
 */

export const logFeatureUsage = async (userId: string, featureKey: string, retryCount = 0): Promise<void> => {
  if (!supabase) return;
  
  try {
    // SECURITY HANDSHAKE:
    // getUser() is the definitive way to ensure the Supabase client has 
    // a fresh, valid JWT token for the upcoming RLS-protected request.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Fallback to provided userId if getUser fails, though getUser is preferred for RLS.
    const activeId = user?.id || userId;

    if (!activeId) {
      throw new Error("AUTH_LOST");
    }

    // EXPLICIT BINDING: We send user_id to satisfy RLS.
    const { error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: activeId,
        feature_key: featureKey
      }]);
    
    if (error) {
      const combined = `${error.message} ${error.details || ""}`;
      
      // Case 1: Hard Quota Rejection (Governor Trigger)
      if (combined.includes('QUOTA_EXHAUSTED')) {
        throw new Error("QUOTA_EXHAUSTED");
      }
      
      // Case 2: RLS Policy / Identity Conflict (Code 42501)
      if (error.code === '42501' || combined.includes('violates row-level security policy')) {
        if (retryCount === 0) {
          console.warn("UsageEngine: Identity Desync (42501). Refreshing neural session...");
          await supabase.auth.refreshSession();
          return await logFeatureUsage(activeId, featureKey, 1);
        }
        // FAIL-OPEN: If RLS still fails after retry, we throw a specific error
        // that the UI can catch and decide to ignore (allowing the AI to run).
        throw new Error("IDENTITY_DESYNC_NON_FATAL");
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