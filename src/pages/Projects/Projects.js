import template from './Projects.html?raw';
import './Projects.css';
import { deleteProject, fetchProjectsWithStats } from '../../lib/api/projects.js';
import { showDeleteConfirm } from '../../components/ConfirmModal/ConfirmModal.js';
import { escapeHtml, truncate } from '../../lib/utils.js';
import { navigate } from '../../router/router.js';
import { toast } from '../../lib/toast.js';

function renderRow(project) {
  const shortDescription = project.description ? truncate(project.description, 80) : '—';
  const descriptionTitle = project.description ? escapeHtml(project.description) : '';

  return `
    <tr data-project-id="${project.id}">
      <td class="projects-table__title">${escapeHtml(project.title)}</td>
      <td class="projects-table__description text-soft" ${descriptionTitle ? `title="${descriptionTitle}"` : ''}>
        ${escapeHtml(shortDescription)}
      </td>
      <td class="text-center">${project.stageCount}</td>
      <td class="text-center">${project.openTaskCount}</td>
      <td class="text-center">${project.doneTaskCount}</td>
      <td class="text-end">
        <div class="projects-table__actions">
          <a href="/project/${project.id}/tasks" data-router-link class="btn btn-sm btn-glass">
            View Tasks
          </a>
          <a href="/project/${project.id}/edit" data-router-link class="btn btn-sm btn-glass" title="Edit">
            <i class="bi bi-pencil"></i>
          </a>
          <button type="button" class="btn btn-sm btn-glass text-danger" data-delete-project title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function setLoading(container, loading) {
  container.querySelector('[data-projects-loading]')?.classList.toggle('d-none', !loading);
  container.querySelector('[data-projects-table-wrap]')?.classList.toggle('d-none', loading);
}

export function render(container) {
  container.innerHTML = template;

  const tableWrap = container.querySelector('[data-projects-table-wrap]');
  const tbody = container.querySelector('[data-projects-tbody]');
  const emptyEl = container.querySelector('[data-projects-empty]');
  let cancelled = false;

  async function loadProjects() {
    setLoading(container, true);
    emptyEl.classList.add('d-none');

    try {
      const projects = await fetchProjectsWithStats();
      if (cancelled) return;

      if (projects.length === 0) {
        tbody.innerHTML = '';
        tableWrap.classList.add('d-none');
        emptyEl.classList.remove('d-none');
        return;
      }

      tableWrap.classList.remove('d-none');
      emptyEl.classList.add('d-none');
      tbody.innerHTML = projects.map(renderRow).join('');
    } catch (error) {
      if (cancelled) return;
      toast.fromError(error, 'Could not load projects.');
    } finally {
      if (!cancelled) {
        setLoading(container, false);
      }
    }
  }

  const onTableClick = async (event) => {
    const deleteBtn = event.target.closest('[data-delete-project]');
    if (!deleteBtn) return;

    const row = deleteBtn.closest('[data-project-id]');
    if (!row) return;

    const projectId = row.getAttribute('data-project-id');
    const title = row.querySelector('.projects-table__title')?.textContent?.trim() ?? 'project';

    const confirmed = await showDeleteConfirm({ itemName: title });
    if (!confirmed) return;

    deleteBtn.disabled = true;

    try {
      await deleteProject(projectId);
      toast.success('Project deleted.');
      await loadProjects();
    } catch (error) {
      toast.fromError(error, 'Could not delete project.');
      deleteBtn.disabled = false;
    }
  };

  tbody.addEventListener('click', onTableClick);
  loadProjects();

  return () => {
    cancelled = true;
    tbody.removeEventListener('click', onTableClick);
  };
}
