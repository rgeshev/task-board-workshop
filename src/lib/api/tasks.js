import { supabase } from '../supabase.js';

export async function fetchProjectBoard(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      description,
      project_stages (
        id,
        name,
        position
      ),
      tasks (
        id,
        title,
        description,
        position,
        done,
        stage_id
      )
    `)
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const stages = (data.project_stages ?? []).sort((a, b) => a.position - b.position);
  const tasks = (data.tasks ?? []).sort((a, b) => a.position - b.position);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    stages,
    tasks,
  };
}

async function nextTaskPosition(stageId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('position')
    .eq('stage_id', stageId)
    .order('position', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.length ? data[0].position + 1 : 0;
}

export async function createTask({ projectId, stageId, title, description }) {
  const position = await nextTaskPosition(stageId);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      stage_id: stageId,
      title: title.trim(),
      description: description?.trim() || null,
      position,
      done: false,
    })
    .select('id, title, description, position, done, stage_id')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(taskId, { title, description, stageId, done }) {
  const payload = {};

  if (title != null) payload.title = title.trim();
  if (description != null) payload.description = description.trim() || null;
  if (stageId != null) payload.stage_id = stageId;
  if (done != null) payload.done = done;

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .select('id, title, description, position, done, stage_id')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function toggleTaskDone(taskId, done) {
  return updateTask(taskId, { done });
}
