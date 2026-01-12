
import { supabase } from '../auth/supabaseClient.ts';
import { MaintenanceScheduleResponse } from '../shared/types.ts';

/**
 * Roadmap Template Service
 * Implements a "Template Factory" pattern to reuse AI roadmaps across 
 * thousands of users, reducing Gemini API hits to near zero for common cars.
 */

export const getCachedRoadmap = async (make: string, model: string, year: number): Promise<MaintenanceScheduleResponse | null> => {
  if (!supabase) return null;

  try {
    // We look for a template that covers this specific year or a close range
    const { data, error } = await supabase
      .from('roadmap_templates')
      .select('template_data')
      .ilike('make', make)
      .ilike('model', model)
      .lte('year_start', year)
      .gte('year_end', year)
      .maybeSingle();

    if (error) {
      console.warn("Template Search Error:", error);
      return null;
    }
    
    return data?.template_data as MaintenanceScheduleResponse || null;
  } catch (e) {
    return null;
  }
};

export const saveRoadmapTemplate = async (make: string, model: string, year: number, roadmap: MaintenanceScheduleResponse) => {
  if (!supabase) return;

  try {
    // When saving, we assume the same engineering specs for +/- 3 years
    // This allows one Gemini call to serve 7 model years of the same car generation.
    await supabase
      .from('roadmap_templates')
      .insert([{
        make,
        model,
        year_start: year - 3,
        year_end: year + 3,
        template_data: roadmap
      }]);
  } catch (e) {
    console.error("Template Factory Storage Failure:", e);
  }
};
