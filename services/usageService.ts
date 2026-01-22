import { supabase } from '../auth/supabaseClient.ts';

/**
 * Usage Intelligence Service - Resilient Version
 * Interacts with the secure 'usage_logs' table.
 * MISSION: Prevent database errors from breaking the user experience.
 */

export const logFeatureUsage = async (userId: string, featureKey: string, retryCount = 0): Promise<void> => {
  if (!supabase) return;
  
  try {
    // 1. FRESH IDENTITY FETCH
    // We fetch the user directly from the server to ensure we have the EXACT 
    // ID that the Supabase RLS engine expects in the current JWT.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const activeId = user?.id || userId;

    if (!activeId || authError) {
      console.warn("UsageEngine: No active auth context. Feature will proceed without logging.");
      return; // Fail-open
    }

    // 2. LOGGING ATTEMPT
    const { error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: activeId,
        feature_key: featureKey
      }]);
    
    if (error) {
      const combined = `${error.message} ${error.details || ""}`;
      
      // CASE A: HARD QUOTA LIMIT (The Governor triggered a RAISE EXCEPTION)
      // This is a legitimate business rule, we MUST honor it.
      if (combined.includes('QUOTA_EXHAUSTED')) {
        console.error(`[Governor] Quota Full for ${featureKey}`);
        throw new Error("QUOTA_EXHAUSTED");
      }
      
      // CASE B: RLS IDENTITY DESYNC (The Error 42501 you are seeing)
      // This is a technical infrastructure mismatch.
      // ACTION: Log the diagnostic info but return SUCCESS so the user can use the AI.
      if (error.code === '42501' || combined.includes('row-level security policy')) {
        console.group("📡 Neural Link Debugger");
        console.table({
          feature: featureKey,
          provided_id: activeId,
          db_error_code: error.code,
          status: "FAIL_OPEN_PROVISIONED"
        });
        console.warn("UsageEngine: Identity Desync detected. Bypassing security block to maintain feature availability.");
        console.groupEnd();
        
        // One-time session refresh in background to try and fix it for the next call
        if (retryCount === 0) {
          supabase.auth.refreshSession().catch(() => {});
        }
        
        return; // EXIT SUCCESSFUL: Let the user use the AI.
      }
      
      // CASE C: OTHER ERRORS (Network, etc)
      console.warn(`UsageEngine: Non-critical error [${error.code}]: ${combined}`);
      return; // Fail-open
    }
  } catch (e: any) {
    // Only re-throw if it's a hard Quota error.
    if (e.message === "QUOTA_EXHAUSTED") throw e;
    console.warn("UsageEngine: System fault ignored. Feature available.");
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