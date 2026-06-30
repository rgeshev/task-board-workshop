import template from './Deadlines.html?raw';
import './Deadlines.css';
import { fetchTasksByDeadline } from '../../lib/api/tasks.js';
import { escapeHtml, formatDueDate, getDueDateStatus, groupTasksByDeadline } from '../../lib/utils.js';
import { navigate } from '../../router/router.js';
import { toast } from '../../lib/toast.js';

function setLoading(container, loading) {
  container.querySelector('[data-deadlines-loading]')?.classList.toggle('d-none', !loading);
  container.querySelector('[data-deadlines-content]')?.classList.toggle('d-none', loading);
}

function renderDueCell(task) {
  if (!task.due_date) {
    return '<span class="text-soft">—</span>';
  }

  const status = getDueDateStatus(task.due_date, task.done);
  const statusClass =
    status === 'overdue'
      ? 'deadlines-table__due--overdue'
      : status === 'today'
        ? 'deadlines-table__due--today'
        : '';

  return `
    <span class="deadlines-table__due ${statusClass}">
      <i class="bi bi-calendar-event"></i>
      ${escapeHtml(formatDueDate(task.due_date))}
    </span>
  `;
}

function renderTaskRow(task) {
  const doneClass = task.done ? 'deadlines-table__task--done' : '';
  const statusLabel = task.done ? 'Done' : 'Open';
  const statusClass = task.done ? 'deadlines-table__status--done' : '';

  return `
    <tr data-project-id="${task.project_id}">
      <td>${renderDueCell(task)}</td>
      <td class="deadlines-table__task-title ${doneClass}">${escapeHtml(task.title)}</td>
      <td>
        <a
          href="/project/${task.project_id}/tasks"
          data-router-link
          class="deadlines-table__project-link"
          data-project-link
        >${escapeHtml(task.projectTitle)}</a>
      </td>
      <td class="text-soft">${escapeHtml(task.stageName)}</td>
      <td>
        <span class="deadlines-table__status ${statusClass}">${statusLabel}</span>
      </td>
    </tr>
  `;
}

function renderGroup(group) {
  const rows = group.tasks.map(renderTaskRow).join('');
  const groupModifier = group.key === 'overdue' || group.key === 'today' ? `deadlines-page__group--${group.key}` : '';

  return `
    <section class="deadlines-page__group ${groupModifier}">
      <div class="deadlines-page__group-head">
        <i class="bi ${group.icon}"></i>
        <h2 class="deadlines-page__group-title">${escapeHtml(group.label)}</h2>
        <span class="deadlines-page__group-count">${group.tasks.length}</span>
      </div>
      <div class="card deadlines-table-wrap">
        <div class="table-responsive">
          <table class="table deadlines-table align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Due date</th>
                <th scope="col">Task</th>
                <th scope="col">Project</th>
                <th scope="col">Stage</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderContent(container, tasks) {
  const contentEl = container.querySelector('[data-deadlines-content]');
  const emptyEl = container.querySelector('[data-deadlines-empty]');

  if (!tasks.length) {
    contentEl.classList.add('d-none');
    emptyEl.classList.remove('d-none');
    return;
  }

  const groups = groupTasksByDeadline(tasks);
  contentEl.innerHTML = groups.map(renderGroup).join('');
  contentEl.classList.remove('d-none');
  emptyEl.classList.add('d-none');
}

export function render(container) {
  container.innerHTML = template;

  let cancelled = false;

  async function loadTasks() {
    setLoading(container, true);
    container.querySelector('[data-deadlines-empty]')?.classList.add('d-none');
    container.querySelector('[data-deadlines-content]')?.classList.add('d-none');

    try {
      const tasks = await fetchTasksByDeadline();
      if (cancelled) return;
      renderContent(container, tasks);
    } catch (error) {
      if (cancelled) return;
      toast.fromError(error, 'Could not load deadlines.');
    } finally {
      if (!cancelled) {
        setLoading(container, false);
      }
    }
  }

  const onContentClick = (event) => {
    const projectLink = event.target.closest('[data-project-link]');
    if (projectLink) {
      event.stopPropagation();
      return;
    }

    const row = event.target.closest('tr[data-project-id]');
    if (!row) return;

    const projectId = row.getAttribute('data-project-id');
    navigate(`/project/${projectId}/tasks`);
  };

  container.addEventListener('click', onContentClick);
  loadTasks();

  return () => {
    cancelled = true;
    container.removeEventListener('click', onContentClick);
  };
}
