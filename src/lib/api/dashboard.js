import { supabase } from '../supabase.js';

export async function fetchDashboardStats() {
  const [projectsResult, openTasksResult, doneTasksResult] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('done', false),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('done', true),
  ]);

  if (projectsResult.error) throw projectsResult.error;
  if (openTasksResult.error) throw openTasksResult.error;
  if (doneTasksResult.error) throw doneTasksResult.error;

  return {
    projectCount: projectsResult.count ?? 0,
    openTaskCount: openTasksResult.count ?? 0,
    doneTaskCount: doneTasksResult.count ?? 0,
  };
}
