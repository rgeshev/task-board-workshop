import { supabase } from '../supabase.js';

const DEFAULT_STAGES = [
  { name: 'Not Started', position: 0 },
  { name: 'In Progress', position: 1 },
  { name: 'Done', position: 2 },
];

function mapProjectStats(project) {
  const stages = project.project_stages ?? [];
  const tasks = project.tasks ?? [];

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    created_at: project.created_at,
    stageCount: stages.length,
    openTaskCount: tasks.filter((task) => !task.done).length,
    doneTaskCount: tasks.filter((task) => task.done).length,
  };
}

export async function fetchProjectsWithStats() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      description,
      created_at,
      project_stages ( id ),
      tasks ( done )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapProjectStats);
}

export async function fetchProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, description, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createDefaultStages(projectId) {
  const rows = DEFAULT_STAGES.map((stage) => ({
    project_id: projectId,
    name: stage.name,
    position: stage.position,
  }));

  const { error } = await supabase.from('project_stages').insert(rows);
  if (error) throw error;
}

export async function createProject({ title, description }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error('You must be logged in to create a project.');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      owner_id: user.id,
    })
    .select('id, title, description, created_at')
    .single();

  if (error) throw error;

  await createDefaultStages(data.id);
  return data;
}

export async function updateProject(id, { title, description }) {
  const { data, error } = await supabase
    .from('projects')
    .update({
      title: title.trim(),
      description: description?.trim() || null,
    })
    .eq('id', id)
    .select('id, title, description, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// Kept for compatibility with dashboard and other callers.
export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, description, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
