import template from './ProjectTasks.html?raw';
import './ProjectTasks.css';
import {
  applyTaskOrder,
  applyUpdatesToBoard,
  computeTaskMoveUpdates,
  createTask,
  deleteTask,
  fetchProjectBoard,
  isMoveNoOp,
  toggleTaskDone,
  updateTask,
} from '../../lib/api/tasks.js';
import { uploadTaskAttachment } from '../../lib/api/attachments.js';
import { initBoardDragDrop } from '../../components/BoardDragDrop/BoardDragDrop.js';
import { openTaskModal, showDeleteTaskConfirm } from '../../components/TaskModal/TaskModal.js';
import { escapeHtml, formatDueDate, getDueDateStatus, truncate } from '../../lib/utils.js';
import { navigate } from '../../router/router.js';
import { toast } from '../../lib/toast.js';

const STAGE_COLORS = ['var(--tb-muted)', 'var(--tb-amber)', 'var(--tb-green)', 'var(--tb-cyan)', 'var(--tb-violet)'];

function stageColor(index) {
  return STAGE_COLORS[index % STAGE_COLORS.length];
}

function tasksForStage(tasks, stageId) {
  return tasks
    .filter((task) => task.stage_id === stageId)
    .sort((a, b) => a.position - b.position);
}

function renderDueBadge(task) {
  if (!task.due_date) return '';

  const status = getDueDateStatus(task.due_date, task.done);
  const label = formatDueDate(task.due_date);
  const statusClass =
    status === 'overdue'
      ? 'board__task-due--overdue'
      : status === 'today'
        ? 'board__task-due--today'
        : 'board__task-due--default';

  return `
    <span class="board__task-due ${statusClass}">
      <i class="bi bi-calendar-event"></i>
      ${escapeHtml(label)}
    </span>
  `;
}

function renderTaskCard(task) {
  const description = task.description
    ? `<p class="board__task-desc text-soft small mb-0">${escapeHtml(task.description)}</p>`
    : '';
  const dueBadge = renderDueBadge(task);

  return `
    <article
      class="card board__task p-3 ${task.done ? 'board__task--done' : ''}"
      data-task-id="${task.id}"
      draggable="true"
    >
      <div class="board__task-top">
        <div class="form-check mb-1 flex-grow-1">
          <input class="form-check-input" type="checkbox" data-toggle-done ${task.done ? 'checked' : ''} id="task-done-${task.id}" />
          <label class="form-check-label" for="task-done-${task.id}">${escapeHtml(task.title)}</label>
        </div>
        <div class="board__task-actions">
          <button type="button" class="btn btn-sm btn-glass" data-edit-task title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="btn btn-sm btn-glass text-danger" data-delete-task title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      ${dueBadge}
      ${description}
    </article>
  `;
}

function renderColumn(stage, tasks, stageIndex) {
  const stageTasks = tasksForStage(tasks, stage.id);
  const cards = stageTasks.map(renderTaskCard).join('');

  return `
    <div class="board__col" data-stage-id="${stage.id}">
      <div class="board__col-head">
        <span class="board__dot" style="--dot: ${stageColor(stageIndex)}"></span>
        <span class="fw-semibold">${escapeHtml(stage.name)}</span>
        <span class="board__count" data-stage-count="${stage.id}">${stageTasks.length}</span>
      </div>
      <div class="board__col-body" data-stage-id="${stage.id}">
        ${cards}
      </div>
    </div>
  `;
}

function renderBoard(boardEl, board) {
  boardEl.innerHTML = board.stages.map((stage, index) => renderColumn(stage, board.tasks, index)).join('');
}

function setLoading(container, loading) {
  container.querySelector('[data-board-loading]')?.classList.toggle('d-none', !loading);
  container.querySelector('[data-board-scroll]')?.classList.toggle('d-none', loading);
}

export function render(container, params = {}) {
  container.innerHTML = template;

  const projectId = params.id;
  const boardEl = container.querySelector('[data-board]');
  const scrollEl = container.querySelector('[data-board-scroll]');
  const emptyEl = container.querySelector('[data-board-empty]');
  const addBtn = container.querySelector('[data-add-task]');

  let board = null;
  let cancelled = false;
  let cleanupDragDrop = null;

  function paintBoard() {
    renderBoard(boardEl, board);
  }

  async function loadBoard() {
    setLoading(container, true);
    emptyEl.classList.add('d-none');

    try {
      const data = await fetchProjectBoard(projectId);
      if (cancelled) return;

      if (!data) {
        toast.error('Project not found.');
        navigate('/projects');
        return;
      }

      board = data;

      container.querySelector('[data-project-title]').textContent = data.title;
      container.querySelector('[data-project-breadcrumb]').textContent = data.title;

      if (data.stages.length === 0) {
        scrollEl.classList.add('d-none');
        emptyEl.classList.remove('d-none');
        return;
      }

      scrollEl.classList.remove('d-none');
      paintBoard();
    } catch (error) {
      if (cancelled) return;
      toast.fromError(error, 'Could not load tasks board.');
    } finally {
      if (!cancelled) {
        setLoading(container, false);
      }
    }
  }

  async function handleTaskMove({ taskId, stageId, toIndex }) {
    if (!board) return;

    const updates = computeTaskMoveUpdates(board, taskId, stageId, toIndex);
    if (!updates.length || isMoveNoOp(board, updates)) {
      return;
    }

    const previous = board.tasks.map((task) => ({
      id: task.id,
      stage_id: task.stage_id,
      position: task.position,
    }));

    applyUpdatesToBoard(board, updates);
    paintBoard();

    try {
      await applyTaskOrder(updates);
    } catch (error) {
      previous.forEach((item) => {
        const task = board.tasks.find((entry) => entry.id === item.id);
        if (task) {
          task.stage_id = item.stage_id;
          task.position = item.position;
        }
      });
      paintBoard();
      toast.fromError(error, 'Could not move task.');
    }
  }

  const onAddTask = () => {
    if (!board?.stages.length) return;

    openTaskModal({
      mode: 'add',
      stages: board.stages,
      defaultStageId: board.stages[0]?.id,
      onSubmit: async (values) => {
        const task = await createTask({
          projectId,
          stageId: values.stageId,
          title: values.title,
          description: values.description,
          dueDate: values.dueDate,
        });

        const failedUploads = [];

        for (const file of values.pendingFiles ?? []) {
          try {
            await uploadTaskAttachment(task.id, file);
          } catch (error) {
            failedUploads.push(truncate(file.name, 40));
          }
        }

        if (failedUploads.length) {
          toast.error(
            `Task created, but ${failedUploads.length} file(s) failed to upload: ${failedUploads.join(', ')}.`
          );
          throw new Error('Partial attachment upload failure.');
        }

        if ((values.pendingFiles ?? []).length) {
          toast.success('Task created with attachments.');
        } else {
          toast.success('Task created.');
        }

        await loadBoard();
      },
    });
  };

  const onBoardClick = async (event) => {
    const editBtn = event.target.closest('[data-edit-task]');
    const deleteBtn = event.target.closest('[data-delete-task]');
    const toggleInput = event.target.closest('[data-toggle-done]');
    const card = event.target.closest('[data-task-id]');

    if (!card || !board) return;

    const taskId = card.getAttribute('data-task-id');
    const task = board.tasks.find((item) => item.id === taskId);
    if (!task) return;

    if (toggleInput) {
      const done = toggleInput.checked;
      toggleInput.disabled = true;

      try {
        await toggleTaskDone(taskId, done);
        await loadBoard();
      } catch (error) {
        toggleInput.checked = !done;
        toast.fromError(error, 'Could not update task.');
      } finally {
        toggleInput.disabled = false;
      }
      return;
    }

    if (editBtn) {
      openTaskModal({
        mode: 'edit',
        stages: board.stages,
        task,
        onSubmit: async (values) => {
          await updateTask(taskId, {
            title: values.title,
            description: values.description,
            stageId: values.stageId,
            done: values.done,
            dueDate: values.dueDate,
          });
          toast.success('Task updated.');
          await loadBoard();
        },
      });
      return;
    }

    if (deleteBtn) {
      const confirmed = await showDeleteTaskConfirm({ itemName: task.title });
      if (!confirmed) return;

      deleteBtn.disabled = true;

      try {
        await deleteTask(taskId);
        toast.success('Task deleted.');
        await loadBoard();
      } catch (error) {
        toast.fromError(error, 'Could not delete task.');
        deleteBtn.disabled = false;
      }
    }
  };

  addBtn.addEventListener('click', onAddTask);
  boardEl.addEventListener('click', onBoardClick);
  cleanupDragDrop = initBoardDragDrop(scrollEl, { onMove: handleTaskMove });
  loadBoard();

  return () => {
    cancelled = true;
    addBtn.removeEventListener('click', onAddTask);
    boardEl.removeEventListener('click', onBoardClick);
    cleanupDragDrop?.();
  };
}
