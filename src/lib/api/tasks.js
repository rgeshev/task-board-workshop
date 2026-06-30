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
        stage_id,
        due_date
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

export async function createTask({ projectId, stageId, title, description, dueDate }) {
  const position = await nextTaskPosition(stageId);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      stage_id: stageId,
      title: title.trim(),
      description: description?.trim() || null,
      due_date: dueDate || null,
      position,
      done: false,
    })
    .select('id, title, description, position, done, stage_id, due_date')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(taskId, { title, description, stageId, done, position, dueDate }) {
  const payload = {};

  if (title != null) payload.title = title.trim();
  if (description != null) payload.description = description.trim() || null;
  if (stageId != null) payload.stage_id = stageId;
  if (done != null) payload.done = done;
  if (position != null) payload.position = position;
  if (dueDate !== undefined) payload.due_date = dueDate || null;

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .select('id, title, description, position, done, stage_id, due_date')
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

export function computeTaskMoveUpdates(board, taskId, toStageId, toIndex) {
  const task = board.tasks.find((item) => item.id === taskId);
  if (!task) return [];

  const fromStageId = task.stage_id;
  const targetTasks = board.tasks
    .filter((item) => item.stage_id === toStageId && item.id !== taskId)
    .sort((a, b) => a.position - b.position);

  const clampedIndex = Math.max(0, Math.min(toIndex, targetTasks.length));
  targetTasks.splice(clampedIndex, 0, task);

  const updates = targetTasks.map((item, index) => ({
    id: item.id,
    stage_id: toStageId,
    position: index,
  }));

  if (fromStageId !== toStageId) {
    const sourceTasks = board.tasks
      .filter((item) => item.stage_id === fromStageId && item.id !== taskId)
      .sort((a, b) => a.position - b.position);

    sourceTasks.forEach((item, index) => {
      updates.push({
        id: item.id,
        stage_id: fromStageId,
        position: index,
      });
    });
  }

  return updates;
}

export function applyUpdatesToBoard(board, updates) {
  updates.forEach((update) => {
    const task = board.tasks.find((item) => item.id === update.id);
    if (task) {
      task.stage_id = update.stage_id;
      task.position = update.position;
    }
  });
}

export function isMoveNoOp(board, updates) {
  return updates.every((update) => {
    const task = board.tasks.find((item) => item.id === update.id);
    return task && task.stage_id === update.stage_id && task.position === update.position;
  });
}

export async function fetchTasksByDeadline() {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      done,
      due_date,
      stage_id,
      project_id,
      projects (
        id,
        title
      ),
      project_stages (
        name
      )
    `)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    done: task.done,
    due_date: task.due_date,
    stage_id: task.stage_id,
    project_id: task.project_id,
    projectTitle: task.projects?.title ?? 'Unknown project',
    stageName: task.project_stages?.name ?? 'Unknown stage',
  }));
}

export async function applyTaskOrder(updates) {
  const results = await Promise.all(
    updates.map((update) =>
      supabase
        .from('tasks')
        .update({ stage_id: update.stage_id, position: update.position })
        .eq('id', update.id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
