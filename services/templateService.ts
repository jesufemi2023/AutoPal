
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
    const { data, error } = await supabase
      .from('roadmap_templates')
      .select('template_data')
      .ilike('make', make)
      .ilike('model', model)
      .lte('year_start', year)
      .gte('year_end', year)
      .maybeSingle();

    if (error) return null;
    return data?.template_data as MaintenanceScheduleResponse || null;
  } catch (e) {
    return null;
  }
};

export const saveRoadmapTemplate = async (make: string, model: string, year: number, roadmap: MaintenanceScheduleResponse) => {
  if (!supabase) return;

  try {
    // We save a range (e.g. +/- 2 years) to make the template more reusable
    await supabase
      .from('roadmap_templates')
      .insert([{
        make,
        model,
        year_start: year - 2,
        year_end: year + 2,
        template_data: roadmap
      }]);
  } catch (e) {
    console.error("Template Save Error:", e);
  }
};
