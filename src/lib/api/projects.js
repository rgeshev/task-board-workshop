import { supabase } from '../supabase.js';

export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, description, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
