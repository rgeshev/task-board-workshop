import template from './Projects.html?raw';
import './Projects.css';
import { fetchProjects } from '../../lib/api/projects.js';
import { toast } from '../../lib/toast.js';

const ICONS = ['bi-rocket-takeoff', 'bi-phone', 'bi-megaphone', 'bi-palette', 'bi-code-slash'];
const COLORS = ['var(--tb-violet)', 'var(--tb-cyan)', 'var(--tb-green)', 'var(--tb-amber)', 'var(--tb-pink)'];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderProjectCard(project, index) {
  const icon = ICONS[index % ICONS.length];
  const color = COLORS[index % COLORS.length];
  const description = project.description
    ? `<p class="text-soft small mb-0">${escapeHtml(project.description)}</p>`
    : '<p class="text-soft small mb-0">No description</p>';

  return `
    <div class="col-md-6 col-xl-4">
      <a href="/projects/${project.id}/tasks" data-router-link class="card tb-hover h-100 p-4 text-decoration-none projects-card">
        <div class="projects-card__icon" style="--icon: ${color}">
          <i class="bi ${icon}"></i>
        </div>
        <h3 class="h5 mt-3 mb-2">${escapeHtml(project.title)}</h3>
        ${description}
      </a>
    </div>
  `;
}

function setLoading(container, loading) {
  container.querySelector('[data-projects-loading]')?.classList.toggle('d-none', !loading);
  container.querySelector('[data-projects-list]')?.classList.toggle('d-none', loading);
}

export function render(container) {
  container.innerHTML = template;

  const listEl = container.querySelector('[data-projects-list]');
  const emptyEl = container.querySelector('[data-projects-empty]');
  let cancelled = false;

  async function loadProjects() {
    setLoading(container, true);
    emptyEl.classList.add('d-none');

    try {
      const projects = await fetchProjects();
      if (cancelled) return;

      if (projects.length === 0) {
        listEl.innerHTML = '';
        listEl.classList.add('d-none');
        emptyEl.classList.remove('d-none');
        return;
      }

      listEl.classList.remove('d-none');
      emptyEl.classList.add('d-none');
      listEl.innerHTML = projects.map((project, index) => renderProjectCard(project, index)).join('');
    } catch (error) {
      if (cancelled) return;
      toast.fromError(error, 'Could not load projects.');
    } finally {
      if (!cancelled) {
        setLoading(container, false);
      }
    }
  }

  loadProjects();

  return () => {
    cancelled = true;
  };
}
